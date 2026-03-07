from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta, timezone

from database import db
from models import UserRegister, OTPVerify, UserLogin, ChangePassword
from utils import (
    generate_otp, hash_password, verify_password, 
    create_access_token, send_email_func
)
from dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post('/register')
async def register(user_data: UserRegister):
    existing = await db.users.find_one({
        '$or': [{'email': user_data.email}, {'username': user_data.username}]
    })
    if existing:
        raise HTTPException(status_code=400, detail='User already exists')
    
    otp = generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
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
        'created_at': datetime.now(timezone.utc).isoformat()
    })
    
    html = f"<h2>Welcome to QuickChat!</h2><p>Your OTP is: <b>{otp}</b></p>"
    email_sent = await send_email_func(user_data.email, "QuickChat - Verification Code", html)
    
    if not email_sent:
        await db.otps.delete_many({'email': user_data.email})
        await db.pending_users.delete_many({'email': user_data.email})
        raise HTTPException(status_code=500, detail='Failed to send OTP email. Please check your email address or try again later.')
    
    return {'message': 'OTP sent'}

@router.post('/verify-otp')
async def verify_otp(data: OTPVerify):
    otp_doc = await db.otps.find_one({'email': data.email})
    if not otp_doc or datetime.fromisoformat(otp_doc['expires_at']) < datetime.now(timezone.utc) or otp_doc['otp'] != data.otp:
        raise HTTPException(status_code=400, detail='Invalid or expired OTP')
    
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
        'created_at': datetime.now(timezone.utc).isoformat(),
        'blocked_users': []
    }
    
    await db.users.insert_one(user_doc)
    await db.otps.delete_many({'email': data.email})
    await db.pending_users.delete_many({'email': data.email})
    
    token = create_access_token({'sub': user_id})
    user_res = {k: v for k, v in user_doc.items() if k not in ['_id', 'password_hash']}
    
    return {'token': token, 'user': user_res}

@router.post('/login')
async def login(data: UserLogin):
    user = await db.users.find_one({'$or': [{'email': data.login}, {'username': data.login}]})
    if not user or not verify_password(data.password, user['password_hash']):
        raise HTTPException(status_code=401, detail='Invalid credentials')
    
    token = create_access_token({'sub': user['user_id']})
    user_res = {k: v for k, v in user.items() if k not in ['_id', 'password_hash']}
    if 'blocked_users' not in user_res:
        user_res['blocked_users'] = []
        
    return {'token': token, 'user': user_res}

@router.get('/me')
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

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
