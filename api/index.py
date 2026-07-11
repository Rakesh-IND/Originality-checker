import os
import uuid
from typing import List, Optional
from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import Client

import sys
sys.path.append(os.path.dirname(__file__))

from hashing import compute_dhash, compute_similarity
from auth import get_current_user, supabase

app = FastAPI(title="Duplicate Image Detector API")

# Setup CORS to allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ImageResponse(BaseModel):
    id: str
    filename: str
    storage_path: str
    dhash: str
    file_size: int
    uploaded_at: str
    match_count: Optional[int] = 0

class MatchResponse(BaseModel):
    image: dict
    similarity: float

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/images/upload", response_model=dict)
async def upload_image(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Read image bytes
    contents = await file.read()
    
    # 1. Compute dHash
    try:
        dhash_hex = compute_dhash(contents)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process image: {str(e)}")

    # 2. Upload to Supabase Storage
    # Generate unique filename to avoid collisions
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    unique_filename = f"{uuid.uuid4()}.{ext}"
    storage_path = f"{user.id}/{unique_filename}"
    
    try:
        supabase.storage.from_("photos").upload(
            path=storage_path,
            file=contents,
            file_options={"content-type": file.content_type}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {str(e)}")

    # 3. Insert into database
    try:
        response = supabase.table("images").insert({
            "user_id": user.id,
            "filename": file.filename,
            "storage_path": storage_path,
            "dhash": dhash_hex,
            "file_size": len(contents)
        }).execute()
        
        new_image = response.data[0]
    except Exception as e:
        # Rollback storage? (Not strictly necessary for MVP, but good practice)
        raise HTTPException(status_code=500, detail=f"Database insert failed: {str(e)}")

    # 4. Find matches for the new image against the user's existing library
    # Here we do it via a separate call or inline. Since the requirement asks for it to be returned:
    matches = await get_matches(new_image['id'], threshold=90.0, user=user)

    return {
        "image": new_image,
        "matches": matches
    }

@app.get("/api/images", response_model=List[ImageResponse])
async def list_images(user: dict = Depends(get_current_user)):
    """List all images for the logged in user, along with a match count."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    try:
        # Get all user images
        response = supabase.table("images").select("*").eq("user_id", user.id).order("uploaded_at", desc=True).execute()
        images = response.data
        
        # Calculate match counts dynamically
        # In a very large library, doing this N^2 in python is slow, but acceptable for MVP.
        # Alternatively, we just return the images and the frontend fetches matches on demand.
        # The prompt says: "GET /api/images - list all user's images with a match-count summary per image".
        
        # A simple N^2 loop to find match counts (threshold >= 90 default for summary)
        result = []
        for img1 in images:
            count = 0
            for img2 in images:
                if img1['id'] != img2['id']:
                    sim = compute_similarity(img1['dhash'], img2['dhash'])
                    if sim >= 90.0:
                        count += 1
            
            img_data = img1.copy()
            img_data['match_count'] = count
            result.append(ImageResponse(**img_data))

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database fetch failed: {str(e)}")

@app.get("/api/images/{image_id}/matches", response_model=dict)
async def get_matches(
    image_id: str, 
    threshold: float = 90.0, 
    user: dict = Depends(get_current_user)
):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    try:
        # Get the target image
        target_res = supabase.table("images").select("*").eq("id", image_id).eq("user_id", user.id).execute()
        if not target_res.data:
            raise HTTPException(status_code=404, detail="Image not found")
        
        target_image = target_res.data[0]
        
        # Get all other images for this user
        all_res = supabase.table("images").select("*").eq("user_id", user.id).neq("id", image_id).execute()
        other_images = all_res.data
        
        matches = []
        for img in other_images:
            sim = compute_similarity(target_image['dhash'], img['dhash'])
            if sim >= threshold:
                matches.append(MatchResponse(image=img, similarity=sim))
                
        # Sort by similarity descending
        matches.sort(key=lambda x: x.similarity, reverse=True)
        return {
            "target": target_image,
            "matches": matches
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/images/{image_id}")
async def delete_image(image_id: str, user: dict = Depends(get_current_user)):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    try:
        # Check ownership and get storage path
        target_res = supabase.table("images").select("*").eq("id", image_id).eq("user_id", user.id).execute()
        if not target_res.data:
            raise HTTPException(status_code=404, detail="Image not found")
        
        target_image = target_res.data[0]
        storage_path = target_image['storage_path']
        
        # Delete from DB
        supabase.table("images").delete().eq("id", image_id).execute()
        
        # Delete from Storage
        supabase.storage.from_("photos").remove([storage_path])
        
        return {"status": "success", "message": "Image deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
