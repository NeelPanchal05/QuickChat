from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File, Body
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, timedelta, timezone
from pathlib import Path
import socketio
import os
import jwt
import bcrypt
import asyncio
import random
import string
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
from bson import ObjectId

# Import local modules
from encryption import encrypt_message, decrypt_message
from spam_protection import spam_protection, is_spam_message

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configuration
SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
GMAIL_EMAIL = os.getenv('GMAIL_EMAIL', '')
GMAIL_PASSWORD = os.getenv('GMAIL_PASSWORD', '')
SENDER_EMAIL = os.getenv('SENDER_EMAIL', GMAIL_EMAIL)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'quickchat')]

# Socket.IO server
# CORS_ORIGINS env var is comma-separated, e.g. "http://localhost:3000,https://your-app.vercel.app"
_cors_env = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000')
_allowed_origins = [o.strip() for o in _cors_env.split(',') if o.strip()]

sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=_allowed_origins,
    ping_timeout=60,
    ping_interval=25
)

# FastAPI app
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create indexes for performance
    await db.users.create_index('user_id', unique=True)
    await db.users.create_index('email', unique=True)
    await db.messages.create_index('conversation_id')
    await db.messages.create_index('timestamp')
    await db.conversations.create_index('participants')
    await db.conversations.create_index('updated_at')
    await db.otps.create_index('email')
    logger.info('Database indexes created successfully')
    yield
    # Shutdown: close MongoDB connection
    client.close()
    logger.info('MongoDB connection closed')

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# In-memory storage
active_users = {}  # {user_id: socket_id}
user_sockets = {}  # {socket_id: user_id}

# ==================== Models ====================

class UserRegister(BaseModel):
    email: EmailStr
    username: str
    password: str
    real_name: str
    unique_id: str

class OTPVerify(BaseModel):
    email: EmailStr
    otp: str

class UserLogin(BaseModel):
    login: str
    password: str

class UserUpdate(BaseModel):
    real_name: Optional[str] = None
    profile_photo: Optional[str] = None
    bio: Optional[str] = None

class ChangePassword(BaseModel):
    old_password: str
    new_password: str

class ConversationCreate(BaseModel):
    participant_id: str

class InviteFriend(BaseModel):
    email: EmailStr

# ==================== Helper Functions ====================

