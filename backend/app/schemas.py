"""Data schemas and types for CareSaathi Family Profiles and RBAC."""

from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class Role(str, Enum):
    """User roles within a Family Account."""
    FAMILY_OWNER = "family_owner"      # Full administrative control over family account
    PARENT_GUARDIAN = "parent_guardian"  # Full control over child profiles and own profile
    ADULT_MEMBER = "adult_member"        # Standard adult family member (self-management)
    CAREGIVER = "caregiver"            # Delegated external/secondary caregiver with assigned access


class AgeGroup(str, Enum):
    """Age classification for family members."""
    CHILD = "child"           # 0 - 17 years old
    ADULT = "adult"           # 18 - 64 years old
    SENIOR_CITIZEN = "senior" # 65+ years old


class UserResponse(BaseModel):
    """Schema for authenticated user profile."""
    user_id: str
    email: str
    full_name: str
    family_id: str
    role: Role


class LoginRequest(BaseModel):
    """Login credentials schema."""
    email: str
    password: str


class TokenResponse(BaseModel):
    """Authentication token response schema."""
    access_token: str
    token_type: str = "Bearer"
    user: UserResponse


class FamilyMemberProfile(BaseModel):
    """Family Member Health Profile schema with RBAC metadata."""
    profile_id: str
    family_id: str
    full_name: str
    age: int = Field(ge=0, le=125)
    age_group: AgeGroup
    relationship: str
    blood_group: Optional[str] = None
    emergency_contact: Optional[str] = None
    allergies: Optional[str] = None
    care_notes: Optional[str] = None
    guardian_user_ids: List[str] = Field(default_factory=list)
    assigned_caregiver_ids: List[str] = Field(default_factory=list)
    created_at: str
    updated_at: str

    @classmethod
    def determine_age_group(cls, age: int) -> AgeGroup:
        """Derive appropriate age group from age."""
        if age < 18:
            return AgeGroup.CHILD
        elif age >= 65:
            return AgeGroup.SENIOR_CITIZEN
        return AgeGroup.ADULT


