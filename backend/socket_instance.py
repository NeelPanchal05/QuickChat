import socketio
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

_cors_env = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000')
_allowed_origins = [o.strip() for o in _cors_env.split(',') if o.strip()]

redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
try:
    mgr = socketio.AsyncRedisManager(redis_url)
except Exception:
    mgr = None
    print("Warning: Redis not configured or not available. Running socket.io without external manager.")

sio = socketio.AsyncServer(
    async_mode='asgi',
    client_manager=mgr,
    cors_allowed_origins='*',
    ping_timeout=60,
    ping_interval=25
)

# In-memory storage for sockets
active_users = {}  # {user_id: socket_id}
user_sockets = {}  # {socket_id: user_id}
