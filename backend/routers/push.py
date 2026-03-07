from fastapi import APIRouter, Depends, Body
from typing import Dict, Any

from database import db
from dependencies import get_current_user
from utils import VAPID_PUBLIC_KEY

router = APIRouter(prefix="/api/push", tags=["Push Notifications"])

@router.get('/vapid_public_key')
async def get_vapid_key():
    return {"public_key": VAPID_PUBLIC_KEY}

@router.post('/subscribe')
async def subscribe(subscription: Dict[str, Any] = Body(...), current_user: dict = Depends(get_current_user)):
    await db.push_subscriptions.update_one(
        {"user_id": current_user["user_id"], "endpoint": subscription.get("endpoint")},
        {"$set": {
            "user_id": current_user["user_id"],
            "subscription": subscription
        }},
        upsert=True
    )
    return {"message": "Subscribed successfully"}
