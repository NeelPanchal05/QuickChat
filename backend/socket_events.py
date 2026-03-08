import jwt
from datetime import datetime, timezone
from database import db
from utils import SECRET_KEY, ALGORITHM
from encryption import encrypt_message
from spam_protection import spam_protection, is_spam_message
from socket_instance import sio, active_users, user_sockets
from push_service import send_push_notification
from models import (
    SendMessageEvent, TypingEvent, MessageReadEvent, 
    MessagesReadBatchEvent, ReactionEvent, CallUserEvent, 
    AcceptCallEvent, RejectCallEvent, EndCallEvent
)
from pydantic import ValidationError
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
    
    try:
        validated_data = SendMessageEvent(**data)
    except ValidationError as e:
        await sio.emit('error', {'message': 'Invalid payload format'}, to=sid)
        return

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

    content = validated_data.content
    msg_type = validated_data.message_type
    
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
        'file_name': validated_data.file_name,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'read_by': [user_id],
        'reply_to': validated_data.reply_to,
        'reactions': []
    }
    
    await db.messages.insert_one(doc)
    await db.conversations.update_one(
        {'conversation_id': doc['conversation_id']}, 
        {'$set': {'updated_at': doc['timestamp']}}
    )
    
    response_doc = doc.copy()
    response_doc['content'] = content
    response_doc.pop('_id', None)
    temp_id = validated_data.temp_id
    if temp_id:
        response_doc['temp_id'] = temp_id
    
    await sio.emit('new_message', response_doc, room=doc['conversation_id'])

    if other_id and other_id not in active_users:
        sender_name = sender.get('real_name', 'Someone') if sender else 'Someone'
        await send_push_notification(other_id, {
            "title": sender_name,
            "body": content if msg_type == 'text' else f"Sent a {msg_type}",
            "data": { "url": f"/?chat={conversation_id}" } 
        })

@sio.on('typing')
async def handle_typing(sid, data):
    if sid in user_sockets:
        try:
            validated_data = TypingEvent(**data)
            await sio.emit('user_typing', {
                'user_id': user_sockets[sid],
                'conversation_id': validated_data.conversation_id
            }, room=validated_data.conversation_id, skip_sid=sid)
        except ValidationError:
            pass

@sio.on('message_read')
async def handle_read(sid, data):
    if sid in user_sockets:
        try:
            val = MessageReadEvent(**data)
            await db.messages.update_one(
                {'message_id': val.message_id}, 
                {'$addToSet': {'read_by': user_sockets[sid]}}
            )
            await sio.emit('message_read', {
                'message_id': val.message_id, 
                'user_id': user_sockets[sid]
            }, room=val.conversation_id)
        except ValidationError:
            pass

@sio.on('messages_read_batch')
async def handle_read_batch(sid, data):
    if sid in user_sockets:
        message_ids = data.get('message_ids', [])
        conversation_id = data.get('conversation_id')
        if message_ids:
            await db.messages.update_many(
                {'message_id': {'$in': message_ids}},
                {'$addToSet': {'read_by': user_sockets[sid]}}
            )
            await sio.emit('messages_read_batch', {
                'message_ids': message_ids,
                'user_id': user_sockets[sid]
            }, room=conversation_id)

@sio.on('add_reaction')
async def add_reaction(sid, data):
    if sid in user_sockets:
        try:
            val = ReactionEvent(**data)
            user_id = user_sockets[sid]
            reaction = {'user_id': user_id, 'emoji': val.emoji}
            await db.messages.update_one(
                {'message_id': val.message_id},
                {'$addToSet': {'reactions': reaction}}
            )
            await sio.emit('reaction_added', {
                'message_id': val.message_id,
                'user_id': user_id,
                'emoji': val.emoji
            }, room=val.conversation_id)
        except ValidationError:
            pass

@sio.on('remove_reaction')
async def remove_reaction(sid, data):
    if sid in user_sockets:
        try:
            val = ReactionEvent(**data)
            user_id = user_sockets[sid]
            reaction = {'user_id': user_id, 'emoji': val.emoji}
            await db.messages.update_one(
                {'message_id': val.message_id},
                {'$pull': {'reactions': reaction}}
            )
            await sio.emit('reaction_removed', {
                'message_id': val.message_id,
                'user_id': user_id,
                'emoji': val.emoji
            }, room=val.conversation_id)
        except ValidationError:
            pass

@sio.on('call_user')
async def call_user(sid, data):
    if sid not in user_sockets: return
    try:
        val = CallUserEvent(**data)
        if val.callee_id in active_users:
            caller = await db.users.find_one({'user_id': user_sockets[sid]}, {'_id':0})
            await sio.emit('incoming_call', {
                'caller': caller, 'caller_id': user_sockets[sid],
                'signal': val.signal, 'call_type': val.call_type
            }, room=active_users[val.callee_id])
    except ValidationError:
        pass

@sio.on('accept_call')
async def accept_call(sid, data):
    try:
        val = AcceptCallEvent(**data)
        if val.caller_id in active_users:
            await sio.emit('call_accepted', {
                'callee_id': user_sockets[sid], 'signal': val.signal
            }, room=active_users[val.caller_id])
    except ValidationError:
        pass

@sio.on('reject_call')
async def reject_call(sid, data):
    try:
        val = RejectCallEvent(**data)
        if val.caller_id in active_users:
            await sio.emit('call_rejected', {}, room=active_users[val.caller_id])
    except ValidationError:
        pass

@sio.on('end_call')
async def end_call(sid, data):
    if sid not in user_sockets: return
    try:
        val = EndCallEvent(**data)
        if val.other_user_id in active_users:
            await sio.emit('call_ended', {}, room=active_users[val.other_user_id])
    except ValidationError:
        pass
