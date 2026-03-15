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
from cloudinary_utils import upload_to_cdn, is_cdn_enabled

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
    user_id = current_user['user_id']
    
    pipeline = [
        # Step 1: Filter conversations this user belongs to (not archived)
        {
            '$match': {
                'participants': user_id,
                'archived_by': {'$ne': user_id}
            }
        },
        # Step 2: Sort newest first
        { '$sort': { 'updated_at': -1 } },
        { '$limit': 100 },

        # Step 3: Join the last message in each conversation
        {
            '$lookup': {
                'from': 'messages',
                'let': { 'conv_id': '$conversation_id' },
                'pipeline': [
                    { '$match': { '$expr': { '$eq': ['$conversation_id', '$$conv_id'] } } },
                    { '$sort': { 'timestamp': -1 } },
                    { '$limit': 1 },
                    { '$project': { '_id': 0 } }
                ],
                'as': 'last_message_arr'
            }
        },
        # Step 4: Flatten last_message array → single object or null
        {
            '$addFields': {
                'last_message': { '$arrayElemAt': ['$last_message_arr', 0] }
            }
        },
        { '$unset': 'last_message_arr' },
        { '$project': { '_id': 0 } }
    ]

    convs = await db.conversations.aggregate(pipeline).to_list(100)

    # Collect all unique other-user IDs in one pass
    other_ids = []
    for conv in convs:
        participants = conv.get('participants', [])
        others = [p for p in participants if p != user_id]
        other_id = others[0] if others else user_id
        conv['_other_id'] = other_id
        if other_id not in other_ids:
            other_ids.append(other_id)

    # Fetch all other users in a SINGLE query
    users_cursor = db.users.find(
        {'user_id': {'$in': other_ids}},
        {'_id': 0, 'user_id': 1, 'username': 1, 'real_name': 1, 'profile_photo': 1, 'online_status': 1, 'public_key': 1}
    )
    users_list = await users_cursor.to_list(len(other_ids))
    users_map = {u['user_id']: u for u in users_list}

    # Assemble final response
    for conv in convs:
        other_id = conv.pop('_other_id')
        conv['other_user'] = users_map.get(other_id)
        conv['is_pinned'] = user_id in conv.get('pinned_by', [])

        # Decrypt last message preview
        last_msg = conv.get('last_message')
        if last_msg and last_msg.get('content'):
            try:
                last_msg['content'] = decrypt_message(last_msg['content'])
            except Exception:
                pass

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
    expires_in: Optional[int] = Body(default=0),
    current_user: dict = Depends(get_current_user)
):
    is_spam, reason = spam_protection.check_spam(current_user['user_id'])
    if is_spam:
        raise HTTPException(status_code=429, detail=reason)

    # ---- CDN Upload (Phase 13) -------------------------------------------
    # If Cloudinary is configured, upload media to CDN and store the URL.
    # The content going into the DB is either a CDN URL or the original (encrypted) data URI.
    stored_content = content
    is_media_type = message_type and message_type not in ("text", "location", "poll")
    
    if is_media_type and is_cdn_enabled() and content.startswith("data:"):
        # Content at this point is already E2EE-encrypted on the frontend.
        # We decode it to get the original data URI and upload to CDN.
        # Note: If E2EE is enabled, we're uploading the encrypted ciphertext as a binary blob.
        # The CDN URL is safe to expose because only users with the correct key can decrypt.
        cdn_url = await upload_to_cdn(content, file_name=file_name)
        if cdn_url:
            stored_content = cdn_url  # Replace data URI with CDN URL
    # ---- End CDN Upload ----------------------------------------------------

    encrypted_content = encrypt_message(stored_content) if stored_content else ''
    
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
        'reactions': [],
        'is_edited': False,
        'is_deleted': False,
        'expires_in': expires_in
    }
    await db.messages.insert_one(doc)
    await db.conversations.update_one({'conversation_id': conversation_id}, {'$set': {'updated_at': doc['timestamp']}})
    
    response_doc = doc.copy()
    response_doc['content'] = stored_content  # Return stored content (URL or original data)
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
    }, {'_id': 0}).to_list(1000)
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
