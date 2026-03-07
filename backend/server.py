from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
import socketio
import logging

from database import db, client
from socket_instance import sio, _allowed_origins

# Import to register Socket.IO events
import socket_events

# Import routers
from routers import auth, users, chat

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.users.create_index('user_id', unique=True)
    await db.users.create_index('email', unique=True)
    await db.messages.create_index('conversation_id')
    await db.messages.create_index('timestamp')
    await db.conversations.create_index('participants')
    await db.conversations.create_index('updated_at')
    await db.otps.create_index('email')
    logger.info('Database indexes created successfully')
    yield
    client.close()
    logger.info('MongoDB connection closed')

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+):3000$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(chat.router)

app_asgi = socketio.ASGIApp(sio, app)
