"""
Spam protection and rate limiting for QuickChat
"""

from datetime import datetime, timedelta, timezone
from collections import defaultdict
from typing import Dict, List

class SpamProtection:
    def __init__(self, max_messages_per_minute: int = 10, max_messages_per_hour: int = 100):
        self.max_messages_per_minute = max_messages_per_minute
        self.max_messages_per_hour = max_messages_per_hour
        self.user_messages: Dict[str, List[datetime]] = defaultdict(list)
        self.blocked_users: Dict[str, datetime] = {}

    def check_spam(self, user_id: str) -> tuple[bool, str]:
        """
        Check if user is spamming
        Returns (is_spam, message)
        """
        now = datetime.now(timezone.utc)
        
        # Check if user is temporarily blocked
        if user_id in self.blocked_users:
            if self.blocked_users[user_id] > now:
                return True, "You are temporarily blocked due to spam. Try again later."
            else:
                del self.blocked_users[user_id]
        
        # Clean old messages
        one_hour_ago = now - timedelta(hours=1)
        if user_id in self.user_messages:
            self.user_messages[user_id] = [
                msg_time for msg_time in self.user_messages[user_id]
                if msg_time > one_hour_ago
            ]
        
        # Check hourly limit
        messages_in_hour = len(self.user_messages[user_id])
        if messages_in_hour >= self.max_messages_per_hour:
            # Block user for 1 hour
            self.blocked_users[user_id] = now + timedelta(hours=1)
            return True, "You've exceeded the hourly message limit. Try again later."
        
        # Check per-minute limit
        one_minute_ago = now - timedelta(minutes=1)
        messages_in_minute = sum(
            1 for msg_time in self.user_messages[user_id]
            if msg_time > one_minute_ago
        )
        
        if messages_in_minute >= self.max_messages_per_minute:
            return True, "You're sending messages too quickly. Please slow down."
        
        # Record message
        self.user_messages[user_id].append(now)
        return False, "OK"

    def get_user_block_status(self, user_id: str) -> bool:
        """Check if user is currently blocked"""
        if user_id in self.blocked_users:
            if self.blocked_users[user_id] > datetime.now(timezone.utc):
                return True
            else:
                del self.blocked_users[user_id]
        return False

    def reset_user(self, user_id: str):
        """Reset spam record for a user (admin action)"""
        if user_id in self.user_messages:
            del self.user_messages[user_id]
        if user_id in self.blocked_users:
            del self.blocked_users[user_id]

# Global spam protection instance
spam_protection = SpamProtection()

# Keyword-based spam detection
SPAM_KEYWORDS = [
    'buy now', 'click here', 'limited time', 'act now',
    'earn money', 'work from home', 'free money',
    'click link', 'visit website', 'pornography',
    'adult content', 'xxx'
]

def contains_spam_keywords(message: str) -> bool:
    """Check if message contains known spam keywords"""
    message_lower = message.lower()
    for keyword in SPAM_KEYWORDS:
        if keyword in message_lower:
            return True
    return False

def is_spam_message(message: str) -> tuple[bool, str]:
    """
    Check if message is spam
    Returns (is_spam, reason)
    """
    # Check for repeated characters (e.g., "AAAAAAAA")
    for char in set(message):
        if message.count(char) > len(message) * 0.7:
            return True, "Message contains excessive repeated characters"
    
    # Check for URLs (potential phishing)
    if 'http://' in message or 'https://' in message:
        url_count = message.count('http://') + message.count('https://')
        if url_count > 2:
            return True, "Message contains too many URLs"
    
    # Check for spam keywords
    if contains_spam_keywords(message):
        return True, "Message contains spam keywords"
    
    # Check for all caps messages (limit to reasonable length)
    if len(message) > 20 and message.isupper():
        return True, "Message is in all caps"
    
    return False, "OK"
