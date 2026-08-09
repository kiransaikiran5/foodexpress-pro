from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog

def create_audit_log(
    db: Session,
    user_id: int,
    action: str,
    table_name: str = None,
    record_id: int = None,
    details: str = None
):
    log = AuditLog(
        user_id=user_id,
        action=action,
        table_name=table_name,
        record_id=record_id,
        details=details
    )
    db.add(log)
    db.commit()