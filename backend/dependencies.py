from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from database import db
from utils import SECRET_KEY, ALGORITHM

security = HTTPBearer()

# Fields excluded from the auth token payload — large or sensitive fields not needed for auth checks.
# profile_photo can be a base64 blob (100-500KB) — it would be fetched on EVERY API request otherwise.
_USER_AUTH_PROJECTION = {
    '_id': 0,
    'profile_photo': 0,
    'bio': 0,
    'password_hash': 0,
}

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get('sub')
        if not user_id:
            raise HTTPException(status_code=401, detail='Invalid token')
        
        user = await db.users.find_one({'user_id': user_id}, _USER_AUTH_PROJECTION)
        if not user:
            raise HTTPException(status_code=401, detail='User not found')
        
        if 'blocked_users' not in user:
            user['blocked_users'] = []
            
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail='Invalid token')
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail='Invalid token')
