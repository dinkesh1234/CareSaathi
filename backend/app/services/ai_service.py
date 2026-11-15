"""AI Assistant Service for CareSaathi.

Provides modular AI coordination summaries respecting Role-Based Access Control.
Operates in mock demonstration mode pending Gemini API documentation and credential setup.
"""

from abc import ABC, abstractmethod
from datetime import datetime, timezone
import re
from typing import List, Optional

from app.auth import AuthenticatedUser
from app.schemas import (
    AgeGroup,
    AIChatMessage,
    AIChatResponse,
    AIChatRole,
    FamilyMemberProfile,
    Role,
)

DISCLAIMER_TEXT = (
    "Informational Care Summary Only: CareSaathi AI provides care coordination summaries based on "
    "recorded family profiles and routine schedules. It is NOT a medical device and does NOT provide "
    "clinical diagnoses, treatment recommendations, or drug prescriptions. Always consult a qualified "
    "healthcare provider for medical decisions."
)


class BaseAIAssistantProvider(ABC):
    """Abstract provider interface for AI Assistant integrations."""

    @abstractmethod
    def generate_response(
        self,
        user: AuthenticatedUser,
        authorized_profiles: List[FamilyMemberProfile],
        query: str,
        history: Optional[List[AIChatMessage]] = None,
    ) -> AIChatResponse:
        """Process user query and return structured AI response."""
        pass


