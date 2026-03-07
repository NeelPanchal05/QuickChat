"""Quick test to verify Cloudinary credentials are working."""
import os
from dotenv import load_dotenv
load_dotenv()

try:
    import cloudinary
    import cloudinary.api
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET"),
        secure=True
    )
    result = cloudinary.api.ping()
    print("SUCCESS: Cloudinary connected! Status:", result.get("status"))
except ImportError:
    print("ERROR: cloudinary package not installed. Run: pip install cloudinary")
except Exception as e:
    print(f"ERROR: {e}")
