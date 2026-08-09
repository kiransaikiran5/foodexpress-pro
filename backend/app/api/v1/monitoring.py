from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
import platform, os, psutil, time

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.audit_log import AuditLog
from app.models.failed_request_log import FailedRequestLog
from app.models.backup_log import BackupLog
from app.api.deps import role_required

router = APIRouter(prefix="/admin/monitoring", tags=["Admin - Monitoring"])

# ---------- Helper: system info ----------
def get_server_health():
    try:
        cpu = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        uptime = time.time() - psutil.boot_time()
        return {
            "cpu_percent": cpu,
            "memory_percent": memory.percent,
            "disk_percent": disk.percent,
            "uptime_hours": round(uptime / 3600, 1),
            "platform": platform.platform()
        }
    except:
        return {
            "cpu_percent": "N/A",
            "memory_percent": "N/A",
            "disk_percent": "N/A",
            "uptime_hours": "N/A",
            "platform": platform.platform()
        }

# ---------- Dashboard ----------
@router.get("/dashboard")
def monitoring_dashboard(
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    # ---- API Monitoring: count of failed requests in last hour ----
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    failed_count = db.query(func.count(FailedRequestLog.id)).filter(
        FailedRequestLog.created_at >= one_hour_ago
    ).scalar()

    # ---- Failed Request Logs (last 10) ----
    recent_failed = db.query(FailedRequestLog).order_by(FailedRequestLog.created_at.desc()).limit(10).all()
    failed_logs = [
        {
            "id": f.id,
            "endpoint": f.endpoint,
            "method": f.method,
            "status_code": f.status_code,
            "error_message": f.error_message,
            "client_ip": f.client_ip,
            "created_at": f.created_at.isoformat()
        } for f in recent_failed
    ]

    # ---- Audit Monitoring (recent 10 audit logs) ----
    audit_logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(10).all()
    recent_audits = [
        {
            "id": a.id,
            "action": a.action,
            "details": a.details,
            "created_at": a.created_at.isoformat()
        } for a in audit_logs
    ]

    # ---- Security Alerts (simulated) ----
    # Count of failed login attempts (actions containing 'LOGIN_FAIL') in last hour
    failed_logins = db.query(func.count(AuditLog.id)).filter(
        AuditLog.action.like("%LOGIN_FAIL%"),
        AuditLog.created_at >= one_hour_ago
    ).scalar()

    security_alerts = []
    if failed_logins > 5:
        security_alerts.append(f"High number of failed logins: {failed_logins} in the last hour")

    # ---- Backup & Recovery ----
    last_backup = db.query(BackupLog).order_by(BackupLog.created_at.desc()).first()
    backup_status = {
        "last_backup_date": last_backup.created_at.isoformat() if last_backup else None,
        "last_backup_status": last_backup.status if last_backup else "No backup yet"
    }

    return {
        "server_health": get_server_health(),
        "api_monitoring": {
            "failed_requests_last_hour": failed_count,
            "recent_failed_logs": failed_logs
        },
        "audit_monitoring": recent_audits,
        "security_alerts": security_alerts,
        "backup_status": backup_status
    }

# ---------- Trigger Backup (simulated) ----------
@router.post("/backup")
def trigger_backup(
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    # Simulate backup creation
    backup = BackupLog(
        backup_type="manual",
        status="completed",
        file_path=f"/backups/backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.sql"
    )
    db.add(backup)
    db.commit()
    return {"message": "Backup initiated successfully", "backup_id": backup.id}

# ---------- Health endpoint (public / separate) ----------
@router.get("/health")
def server_health():
    return get_server_health()