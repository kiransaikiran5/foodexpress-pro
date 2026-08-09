from pydantic import BaseModel
from typing import Dict, Any

class SettingsResponse(BaseModel):
    settings: Dict[str, Any]

class SettingsUpdate(BaseModel):
    settings: Dict[str, Any]