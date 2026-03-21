import os
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from dependencies import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/ai",
    tags=["AI"]
)

API_KEY = os.getenv("NVIDIA_API_KEY", "")

# Ensure it's formatted properly for the Authorization header
if API_KEY and not API_KEY.startswith("Bearer "):
    API_KEY = f"Bearer {API_KEY}"

class ChatMessage(BaseModel):
    role: str
    content: Any # Use Any to allow lists of content (multimodal images)

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    model: str = "google/gemma-3n-e4b-it"

@router.post("/chat")
async def ai_chat(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    if not API_KEY:
        raise HTTPException(status_code=500, detail="AI feature is not configured.")
        
    try:
        raw_messages = [{"role": m.role, "content": m.content} for m in request.messages]
        
        # 1. Filter out any leading non-user messages to ensure it starts with 'user'
        while raw_messages and raw_messages[0]["role"] != "user":
            raw_messages.pop(0)
            
        # 2. Enforce strict alternation
        messages = []
        expected_role = "user"
        for m in raw_messages:
            if m["role"] == expected_role:
                messages.append(m)
                expected_role = "assistant" if expected_role == "user" else "user"
        
        # 3. Bake system prompt into the first user message (safest approach for some strict models)
        user_name = current_user.get('real_name', 'User')
        system_instructions = f"SYSTEM INSTRUCTIONS: You are Nova, an advanced, highly intelligent AI assistant embedded in QuickChat. Your goal is to be exceptionally helpful, concise, and friendly. The user's name is {user_name}.\n\n"
        
        if messages and messages[0]["role"] == "user":
            if isinstance(messages[0]["content"], str):
                messages[0]["content"] = system_instructions + messages[0]["content"]
            elif isinstance(messages[0]["content"], list):
                for block in messages[0]["content"]:
                    if isinstance(block, dict) and block.get("type") == "text":
                        block["text"] = system_instructions + block.get("text", "")
                        break

        payload = {
            "model": request.model,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 2048
        }
        
        headers = {
            "Authorization": API_KEY,
            "Accept": "application/json"
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://integrate.api.nvidia.com/v1/chat/completions",
                json=payload,
                headers=headers,
                timeout=60.0
            )
            
            if response.status_code != 200:
                logger.error(f"NVIDIA API Error: {response.text}")
                raise HTTPException(status_code=500, detail=f"AI service returned error: {response.text}")
                
            data = response.json()
            response_text = data["choices"][0]["message"]["content"]
            return {"content": response_text}
            
    except Exception as e:
        logger.error(f"Error in Nova AI chat: {str(e)}")
        raise HTTPException(status_code=500, detail="Nova is currently unavailable.")
