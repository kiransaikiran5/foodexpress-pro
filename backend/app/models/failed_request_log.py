from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from app.database import Base

class FailedRequestLog(Base):
    __tablename__ = "failed_request_logs"

    id = Column(Integer, primary_key=True, index=True)
    endpoint = Column(String(255), nullable=False)
    method = Column(String(10), nullable=False)
    status_code = Column(Integer, nullable=False)
    error_message = Column(Text, nullable=True)
    client_ip = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())