import os
from cryptography.fernet import Fernet
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# For production, generate a key and store it securely
# For development, we'll use a derived key from SECRET_KEY
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY', None)

if not ENCRYPTION_KEY:
    # Derive encryption key from SECRET_KEY (not recommended for production)
    import hashlib
    import base64
    secret = os.getenv('SECRET_KEY', 'default-secret-key').encode()
    derived = base64.urlsafe_b64encode(hashlib.sha256(secret).digest())
    cipher = Fernet(derived)
else:
    cipher = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)

def encrypt_message(message: str) -> str:
    """Encrypt a message string"""
    try:
        encrypted = cipher.encrypt(message.encode())
        return encrypted.decode('utf-8')
    except Exception as e:
        print(f"Encryption failed: {e}")
        return message

def decrypt_message(encrypted_message: str) -> str:
    """Decrypt an encrypted message string"""
    try:
        decrypted = cipher.decrypt(encrypted_message.encode())
        return decrypted.decode('utf-8')
    except Exception as e:
        print(f"Decryption failed: {e}")
        return encrypted_message

def generate_encryption_key() -> str:
    """Generate a new encryption key"""
    return Fernet.generate_key().decode('utf-8')
