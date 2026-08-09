from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from app.core.config import settings

conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
    USE_CREDENTIALS=True,
    # TEMPLATE_FOLDER is not required when sending raw HTML strings
)

fm = FastMail(conf)

async def send_verification_email(email: str, token: str):
    verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    html = f"""
    <h1>Verify your email</h1>
    <p>Click the link below to verify your email address:</p>
    <a href="{verification_url}">{verification_url}</a>
    <p>This link expires in 24 hours.</p>
    """
    message = MessageSchema(
        subject="FoodExpress - Email Verification",
        recipients=[email],
        body=html,
        subtype="html"
    )
    await fm.send_message(message)

async def send_password_reset_email(email: str, token: str):
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    html = f"""
    <h1>Password Reset Request</h1>
    <p>Click the link below to reset your password:</p>
    <a href="{reset_url}">{reset_url}</a>
    <p>If you didn't request this, ignore this email.</p>
    """
    message = MessageSchema(
        subject="FoodExpress - Password Reset",
        recipients=[email],
        body=html,
        subtype="html"
    )
    await fm.send_message(message)