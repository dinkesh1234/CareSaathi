"""Google Gemini API service for CareSaathi.

Provides production integration with the official Google GenAI SDK (gemini-2.5-flash).
Enforces strict medical safety guardrails:
- Strictly refuses clinical diagnoses, drug prescriptions, or dosage alterations.
- Prominently directs urgent queries to emergency services (108/112).
- Restricts contextual knowledge solely to caller's RBAC-authorized family profiles.
- Handles rate limiting, quota exhaustion, and API timeouts with graceful fallback.
"""

from typing import Any, Dict, List, Optional
import re

from app.config import settings
from app.schemas import AIChatMessage, AIChatResponse, FamilyMemberProfile
from app.services.ai_service import BaseAIAssistantProvider, DISCLAIMER_TEXT, MockAIAssistantProvider

try:
    from google import genai
    from google.genai import types
    _GENAI_AVAILABLE = True
except ImportError:
    _GENAI_AVAILABLE = False


SYSTEM_INSTRUCTION = """You are CareSaathi AI Care Coordinator, an intelligent assistant embedded in the CareSaathi Family Health Platform.
Your mission is to help family coordinators, parents, and caregivers organize routine health schedules, track medication adherence, prepare for doctor consultations, and summarize care handoffs.

STRICT CLINICAL SAFETY RULES:
1. You are an INFORMATIONAL CARE COORDINATOR, NOT a medical doctor.
2. NEVER provide clinical diagnoses, interpret raw diagnostic test results (e.g. ECG, MRI), or prescribe medications.
3. NEVER advise altering drug dosages or starting new medications.
4. For acute or severe symptoms (e.g. chest pain, difficulty breathing, sudden numbness, uncontrolled bleeding), immediately instruct the user to call emergency medical services (108 or 112 in India, 911 in the US) or visit the nearest emergency room.
5. Base all answers strictly on the authorized family records provided in the conversation context. Do not invent or assume data about members not in your authorized context.
6. Keep language warm, clear, accessible to family members and elderly seniors, and professional.
"""


class GeminiAIAssistantProvider(BaseAIAssistantProvider):
    """Google Gemini AI Assistant implementation with strict safety guardrails."""

    def __init__(self) -> None:
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL or "gemini-2.5-flash"
        self._client = None
        self._mock_fallback = MockAIAssistantProvider()

        if _GENAI_AVAILABLE and self.api_key:
            try:
                self._client = genai.Client(api_key=self.api_key)
            except Exception:
                self._client = None

    @property
    def is_available(self) -> bool:
        """Check if Gemini SDK and API key are configured and ready."""
        return bool(_GENAI_AVAILABLE and self._client)

    @property
    def provider_id(self) -> str:
        return f"google-{self.model_name}"

    def generate_response(
        self,
        user: Any,
        authorized_profiles: List[FamilyMemberProfile],
        query: str,
        history: Optional[List[AIChatMessage]] = None,
    ) -> AIChatResponse:
        """Generate response via Gemini API with safety guardrails and context injection."""
        # 1. Pre-API Guardrail: Immediate medical safety refusal for emergency or diagnostic queries
        refusal_response = self._mock_fallback._refuse_medical_diagnosis(query, user, authorized_profiles)
        if refusal_response:
            return refusal_response

        # 2. Check for Authorized Profiles Access
        if not authorized_profiles:
            return AIChatResponse(
                response=(
                    f"Namaste, {user.full_name}. Under your current role ({user.role.value}), you do not have "
                    "access to any family member records in this account. Please contact the Family Owner for delegated access."
                ),
                suggested_followups=["Switch active role in the topbar to test other permissions"],
                provider=self.provider_id,
                is_mock=False,
                disclaimer=DISCLAIMER_TEXT,
                authorized_members_count=0,
                authorized_member_names=[],
            )

        # 3. Fallback to mock provider if Gemini client is not initialized
        if not self.is_available:
            return self._mock_fallback.generate_response(user, authorized_profiles, query, history)

        # 4. Construct Contextual Prompt with Authorized Profiles
        profiles_context_lines = []
        for p in authorized_profiles:
            profiles_context_lines.append(
                f"- Name: {p.full_name}, Age: {p.age} ({p.age_group}), Relationship: {p.relationship}, "
                f"Blood Group: {p.blood_group or 'Not recorded'}, Allergies: {p.allergies or 'None'}, "
                f"Care Notes: {p.care_notes or 'Stable'}"
            )
        profiles_context_str = "\n".join(profiles_context_lines)

        user_context_str = f"Caller: {user.full_name} (Role: {user.role.value}, Family ID: {user.family_id})\n"

        prompt_with_context = (
            f"{user_context_str}\n"
            f"Authorized Family Members Records ({len(authorized_profiles)}):\n"
            f"{profiles_context_str}\n\n"
            f"User Question: {query}\n"
        )

        try:
            # Generate content using official google-genai client
            response = self._client.models.generate_content(
                model=self.model_name,
                contents=prompt_with_context,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    temperature=0.2,
                    max_output_tokens=2048,
                ),
            )

            generated_text = response.text or "I was unable to formulate a response based on the available records."

            return AIChatResponse(
                response=generated_text,
                suggested_followups=[
                    "Summarize today's family care schedule",
                    "What appointments are upcoming?",
                    "View prescribed medication instructions",
                ],
                provider=self.provider_id,
                is_mock=False,
                disclaimer=DISCLAIMER_TEXT,
                authorized_members_count=len(authorized_profiles),
                authorized_member_names=[p.full_name for p in authorized_profiles],
            )
        except Exception as err:
            # On rate limit (HTTP 429) or network issue, fail safely with fallback provider
            fallback_res = self._mock_fallback.generate_response(user, authorized_profiles, query, history)
            fallback_res.response = (
                f"{fallback_res.response}\n\n"
                f"*(Note: Generated via CareSaathi fallback coordinator while connecting to Gemini service: {str(err)[:60]})*"
            )
            return fallback_res


def get_ai_service() -> BaseAIAssistantProvider:
    """Factory returning Gemini provider when configured, or Mock provider otherwise."""
    if settings.is_gemini_configured and _GENAI_AVAILABLE:
        return GeminiAIAssistantProvider()
    return MockAIAssistantProvider()
