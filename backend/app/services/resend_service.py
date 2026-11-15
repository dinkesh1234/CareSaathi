"""Resend transactional email notification service for CareSaathi.

Dispatches medication schedule reminders, upcoming doctor appointment alerts,
and urgent caregiver shift handoffs using the Resend API.
Features notification deduplication, responsive healthcare HTML templates,
and automatic demonstration labels during testing.
"""

from datetime import datetime, timezone
import time
from typing import Any, Dict, Optional
import httpx

from app.config import settings

RESEND_API_URL = "https://api.resend.com/emails"

# Deduplication cache: key -> timestamp (seconds)
_SENT_CACHE: Dict[str, float] = {}
DEDUP_WINDOW_SECONDS = 900 # 15 minutes


class ResendService:
    """Service client for Resend API notification delivery."""

    def __init__(self) -> None:
        self.api_key = settings.RESEND_API_KEY
        self.from_email = settings.RESEND_FROM_EMAIL
        self.app_env = settings.APP_ENV

    @property
    def is_configured(self) -> bool:
        """Check if Resend API key is configured."""
        return settings.is_resend_configured

    def _is_duplicate(self, dedup_key: str) -> bool:
        """Check if identical notification was dispatched recently."""
        last_sent = _SENT_CACHE.get(dedup_key)
        now = time.time()
        if last_sent and (now - last_sent < DEDUP_WINDOW_SECONDS):
            return True
        _SENT_CACHE[dedup_key] = now
        return False

    def _wrap_html_template(self, title: str, content_html: str, action_text: str = "Open CareSaathi Dashboard", action_url: str = "http://127.0.0.1:3000/") -> str:
        """Wrap content in CareSaathi's navy & teal responsive healthcare layout."""
        test_badge = ""
        if self.app_env != "production":
            test_badge = (
                '<div style="background-color: #fef3c7; border: 1px solid #f59e0b; color: #92400e; '
                'padding: 8px 12px; font-size: 12px; font-weight: 600; text-align: center; border-radius: 4px; margin-bottom: 16px;">'
                '🧪 CARESATHI DEMONSTRATION / TEST NOTIFICATION'
                '</div>'
            )

        return f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }}
            .container {{ max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; }}
            .header {{ background-color: #0f2942; padding: 24px; text-align: center; color: #ffffff; }}
            .logo-text {{ font-size: 22px; font-weight: 700; color: #ffffff; margin: 0; }}
            .logo-accent {{ color: #0d9488; }}
            .tagline {{ font-size: 13px; color: #94a3b8; margin-top: 4px; }}
            .body-content {{ padding: 28px; line-height: 1.6; font-size: 15px; }}
            .btn {{ display: inline-block; background-color: #0d9488; color: #ffffff !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 20px; }}
            .footer {{ background-color: #f1f5f9; padding: 16px 24px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo-text">Care<span class="logo-accent">Saathi</span></div>
              <div class="tagline">One Family. One Connected Health Space.</div>
            </div>
            <div class="body-content">
              {test_badge}
              <h2 style="color: #0f2942; margin-top: 0; font-size: 18px;">{title}</h2>
              {content_html}
              <div style="text-align: center; margin-top: 24px;">
                <a href="{action_url}" class="btn">{action_text}</a>
              </div>
            </div>
            <div class="footer">
              CareSaathi Family Health & Care Coordination &bull; Informational care assistance only.<br>
              In medical emergencies, call 108 or 112 immediately.
            </div>
          </div>
        </body>
        </html>
        """

    async def send_medication_reminder(
        self,
        to_email: str,
        patient_name: str,
        medication_name: str,
        dosage: str,
        schedule_time: str,
        refill_days_left: int = 14,
    ) -> Dict[str, Any]:
        """Dispatch a medication dose reminder."""
        dedup_key = f"{to_email}:med:{patient_name}:{medication_name}:{schedule_time}"
        if self._is_duplicate(dedup_key):
            return {
                "success": True,
                "duplicate_prevented": True,
                "message": f"Medication reminder for {medication_name} was already sent recently.",
            }

        prefix = "[CareSaathi Test] " if self.app_env != "production" else "CareSaathi: "
        subject = f"{prefix}Medication Reminder for {patient_name} - {medication_name} ({dosage})"

        refill_note = (
            f'<p style="color: #dc2626; font-size: 13px;">⚠️ Refill Notice: Only {refill_days_left} days of supply remaining. Please arrange a refill soon.</p>'
            if refill_days_left <= 7
            else f'<p style="color: #64748b; font-size: 13px;">Supply: {refill_days_left} days remaining.</p>'
        )

        content = f"""
          <p>Hello,</p>
          <p>This is a scheduled CareSaathi health reminder for <strong>{patient_name}</strong>:</p>
          <div style="background-color: #f0fdfa; border-left: 4px solid #0d9488; padding: 12px 16px; border-radius: 4px; margin: 16px 0;">
            <div style="font-weight: 700; font-size: 16px; color: #0f766e;">💊 {medication_name} ({dosage})</div>
            <div style="color: #334155; margin-top: 4px;">Scheduled Time: <strong>{schedule_time}</strong></div>
          </div>
          {refill_note}
          <p>Please confirm once the dose has been taken in your family dashboard to keep care records up to date.</p>
        """

        html_body = self._wrap_html_template("Scheduled Medication Due", content, "Mark Dose Taken")
        return await self._dispatch_email(to_email, subject, html_body)

    async def send_appointment_reminder(
        self,
        to_email: str,
        patient_name: str,
        doctor_name: str,
        specialty: str,
        appointment_date: str,
        location: str,
    ) -> Dict[str, Any]:
        """Dispatch an upcoming doctor appointment reminder."""
        dedup_key = f"{to_email}:apt:{patient_name}:{doctor_name}:{appointment_date}"
        if self._is_duplicate(dedup_key):
            return {
                "success": True,
                "duplicate_prevented": True,
                "message": f"Appointment reminder for {patient_name} was already sent recently.",
            }

        prefix = "[CareSaathi Test] " if self.app_env != "production" else "CareSaathi: "
        subject = f"{prefix}Upcoming Doctor Appointment - {patient_name} with {doctor_name}"

        content = f"""
          <p>Hello,</p>
          <p>This is a reminder for an upcoming medical consultation for <strong>{patient_name}</strong>:</p>
          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 4px; margin: 16px 0;">
            <div style="font-weight: 700; font-size: 16px; color: #1e40af;">🩺 {doctor_name} ({specialty})</div>
            <div style="color: #334155; margin-top: 4px;"><strong>Date & Time:</strong> {appointment_date}</div>
            <div style="color: #334155; margin-top: 2px;"><strong>Clinic / Location:</strong> {location}</div>
          </div>
          <p>You can access past prescription records and generate a Doctor Summary Brief from the Appointments view.</p>
        """

        html_body = self._wrap_html_template("Upcoming Healthcare Appointment", content, "View Appointment Details")
        return await self._dispatch_email(to_email, subject, html_body)

    async def send_caregiver_handoff_alert(
        self,
        to_email: str,
        caregiver_name: str,
        patient_name: str,
        shift_type: str,
        priority: str,
        notes: str,
    ) -> Dict[str, Any]:
        """Dispatch a caregiver shift handoff update alert."""
        dedup_key = f"{to_email}:hoff:{patient_name}:{shift_type}:{notes[:20]}"
        if self._is_duplicate(dedup_key):
            return {"success": True, "duplicate_prevented": True}

        prefix = "[CareSaathi Test] " if self.app_env != "production" else "CareSaathi Alert: "
        subject = f"{prefix}Caregiver Shift Note for {patient_name} ({priority.upper()})"

        border_color = "#ef4444" if priority in ("high", "urgent") else "#0d9488"
        content = f"""
          <p>A new shift continuity handoff note was recorded for <strong>{patient_name}</strong>:</p>
          <div style="background-color: #fafafa; border-left: 4px solid {border_color}; padding: 12px 16px; border-radius: 4px; margin: 16px 0;">
            <div><strong>Attending Caregiver:</strong> {caregiver_name}</div>
            <div><strong>Shift:</strong> {shift_type} &bull; <strong>Priority:</strong> {priority.upper()}</div>
            <p style="margin-top: 8px; font-style: italic; color: #1e293b;">"{notes}"</p>
          </div>
        """

        html_body = self._wrap_html_template("Care Continuity Update", content, "View Care Continuity Log")
        return await self._dispatch_email(to_email, subject, html_body)

    async def send_invitation_email(
        self,
        to_email: str,
        inviter_name: str,
        family_name: str,
        invitation_link: str,
        role: str,
    ) -> Dict[str, Any]:
        """Send an invitation email to join a CareSaathi family care circle."""
        subject = f"CareSaathi Invitation: Join the {family_name}"
        role_label = role.replace("_", " ").title()
        content = f"""
          <p style="font-size: 15px; color: #1e293b;">Hello,</p>
          <p style="font-size: 15px; color: #334155; line-height: 1.6;">
            <strong>{inviter_name}</strong> has invited you to join the <strong>{family_name}</strong> on <strong>CareSaathi</strong> as a <strong>{role_label}</strong>.
          </p>
          <p style="font-size: 14px; color: #475569; line-height: 1.5;">
            CareSaathi helps families coordinate senior health, medications, and caregiver handoffs in one private, secure platform.
          </p>
        """
        html = self._wrap_html_template(
            title="Family Care Circle Invitation",
            content_html=content,
            action_text="Accept Invitation & Sign In",
            action_url=invitation_link,
        )
        return await self._dispatch_email(to_email=to_email, subject=subject, html=html)

    async def _dispatch_email(self, to_email: str, subject: str, html: str) -> Dict[str, Any]:
        """Send the email payload via Resend API."""
        if not self.is_configured:
            return {
                "success": False,
                "error": "not_configured",
                "message": "Resend API key is not configured in backend/.env",
            }

        payload = {
            "from": f"CareSaathi Notifications <{self.from_email}>",
            "to": [to_email],
            "subject": subject,
            "html": html,
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(RESEND_API_URL, json=payload, headers=headers)
                if res.status_code in (200, 201):
                    data = res.json()
                    return {
                        "success": True,
                        "email_id": data.get("id"),
                        "recipient": to_email,
                        "message": "Email sent successfully via Resend.",
                    }
                else:
                    return {
                        "success": False,
                        "error": "resend_error",
                        "status_code": res.status_code,
                        "message": res.text,
                    }
        except Exception as err:
            return {
                "success": False,
                "error": "connection_error",
                "message": str(err),
            }


resend_service = ResendService()
