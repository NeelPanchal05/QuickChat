from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File
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
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    ping_timeout=60,
    ping_interval=25
)

# FastAPI app
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=['*'],
    allow_headers=['*'],
)

security = HTTPBearer()

# In-memory storage for active users and WebRTC signaling
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
    login: str  # email or username
    password: str

class UserUpdate(BaseModel):
    real_name: Optional[str] = None
    profile_photo: Optional[str] = None

class ConversationCreate(BaseModel):
    participant_id: str

class MessageSend(BaseModel):
    conversation_id: str
    content: str
    message_type: str = 'text'

class MessageRead(BaseModel):
    conversation_id: str
    message_id: str

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
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail='Token expired')
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail='Invalid token')

async def send_otp_email(email: str, otp: str):
    try:
        logger.info(f'Attempting to send OTP to {email}')
        
        # Create email message
        message = MIMEMultipart('alternative')
        message['Subject'] = 'QuickChat - Your OTP Code'
        message['From'] = SENDER_EMAIL
        message['To'] = email
        
        html_content = f'''
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #7000FF;">Welcome to QuickChat!</h2>
            <p>Your verification code is:</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px;">
                {otp}
            </div>
            <p style="color: #666; font-size: 14px; margin-top: 20px;">This code will expire in 10 minutes.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
        </div>
        '''
        
        part = MIMEText(html_content, 'html')
        message.attach(part)
        
        # Send via Gmail SMTP
        def send_email():
            with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
                server.login(GMAIL_EMAIL, GMAIL_PASSWORD)
                server.sendmail(SENDER_EMAIL, [email], message.as_string())
        
        await asyncio.to_thread(send_email)
        logger.info(f'OTP email sent successfully to {email}')
        return True
        
    except Exception as e:
        logger.error(f'Failed to send OTP email to {email}: {type(e).__name__}: {str(e)}')
        import traceback
        logger.error(traceback.format_exc())
        return False

# ==================== Auth Endpoints ====================

@app.post('/api/auth/register')
async def register(user_data: UserRegister):
    # Check if user already exists
    existing = await db.users.find_one({
        '$or': [
            {'email': user_data.email},
            {'username': user_data.username}
        ]
    })
    
    if existing:
        raise HTTPException(status_code=400, detail='User already exists')
    
    # Generate OTP
    otp = generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    # Store OTP
    await db.otps.delete_many({'email': user_data.email})  # Remove old OTPs
    await db.otps.insert_one({
        'email': user_data.email,
        'otp': otp,
        'expires_at': expires_at.isoformat()
    })
    
    # Store user data temporarily
    await db.pending_users.delete_many({'email': user_data.email})
    await db.pending_users.insert_one({
        'email': user_data.email,
        'username': user_data.username,
        'password_hash': hash_password(user_data.password),
        'real_name': user_data.real_name,
        'unique_id': user_data.unique_id,
        'created_at': datetime.now(timezone.utc).isoformat()
    })
    
    # Send OTP email
    email_sent = await send_otp_email(user_data.email, otp)
    
    return {
        'message': 'OTP sent to your email',
        'email': user_data.email,
        'otp_sent': email_sent
    }

