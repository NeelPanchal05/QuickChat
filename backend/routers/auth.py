from fastapi import APIRouter, HTTPException, Depends, Response, Request, BackgroundTasks
from datetime import datetime, timedelta, timezone
from google.oauth2 import id_token
from google.auth.transport import requests

from database import db
from models import UserRegister, OTPVerify, UserLogin, ChangePassword
from utils import (
    generate_otp, hash_password, verify_password, 
    create_access_token, create_refresh_token, send_email_func, GOOGLE_CLIENT_ID
)
from dependencies import get_current_user
from rate_limiter import limiter, redis_client

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post('/register')
@limiter.limit("5/minute")
async def register(request: Request, user_data: UserRegister, background_tasks: BackgroundTasks):
    existing = await db.users.find_one({
        '$or': [{'email': user_data.email}, {'username': user_data.username}]
    })
    if existing:
        raise HTTPException(status_code=400, detail='User already exists')
    
    otp = generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    if redis_client:
        try:
            # 600 seconds = 10 minutes
            redis_client.setex(f"otp:{user_data.email}", 600, otp)
        except Exception:
            await db.otps.delete_many({'email': user_data.email})
            await db.otps.insert_one({
                'email': user_data.email,
                'otp': otp,
                'expires_at': expires_at.isoformat()
            })
    else:
        await db.otps.delete_many({'email': user_data.email})
        await db.otps.insert_one({
            'email': user_data.email,
            'otp': otp,
            'expires_at': expires_at.isoformat()
        })
    
    await db.pending_users.delete_many({'email': user_data.email})
    await db.pending_users.insert_one({
        'email': user_data.email,
        'username': user_data.username,
        'password_hash': hash_password(user_data.password),
        'real_name': user_data.real_name,
        'unique_id': user_data.unique_id,
        'public_key': user_data.public_key,
        'created_at': datetime.now(timezone.utc).isoformat()
    })
    
    html = f"<h2>Welcome to QuickChat!</h2><p>Your OTP is: <b>{otp}</b></p>"
    
    # Send email in the background so the user gets an immediate response
    background_tasks.add_task(send_email_func, user_data.email, "QuickChat - Verification Code", html)
    
    return {'message': 'OTP sent'}

@router.post('/verify-otp')
@limiter.limit("5/minute")
async def verify_otp(request: Request, data: OTPVerify, response: Response):
    otp_valid = False
    if redis_client:
        try:
            stored_otp = redis_client.get(f"otp:{data.email}")
            if stored_otp and stored_otp.decode('utf-8') == data.otp:
                otp_valid = True
                redis_client.delete(f"otp:{data.email}")
        except Exception:
            pass

    if not otp_valid:
        otp_doc = await db.otps.find_one({'email': data.email})
        if not otp_doc or datetime.fromisoformat(otp_doc['expires_at']) < datetime.now(timezone.utc) or otp_doc['otp'] != data.otp:
            raise HTTPException(status_code=400, detail='Invalid or expired OTP')
        await db.otps.delete_many({'email': data.email})
    
    pending = await db.pending_users.find_one({'email': data.email})
    if not pending:
        raise HTTPException(status_code=400, detail='User data missing')
    
    user_id = f"user_{datetime.now(timezone.utc).timestamp()}".replace('.', '_')
    user_doc = {
        'user_id': user_id,
        'email': pending['email'],
        'username': pending['username'],
        'password_hash': pending['password_hash'],
        'real_name': pending['real_name'],
        'unique_id': pending['unique_id'],
        'profile_photo': '',
        'bio': '',
        'online_status': 'offline',
        'verified': True,
        'public_key': pending.get('public_key'),
        'created_at': datetime.now(timezone.utc).isoformat(),
        'blocked_users': []
    }
    
    await db.users.insert_one(user_doc)
    await db.pending_users.delete_many({'email': data.email})
    await db.pending_users.delete_many({'email': data.email})
    
    access_token = create_access_token({'sub': user_id})
    refresh_token = create_refresh_token({'sub': user_id})
    
    # Set HttpOnly cookie for refresh token
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=7 * 24 * 60 * 60 # 7 days
    )
    
    user_res = {k: v for k, v in user_doc.items() if k not in ['_id', 'password_hash']}
    
    return {'token': access_token, 'user': user_res}

