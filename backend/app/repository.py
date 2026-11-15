"""Thread-safe In-Memory Data Store for CareSaathi Family Accounts & Profiles.

Note: In this development phase, profiles are managed through an in-memory repository
with initial fictional demonstration data. Future production integration will bind
this repository interface to Supabase PostgreSQL with database-enforced Row-Level Security.
"""

from datetime import datetime, timezone
import threading
from typing import Dict, List, Optional
import uuid

from app.auth import AuthenticatedUser, hash_password
from app.schemas import AgeGroup, FamilyMemberProfile, Role


class DataRepository:
    """Thread-safe repository managing Users and Family Member Profiles."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._users: Dict[str, AuthenticatedUser] = {}
        self._profiles: Dict[str, FamilyMemberProfile] = {}
        self._seed_demo_data()

    def _seed_demo_data(self) -> None:
        """Seed initial fictional demonstration users and family profiles."""
        now_iso = datetime.now(timezone.utc).isoformat()

        # Seed Family 1 Users (Sharma Family)
        pw_hash, salt = hash_password("DemoPassword123!")

        user_anil = AuthenticatedUser(
            user_id="user_anil_01",
            email="anil.sharma@example.com",
            full_name="Anil Sharma",
            family_id="fam_sharma_101",
            role=Role.FAMILY_OWNER,
            password_hash=pw_hash,
            salt=salt,
        )

        user_sunita = AuthenticatedUser(
            user_id="user_sunita_02",
            email="sunita.sharma@example.com",
            full_name="Sunita Sharma",
            family_id="fam_sharma_101",
            role=Role.PARENT_GUARDIAN,
            password_hash=pw_hash,
            salt=salt,
        )

        user_priya = AuthenticatedUser(
            user_id="user_caregiver_priya_03",
            email="nurse.priya@example.com",
            full_name="Nurse Priya Nair",
            family_id="fam_sharma_101",
            role=Role.CAREGIVER,
            password_hash=pw_hash,
            salt=salt,
        )

        # Seed Family 2 Users (Verma Family - for Cross-Family IDOR Isolation Testing)
        user_rajesh = AuthenticatedUser(
            user_id="user_rajesh_99",
            email="rajesh.verma@example.com",
            full_name="Rajesh Verma",
            family_id="fam_verma_202",
            role=Role.FAMILY_OWNER,
            password_hash=pw_hash,
            salt=salt,
        )

        self._users[user_anil.user_id] = user_anil
        self._users[user_sunita.user_id] = user_sunita
        self._users[user_priya.user_id] = user_priya
        self._users[user_rajesh.user_id] = user_rajesh

        # Seed Family 1 Profiles (Senior, Adults, Child)
        prof_ramesh = FamilyMemberProfile(
            profile_id="prof_ramesh_101",
            family_id="fam_sharma_101",
            full_name="Ramesh Sharma",
            age=74,
            age_group=AgeGroup.SENIOR_CITIZEN,
            relationship="Grandfather",
            blood_group="B+",
            emergency_contact="Anil Sharma (+91 98765 43210)",
            allergies="Penicillin (Severe)",
            care_notes="Hypertension (Controlled). Daily Amlodipine 5mg & Metformin 500mg.",
            guardian_user_ids=["user_anil_01"],
            assigned_caregiver_ids=["user_caregiver_priya_03"],
            created_at=now_iso,
            updated_at=now_iso,
        )

        prof_sunita = FamilyMemberProfile(
            profile_id="prof_sunita_102",
            family_id="fam_sharma_101",
            full_name="Sunita Sharma",
            age=48,
            age_group=AgeGroup.ADULT,
            relationship="Mother",
            blood_group="O+",
            emergency_contact="Anil Sharma (+91 98765 43210)",
            allergies="None reported",
            care_notes="Thyroid management: Morning Levothyroxine 50mcg on empty stomach.",
            guardian_user_ids=[],
            assigned_caregiver_ids=[],
            created_at=now_iso,
            updated_at=now_iso,
        )

        prof_anil = FamilyMemberProfile(
            profile_id="prof_anil_103",
            family_id="fam_sharma_101",
            full_name="Anil Sharma",
            age=50,
            age_group=AgeGroup.ADULT,
            relationship="Father (Coordinator)",
            blood_group="B+",
            emergency_contact="Sunita Sharma (+91 98765 43211)",
            allergies="Dust mite allergy",
            care_notes="Annual checkup scheduled. Regular exercise.",
            guardian_user_ids=[],
            assigned_caregiver_ids=[],
            created_at=now_iso,
            updated_at=now_iso,
        )

        prof_ananya = FamilyMemberProfile(
            profile_id="prof_ananya_104",
            family_id="fam_sharma_101",
            full_name="Ananya Sharma",
            age=17,
            age_group=AgeGroup.CHILD,
            relationship="Daughter",
            blood_group="O+",
            emergency_contact="Sunita Sharma (+91 98765 43211)",
            allergies="Peanuts (Mild)",
            care_notes="High school student. Immunizations current. Vision exam upcoming.",
            guardian_user_ids=["user_anil_01", "user_sunita_02"],
            assigned_caregiver_ids=[],
            created_at=now_iso,
            updated_at=now_iso,
        )

        # Seed Family 2 Profile (Cross-family test target)
        prof_kavita = FamilyMemberProfile(
            profile_id="prof_kavita_201",
            family_id="fam_verma_202",
            full_name="Kavita Verma",
            age=10,
            age_group=AgeGroup.CHILD,
            relationship="Daughter",
            blood_group="A+",
            emergency_contact="Rajesh Verma (+91 98222 33445)",
            allergies="None",
            care_notes="Pediatric wellness checkup scheduled.",
            guardian_user_ids=["user_rajesh_99"],
            assigned_caregiver_ids=[],
            created_at=now_iso,
            updated_at=now_iso,
        )

        self._profiles[prof_ramesh.profile_id] = prof_ramesh
        self._profiles[prof_sunita.profile_id] = prof_sunita
        self._profiles[prof_anil.profile_id] = prof_anil
        self._profiles[prof_ananya.profile_id] = prof_ananya
        self._profiles[prof_kavita.profile_id] = prof_kavita

    def get_user_by_id(self, user_id: str) -> Optional[AuthenticatedUser]:
        with self._lock:
            return self._users.get(user_id)

    def get_user_by_email(self, email: str) -> Optional[AuthenticatedUser]:
        with self._lock:
            email_lower = email.lower().strip()
            for user in self._users.values():
                if user.email.lower() == email_lower:
                    return user
            return None

    def list_family_profiles(self, family_id: str) -> List[FamilyMemberProfile]:
        with self._lock:
            return [p for p in self._profiles.values() if p.family_id == family_id]

    def get_profile_by_id(self, profile_id: str) -> Optional[FamilyMemberProfile]:
        with self._lock:
            return self._profiles.get(profile_id)

    def create_profile(
        self,
        family_id: str,
        full_name: str,
        age: int,
        relationship: str,
        blood_group: Optional[str] = None,
        emergency_contact: Optional[str] = None,
        allergies: Optional[str] = None,
        care_notes: Optional[str] = None,
        guardian_user_ids: Optional[List[str]] = None,
    ) -> FamilyMemberProfile:
        with self._lock:
            profile_id = f"prof_{uuid.uuid4().hex[:10]}"
            now_iso = datetime.now(timezone.utc).isoformat()
            age_group = FamilyMemberProfile.determine_age_group(age)

            new_profile = FamilyMemberProfile(
                profile_id=profile_id,
                family_id=family_id,
                full_name=full_name,
                age=age,
                age_group=age_group,
                relationship=relationship,
                blood_group=blood_group,
                emergency_contact=emergency_contact,
                allergies=allergies,
                care_notes=care_notes,
                guardian_user_ids=guardian_user_ids or [],
                assigned_caregiver_ids=[],
                created_at=now_iso,
                updated_at=now_iso,
            )
            self._profiles[profile_id] = new_profile
            return new_profile

    def update_profile(
        self,
        profile_id: str,
        updates: dict,
    ) -> Optional[FamilyMemberProfile]:
        with self._lock:
            profile = self._profiles.get(profile_id)
            if not profile:
                return None

            profile_dict = profile.model_dump()
            for key, val in updates.items():
                if val is not None:
                    profile_dict[key] = val

            if "age" in updates and updates["age"] is not None:
                profile_dict["age_group"] = FamilyMemberProfile.determine_age_group(updates["age"])

            profile_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
            updated_profile = FamilyMemberProfile(**profile_dict)
            self._profiles[profile_id] = updated_profile
            return updated_profile

    def delete_profile(self, profile_id: str) -> bool:
        with self._lock:
            return self._profiles.pop(profile_id, None) is not None


# Global repository instance
repository = DataRepository()
