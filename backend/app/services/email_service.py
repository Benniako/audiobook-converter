"""
Email notification service for conversion completion/failure.
Uses SMTP (works with Gmail, SendGrid, Mailgun, any SMTP provider).
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import get_settings


async def send_conversion_notification(user_email: str, book_title: str, status: str, book_id: str, error: str = None):
    """Send email notification when a conversion completes or fails."""
    settings = get_settings()
    if not settings.smtp_host:
        return  # SMTP not configured, skip silently

    app_url = settings.app_url.rstrip("/")
    book_url = f"{app_url}/books/{book_id}"

    if status == "done":
        subject = f"🎧 Your audiobook is ready: {book_title}"
        html = f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
            <div style="text-align:center;margin-bottom:24px;">
                <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#4f46e5,#7c3aed);
                     display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
                    <span style="font-size:24px;">🎧</span>
                </div>
                <h1 style="font-size:20px;color:#0f172a;margin:0;">Audiobook Ready</h1>
            </div>
            <p style="color:#475569;line-height:1.6;">Your audiobook <strong>"{book_title}"</strong> has been converted and is ready to listen.</p>
            <div style="text-align:center;margin:24px 0;">
                <a href="{book_url}" style="display:inline-block;background:#4f46e5;color:white;padding:12px 24px;
                     border-radius:12px;text-decoration:none;font-weight:600;">Listen Now</a>
            </div>
            <p style="color:#94a3b8;font-size:12px;text-align:center;">Audiobook Converter</p>
        </div>
        """
    elif status == "failed":
        subject = f"❌ Conversion failed: {book_title}"
        html = f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
            <div style="text-align:center;margin-bottom:24px;">
                <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#ef4444,#dc2626);
                     display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
                    <span style="font-size:24px;">❌</span>
                </div>
                <h1 style="font-size:20px;color:#0f172a;margin:0;">Conversion Failed</h1>
            </div>
            <p style="color:#475569;line-height:1.6;">Your audiobook <strong>"{book_title}"</strong> failed to convert.</p>
            {f'<p style="color:#dc2626;background:#fef2f2;padding:12px;border-radius:8px;font-size:13px;">Error: {error}</p>' if error else ''}
            <div style="text-align:center;margin:24px 0;">
                <a href="{book_url}" style="display:inline-block;background:#4f46e5;color:white;padding:12px 24px;
                     border-radius:12px;text-decoration:none;font-weight:600;">Try Again</a>
            </div>
            <p style="color:#94a3b8;font-size:12px;text-align:center;">Audiobook Converter</p>
        </div>
        """
    else:
        return

    await _send_email(user_email, subject, html)


async def _send_email(to: str, subject: str, html: str):
    settings = get_settings()
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as server:
            server.starttls()
            if settings.smtp_user:
                server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
    except Exception as e:
        # Don't crash the worker if email fails
        import logging
        logging.getLogger(__name__).warning(f"Failed to send email to {to}: {e}")
