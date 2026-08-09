import os
import uuid
import aiofiles
from fastapi import UploadFile, HTTPException

UPLOAD_DIR = "uploads"
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "pdf"}

async def save_upload_file(upload_file: UploadFile, subfolder: str = "") -> str:
    if upload_file.filename:
        ext = upload_file.filename.rsplit(".", 1)[-1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"File type .{ext} not allowed")
    else:
        raise HTTPException(status_code=400, detail="No file selected")

    os.makedirs(os.path.join(UPLOAD_DIR, subfolder), exist_ok=True)
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, subfolder, filename)

    async with aiofiles.open(filepath, 'wb') as out_file:
        content = await upload_file.read()
        await out_file.write(content)

    return filepath   # relative path