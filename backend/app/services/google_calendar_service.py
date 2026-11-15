"""Google Calendar API service for CareSaathi appointments.

Manages synchronization of doctor visits, checkups, and consultations to Google Calendar.
Configures 60-minute and 15-minute popup reminders, verifies against duplicate events,
and handles token expiration and scope errors gracefully.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
import httpx

CALENDAR_BASE_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"


class GoogleCalendarService:
    """Service client for Google Calendar API interactions."""

    async def list_calendar_events(
        self,
        access_token: str,
        max_results: int = 15,
        time_min: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Fetch upcoming calendar events for the authenticated Google account."""
        now_iso = time_min or datetime.now(timezone.utc).isoformat()
        params = {
            "maxResults": max_results,
            "orderBy": "startTime",
            "singleEvents": "true",
            "timeMin": now_iso,
        }
        headers = {"Authorization": f"Bearer {access_token}"}

        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(CALENDAR_BASE_URL, headers=headers, params=params)

            if response.status_code == 401:
                return {
                    "success": False,
                    "error": "token_expired",
                    "message": "Google Calendar access token has expired or was revoked.",
                }
            if response.status_code != 200:
                return {
                    "success": False,
                    "error": "api_error",
                    "status_code": response.status_code,
                    "message": response.text,
                }

            data = response.json()
            return {
                "success": True,
                "events": data.get("items", []),
                "summary": data.get("summary", "Primary Calendar"),
            }

    async def create_appointment_event(
        self,
        access_token: str,
        title: str,
        doctor_name: str,
        patient_name: str,
        start_datetime: datetime,
        location: str,
        notes: Optional[str] = None,
        duration_minutes: int = 45,
    ) -> Dict[str, Any]:
        """Create a Google Calendar event with healthcare reminders and duplicate prevention."""
        end_datetime = start_datetime + timedelta(minutes=duration_minutes)
        summary = f"🏥 CareSaathi: {title} ({patient_name})"

        # 1. Prevent duplicate event creation: Check if an event with identical summary and start time already exists
        list_res = await self.list_calendar_events(
            access_token=access_token,
            max_results=25,
            time_min=(start_datetime - timedelta(hours=2)).isoformat(),
        )

        if list_res.get("success"):
            existing_events = list_res.get("events", [])
            for event in existing_events:
                existing_summary = event.get("summary", "")
                existing_start = event.get("start", {}).get("dateTime", "")
                if existing_summary == summary and start_datetime.isoformat() in existing_start:
                    return {
                        "success": True,
                        "duplicate_prevented": True,
                        "event_id": event.get("id"),
                        "html_link": event.get("htmlLink"),
                        "message": "Event already exists in Google Calendar (duplicate prevented).",
                    }

        # 2. Build Event Payload
        description = (
            f"CareSaathi Family Healthcare Appointment\n\n"
            f"Patient: {patient_name}\n"
            f"Doctor / Specialist: {doctor_name}\n"
            f"Location: {location}\n"
            f"Notes: {notes or 'Routine healthcare follow-up'}\n\n"
            f"— Managed via CareSaathi Health & Care Coordination"
        )

        event_payload = {
            "summary": summary,
            "description": description,
            "location": location,
            "start": {
                "dateTime": start_datetime.isoformat(),
                "timeZone": "Asia/Kolkata",
            },
            "end": {
                "dateTime": end_datetime.isoformat(),
                "timeZone": "Asia/Kolkata",
            },
            "reminders": {
                "useDefault": False,
                "overrides": [
                    {"method": "popup", "minutes": 60},
                    {"method": "popup", "minutes": 15},
                ],
            },
            "colorId": "11", # Bold Red / Healthcare in Google Calendar
        }

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.post(CALENDAR_BASE_URL, json=event_payload, headers=headers)

            if response.status_code == 401:
                return {
                    "success": False,
                    "error": "token_expired",
                    "message": "Google Calendar access token has expired.",
                }
            if response.status_code not in (200, 201):
                return {
                    "success": False,
                    "error": "api_error",
                    "status_code": response.status_code,
                    "message": response.text,
                }

            created_event = response.json()
            return {
                "success": True,
                "duplicate_prevented": False,
                "event_id": created_event.get("id"),
                "html_link": created_event.get("htmlLink"),
                "status": created_event.get("status"),
                "message": "Appointment event created in Google Calendar successfully.",
            }


google_calendar_service = GoogleCalendarService()
