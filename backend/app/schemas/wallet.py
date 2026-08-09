from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class WalletTransactionResponse(BaseModel):
    id: int
    type: str
    amount: float
    description: Optional[str]
    reward_type: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class WalletResponse(BaseModel):
    id: int
    balance: float
    reward_points: int
    referral_code: Optional[str] = None
    transactions: List[WalletTransactionResponse] = []

    class Config:
        from_attributes = True

class WalletRecharge(BaseModel):
    amount: float = Field(..., gt=0)

class RedeemPoints(BaseModel):
    points: int = Field(..., gt=0)

class ApplyReferral(BaseModel):
    referral_code: str