import asyncio
import logging
import sys
import os

# Add parent directory to sys.path so we can import 'database'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import db, client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def setup():
    logger.info('Starting database index setup...')
    try:
        await db.users.create_index('user_id', unique=True)
        await db.users.create_index('email', unique=True)
        await db.messages.create_index('conversation_id')
        await db.messages.create_index('timestamp')
        await db.conversations.create_index('participants')
        await db.conversations.create_index('updated_at')
        await db.otps.create_index('email')
        logger.info('Database indexes created successfully')
    except Exception as e:
        logger.error(f'Failed to create indexes: {e}')
    finally:
        client.close()
        logger.info('MongoDB connection closed')

if __name__ == '__main__':
    asyncio.run(setup())
