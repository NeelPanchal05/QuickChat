import os
import random
import string
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import jwt
import bcrypt
import asyncio
from datetime import datetime, timedelta, timezone
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configuration
SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
GMAIL_EMAIL = os.getenv('GMAIL_EMAIL', '')
GMAIL_PASSWORD = os.getenv('GMAIL_PASSWORD', '')
SENDER_EMAIL = os.getenv('SENDER_EMAIL', GMAIL_EMAIL)

VAPID_PUBLIC_KEY = os.getenv('VAPID_PUBLIC_KEY', '')
VAPID_PRIVATE_KEY = os.getenv('VAPID_PRIVATE_KEY', '')
VAPID_CLAIMS_EMAIL = os.getenv('VAPID_CLAIMS_EMAIL', 'mailto:' + SENDER_EMAIL)

logger = logging.getLogger(__name__)

def generate_otp():
    return ''.join(random.choices(string.digits, k=6))

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({'exp': expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def send_email_func(to_email: str, subject: str, html_content: str):
    try:
        message = MIMEMultipart('alternative')
        message['Subject'] = subject
        message['From'] = SENDER_EMAIL
        message['To'] = to_email
        part = MIMEText(html_content, 'html')
        message.attach(part)
        
        def send():
            with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
                server.login(GMAIL_EMAIL, GMAIL_PASSWORD)
                server.sendmail(SENDER_EMAIL, [to_email], message.as_string())
        
        await asyncio.to_thread(lambda: send())
        return True
    except Exception as e:
        logger.error(f"Email failed: {e}")
        return False