class ProfileCreateRequest(BaseModel):
    """Schema for creating a new family member profile."""
    full_name: str = Field(min_length=2, max_length=100)
    age: int = Field(ge=0, le=125)
    relationship: str = Field(min_length=2, max_length=50)
    blood_group: Optional[str] = Field(default=None, max_length=5)
    emergency_contact: Optional[str] = Field(default=None, max_length=100)
    allergies: Optional[str] = Field(default=None, max_length=250)
    care_notes: Optional[str] = Field(default=None, max_length=500)
    guardian_user_ids: Optional[List[str]] = None

    @field_validator("full_name", "relationship")
    @classmethod
    def sanitize_strings(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Field cannot be empty or only whitespace")
        return cleaned


class ProfileUpdateRequest(BaseModel):
    """Schema for updating an existing family member profile."""
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    age: Optional[int] = Field(default=None, ge=0, le=125)
    relationship: Optional[str] = Field(default=None, min_length=2, max_length=50)
    blood_group: Optional[str] = None
    emergency_contact: Optional[str] = None
    allergies: Optional[str] = None
    care_notes: Optional[str] = None


class CaregiverAssignmentRequest(BaseModel):
    """Schema for assigning or revoking caregiver permissions."""
    caregiver_user_id: str = Field(min_length=1)


class AIChatRole(str, Enum):
    """Message sender role in AI assistant chat."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class AIChatMessage(BaseModel):
    """Single chat message in conversation history."""
    role: AIChatRole
    content: str = Field(..., min_length=1, max_length=2000)
    timestamp: Optional[str] = None


class AIChatRequest(BaseModel):
    """User query request payload for CareSaathi AI Assistant."""
    message: str = Field(..., min_length=1, max_length=1000)
    history: Optional[List[AIChatMessage]] = Field(default_factory=list, validation_alias="conversation_history")

    model_config = {
        "populate_by_name": True,
    }


class SignupRequest(BaseModel):
    """User registration schema for new CareSaathi accounts."""
    email: str = Field(..., pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(..., min_length=8, description="Minimum 8 characters")
    full_name: str = Field(..., min_length=2, max_length=100)
    role: Role = Field(default=Role.FAMILY_OWNER)
    family_name: Optional[str] = Field(default=None, max_length=100)


# ==============================================================================
# Medication Center Schemas
# ==============================================================================
class MedicationStatus(str, Enum):
    PENDING = "pending"
    REPORTED_TAKEN = "reported_taken"
    SKIPPED = "skipped"


class MedicationItem(BaseModel):
    """Schema for a scheduled medication entry."""
    medication_id: str
    family_id: str
    profile_id: str
    patient_name: str
    name: str
    dosage: str
    schedule_time: str
    frequency: str = "Daily"
    refill_days_left: int = 14
    instructions: Optional[str] = None
    status_today: MedicationStatus = MedicationStatus.PENDING
    last_reported_at: Optional[str] = None
    reported_by_user_id: Optional[str] = None
    clinical_disclaimer: str = (
        "Recorded as reported by caregiver/patient. CareSaathi does not verify clinical ingestion."
    )
    created_at: str
    updated_at: str


class MedicationCreateRequest(BaseModel):
    """Payload to add a new medication schedule."""
    profile_id: str
    name: str = Field(..., min_length=2, max_length=100)
    dosage: str = Field(..., min_length=1, max_length=50)
    schedule_time: str = Field(..., description="e.g. 08:00 AM, 02:00 PM")
    frequency: str = Field(default="Daily")
    refill_days_left: int = Field(default=14, ge=0, le=365)
    instructions: Optional[str] = None


class MedicationUpdateRequest(BaseModel):
    """Payload to update medication schedule details."""
    name: Optional[str] = None
    dosage: Optional[str] = None
    schedule_time: Optional[str] = None
    frequency: Optional[str] = None
    refill_days_left: Optional[int] = None
    instructions: Optional[str] = None


class MedicationStatusUpdateRequest(BaseModel):
    """Payload to record user-reported medication status with audit timestamp."""
    status: MedicationStatus
    confirmation_notes: Optional[str] = None


# ==============================================================================
# Appointments Schemas
# ==============================================================================
class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class HealthcareAppointment(BaseModel):
    """Schema for a healthcare consultation or clinic visit."""
    appointment_id: str
    family_id: str
    profile_id: str
    patient_name: str
    doctor_name: str
    specialty: str
    appointment_date: str
    location: str
    notes: Optional[str] = None
    escort_user_id: Optional[str] = None
    escort_name: Optional[str] = None
    status: AppointmentStatus = AppointmentStatus.SCHEDULED
    created_at: str
    updated_at: str


class AppointmentCreateRequest(BaseModel):
    """Payload to schedule a healthcare appointment."""
    profile_id: str
    doctor_name: str = Field(..., min_length=2, max_length=100)
    specialty: str = Field(..., min_length=2, max_length=100)
    appointment_date: str = Field(..., description="ISO 8601 or YYYY-MM-DD HH:MM")
    location: str = Field(..., min_length=2, max_length=150)
    notes: Optional[str] = None
    escort_user_id: Optional[str] = None


class AppointmentUpdateRequest(BaseModel):
    """Payload to update an appointment."""
    doctor_name: Optional[str] = None
    specialty: Optional[str] = None
    appointment_date: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[AppointmentStatus] = None
    escort_user_id: Optional[str] = None


class AppointmentEscortRequest(BaseModel):
    """Payload to confirm or assign family escort."""
    escort_user_id: str
    escort_name: str


# ==============================================================================
# Care Continuity Engine & Handoff Schemas
# ==============================================================================
class HandoffStatus(str, Enum):
    PENDING = "pending"
    ACKNOWLEDGED = "acknowledged"
    COMPLETED = "completed"


class CaregiverHandoff(BaseModel):
    """Schema for a caregiver shift handoff record."""
    handoff_id: str
    family_id: str
    profile_id: str
    patient_name: str
    shift_type: str
    from_caregiver_name: str
    to_caregiver_name: str
    to_caregiver_id: Optional[str] = None
    priority: str = "routine"
    handoff_notes: str
    status: HandoffStatus = HandoffStatus.PENDING
    acknowledged_at: Optional[str] = None
    created_at: str


class CaregiverHandoffCreateRequest(BaseModel):
    """Payload to record a new shift handoff."""
    profile_id: str
    shift_type: str = Field(..., description="e.g. Morning Shift, Evening Shift")
    from_caregiver_name: str
    to_caregiver_name: str
    to_caregiver_id: Optional[str] = None
    priority: str = Field(default="routine", description="routine | urgent | critical")
    handoff_notes: str = Field(..., min_length=5, max_length=1000)


class CareGapSeverity(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    ROUTINE = "routine"


class CareGapAlert(BaseModel):
    """Schema for a detected care gap from stored data."""
    alert_id: str
    severity: CareGapSeverity
    category: str
    title: str
    reason: str
    profile_id: str
    patient_name: str
    suggested_action: str
    assigned_to: Optional[str] = None
    is_resolved: bool = False
    detected_at: str


class CareActivityRecord(BaseModel):
    """Audit log entry for recent family care actions."""
    activity_id: str
    family_id: str
    icon: str
    title: str
    subtitle: str
    actor_name: str
    timestamp: str


class CareContinuityOverview(BaseModel):
    """Aggregated care continuity overview payload for the dashboard."""
    family_id: str
    detected_care_gaps: List[CareGapAlert]
    active_handoffs: List[CaregiverHandoff]
    pending_medications_today: List[MedicationItem]
    upcoming_appointments: List[HealthcareAppointment]
    recent_activity: List[CareActivityRecord]
    high_priority_gaps_count: int
    unconfirmed_meds_count: int


class AIChatResponse(BaseModel):
    """AI Assistant response structure with safety metadata."""
    response: str
    suggested_followups: List[str] = Field(default_factory=list)
    provider: str = "mock-care-assistant-v1"
    is_mock: bool = True
    disclaimer: str
    authorized_members_count: int = 0
    authorized_member_names: List[str] = Field(default_factory=list)


class AICapabilitiesResponse(BaseModel):
    """Metadata response describing AI Assistant features and readiness."""
    status: str = "operational"
    provider: str = "mock-care-assistant-v1"
    is_mock: bool = True
    capabilities: List[str]
    disclaimer: str


# ==============================================================================
# Family Invitation Schemas
# ==============================================================================
class InvitationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class InvitationCreateRequest(BaseModel):
    """Payload to invite a family member or caregiver via email."""
    invitee_email: str = Field(..., pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", description="Valid email address")
    role: Role = Role.ADULT_MEMBER
    target_profile_id: Optional[str] = None
    relationship: Optional[str] = Field(default="Family Member", max_length=50)


class FamilyInvitation(BaseModel):
    """Schema for a family circle invitation."""
    invitation_id: str
    family_id: str
    family_name: str
    invited_by_user_id: str
    invited_by_name: str
    invitee_email: str
    role: Role
    token: str
    status: InvitationStatus = InvitationStatus.PENDING
    target_profile_id: Optional[str] = None
    relationship: str = "Family Member"
    expires_at: str
    created_at: str
    invitation_link: str

