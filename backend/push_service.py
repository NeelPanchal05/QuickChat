import json
import logging
import asyncio
from pywebpush import webpush, WebPushException
from database import db
from utils import VAPID_PRIVATE_KEY, VAPID_CLAIMS_EMAIL

logger = logging.getLogger(__name__)

async def send_push_notification(user_id: str, payload: dict):
    if not VAPID_PRIVATE_KEY:
        return
        
    subscriptions = await db.push_subscriptions.find({"user_id": user_id}).to_list(None)
    for sub in subscriptions:
        try:
            await asyncio.to_thread(
                webpush,
                subscription_info=sub["subscription"],
                data=json.dumps(payload),
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": VAPID_CLAIMS_EMAIL}
            )
        except WebPushException as ex:
            logger.error(f"Push failed: {repr(ex)}")
            # If subscription is dead, remove it
            if ex.response and ex.response.status_code in [404, 410]:
                await db.push_subscriptions.delete_one({"_id": sub["_id"]})
        except Exception as e:
            logger.error(f"Push error: {e}")
