from fastapi import APIRouter, HTTPException, Depends
from database import db
from models import UserUpdate, InviteFriend
from dependencies import get_current_user
from utils import send_email_func

router = APIRouter(prefix="/api/users", tags=["Users"])

@router.get('/search')
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

@router.put('/profile')
async def update_profile(data: UserUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.users.update_one({'user_id': current_user['user_id']}, {'$set': update_data})
    return await db.users.find_one({'user_id': current_user['user_id']}, {'_id': 0, 'password_hash': 0})

@router.post('/invite')
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

@router.post('/block/{user_id}')
async def block_user(user_id: str, current_user: dict = Depends(get_current_user)):
    await db.users.update_one({'user_id': current_user['user_id']}, {'$addToSet': {'blocked_users': user_id}})
    return {'message': 'User blocked'}

@router.post('/unblock/{user_id}')
async def unblock_user(user_id: str, current_user: dict = Depends(get_current_user)):
    await db.users.update_one({'user_id': current_user['user_id']}, {'$pull': {'blocked_users': user_id}})
    return {'message': 'User unblocked'}

@router.get('/blocked')
async def get_blocked_users(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({'user_id': current_user['user_id']})
    blocked_ids = user.get('blocked_users', [])
    return await db.users.find({'user_id': {'$in': blocked_ids}}, {'_id': 0, 'password_hash': 0}).to_list(None)
