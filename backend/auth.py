import os
from fastapi import Request, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
# We use the service role key to bypass RLS when necessary (e.g. comparing all hashes)
# But we authenticate requests using the user's JWT.
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    # Not raising error immediately to allow frontend dev without backend fully configured
    print("Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set.")
    supabase: Client = None
else:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Verifies the JWT token from the Authorization header using Supabase.
    Returns the user object if valid.
    """
    token = credentials.credentials
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    try:
        # Supabase Python client currently provides a way to get user from JWT
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_response.user
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication error: {str(e)}")
