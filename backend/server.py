from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import socketio
import logging

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from rate_limiter import limiter

from database import db, client
from socket_instance import sio, _allowed_origins

# Import to register Socket.IO events
import socket_events

# Import routers
from routers import auth, users, chat, push, ai

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info('Starting API server and initializing DB indexes...')
    
    # Create indexes for optimal querying
    try:
        await db.messages.create_index([("conversation_id", 1), ("timestamp", -1)])
        await db.messages.create_index("expires_at", expireAfterSeconds=0)
        await db.conversations.create_index("participants")
        await db.users.create_index("email", unique=True)
        await db.users.create_index("unique_id", unique=True)
        logger.info('MongoDB indexes verified/created successfully.')
    except Exception as e:
        logger.error(f"Failed to create MongoDB indexes: {e}")

    yield
    client.close()
    logger.info('MongoDB connection closed')

app = FastAPI(lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# GZip compression — compresses all responses >= 1000 bytes.
# Typically reduces JSON payload size by 60-80%, critical for mobile network performance.
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(chat.router)
app.include_router(push.router)
app.include_router(ai.router)

app_asgi = socketio.ASGIApp(sio, app)