@router.post('/login')
@limiter.limit("10/minute")
async def login(request: Request, data: UserLogin, response: Response):
    # Case-insensitive lookup for email, exact match for username
    user = await db.users.find_one({
        '$or': [
            {'email': {'$regex': f'^{data.login}$', '$options': 'i'}}, 
            {'username': data.login}
        ]
    })
    if not user or not verify_password(data.password, user['password_hash']):
        raise HTTPException(status_code=401, detail='Invalid credentials')
    
    access_token = create_access_token({'sub': user['user_id']})
    refresh_token = create_refresh_token({'sub': user['user_id']})
    
    # Set HttpOnly cookie for refresh token
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=7 * 24 * 60 * 60 # 7 days
    )
    
    user_res = {k: v for k, v in user.items() if k not in ['_id', 'password_hash']}
    if 'blocked_users' not in user_res:
        user_res['blocked_users'] = []
        
    return {'token': access_token, 'user': user_res}

@router.post('/google')
@limiter.limit("10/minute")
async def google_auth(request: Request, response: Response):
    data = await request.json()
    token = data.get('token')
    public_key = data.get('public_key')
    
    if not token:
        raise HTTPException(status_code=400, detail="Missing Google token")
        
    try:
        idinfo = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            audience=GOOGLE_CLIENT_ID if GOOGLE_CLIENT_ID else None,
            clock_skew_in_seconds=60
        )
        email = idinfo.get('email')
        real_name = idinfo.get('name')
        profile_photo = idinfo.get('picture', '')
        
        if not email:
            raise HTTPException(status_code=400, detail="Google account has no email")
            
    except ValueError as e:
        print(f"Google Auth Error: {e}")
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")

    # Make case-insensitive query for email
    email_regex = {'$regex': f"^{email}$", '$options': 'i'}
    user = await db.users.find_one({'email': email_regex})
    is_new_user = False
    
    if not user:
        # User does not exist, create them immediately
        is_new_user = True
        user_id = f"user_{datetime.now(timezone.utc).timestamp()}".replace('.', '_')
        username = f"{email.split('@')[0]}{int(datetime.now(timezone.utc).timestamp()) % 10000}"
        
        # We enforce a public key if it's a new user
        if not public_key:
            raise HTTPException(status_code=400, detail="Public key is required for registration")
            
        user = {
            'user_id': user_id,
            'email': email,
            'username': username,
            'password_hash': '', # No password for Google users
            'real_name': real_name,
            'unique_id': username, # use generated username as unique_id initially
            'profile_photo': profile_photo,
            'bio': '',
            'online_status': 'offline',
            'verified': True,
            'public_key': public_key,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'blocked_users': []
        }
        await db.users.insert_one(user)
    
    access_token = create_access_token({'sub': user['user_id']})
    refresh_token = create_refresh_token({'sub': user['user_id']})
    
    # Set HttpOnly cookie for refresh token
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=7 * 24 * 60 * 60 # 7 days
    )
    
    user_res = {k: v for k, v in user.items() if k not in ['_id', 'password_hash']}
    if 'blocked_users' not in user_res:
        user_res['blocked_users'] = []
        
    return {'token': access_token, 'user': user_res, 'is_new_user': is_new_user}


@router.get('/me')
async def get_me(current_user: dict = Depends(get_current_user)):
    # Fetch full user to include profile_photo and bio which are excluded in get_current_user
    full_user = await db.users.find_one({'user_id': current_user['user_id']}, {'_id': 0, 'password_hash': 0})
    if not full_user:
        raise HTTPException(status_code=404, detail="User not found")
    if 'blocked_users' not in full_user:
        full_user['blocked_users'] = []
    return full_user

@router.post('/change-password')
async def change_password(data: ChangePassword, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({'user_id': current_user['user_id']})
    if not verify_password(data.old_password, user['password_hash']):
        raise HTTPException(status_code=400, detail="Incorrect old password")
    
    new_hash = hash_password(data.new_password)
    await db.users.update_one({'user_id': current_user['user_id']}, {'$set': {'password_hash': new_hash}})
    return {"message": "Password updated successfully"}

@router.delete('/delete-account')
async def delete_account(current_user: dict = Depends(get_current_user)):
    user_id = current_user['user_id']
    await db.users.delete_one({'user_id': user_id})
    await db.conversations.update_many({}, {'$pull': {'participants': user_id}})
    return {"message": "Account deleted successfully"}

@router.post('/refresh')
@limiter.limit("20/minute")
async def refresh_token(request: Request, response: Response):
    from utils import SECRET_KEY, ALGORITHM
    import jwt
    refresh_token = request.cookies.get("refresh_token")
    
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")
        
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get('sub')
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
            
        user = await db.users.find_one({'user_id': user_id})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
            
        new_access_token = create_access_token({'sub': user_id})
        return {'token': new_access_token}
    except jwt.ExpiredSignatureError:
        response.delete_cookie("refresh_token")
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

