from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from app.database import SessionLocal
from app.models.failed_request_log import FailedRequestLog
import traceback

class ErrorLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if response.status_code >= 400:
            # Capture failed request details
            try:
                body = await request.body()
                error_msg = f"HTTP {response.status_code}"
                # Try to get more detail from response
                # For simplicity, just log the endpoint and status
                db = SessionLocal()
                try:
                    log_entry = FailedRequestLog(
                        endpoint=request.url.path,
                        method=request.method,
                        status_code=response.status_code,
                        error_message=error_msg,
                        client_ip=request.client.host if request.client else None
                    )
                    db.add(log_entry)
                    db.commit()
                except:
                    db.rollback()
                finally:
                    db.close()
            except:
                pass  # ignore logging errors
        return response