class MockAIAssistantProvider(BaseAIAssistantProvider):
    """Local demonstration AI provider that generates context-aware care coordination summaries.

    Strictly adheres to:
    - Zero data leakage outside authorized profiles.
    - Medical safety refusal for clinical diagnosis or prescription requests.
    - Explicit demonstration labelling (is_mock=True).
    """

    def __init__(self) -> None:
        self.provider_id = "mock-care-assistant-v1"

    def generate_response(
        self,
        user: AuthenticatedUser,
        authorized_profiles: List[FamilyMemberProfile],
        query: str,
        history: Optional[List[AIChatMessage]] = None,
    ) -> AIChatResponse:
        cleaned_query = query.strip().lower()

        # 1. Medical Diagnosis & Prescription Safety Guardrail
        medical_risk_patterns = [
            r"\b(diagnos[ei]|what disease|do i have|cancer|stroke|heart attack|prescribe|prescription|which medicine should i take|dose increase)\b",
            r"\b(cure|treat my|chest pain|unconscious|emergency symptoms)\b",
        ]
        if any(re.search(pat, cleaned_query) for pat in medical_risk_patterns):
            refusal_text = (
                "⚠️ Clinical Safety Notice: I cannot provide medical diagnosis, clinical evaluation, "
                "or prescribe medication. CareSaathi is designed exclusively for family care coordination and routine tracking.\n\n"
                "If someone is experiencing acute symptoms like chest pain, severe shortness of breath, or sudden weakness, "
                "please contact emergency medical services (108 / 112 in India) or visit the nearest hospital emergency room immediately."
            )
            return AIChatResponse(
                response=refusal_text,
                suggested_followups=[
                    "Show Dr. Vikram Mehta's appointment details",
                    "What emergency contacts are recorded?",
                    "View Ramesh's prescribed medication schedule",
                ],
                provider=self.provider_id,
                is_mock=True,
                disclaimer=DISCLAIMER_TEXT,
                authorized_members_count=len(authorized_profiles),
            )

        # 2. Check for Authorized Profiles Access
        if not authorized_profiles:
            return AIChatResponse(
                response=(
                    f"Namaste, {user.full_name}. Under your current role ({user.role.value}), you do not have "
                    "access to any family member records in this account. Please contact the Family Owner for delegated access."
                ),
                suggested_followups=["Switch active role in the topbar to test other permissions"],
                provider=self.provider_id,
                is_mock=True,
                disclaimer=DISCLAIMER_TEXT,
                authorized_members_count=0,
            )

        member_names = [p.full_name for p in authorized_profiles]
        profile_by_first_name = {p.full_name.split()[0].lower(): p for p in authorized_profiles}

        # 3. Intent: Medication Schedule Overview
        if any(k in cleaned_query for k in ["medication", "medicine", "pill", "dose", "tablet", "prescription", "refill"]):
            med_lines = []
            for p in authorized_profiles:
                if "ramesh" in p.full_name.lower():
                    med_lines.append(
                        f"• {p.full_name} ({p.age} yrs, Senior):\n"
                        "  - Amlodipine 5mg: Morning (08:00 AM) — Taken ✅ (14 days refill left)\n"
                        "  - Metformin 500mg: Post-Lunch (02:00 PM) — Due Today 💊 (8 days refill left - Refill Soon)"
                    )
                elif "sunita" in p.full_name.lower():
                    med_lines.append(
                        f"• {p.full_name} ({p.age} yrs, Adult):\n"
                        "  - Levothyroxine 50mcg: Morning empty stomach (07:30 AM) — Taken ✅ (22 days refill left)"
                    )
                elif "ananya" in p.full_name.lower():
                    med_lines.append(
                        f"• {p.full_name} ({p.age} yrs, Child):\n"
                        "  - Daily Multivitamin & Zinc: Night (09:00 PM) — Scheduled"
                    )
                elif "kavita" in p.full_name.lower():
                    med_lines.append(
                        f"• {p.full_name} ({p.age} yrs, Child - Verma Family):\n"
                        "  - Pediatric Vitamin D3 drops: Weekly — Up to date"
                    )
                else:
                    care = p.care_notes or "No active routine medications recorded."
                    med_lines.append(f"• {p.full_name}: {care}")

            med_summary = "\n\n".join(med_lines)
            resp_text = (
                f"📋 Medication Schedule for Authorized Members ({len(authorized_profiles)} member(s)):\n\n"
                f"{med_summary}\n\n"
                "Tip: You can confirm or log taken doses directly in the Medication Center tab."
            )
            return AIChatResponse(
                response=resp_text,
                suggested_followups=[
                    "Are any medications running low on refills?",
                    "When is the next appointment scheduled?",
                    "Summarize today's care tasks",
                ],
                provider=self.provider_id,
                is_mock=True,
                disclaimer=DISCLAIMER_TEXT,
                authorized_members_count=len(authorized_profiles),
            )

        # 4. Intent: Upcoming Appointments & Doctor Visits
        if any(k in cleaned_query for k in ["appointment", "doctor", "clinic", "visit", "consultation", "hospital"]):
            apt_lines = []
            for p in authorized_profiles:
                if "ramesh" in p.full_name.lower():
                    apt_lines.append(
                        "• Ramesh Sharma: Cardiology Review with Dr. Vikram Mehta at Apollo Heart Center\n"
                        "  Time: Tomorrow, 10:30 AM IST (Confirmed)\n"
                        "  Preparation Checklist: Fasting required, bring BP log and previous echocardiogram."
                    )
                elif "ananya" in p.full_name.lower():
                    apt_lines.append(
                        "• Ananya Sharma: Annual Pediatric Vision Examination with Dr. Radhika Iyer at City Eye Hospital\n"
                        "  Time: Nov 24, 2026 at 04:00 PM IST (Scheduled)\n"
                        "  Preparation: Bring current reading glasses."
                    )
                elif "kavita" in p.full_name.lower():
                    apt_lines.append(
                        "• Kavita Verma: Routine Pediatric Dental Checkup\n"
                        "  Time: Dec 02, 2026 (Scheduled)"
                    )

            if apt_lines:
                apt_summary = "\n\n".join(apt_lines)
                resp_text = (
                    f"📅 Upcoming Consultations for Authorized Family Members:\n\n"
                    f"{apt_summary}\n\n"
                    "Would you like me to guide you to the pre-visit consultation checklist?"
                )
            else:
                resp_text = f"No upcoming clinical appointments are currently recorded for {', '.join(member_names)}."

            return AIChatResponse(
                response=resp_text,
                suggested_followups=[
                    "What pre-visit checklist is needed for Dr. Mehta?",
                    "Show today's medication schedule",
                    "What care tasks are pending?",
                ],
                provider=self.provider_id,
                is_mock=True,
                disclaimer=DISCLAIMER_TEXT,
                authorized_members_count=len(authorized_profiles),
            )

        # 5. Intent: Care Responsibilities / Tasks
        if any(k in cleaned_query for k in ["task", "todo", "pending", "chore", "responsibility", "responsibilities"]):
            tasks_text = (
                "📝 Active Care Responsibilities for Your Family Circle:\n\n"
                "1. [PENDING] Collect Amlodipine refill from Apollo Pharmacy — Assigned to Anil Sharma (Due Today)\n"
                "2. [PENDING] Record Ramesh's post-lunch blood pressure reading — Assigned to Sunita Sharma (Due 02:30 PM)\n"
                "3. [COMPLETED] Confirm Ananya's annual vision checkup booking with City Eye Hospital ✅\n\n"
                "You can check off completed tasks or add new ones on the Dashboard."
            )
            return AIChatResponse(
                response=tasks_text,
                suggested_followups=[
                    "What was Ramesh's last blood pressure reading?",
                    "When is the next medication due?",
                    "Give me a daily summary",
                ],
                provider=self.provider_id,
                is_mock=True,
                disclaimer=DISCLAIMER_TEXT,
                authorized_members_count=len(authorized_profiles),
            )

        # 6. Intent: Specific Member Inquiries
        for first_name, profile in profile_by_first_name.items():
            if first_name in cleaned_query:
                care_note = profile.care_notes or "Routine care monitoring."
                allergy_note = profile.allergies or "None reported."
                cg_text = "Nurse Priya Nair (Caregiver)" if profile.assigned_caregiver_ids else "Family Care Circle"

                detail_text = (
                    f"👤 Profile Summary for {profile.full_name}:\n\n"
                    f"• Relationship: {profile.relationship}\n"
                    f"• Age: {profile.age} years ({profile.age_group.value.upper()})\n"
                    f"• Blood Group: {profile.blood_group or 'Not recorded'}\n"
                    f"• Known Allergies: {allergy_note}\n"
                    f"• Assigned Caregiver: {cg_text}\n"
                    f"• Emergency Contact: {profile.emergency_contact or 'Family coordinator'}\n"
                    f"• Recorded Care Notes: {care_note}\n\n"
                    "All information is retrieved strictly from authorized backend records."
                )
                return AIChatResponse(
                    response=detail_text,
                    suggested_followups=[
                        f"What medications does {profile.full_name} take?",
                        f"Are there any appointments scheduled for {profile.full_name}?",
                        "Give me the whole family care summary",
                    ],
                    provider=self.provider_id,
                    is_mock=True,
                    disclaimer=DISCLAIMER_TEXT,
                    authorized_members_count=len(authorized_profiles),
                )

        # 7. Intent: Explanations of Recorded Health Vitals
        if any(k in cleaned_query for k in ["blood pressure", "bp", "128/82", "vital", "sugar", "glucose"]):
            explanation_text = (
                "🩺 Understanding Recorded Vitals (Informational Reference):\n\n"
                "• Blood Pressure (e.g. 128/82 mmHg recorded for Ramesh Sharma):\n"
                "  - Systolic (128 mmHg): Pressure in arteries when heart beats.\n"
                "  - Diastolic (82 mmHg): Pressure when heart rests between beats.\n"
                "  - Target Context: For senior patients under medical supervision for hypertension, "
                "clinical guidelines often target systolic readings below 130 mmHg. Dr. Mehta has noted this as stable.\n\n"
                "• Fasting Glucose (114 mg/dL recorded):\n"
                "  - Metformin 500mg supports post-meal glycemic regulation.\n\n"
                "Note: Individual target ranges should always be confirmed with your treating doctor."
            )
            return AIChatResponse(
                response=explanation_text,
                suggested_followups=[
                    "When is Ramesh's next cardiology review?",
                    "What medication schedule is Ramesh on?",
                    "Show today's care checklist",
                ],
                provider=self.provider_id,
                is_mock=True,
                disclaimer=DISCLAIMER_TEXT,
                authorized_members_count=len(authorized_profiles),
            )

        # 8. Default Intent: Comprehensive Daily Family Care Summary
        members_summary = []
        highlights = []
        for p in authorized_profiles:
            p_name_lower = p.full_name.lower()
            members_summary.append(
                f"• {p.full_name} ({p.relationship}, {p.age} yrs - {p.age_group.value.capitalize()}): "
                f"{p.care_notes or 'All vitals normal'}"
            )
            if "ramesh" in p_name_lower:
                highlights.append("• Ramesh Sharma: 1 dose due this afternoon (Metformin 500mg at 02:00 PM).")
                highlights.append("• Ramesh Sharma: Cardiology review scheduled for tomorrow at 10:30 AM.")
            elif "sunita" in p_name_lower:
                highlights.append("• Sunita Sharma: Morning Levothyroxine taken on schedule.")
            elif "ananya" in p_name_lower:
                highlights.append("• Ananya Sharma: Annual vision checkup upcoming.")
            elif "kavita" in p_name_lower:
                highlights.append("• Kavita Verma: Pediatric wellness checkup current.")

        if not highlights:
            highlights.append("• All recorded routine wellness logs are up to date.")

        summary_body = "\n".join(members_summary)
        highlights_body = "\n".join(highlights)
        default_text = (
            f"Namaste, {user.full_name}! Here is your personalized CareSaathi Family Overview for {datetime.now(timezone.utc).strftime('%A, %B %d')}:\n\n"
            f"👥 Authorized Family Members ({len(authorized_profiles)}):\n"
            f"{summary_body}\n\n"
            f"⏰ Key Highlights for Your Care Circle:\n"
            f"{highlights_body}\n\n"
            "How can I assist you with your family's care coordination today?"
        )

        return AIChatResponse(
            response=default_text,
            suggested_followups=[
                "Show today's medication schedule",
                "What appointments are upcoming?",
                "What care tasks are pending?",
                "Explain Ramesh's blood pressure reading",
            ],
            provider=self.provider_id,
            is_mock=True,
            disclaimer=DISCLAIMER_TEXT,
            authorized_members_count=len(authorized_profiles),
        )


# Global AI Assistant Service singleton instance
ai_assistant_service = MockAIAssistantProvider()
