from fastapi import APIRouter, HTTPException, Depends, Body, Request
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId

from database import db
from models import ConversationCreate
from dependencies import get_current_user
from spam_protection import spam_protection
from encryption import encrypt_message, decrypt_message
from socket_instance import sio, active_users
from push_service import send_push_notification
from rate_limiter import limiter

router = APIRouter(prefix="/api", tags=["Chat"])

@router.post('/conversations')
@limiter.limit("20/minute")
async def create_conversation(request: Request, data: ConversationCreate, current_user: dict = Depends(get_current_user)):
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

@router.get('/conversations')
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

@router.get('/conversations/{conversation_id}/messages')
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
        # Note: messages are sorted by timestamp DESCending. 
        # So "before" means older than the provided timestamp.
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

@router.post('/conversations/{conversation_id}/messages')
@limiter.limit("60/minute")
async def save_attachment_message(
    request: Request,
    conversation_id: str, 
    content: str = Body(...), 
    message_type: str = Body(...), 
    file_name: str = Body(default=None),
    temp_id: Optional[str] = Body(default=None),
    reply_to: Optional[str] = Body(default=None),
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
        'read_by': [current_user['user_id']],
        'reply_to': reply_to,
        'reactions': []
    }
    await db.messages.insert_one(doc)
    await db.conversations.update_one({'conversation_id': conversation_id}, {'$set': {'updated_at': doc['timestamp']}})
    
    response_doc = doc.copy()
    response_doc['content'] = content
    response_doc.pop('_id', None)
    if temp_id:
        response_doc['temp_id'] = temp_id
    await sio.emit('new_message', response_doc, room=conversation_id)
    
    conv = await db.conversations.find_one({'conversation_id': conversation_id})
    if conv:
        other_id = next((p for p in conv.get('participants', []) if p != current_user['user_id']), None)
        if other_id and other_id not in active_users:
            sender_name = current_user.get('real_name', 'Someone')
            await send_push_notification(other_id, {
                "title": sender_name,
                "body": f"Sent a {message_type}",
                "data": { "url": f"/?chat={conversation_id}" } 
            })

    return {k: v for k, v in doc.items() if k != '_id'}

@router.put('/conversations/{conversation_id}/archive')
async def archive_conversation(conversation_id: str, archived: bool = Body(..., embed=True), current_user: dict = Depends(get_current_user)):
    op = '$addToSet' if archived else '$pull'
    await db.conversations.update_one({'conversation_id': conversation_id}, {op: {'archived_by': current_user['user_id']}})
    return {'message': 'Updated'}

@router.get('/conversations/archived')
async def get_archived(current_user: dict = Depends(get_current_user)):
    convs = await db.conversations.find({
        'participants': current_user['user_id'],
        'archived_by': current_user['user_id']
    }, {'_id': 0}).to_list(None)
    return convs

@router.delete('/conversations/{conversation_id}')
async def delete_conversation(conversation_id: str, current_user: dict = Depends(get_current_user)):
    conv = await db.conversations.find_one({'conversation_id': conversation_id, 'participants': current_user['user_id']})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    await db.conversations.delete_one({'conversation_id': conversation_id})
    await db.messages.delete_many({'conversation_id': conversation_id})
    return {'message': 'Deleted'}

@router.delete('/conversations/{conversation_id}/messages')
async def clear_messages(conversation_id: str, current_user: dict = Depends(get_current_user)):
    conv = await db.conversations.find_one({'conversation_id': conversation_id, 'participants': current_user['user_id']})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    await db.messages.delete_many({'conversation_id': conversation_id})
    return {'message': 'Chat cleared'}

@router.post('/conversations/{conversation_id}/pin')
async def pin_conv(conversation_id: str, current_user: dict = Depends(get_current_user)):
    await db.conversations.update_one({'conversation_id': conversation_id}, {'$addToSet': {'pinned_by': current_user['user_id']}})
    return {'message': 'Pinned'}

@router.delete('/conversations/{conversation_id}/pin')
async def unpin_conv(conversation_id: str, current_user: dict = Depends(get_current_user)):
    await db.conversations.update_one({'conversation_id': conversation_id}, {'$pull': {'pinned_by': current_user['user_id']}})
    return {'message': 'Unpinned'}

# ==================== Call History ====================

@router.get('/calls/history')
async def get_call_history(current_user: dict = Depends(get_current_user)):
    calls = await db.call_history.find({
        '$or': [{'caller_id': current_user['user_id']}, {'callee_id': current_user['user_id']}]
    }).sort('timestamp', -1).limit(50).to_list(50)
    
    return [{**{k: v for k, v in c.items() if k != '_id'}, '_id': str(c['_id'])} for c in calls]

@router.delete('/calls/{call_id}')
async def delete_call(call_id: str, current_user: dict = Depends(get_current_user)):
    try:
        obj_id = ObjectId(call_id)
    except Exception:
        obj_id = call_id
        
    await db.call_history.delete_one({'_id': obj_id})
    return {'message': 'Deleted'}
