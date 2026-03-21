import requests
from dotenv import load_dotenv
import os

load_dotenv("d:/Desktop/SE Project/QuickChat/backend/.env")

# We need a valid token to test the authenticated endpoint `/api/ai/chat`
# Instead of logging in, I can just check if the server is running by hitting a public endpoint
print("Checking backend server status...")
try:
    res = requests.get("http://localhost:5000/docs")
    print("Backend on 5000 responds with status:", res.status_code)
except Exception as e:
    print("Failed to connect to 5000:", e)

try:
    res = requests.get("http://localhost:4000/docs")
    print("Backend on 4000 responds with status:", res.status_code)
except Exception as e:
    print("Failed to connect to 4000:", e)
    