@app.post('/api/auth/verify-otp')
async def verify_otp(data: OTPVerify):
    # Check OTP
    otp_doc = await db.otps.find_one({'email': data.email})
    if not otp_doc:
        raise HTTPException(status_code=400, detail='OTP not found')
    
    if datetime.fromisoformat(otp_doc['expires_at']) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail='OTP expired')
    
    if otp_doc['otp'] != data.otp:
        raise HTTPException(status_code=400, detail='Invalid OTP')
    
    # Get pending user data
    pending_user = await db.pending_users.find_one({'email': data.email})
    if not pending_user:
        raise HTTPException(status_code=400, detail='User data not found')
    
    # Create user
    user_id = f"user_{datetime.now(timezone.utc).timestamp()}".replace('.', '_')
    user_doc = {
        'user_id': user_id,
        'email': pending_user['email'],
        'username': pending_user['username'],
        'password_hash': pending_user['password_hash'],
        'real_name': pending_user['real_name'],
        'unique_id': pending_user['unique_id'],
        'profile_photo': '',
        'online_status': 'offline',
        'verified': True,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    # Clean up
    await db.otps.delete_many({'email': data.email})
    await db.pending_users.delete_many({'email': data.email})
    
    # Create token
    token = create_access_token({'sub': user_id})
    
    user_response = {k: v for k, v in user_doc.items() if k not in ['_id', 'password_hash']}
    
    return {
        'token': token,
        'user': user_response
    }

@app.post('/api/auth/login')
async def login(data: UserLogin):
    # Find user
    user = await db.users.find_one({
        '$or': [
            {'email': data.login},
            {'username': data.login}
        ]
    })
    
    if not user or not verify_password(data.password, user['password_hash']):
        raise HTTPException(status_code=401, detail='Invalid credentials')
    
    # Create token
    token = create_access_token({'sub': user['user_id']})
    
    user_response = {k: v for k, v in user.items() if k not in ['_id', 'password_hash']}
    
    return {
        'token': token,
        'user': user_response
    }

@app.get('/api/auth/me')
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

# ==================== User Endpoints ====================

@app.get('/api/users/search')
async def search_users(query: str, current_user: dict = Depends(get_current_user)):
    users = await db.users.find({
        '$and': [
            {'user_id': {'$ne': current_user['user_id']}},
            {
                '$or': [
                    {'username': {'$regex': query, '$options': 'i'}},
                    {'real_name': {'$regex': query, '$options': 'i'}}
                ]
            }
        ]
    }, {'_id': 0, 'password_hash': 0}).limit(20).to_list(20)
    
    return users

@app.get('/api/users/{user_id}')
async def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({'user_id': user_id}, {'_id': 0, 'password_hash': 0})
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    return user

@app.put('/api/users/profile')
async def update_profile(data: UserUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if update_data:
        await db.users.update_one(
            {'user_id': current_user['user_id']},
            {'$set': update_data}
        )
    
    updated_user = await db.users.find_one(
        {'user_id': current_user['user_id']},
        {'_id': 0, 'password_hash': 0}
    )
    
    return updated_user

# ==================== Conversation Endpoints ====================

@app.post('/api/conversations')
async def create_conversation(data: ConversationCreate, current_user: dict = Depends(get_current_user)):
    # Check if conversation already exists
    existing = await db.conversations.find_one({
        'type': 'direct',
        'participants': {'$all': [current_user['user_id'], data.participant_id]}
    })
    
    if existing:
        conversation = {k: v for k, v in existing.items() if k != '_id'}
        return conversation
    
    # Create new conversation
    conversation_id = f"conv_{datetime.now(timezone.utc).timestamp()}".replace('.', '_')
    conversation_doc = {
        'conversation_id': conversation_id,
        'type': 'direct',
        'participants': [current_user['user_id'], data.participant_id],
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat(),
        'pinned_by': [],
        'archived_by': []
    }
    
    await db.conversations.insert_one(conversation_doc)
    
    return {k: v for k, v in conversation_doc.items() if k != '_id'}

@app.get('/api/conversations')
async def get_conversations(current_user: dict = Depends(get_current_user)):
    conversations = await db.conversations.find({
        'participants': current_user['user_id'],
        'archived_by': {'$ne': current_user['user_id']}
    }, {'_id': 0}).sort('updated_at', -1).to_list(100)
    
    # Enrich with participant info and last message
    for conv in conversations:
        # Get other participant
        other_id = [p for p in conv['participants'] if p != current_user['user_id']][0]
        other_user = await db.users.find_one(
            {'user_id': other_id},
            {'_id': 0, 'user_id': 1, 'username': 1, 'real_name': 1, 'profile_photo': 1, 'online_status': 1}
        )
        conv['other_user'] = other_user
        
        # Get last message
        last_msg = await db.messages.find_one(
            {'conversation_id': conv['conversation_id']},
            {'_id': 0},
            sort=[('timestamp', -1)]
        )
        conv['last_message'] = last_msg
        conv['is_pinned'] = current_user['user_id'] in conv.get('pinned_by', [])
    
    return conversations

@app.get('/api/conversations/{conversation_id}/messages')
async def get_messages(
    conversation_id: str,
    limit: int = 50,
    before: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    # Verify user is participant
    conversation = await db.conversations.find_one({
        'conversation_id': conversation_id,
        'participants': current_user['user_id']
    })
    
    if not conversation:
        raise HTTPException(status_code=404, detail='Conversation not found')
    
    # Build query
    query = {'conversation_id': conversation_id}
    if before:
        query['timestamp'] = {'$lt': before}
    
    messages = await db.messages.find(
        query,
        {'_id': 0}
    ).sort('timestamp', -1).limit(limit).to_list(limit)
    
    messages.reverse()  # Return oldest first
    
    return messages

@app.post('/api/conversations/{conversation_id}/pin')
async def pin_conversation(conversation_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.conversations.update_one(
        {
            'conversation_id': conversation_id,
            'participants': current_user['user_id']
        },
        {'$addToSet': {'pinned_by': current_user['user_id']}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='Conversation not found')
    
    return {'message': 'Conversation pinned'}

@app.delete('/api/conversations/{conversation_id}/pin')
async def unpin_conversation(conversation_id: str, current_user: dict = Depends(get_current_user)):
    await db.conversations.update_one(
        {'conversation_id': conversation_id},
        {'$pull': {'pinned_by': current_user['user_id']}}
    )
    
    return {'message': 'Conversation unpinned'}

@app.delete('/api/conversations/{conversation_id}')
async def delete_conversation(conversation_id: str, current_user: dict = Depends(get_current_user)):
    # Archive for this user
    await db.conversations.update_one(
        {'conversation_id': conversation_id},
        {'$addToSet': {'archived_by': current_user['user_id']}}
    )
    
    return {'message': 'Conversation deleted'}

# ==================== Archive/Block Endpoints ====================

@app.put('/api/conversations/{conversation_id}/archive')
async def archive_conversation(conversation_id: str, archived: bool = True, current_user: dict = Depends(get_current_user)):
    if archived:
        await db.conversations.update_one(
            {'conversation_id': conversation_id},
            {'$addToSet': {'archived_by': current_user['user_id']}}
        )
    else:
        await db.conversations.update_one(
            {'conversation_id': conversation_id},
            {'$pull': {'archived_by': current_user['user_id']}}
        )
    
    return {'message': 'Conversation updated'}

@app.get('/api/conversations/archived')
async def get_archived_conversations(current_user: dict = Depends(get_current_user)):
    conversations = await db.conversations.find({
        'participants': current_user['user_id'],
        'archived_by': current_user['user_id']
    }).to_list(length=None)
    
    result = []
    for conv in conversations:
        conv['_id'] = str(conv.get('_id', ''))
        result.append({k: v for k, v in conv.items() if k != '_id'})
    
    return result

@app.post('/api/users/block/{user_id}')
async def block_user(user_id: str, current_user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {'user_id': current_user['user_id']},
        {'$addToSet': {'blocked_users': user_id}}
    )
    
    return {'message': 'User blocked'}

@app.post('/api/users/unblock/{user_id}')
async def unblock_user(user_id: str, current_user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {'user_id': current_user['user_id']},
        {'$pull': {'blocked_users': user_id}}
    )
    
    return {'message': 'User unblocked'}

@app.get('/api/users/blocked')
async def get_blocked_users(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one(
        {'user_id': current_user['user_id']},
        {'blocked_users': 1}
    )
    
    blocked_user_ids = user.get('blocked_users', []) if user else []
    blocked_users = await db.users.find(
        {'user_id': {'$in': blocked_user_ids}},
        {'_id': 0, 'password_hash': 0}
    ).to_list(length=None)
    
    return blocked_users

# ==================== Call History Endpoints ====================

@app.get('/api/calls/history')
async def get_call_history(current_user: dict = Depends(get_current_user)):
    calls = await db.call_history.find({
        '$or': [
            {'caller_id': current_user['user_id']},
            {'callee_id': current_user['user_id']}
        ]
    }).sort('timestamp', -1).to_list(length=50)
    
    result = []
    for call in calls:
        call['_id'] = str(call.get('_id', ''))
        result.append({k: v for k, v in call.items() if k != '_id'})
    
    return result

@app.delete('/api/calls/{call_id}')
async def delete_call(call_id: str, current_user: dict = Depends(get_current_user)):
    await db.call_history.delete_one({'_id': call_id})
    
    return {'message': 'Call deleted'}

# ==================== Poll Endpoints ====================

class Poll(BaseModel):
    conversation_id: str
    question: str
    options: List[str]
    allow_multiple: bool = False

@app.post('/api/polls')
async def create_poll(poll_data: Poll, current_user: dict = Depends(get_current_user)):
    poll = {
        'conversation_id': poll_data.conversation_id,
        'creator_id': current_user['user_id'],
        'question': poll_data.question,
        'options': [{'text': opt, 'votes': []} for opt in poll_data.options],
        'allow_multiple': poll_data.allow_multiple,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.polls.insert_one(poll)
    poll['_id'] = str(result.inserted_id)
    
    return poll

@app.post('/api/polls/{poll_id}/vote')
async def vote_poll(poll_id: str, option_index: int, current_user: dict = Depends(get_current_user)):
    await db.polls.update_one(
        {'_id': poll_id},
        {'$addToSet': {f'options.{option_index}.votes': current_user['user_id']}}
    )
    
    return {'message': 'Vote recorded'}

# ==================== Message Endpoints ====================

@app.put('/api/messages/{message_id}/read')
async def mark_message_read(message_id: str, current_user: dict = Depends(get_current_user)):
    await db.messages.update_one(
        {'message_id': message_id},
        {'$addToSet': {'read_by': current_user['user_id']}}
    )
    
    return {'message': 'Message marked as read'}

@app.delete('/api/messages/{message_id}')
async def delete_message(message_id: str, current_user: dict = Depends(get_current_user)):
    await db.messages.delete_one({
        'message_id': message_id,
        'sender_id': current_user['user_id']
    })
    
    return {'message': 'Message deleted'}

# ==================== Socket.IO Events ====================

@sio.on('connect')
async def connect(sid, environ, auth):
    logger.info(f'Client connected: {sid}')
    
    # Authenticate
    if not auth or 'token' not in auth:
        return False
    
    try:
        payload = jwt.decode(auth['token'], SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get('sub')
        
        if user_id:
            active_users[user_id] = sid
            user_sockets[sid] = user_id
            
            # Update online status
            await db.users.update_one(
                {'user_id': user_id},
                {'$set': {'online_status': 'online'}}
            )
            
            # Notify contacts
            await sio.emit('user_online', {'user_id': user_id}, skip_sid=sid)
            
            logger.info(f'User {user_id} authenticated and online')
            return True
    except Exception as e:
        logger.error(f'Auth failed: {str(e)}')
        return False

@sio.on('disconnect')
async def disconnect(sid):
    logger.info(f'Client disconnected: {sid}')
    
    if sid in user_sockets:
        user_id = user_sockets[sid]
        
        # Update offline status
        await db.users.update_one(
            {'user_id': user_id},
            {'$set': {'online_status': 'offline'}}
        )
        
        # Clean up
        del active_users[user_id]
        del user_sockets[sid]
        
        # Notify contacts
        await sio.emit('user_offline', {'user_id': user_id})
        
        logger.info(f'User {user_id} offline')

@sio.on('join_conversation')
async def join_conversation(sid, data):
    conversation_id = data.get('conversation_id')
    if conversation_id:
        sio.enter_room(sid, conversation_id)
        logger.info(f'{sid} joined conversation {conversation_id}')

@sio.on('leave_conversation')
async def leave_conversation(sid, data):
    conversation_id = data.get('conversation_id')
    if conversation_id:
        sio.leave_room(sid, conversation_id)

@sio.on('send_message')
async def handle_message(sid, data):
    if sid not in user_sockets:
        return
    
    user_id = user_sockets[sid]
    conversation_id = data.get('conversation_id')
    content = data.get('content')
    message_type = data.get('message_type', 'text')
    
    # Create message
    message_id = f"msg_{datetime.now(timezone.utc).timestamp()}".replace('.', '_')
    message_doc = {
        'message_id': message_id,
        'conversation_id': conversation_id,
        'sender_id': user_id,
        'content': content,
        'message_type': message_type,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'read_by': [user_id]
    }
    
    await db.messages.insert_one(message_doc)
    
    # Update conversation
    await db.conversations.update_one(
        {'conversation_id': conversation_id},
        {'$set': {'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    # Emit to conversation room
    message_response = {k: v for k, v in message_doc.items() if k != '_id'}
    await sio.emit('new_message', message_response, room=conversation_id)

@sio.on('typing')
async def handle_typing(sid, data):
    if sid not in user_sockets:
        return
    
    user_id = user_sockets[sid]
    conversation_id = data.get('conversation_id')
    
    await sio.emit('user_typing', {
        'user_id': user_id,
        'conversation_id': conversation_id
    }, room=conversation_id, skip_sid=sid)

@sio.on('message_read')
async def handle_message_read(sid, data):
    if sid not in user_sockets:
        return
    
    user_id = user_sockets[sid]
    message_id = data.get('message_id')
    conversation_id = data.get('conversation_id')
    
    # Update message
    await db.messages.update_one(
        {'message_id': message_id},
        {'$addToSet': {'read_by': user_id}}
    )
    
    # Notify conversation
    await sio.emit('message_read', {
        'message_id': message_id,
        'user_id': user_id
    }, room=conversation_id)

# ==================== WebRTC Signaling ====================

@sio.on('call_user')
async def call_user(sid, data):
    if sid not in user_sockets:
        return
    
    caller_id = user_sockets[sid]
    callee_id = data.get('callee_id')
    signal_data = data.get('signal')
    call_type = data.get('call_type', 'video')  # video or audio
    
    if callee_id in active_users:
        callee_sid = active_users[callee_id]
        
        # Get caller info
        caller = await db.users.find_one(
            {'user_id': caller_id},
            {'_id': 0, 'user_id': 1, 'username': 1, 'real_name': 1, 'profile_photo': 1}
        )
        
        await sio.emit('incoming_call', {
            'caller': caller,
            'caller_id': caller_id,
            'signal': signal_data,
            'call_type': call_type
        }, room=callee_sid)
        
        logger.info(f'{call_type} call from {caller_id} to {callee_id}')

@sio.on('accept_call')
async def accept_call(sid, data):
    if sid not in user_sockets:
        return
    
    callee_id = user_sockets[sid]
    caller_id = data.get('caller_id')
    signal_data = data.get('signal')
    
    if caller_id in active_users:
        caller_sid = active_users[caller_id]
        await sio.emit('call_accepted', {
            'callee_id': callee_id,
            'signal': signal_data
        }, room=caller_sid)

@sio.on('reject_call')
async def reject_call(sid, data):
    if sid not in user_sockets:
        return
    
    callee_id = user_sockets[sid]
    caller_id = data.get('caller_id')
    
    if caller_id in active_users:
        caller_sid = active_users[caller_id]
        await sio.emit('call_rejected', {'callee_id': callee_id}, room=caller_sid)

@sio.on('end_call')
async def end_call(sid, data):
    if sid not in user_sockets:
        return
    
    user_id = user_sockets[sid]
    other_user_id = data.get('other_user_id')
    
    if other_user_id in active_users:
        other_sid = active_users[other_user_id]
        await sio.emit('call_ended', {'user_id': user_id}, room=other_sid)

@sio.on('ice_candidate')
async def ice_candidate(sid, data):
    if sid not in user_sockets:
        return
    
    target_id = data.get('target_id')
    candidate = data.get('candidate')
    
    if target_id in active_users:
        target_sid = active_users[target_id]
        await sio.emit('ice_candidate', {'candidate': candidate}, room=target_sid)

# Health check
@app.get('/api/health')
async def health():
    return {'status': 'healthy', 'timestamp': datetime.now(timezone.utc).isoformat()}

# Wrap FastAPI app with Socket.IO
app_asgi = socketio.ASGIApp(sio, app)

@app.on_event('shutdown')
async def shutdown_db_client():
    client.close()