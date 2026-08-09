from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.user import User, RoleEnum
from app.schemas.audit_log import AuditLogResponse
from app.api.deps import role_required

router = APIRouter(prefix="/admin/audit-logs", tags=["Admin - Audit Logs"])

@router.get("/", response_model=List[AuditLogResponse])
async def get_audit_logs(
    user_id: Optional[int] = Query(None),
    action: Optional[str] = Query(None),
    table_name: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = 0,
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog).options(joinedload(AuditLog.user))
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if action:
        query = query.filter(AuditLog.action == action)
    if table_name:
        query = query.filter(AuditLog.table_name == table_name)
    if start_date:
        query = query.filter(AuditLog.created_at >= start_date)
    if end_date:
        query = query.filter(AuditLog.created_at <= end_date)

    logs = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()
    result = []
    for log in logs:
        result.append({
            "id": log.id,
            "user_id": log.user_id,
            "action": log.action,
            "table_name": log.table_name,
            "record_id": log.record_id,
            "details": log.details,
            "created_at": log.created_at,
            "user_name": log.user.full_name if log.user else "System"
        })
    return result