def generate_otp():
    return ''.join(random.choices(string.digits, k=6))

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({'exp': expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get('sub')
        if not user_id:
            raise HTTPException(status_code=401, detail='Invalid token')
        
        user = await db.users.find_one({'user_id': user_id}, {'_id': 0})
        if not user:
            raise HTTPException(status_code=401, detail='User not found')
        
        if 'blocked_users' not in user:
            user['blocked_users'] = []
            
        return user
    except Exception:
        raise HTTPException(status_code=401, detail='Invalid token')

async def send_email_func(to_email: str, subject: str, html_content: str):
    try:
        message = MIMEMultipart('alternative')
        message['Subject'] = subject
        message['From'] = SENDER_EMAIL
        message['To'] = to_email
        part = MIMEText(html_content, 'html')
        message.attach(part)
        
        def send():
            with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
                server.login(GMAIL_EMAIL, GMAIL_PASSWORD)
                server.sendmail(SENDER_EMAIL, [to_email], message.as_string())
        
        await asyncio.to_thread(lambda: send())
        return True
    except Exception as e:
        logger.error(f"Email failed: {e}")
        return False

# ==================== Auth Endpoints ====================

@app.post('/api/auth/register')
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

@app.post('/api/auth/verify-otp')
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

@app.post('/api/auth/login')
async def login(data: UserLogin):
    user = await db.users.find_one({'$or': [{'email': data.login}, {'username': data.login}]})
    if not user or not verify_password(data.password, user['password_hash']):
        raise HTTPException(status_code=401, detail='Invalid credentials')
    
    token = create_access_token({'sub': user['user_id']})
    user_res = {k: v for k, v in user.items() if k not in ['_id', 'password_hash']}
    if 'blocked_users' not in user_res:
        user_res['blocked_users'] = []
        
    return {'token': token, 'user': user_res}

@app.get('/api/auth/me')
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@app.post('/api/auth/change-password')
async def change_password(data: ChangePassword, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({'user_id': current_user['user_id']})
    if not verify_password(data.old_password, user['password_hash']):
        raise HTTPException(status_code=400, detail="Incorrect old password")
    
    new_hash = hash_password(data.new_password)
    await db.users.update_one({'user_id': current_user['user_id']}, {'$set': {'password_hash': new_hash}})
    return {"message": "Password updated successfully"}

@app.delete('/api/auth/delete-account')
async def delete_account(current_user: dict = Depends(get_current_user)):
    user_id = current_user['user_id']
    await db.users.delete_one({'user_id': user_id})
    await db.conversations.update_many({}, {'$pull': {'participants': user_id}})
    return {"message": "Account deleted successfully"}

# ==================== User & Social Endpoints ====================

@app.get('/api/users/search')
async def search_users(query: str, current_user: dict = Depends(get_current_user)):
    users = await db.users.find({
        'user_id': {'$ne': current_user['user_id']},
        '$or': [
            {'username': {'$regex': query, '$options': 'i'}},
            {'real_name': {'$regex': query, '$options': 'i'}},
            {'unique_id': {'$regex': query, '$options': 'i'}}
        ]
    }, {'_id': 0, 'password_hash': 0}).limit(20).to_list(20)
    return users

@app.put('/api/users/profile')
async def update_profile(data: UserUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.users.update_one({'user_id': current_user['user_id']}, {'$set': update_data})
    return await db.users.find_one({'user_id': current_user['user_id']}, {'_id': 0, 'password_hash': 0})

@app.post('/api/users/invite')
async def invite_friend(data: InviteFriend, current_user: dict = Depends(get_current_user)):
    html = f"""
    <h2>Hello!</h2>
    <p>{current_user['real_name']} (@{current_user['username']}) has invited you to join QuickChat.</p>
    <p>Sign up today to connect!</p>
    """
    success = await send_email_func(data.email, "Join me on QuickChat!", html)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send invitation")
    return {"message": "Invitation sent successfully"}

@app.post('/api/users/block/{user_id}')
async def block_user(user_id: str, current_user: dict = Depends(get_current_user)):
    await db.users.update_one({'user_id': current_user['user_id']}, {'$addToSet': {'blocked_users': user_id}})
    return {'message': 'User blocked'}

@app.post('/api/users/unblock/{user_id}')
async def unblock_user(user_id: str, current_user: dict = Depends(get_current_user)):
    await db.users.update_one({'user_id': current_user['user_id']}, {'$pull': {'blocked_users': user_id}})
    return {'message': 'User unblocked'}

@app.get('/api/users/blocked')
async def get_blocked_users(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({'user_id': current_user['user_id']})
    blocked_ids = user.get('blocked_users', [])
    return await db.users.find({'user_id': {'$in': blocked_ids}}, {'_id': 0, 'password_hash': 0}).to_list(None)

# ==================== Conversation & Message Endpoints ====================

@app.post('/api/conversations')
async def create_conversation(data: ConversationCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.conversations.find_one({
        'type': 'direct',
        'participants': {'$all': [current_user['user_id'], data.participant_id]}
    })
    if existing:
        return {k: v for k, v in existing.items() if k != '_id'}
    
    conv_id = f"conv_{datetime.now(timezone.utc).timestamp()}".replace('.', '_')
    doc = {
        'conversation_id': conv_id,
        'type': 'direct',
        'participants': [current_user['user_id'], data.participant_id],
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat(),
        'pinned_by': [],
        'archived_by': []
    }
    await db.conversations.insert_one(doc)
    return {k: v for k, v in doc.items() if k != '_id'}

@app.get('/api/conversations')
async def get_conversations(current_user: dict = Depends(get_current_user)):
    convs = await db.conversations.find({
        'participants': current_user['user_id'],
        'archived_by': {'$ne': current_user['user_id']}
    }, {'_id': 0}).sort('updated_at', -1).to_list(100)
    
    for conv in convs:
        # Safe fallback in case user is alone in the conversation
        other_participants = [p for p in conv.get('participants', []) if p != current_user['user_id']]
        other_id = other_participants[0] if other_participants else current_user['user_id']
        
        conv['other_user'] = await db.users.find_one(
            {'user_id': other_id},
            {'_id': 0, 'user_id': 1, 'username': 1, 'real_name': 1, 'profile_photo': 1, 'online_status': 1}
        )
        last_msg = await db.messages.find_one(
            {'conversation_id': conv['conversation_id']},
            {'_id': 0}, sort=[('timestamp', -1)]
        )
        if last_msg and last_msg.get('content'):
             try:
                 last_msg['content'] = decrypt_message(last_msg['content'])
             except Exception:
                 pass # Fallback gracefully if decryption fails
             
        conv['last_message'] = last_msg
        conv['is_pinned'] = current_user['user_id'] in conv.get('pinned_by', [])
        
    return convs

@app.get('/api/conversations/{conversation_id}/messages')
async def get_messages(
    conversation_id: str,
    limit: int = 50,
    before: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query: dict = {'conversation_id': conversation_id}
    
    ts_query: dict = {}
    if before:
        ts_query['$lt'] = before
    
    if start_date:
        ts_query['$gte'] = start_date
        if end_date:
            ts_query['$lte'] = end_date
    
    if ts_query:
        query['timestamp'] = ts_query

    messages = await db.messages.find(query, {'_id': 0}).sort('timestamp', -1).limit(limit).to_list(limit)
    
    for msg in messages:
        if msg.get('content'):
            try:
                msg['content'] = decrypt_message(msg['content'])
            except Exception:
                pass # Continue processing other messages on error
        
    messages.reverse()
    return messages

@app.post('/api/conversations/{conversation_id}/messages')
async def save_attachment_message(
    conversation_id: str, 
    content: str = Body(...), 
    message_type: str = Body(...), 
    file_name: str = Body(default=None),
    current_user: dict = Depends(get_current_user)
):
    is_spam, reason = spam_protection.check_spam(current_user['user_id'])
    if is_spam:
        raise HTTPException(status_code=429, detail=reason)

    encrypted_content = encrypt_message(content) if content else ''
    
    msg_id = f"msg_{datetime.now(timezone.utc).timestamp()}".replace('.', '_')
    doc = {
        'message_id': msg_id,
        'conversation_id': conversation_id,
        'sender_id': current_user['user_id'],
        'content': encrypted_content,
        'message_type': message_type,
        'file_name': file_name,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'read_by': [current_user['user_id']]
    }
    await db.messages.insert_one(doc)
    await db.conversations.update_one({'conversation_id': conversation_id}, {'$set': {'updated_at': doc['timestamp']}})
    
    response_doc = doc.copy()
    response_doc['content'] = content
    response_doc.pop('_id', None)
    await sio.emit('new_message', response_doc, room=conversation_id)
    
    return {k: v for k, v in doc.items() if k != '_id'}

@app.put('/api/conversations/{conversation_id}/archive')
async def archive_conversation(conversation_id: str, archived: bool = Body(..., embed=True), current_user: dict = Depends(get_current_user)):
    op = '$addToSet' if archived else '$pull'
    await db.conversations.update_one({'conversation_id': conversation_id}, {op: {'archived_by': current_user['user_id']}})
    return {'message': 'Updated'}

@app.get('/api/conversations/archived')
async def get_archived(current_user: dict = Depends(get_current_user)):
    convs = await db.conversations.find({
        'participants': current_user['user_id'],
        'archived_by': current_user['user_id']
    }, {'_id': 0}).to_list(None)
    return convs

@app.delete('/api/conversations/{conversation_id}')
async def delete_conversation(conversation_id: str, current_user: dict = Depends(get_current_user)):
    conv = await db.conversations.find_one({'conversation_id': conversation_id, 'participants': current_user['user_id']})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    await db.conversations.delete_one({'conversation_id': conversation_id})
    await db.messages.delete_many({'conversation_id': conversation_id})
    return {'message': 'Deleted'}

@app.delete('/api/conversations/{conversation_id}/messages')
async def clear_messages(conversation_id: str, current_user: dict = Depends(get_current_user)):
    conv = await db.conversations.find_one({'conversation_id': conversation_id, 'participants': current_user['user_id']})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    await db.messages.delete_many({'conversation_id': conversation_id})
    return {'message': 'Chat cleared'}

@app.post('/api/conversations/{conversation_id}/pin')
async def pin_conv(conversation_id: str, current_user: dict = Depends(get_current_user)):
    await db.conversations.update_one({'conversation_id': conversation_id}, {'$addToSet': {'pinned_by': current_user['user_id']}})
    return {'message': 'Pinned'}

@app.delete('/api/conversations/{conversation_id}/pin')
async def unpin_conv(conversation_id: str, current_user: dict = Depends(get_current_user)):
    await db.conversations.update_one({'conversation_id': conversation_id}, {'$pull': {'pinned_by': current_user['user_id']}})
    return {'message': 'Unpinned'}

# ==================== Call History ====================

@app.get('/api/calls/history')
async def get_call_history(current_user: dict = Depends(get_current_user)):
    calls = await db.call_history.find({
        '$or': [{'caller_id': current_user['user_id']}, {'callee_id': current_user['user_id']}]
    }).sort('timestamp', -1).limit(50).to_list(50)
    
    # Needs '_id' mapped to string to be JSON serializable
    return [{**{k: v for k, v in c.items() if k != '_id'}, '_id': str(c['_id'])} for c in calls]

@app.delete('/api/calls/{call_id}')
async def delete_call(call_id: str, current_user: dict = Depends(get_current_user)):
    try:
        obj_id = ObjectId(call_id)
    except Exception:
        obj_id = call_id # Fallback if standard strings were stored instead of ObjectIds
        
    await db.call_history.delete_one({'_id': obj_id})
    return {'message': 'Deleted'}

# ==================== Socket.IO ====================

@sio.on('connect')
async def connect(sid, environ, auth):
    if not auth or 'token' not in auth: return False
    try:
        payload = jwt.decode(auth['token'], SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get('sub')
        active_users[user_id] = sid
        user_sockets[sid] = user_id
        await db.users.update_one({'user_id': user_id}, {'$set': {'online_status': 'online'}})
        await sio.emit('user_online', {'user_id': user_id}, skip_sid=sid)
        return True
    except: return False

@sio.on('disconnect')
async def disconnect(sid):
    if sid in user_sockets:
        user_id = user_sockets[sid]
        await db.users.update_one({'user_id': user_id}, {'$set': {'online_status': 'offline'}})
        active_users.pop(user_id, None) # Safe removal without throwing KeyError
        user_sockets.pop(sid, None)
        await sio.emit('user_offline', {'user_id': user_id})

@sio.on('join_conversation')
async def join_conversation(sid, data):
    if data.get('conversation_id'):
        await sio.enter_room(sid, data['conversation_id'])

@sio.on('send_message')
async def handle_message(sid, data):
    if sid not in user_sockets: return
    user_id = user_sockets[sid]
    
    is_spam, reason = spam_protection.check_spam(user_id)
    if is_spam:
        await sio.emit('error', {'message': reason}, to=sid)
        return

    conversation_id = data.get('conversation_id')
    conversation = await db.conversations.find_one({'conversation_id': conversation_id})
    if not conversation:
        await sio.emit('error', {'message': 'Conversation not found'}, to=sid)
        return

    other_id = next((p for p in conversation.get('participants', []) if p != user_id), None)
    if other_id:
        recipient = await db.users.find_one({'user_id': other_id})
        if recipient and user_id in recipient.get('blocked_users', []):
            await sio.emit('error', {'message': 'You cannot send messages to this user.'}, to=sid)
            return
        
        sender = await db.users.find_one({'user_id': user_id})
        if sender and other_id in sender.get('blocked_users', []):
            await sio.emit('error', {'message': 'You have blocked this user. Unblock to send messages.'}, to=sid)
            return

    content = data.get('content', '')
    msg_type = data.get('message_type', 'text')
    
    # Avoid scanning attachments/base64 blobs which might crash the spam filter
    if msg_type == 'text':
        spam_content, reason = is_spam_message(content)
        if spam_content:
            await sio.emit('error', {'message': reason}, to=sid)
            return

    encrypted_content = encrypt_message(content) if content else ''
    
    msg_id = f"msg_{datetime.now(timezone.utc).timestamp()}".replace('.', '_')
    doc = {
        'message_id': msg_id,
        'conversation_id': conversation_id,
        'sender_id': user_id,
        'content': encrypted_content,
        'message_type': msg_type,
        'file_name': data.get('file_name'),
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'read_by': [user_id]
    }
    
    await db.messages.insert_one(doc)
    await db.conversations.update_one(
        {'conversation_id': doc['conversation_id']}, 
        {'$set': {'updated_at': doc['timestamp']}}
    )
    
    response_doc = doc.copy()
    response_doc['content'] = content
    response_doc.pop('_id', None)
    
    await sio.emit('new_message', response_doc, room=doc['conversation_id'])

@sio.on('typing')
async def handle_typing(sid, data):
    if sid in user_sockets:
        await sio.emit('user_typing', {
            'user_id': user_sockets[sid],
            'conversation_id': data.get('conversation_id')
        }, room=data.get('conversation_id'), skip_sid=sid)

@sio.on('message_read')
async def handle_read(sid, data):
    if sid in user_sockets:
        await db.messages.update_one(
            {'message_id': data.get('message_id')}, 
            {'$addToSet': {'read_by': user_sockets[sid]}}
        )
        await sio.emit('message_read', {
            'message_id': data.get('message_id'), 
            'user_id': user_sockets[sid]
        }, room=data.get('conversation_id'))

@sio.on('call_user')
async def call_user(sid, data):
    if sid not in user_sockets: return
    callee_id = data.get('callee_id')
    if callee_id in active_users:
        caller = await db.users.find_one({'user_id': user_sockets[sid]}, {'_id':0})
        await sio.emit('incoming_call', {
            'caller': caller, 'caller_id': user_sockets[sid],
            'signal': data.get('signal'), 'call_type': data.get('call_type')
        }, room=active_users[callee_id])

@sio.on('accept_call')
async def accept_call(sid, data):
    if data.get('caller_id') in active_users:
        await sio.emit('call_accepted', {
            'callee_id': user_sockets[sid], 'signal': data.get('signal')
        }, room=active_users[data.get('caller_id')])

@sio.on('reject_call')
async def reject_call(sid, data):
    if data.get('caller_id') in active_users:
        await sio.emit('call_rejected', {}, room=active_users[data.get('caller_id')])

@sio.on('end_call')
async def end_call(sid, data):
    if sid not in user_sockets: return
    other_user_id = data.get('other_user_id')
    if other_user_id in active_users:
        await sio.emit('call_ended', {}, room=active_users[other_user_id])

app_asgi = socketio.ASGIApp(sio, app)
