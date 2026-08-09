from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.database import Base

class BackupLog(Base):
    __tablename__ = "backup_logs"

    id = Column(Integer, primary_key=True, index=True)
    backup_type = Column(String(50), default="manual")
    status = Column(String(20), default="completed")   # completed, failed
    file_path = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())