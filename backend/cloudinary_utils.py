"""
Cloudinary CDN Utility for QuickChat
--------------------------------------
Handles uploading media files (images, videos, audio, raw documents)
to Cloudinary. Falls back gracefully if credentials are not configured.

To enable: Add to backend/.env:
  CLOUDINARY_CLOUD_NAME=your_cloud_name
  CLOUDINARY_API_KEY=your_api_key
  CLOUDINARY_API_SECRET=your_api_secret
"""

import os
import base64
import mimetypes
from io import BytesIO
from typing import Optional, Tuple

# Attempt to import cloudinary
try:
    import cloudinary
    import cloudinary.uploader
    CLOUDINARY_AVAILABLE = True
except ImportError:
    CLOUDINARY_AVAILABLE = False

CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "")
API_KEY = os.getenv("CLOUDINARY_API_KEY", "")
API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "")

CDN_ENABLED = CLOUDINARY_AVAILABLE and bool(CLOUD_NAME) and bool(API_KEY) and bool(API_SECRET)

if CDN_ENABLED:
    cloudinary.config(
        cloud_name=CLOUD_NAME,
        api_key=API_KEY,
        api_secret=API_SECRET,
        secure=True
    )


def _data_uri_to_bytes(data_uri: str) -> Tuple[bytes, str]:
    """Convert a data URI string to raw bytes and detected mime type."""
    if not data_uri.startswith("data:"):
        raise ValueError("Not a data URI")
    
    header, encoded = data_uri.split(",", 1)
    # Extract mime type from header: data:<mime>;base64
    mime = header.split(";")[0].replace("data:", "") 
    raw = base64.b64decode(encoded)
    return raw, mime


def _get_resource_type(mime_type: str) -> str:
    """Map MIME type to Cloudinary resource_type parameter."""
    if mime_type.startswith("image/"):
        return "image"
    elif mime_type.startswith("video/") or mime_type.startswith("audio/"):
        return "video"
    else:
        return "raw"


async def upload_to_cdn(
    data_uri: str,
    file_name: Optional[str] = None,
    folder: str = "quickchat_media"
) -> Optional[str]:
    """
    Upload a base64 data URI to Cloudinary CDN.
    
    Returns:
        str: The secure CDN URL if upload is successful.
        None: If CDN is not configured or upload fails (falls back to storing data URI).
    """
    if not CDN_ENABLED:
        return None
    
    try:
        raw_bytes, mime_type = _data_uri_to_bytes(data_uri)
        resource_type = _get_resource_type(mime_type)
        
        # Determine public_id from filename for meaningful URLs
        public_id = None
        if file_name:
            # Strip extension — Cloudinary adds it automatically
            name_without_ext = file_name.rsplit(".", 1)[0] if "." in file_name else file_name
            public_id = f"{folder}/{name_without_ext}"
        
        upload_kwargs = {
            "resource_type": resource_type,
            "folder": folder if not public_id else None,
            "public_id": public_id,
            "use_filename": True if not public_id else False,
            "unique_filename": True,
        }
        # Remove None values to avoid API errors
        upload_kwargs = {k: v for k, v in upload_kwargs.items() if v is not None}
        
        result = cloudinary.uploader.upload(BytesIO(raw_bytes), **upload_kwargs)
        return result.get("secure_url")
    except Exception as e:
        print(f"[Cloudinary] Upload failed: {e}. Falling back to data URI.")
        return None


def is_cdn_enabled() -> bool:
    """Return whether Cloudinary CDN is enabled."""
    return CDN_ENABLED
