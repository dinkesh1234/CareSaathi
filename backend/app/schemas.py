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
    history: Optional[List[AIChatMessage]] = Field(default_factory=list)


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

