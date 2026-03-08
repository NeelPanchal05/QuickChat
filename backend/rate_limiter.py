from slowapi import Limiter
from slowapi.util import get_remote_address
import os
import redis
import logging

logger = logging.getLogger(__name__)

# Try connecting to Redis
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
redis_client = None

try:
    client = redis.from_url(REDIS_URL, socket_timeout=1, socket_connect_timeout=1)
    if client.ping():
        redis_client = client
        logger.info("Connected to Redis for rate limiting.")
except Exception as e:
    logger.warning(f"Could not connect to Redis: {e}. Falling back to in-memory rate limiting.")

if redis_client:
    limiter = Limiter(key_func=get_remote_address, storage_uri=REDIS_URL)
else:
    limiter = Limiter(key_func=get_remote_address)
