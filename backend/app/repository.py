"""Thread-safe In-Memory Data Store for CareSaathi Family Accounts & Profiles.

Note: In this development phase, profiles are managed through an in-memory repository
with initial fictional demonstration data. Future production integration will bind
this repository interface to Supabase PostgreSQL with database-enforced Row-Level Security.
"""

from datetime import datetime, timezone, timedelta
import secrets
import threading
from typing import Any, Dict, List, Optional
import uuid

from app.auth import AuthenticatedUser, hash_password
from app.schemas import (
    AgeGroup,
    AppointmentStatus,
    CareActivityRecord,
    CareGapAlert,
    CareGapSeverity,
    CaregiverHandoff,
    CareContinuityOverview,
    FamilyInvitation,
    FamilyMemberProfile,
    HandoffStatus,
    HealthcareAppointment,
    InvitationStatus,
    MedicationItem,
    MedicationStatus,
    Role,
)


class DataRepository:
    """Thread-safe repository managing Users, Profiles, Medications, Appointments, and Care Continuity."""

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._users: Dict[str, AuthenticatedUser] = {}
        self._profiles: Dict[str, FamilyMemberProfile] = {}
        self._medications: Dict[str, MedicationItem] = {}
        self._appointments: Dict[str, HealthcareAppointment] = {}
        self._handoffs: Dict[str, CaregiverHandoff] = {}
        self._invitations: Dict[str, FamilyInvitation] = {}
        self._activities: List[CareActivityRecord] = []
        self._resolved_gap_ids: set[str] = set()
        self._seed_demo_data()

    @property
    def users(self) -> Dict[str, AuthenticatedUser]:
        return self._users

    @property
    def profiles(self) -> Dict[str, FamilyMemberProfile]:
        return self._profiles

    @property
    def medications(self) -> Dict[str, MedicationItem]:
        return self._medications

    @property
    def appointments(self) -> Dict[str, HealthcareAppointment]:
        return self._appointments

    @property
    def handoffs(self) -> Dict[str, CaregiverHandoff]:
        return self._handoffs

    def _seed_demo_data(self) -> None:
        """Seed initial fictional demonstration users and family profiles."""
        self._users.clear()
        self._profiles.clear()
        self._medications.clear()
        self._appointments.clear()
        self._handoffs.clear()
        self._activities.clear()
        self._invitations.clear()
        self._resolved_gap_ids.clear()

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

        # --- Seed Medications for Sharma Family ---
        med_amlodipine = MedicationItem(
            medication_id="med_amlodipine_01",
            family_id="fam_sharma_101",
            profile_id="prof_ramesh_101",
            patient_name="Ramesh Sharma",
            name="Amlodipine",
            dosage="5mg",
            schedule_time="08:00 AM",
            frequency="Daily (Morning)",
            refill_days_left=14,
            instructions="Take after breakfast with water. Monitored for blood pressure control.",
            status_today=MedicationStatus.PENDING,
            created_at=now_iso,
            updated_at=now_iso,
        )

        med_metformin = MedicationItem(
            medication_id="med_metformin_02",
            family_id="fam_sharma_101",
            profile_id="prof_ramesh_101",
            patient_name="Ramesh Sharma",
            name="Metformin",
            dosage="500mg",
            schedule_time="02:00 PM",
            frequency="Daily (Post Lunch)",
            refill_days_left=4, # Trigger for Low Refill Care Gap
            instructions="Take immediately after lunch. Blood sugar management.",
            status_today=MedicationStatus.PENDING,
            created_at=now_iso,
            updated_at=now_iso,
        )

        med_atorvastatin = MedicationItem(
            medication_id="med_atorvastatin_03",
            family_id="fam_sharma_101",
            profile_id="prof_ramesh_101",
            patient_name="Ramesh Sharma",
            name="Atorvastatin",
            dosage="10mg",
            schedule_time="09:00 PM",
            frequency="Daily (Bedtime)",
            refill_days_left=20,
            instructions="Take after dinner.",
            status_today=MedicationStatus.PENDING,
            created_at=now_iso,
            updated_at=now_iso,
        )

        med_levothyroxine = MedicationItem(
            medication_id="med_levothyroxine_04",
            family_id="fam_sharma_101",
            profile_id="prof_sunita_102",
            patient_name="Sunita Sharma",
            name="Levothyroxine",
            dosage="50mcg",
            schedule_time="07:00 AM",
            frequency="Daily (Empty Stomach)",
            refill_days_left=22,
            instructions="Take 30 minutes before breakfast with full glass of water.",
            status_today=MedicationStatus.REPORTED_TAKEN,
            last_reported_at="07:15 AM today",
            reported_by_user_id="user_sunita_02",
            created_at=now_iso,
            updated_at=now_iso,
        )

        self._medications[med_amlodipine.medication_id] = med_amlodipine
        self._medications[med_metformin.medication_id] = med_metformin
        self._medications[med_atorvastatin.medication_id] = med_atorvastatin
        self._medications[med_levothyroxine.medication_id] = med_levothyroxine

        # --- Seed Appointments for Sharma Family ---
        apt_cardio = HealthcareAppointment(
            appointment_id="apt_cardio_101",
            family_id="fam_sharma_101",
            profile_id="prof_ramesh_101",
            patient_name="Ramesh Sharma",
            doctor_name="Dr. Vikram Mehta",
            specialty="Cardiologist",
            appointment_date="Tomorrow at 10:30 AM",
            location="Max Healthcare Clinic, Indiranagar",
            notes="Routine 3-month hypertension checkup and ECG review. Blood pressure logs to be presented.",
            escort_user_id=None, # Trigger for Unassigned Escort Care Gap
            escort_name=None,
            status=AppointmentStatus.SCHEDULED,
            created_at=now_iso,
            updated_at=now_iso,
        )

        apt_dental = HealthcareAppointment(
            appointment_id="apt_dental_102",
            family_id="fam_sharma_101",
            profile_id="prof_ananya_104",
            patient_name="Ananya Sharma",
            doctor_name="Dr. K. Sharma",
            specialty="Pediatric Dental Care",
            appointment_date="Friday at 04:00 PM",
            location="Apex Dental Studio, Whitefield",
            notes="Semi-annual dental cleaning and orthodontic evaluation.",
            escort_user_id="user_sunita_02",
            escort_name="Sunita Sharma",
            status=AppointmentStatus.SCHEDULED,
            created_at=now_iso,
            updated_at=now_iso,
        )

        self._appointments[apt_cardio.appointment_id] = apt_cardio
        self._appointments[apt_dental.appointment_id] = apt_dental

        # --- Seed Caregiver Handoffs for Sharma Family ---
        hoff_morning = CaregiverHandoff(
            handoff_id="hoff_morning_01",
            family_id="fam_sharma_101",
            profile_id="prof_ramesh_101",
            patient_name="Ramesh Sharma",
            shift_type="Morning Shift",
            from_caregiver_name="Nurse Priya Nair",
            to_caregiver_name="Anil Sharma (Evening Coordinator)",
            to_caregiver_id="user_anil_01",
            priority="routine",
            handoff_notes="Ramesh had a good morning walk. Breakfast completed. Morning BP normal at 126/82 mmHg. Metformin 500mg due with lunch at 2:00 PM.",
            status=HandoffStatus.PENDING, # Trigger for Unacknowledged Handoff Care Gap
            created_at=now_iso,
        )
        self._handoffs[hoff_morning.handoff_id] = hoff_morning

        # --- Seed Initial Activity History ---
        self._activities.extend([
            CareActivityRecord(
                activity_id="act_01",
                family_id="fam_sharma_101",
                icon="🩺",
                title="Morning Vitals Logged for Ramesh Sharma",
                subtitle="BP: 126/82 mmHg &bull; Heart Rate: 72 bpm &bull; Verified by Nurse Priya",
                actor_name="Nurse Priya Nair",
                timestamp="15 mins ago • Vitals",
            ),
            CareActivityRecord(
                activity_id="act_02",
                family_id="fam_sharma_101",
                icon="💊",
                title="Sunita Sharma reported morning dose taken",
                subtitle="Levothyroxine 50mcg confirmed on empty stomach",
                actor_name="Sunita Sharma",
                timestamp="2 hours ago • Medication",
            ),
            CareActivityRecord(
                activity_id="act_03",
                family_id="fam_sharma_101",
                icon="📅",
                title="Cardiology appointment scheduled with Dr. Vikram Mehta",
                subtitle="Scheduled for tomorrow at 10:30 AM at Max Healthcare Clinic",
                actor_name="Anil Sharma",
                timestamp="Yesterday • Appointments",
            ),
            CareActivityRecord(
                activity_id="act_04",
                family_id="fam_sharma_101",
                icon="📋",
                title="Shift handoff note logged by Nurse Priya Nair",
                subtitle="Morning Shift handoff to Anil Sharma awaiting confirmation",
                actor_name="Nurse Priya Nair",
                timestamp="3 hours ago • Care Continuity",
            ),
        ])

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

    # ==========================================================================
    # Medications Operations
    # ==========================================================================
    def list_medications(self, family_id: str, profile_id: Optional[str] = None) -> List[MedicationItem]:
        with self._lock:
            meds = [m for m in self._medications.values() if m.family_id == family_id]
            if profile_id:
                meds = [m for m in meds if m.profile_id == profile_id]
            return meds

    def get_medication(self, medication_id: str) -> Optional[MedicationItem]:
        with self._lock:
            return self._medications.get(medication_id)

    def create_medication(
        self,
        family_id: str,
        profile_id: str,
        name: str,
        dosage: str,
        schedule_time: str,
        frequency: str = "Daily",
        refill_days_left: int = 14,
        instructions: Optional[str] = None,
    ) -> MedicationItem:
        with self._lock:
            profile = self._profiles.get(profile_id)
            patient_name = profile.full_name if profile else "Family Member"
            med_id = f"med_{uuid.uuid4().hex[:10]}"
            now_iso = datetime.now(timezone.utc).isoformat()

            new_med = MedicationItem(
                medication_id=med_id,
                family_id=family_id,
                profile_id=profile_id,
                patient_name=patient_name,
                name=name,
                dosage=dosage,
                schedule_time=schedule_time,
                frequency=frequency,
                refill_days_left=refill_days_left,
                instructions=instructions,
                status_today=MedicationStatus.PENDING,
                created_at=now_iso,
                updated_at=now_iso,
            )
            self._medications[med_id] = new_med

            self.record_activity(
                family_id=family_id,
                icon="💊",
                title=f"New medication schedule added: {name} ({dosage})",
                subtitle=f"Prescribed for {patient_name} &bull; {schedule_time}",
                actor_name="Family Coordinator",
            )
            return new_med

    def update_medication(self, medication_id: str, updates: dict) -> Optional[MedicationItem]:
        with self._lock:
            med = self._medications.get(medication_id)
            if not med:
                return None
            med_dict = med.model_dump()
            for k, v in updates.items():
                if v is not None:
                    med_dict[k] = v
            med_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
            updated = MedicationItem(**med_dict)
            self._medications[medication_id] = updated
            return updated

    def update_medication_status(
        self,
        medication_id: str,
        status: MedicationStatus,
        user_id: str,
        notes: Optional[str] = None,
    ) -> Optional[MedicationItem]:
        with self._lock:
            med = self._medications.get(medication_id)
            if not med:
                return None
            user = self._users.get(user_id)
            actor_name = user.full_name if user else "Family Caregiver"

            now_time = datetime.now(timezone.utc).strftime("%I:%M %p today")
            now_iso = datetime.now(timezone.utc).isoformat()

            med_dict = med.model_dump()
            med_dict["status_today"] = status
            med_dict["last_reported_at"] = now_time
            med_dict["reported_by_user_id"] = user_id
            med_dict["updated_at"] = now_iso

            updated = MedicationItem(**med_dict)
            self._medications[medication_id] = updated

            status_label = "reported taken" if status == MedicationStatus.REPORTED_TAKEN else status.value
            self.record_activity(
                family_id=med.family_id,
                icon="💊",
                title=f"{med.patient_name}'s {med.name} dose {status_label}",
                subtitle=f"Reported by {actor_name} at {now_time}. Note: Does not verify clinical ingestion.",
                actor_name=actor_name,
            )
            return updated

    def delete_medication(self, medication_id: str) -> bool:
        with self._lock:
            return self._medications.pop(medication_id, None) is not None

    # ==========================================================================
    # Appointments Operations
    # ==========================================================================
    def list_appointments(self, family_id: str, profile_id: Optional[str] = None) -> List[HealthcareAppointment]:
        with self._lock:
            apts = [a for a in self._appointments.values() if a.family_id == family_id]
            if profile_id:
                apts = [a for a in apts if a.profile_id == profile_id]
            return apts

    def get_appointment(self, appointment_id: str) -> Optional[HealthcareAppointment]:
        with self._lock:
            return self._appointments.get(appointment_id)

    def create_appointment(
        self,
        family_id: str,
        profile_id: str,
        doctor_name: str,
        specialty: str,
        appointment_date: str,
        location: str,
        notes: Optional[str] = None,
        escort_user_id: Optional[str] = None,
    ) -> HealthcareAppointment:
        with self._lock:
            profile = self._profiles.get(profile_id)
            patient_name = profile.full_name if profile else "Family Member"
            apt_id = f"apt_{uuid.uuid4().hex[:10]}"
            now_iso = datetime.now(timezone.utc).isoformat()

            escort_name = None
            if escort_user_id and escort_user_id in self._users:
                escort_name = self._users[escort_user_id].full_name

            new_apt = HealthcareAppointment(
                appointment_id=apt_id,
                family_id=family_id,
                profile_id=profile_id,
                patient_name=patient_name,
                doctor_name=doctor_name,
                specialty=specialty,
                appointment_date=appointment_date,
                location=location,
                notes=notes,
                escort_user_id=escort_user_id,
                escort_name=escort_name,
                status=AppointmentStatus.SCHEDULED,
                created_at=now_iso,
                updated_at=now_iso,
            )
            self._appointments[apt_id] = new_apt

            self.record_activity(
                family_id=family_id,
                icon="📅",
                title=f"Appointment scheduled: {patient_name} with {doctor_name}",
                subtitle=f"{appointment_date} &bull; {location}",
                actor_name="Family Coordinator",
            )
            return new_apt

    def update_appointment(self, appointment_id: str, updates: dict) -> Optional[HealthcareAppointment]:
        with self._lock:
            apt = self._appointments.get(appointment_id)
            if not apt:
                return None
            apt_dict = apt.model_dump()
            for k, v in updates.items():
                if v is not None:
                    apt_dict[k] = v
            apt_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
            updated = HealthcareAppointment(**apt_dict)
            self._appointments[appointment_id] = updated
            return updated

    def confirm_appointment_escort(
        self,
        appointment_id: str,
        escort_user_id: str,
        escort_name: str,
    ) -> Optional[HealthcareAppointment]:
        with self._lock:
            apt = self._appointments.get(appointment_id)
            if not apt:
                return None
            apt_dict = apt.model_dump()
            apt_dict["escort_user_id"] = escort_user_id
            apt_dict["escort_name"] = escort_name
            apt_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
            updated = HealthcareAppointment(**apt_dict)
            self._appointments[appointment_id] = updated

            self.record_activity(
                family_id=apt.family_id,
                icon="🤝",
                title=f"Escort confirmed for {apt.patient_name}'s appointment",
                subtitle=f"{escort_name} assigned as confirmed accompaniment for {apt.doctor_name} visit",
                actor_name=escort_name,
            )
            return updated

    def delete_appointment(self, appointment_id: str) -> bool:
        with self._lock:
            return self._appointments.pop(appointment_id, None) is not None

    # ==========================================================================
    # Caregiver Handoffs Operations
    # ==========================================================================
    def list_handoffs(self, family_id: str, profile_id: Optional[str] = None) -> List[CaregiverHandoff]:
        with self._lock:
            hoffs = [h for h in self._handoffs.values() if h.family_id == family_id]
            if profile_id:
                hoffs = [h for h in hoffs if h.profile_id == profile_id]
            return hoffs

    def create_handoff(
        self,
        family_id: str,
        profile_id: str,
        shift_type: str,
        from_caregiver_name: str,
        to_caregiver_name: str,
        handoff_notes: str,
        to_caregiver_id: Optional[str] = None,
        priority: str = "routine",
    ) -> CaregiverHandoff:
        with self._lock:
            profile = self._profiles.get(profile_id)
            patient_name = profile.full_name if profile else "Family Member"
            hoff_id = f"hoff_{uuid.uuid4().hex[:10]}"
            now_iso = datetime.now(timezone.utc).isoformat()

            new_hoff = CaregiverHandoff(
                handoff_id=hoff_id,
                family_id=family_id,
                profile_id=profile_id,
                patient_name=patient_name,
                shift_type=shift_type,
                from_caregiver_name=from_caregiver_name,
                to_caregiver_name=to_caregiver_name,
                to_caregiver_id=to_caregiver_id,
                priority=priority,
                handoff_notes=handoff_notes,
                status=HandoffStatus.PENDING,
                created_at=now_iso,
            )
            self._handoffs[hoff_id] = new_hoff

            self.record_activity(
                family_id=family_id,
                icon="📋",
                title=f"Shift handoff logged: {shift_type} ({patient_name})",
                subtitle=f"From {from_caregiver_name} to {to_caregiver_name} &bull; Priority: {priority.upper()}",
                actor_name=from_caregiver_name,
            )
            return new_hoff

    def acknowledge_handoff(self, handoff_id: str, user_id: str) -> Optional[CaregiverHandoff]:
        with self._lock:
            hoff = self._handoffs.get(handoff_id)
            if not hoff:
                return None
            user = self._users.get(user_id)
            actor_name = user.full_name if user else "Caregiver"
            now_iso = datetime.now(timezone.utc).isoformat()

            hoff_dict = hoff.model_dump()
            hoff_dict["status"] = HandoffStatus.ACKNOWLEDGED
            hoff_dict["acknowledged_at"] = now_iso
            updated = CaregiverHandoff(**hoff_dict)
            self._handoffs[handoff_id] = updated

            self.record_activity(
                family_id=hoff.family_id,
                icon="✅",
                title=f"Shift handoff acknowledged by {actor_name}",
                subtitle=f"{hoff.shift_type} responsibility accepted for {hoff.patient_name}",
                actor_name=actor_name,
            )
            return updated

    def complete_handoff(self, handoff_id: str) -> Optional[CaregiverHandoff]:
        with self._lock:
            hoff = self._handoffs.get(handoff_id)
            if not hoff:
                return None
            hoff_dict = hoff.model_dump()
            hoff_dict["status"] = HandoffStatus.COMPLETED
            updated = CaregiverHandoff(**hoff_dict)
            self._handoffs[handoff_id] = updated
            return updated

    # ==========================================================================
    # Activity History
    # ==========================================================================
    def record_activity(
        self,
        family_id: str,
        icon: str,
        title: str,
        subtitle: str,
        actor_name: str,
    ) -> CareActivityRecord:
        act_id = f"act_{uuid.uuid4().hex[:10]}"
        now_time = datetime.now(timezone.utc).strftime("%I:%M %p today")
        act = CareActivityRecord(
            activity_id=act_id,
            family_id=family_id,
            icon=icon,
            title=title,
            subtitle=subtitle,
            actor_name=actor_name,
            timestamp=now_time,
        )
        self._activities.insert(0, act)
        if len(self._activities) > 50:
            self._activities.pop()
        return act

    def list_activities(self, family_id: str, limit: int = 15) -> List[CareActivityRecord]:
        with self._lock:
            return [a for a in self._activities if a.family_id == family_id][:limit]

    # ==========================================================================
    # Care Continuity Engine (Detection of Unresolved Care Gaps from Stored Data)
    # ==========================================================================
    def get_care_continuity_overview(self, family_id: str) -> CareContinuityOverview:
        with self._lock:
            meds = [m for m in self._medications.values() if m.family_id == family_id]
            apts = [a for a in self._appointments.values() if a.family_id == family_id]
            hoffs = [h for h in self._handoffs.values() if h.family_id == family_id]
            activities = [a for a in self._activities if a.family_id == family_id][:15]

            gaps: List[CareGapAlert] = []
            now_iso = datetime.now(timezone.utc).isoformat()

            # Rule 1: Detect unconfirmed medication dose due today (Elderly Care Focus)
            for m in meds:
                alert_id = f"gap_med_{m.medication_id}"
                if alert_id in self._resolved_gap_ids:
                    continue

                if m.status_today == MedicationStatus.PENDING:
                    # Elderly patient morning or afternoon doses flagged as high priority
                    severity = CareGapSeverity.HIGH if "08:00 AM" in m.schedule_time or "Morning" in m.frequency else CareGapSeverity.MEDIUM
                    gaps.append(
                        CareGapAlert(
                            alert_id=alert_id,
                            severity=severity,
                            category="medication_adherence",
                            title=f"Unconfirmed Dose: {m.patient_name} - {m.name} ({m.dosage})",
                            reason=(
                                f"Scheduled for {m.schedule_time}. Status remains pending and has not been confirmed "
                                f"by an attending caregiver or patient report."
                            ),
                            profile_id=m.profile_id,
                            patient_name=m.patient_name,
                            suggested_action=f"Check with {m.patient_name} or attending nurse to confirm administration.",
                            assigned_to="Nurse Priya Nair" if "ramesh" in m.profile_id else "Family Coordinator",
                            is_resolved=False,
                            detected_at=now_iso,
                        )
                    )

                # Rule 2: Detect low medication refills (<= 5 days supply)
                refill_alert_id = f"gap_refill_{m.medication_id}"
                if refill_alert_id not in self._resolved_gap_ids and m.refill_days_left <= 5:
                    gaps.append(
                        CareGapAlert(
                            alert_id=refill_alert_id,
                            severity=CareGapSeverity.MEDIUM,
                            category="refill_warning",
                            title=f"Low Supply Warning: {m.patient_name} - {m.name}",
                            reason=f"Only {m.refill_days_left} days of medication supply remaining. Risk of treatment interruption.",
                            profile_id=m.profile_id,
                            patient_name=m.patient_name,
                            suggested_action="Request pharmacy refill or contact prescribing doctor.",
                            assigned_to="Anil Sharma (Coordinator)",
                            is_resolved=False,
                            detected_at=now_iso,
                        )
                    )

            # Rule 3: Detect appointments lacking confirmed family/caregiver escort
            for a in apts:
                alert_id = f"gap_escort_{a.appointment_id}"
                if alert_id in self._resolved_gap_ids:
                    continue

                if not a.escort_user_id and a.status == AppointmentStatus.SCHEDULED:
                    gaps.append(
                        CareGapAlert(
                            alert_id=alert_id,
                            severity=CareGapSeverity.HIGH,
                            category="appointment_coordination",
                            title=f"Unassigned Escort: {a.patient_name} with {a.doctor_name}",
                            reason=(
                                f"Consultation scheduled for {a.appointment_date} at {a.location}. "
                                f"No family member or caregiver is confirmed to accompany the patient."
                            ),
                            profile_id=a.profile_id,
                            patient_name=a.patient_name,
                            suggested_action="Assign a family member or caregiver as confirmed accompaniment.",
                            assigned_to="Anil Sharma (Coordinator)",
                            is_resolved=False,
                            detected_at=now_iso,
                        )
                    )

            # Rule 4: Detect unacknowledged shift handoffs
            for h in hoffs:
                alert_id = f"gap_hoff_{h.handoff_id}"
                if alert_id in self._resolved_gap_ids:
                    continue

                if h.status == HandoffStatus.PENDING:
                    gaps.append(
                        CareGapAlert(
                            alert_id=alert_id,
                            severity=CareGapSeverity.HIGH,
                            category="caregiver_continuity",
                            title=f"Pending Shift Handoff: {h.patient_name} ({h.shift_type})",
                            reason=f"Shift continuity note from {h.from_caregiver_name} has not yet been acknowledged by {h.to_caregiver_name}.",
                            profile_id=h.profile_id,
                            patient_name=h.patient_name,
                            suggested_action=f"Review shift instructions and acknowledge acceptance in Care Continuity Center.",
                            assigned_to=h.to_caregiver_name,
                            is_resolved=False,
                            detected_at=now_iso,
                        )
                    )

            high_count = sum(1 for g in gaps if g.severity == CareGapSeverity.HIGH)
            unconfirmed_meds = sum(1 for m in meds if m.status_today == MedicationStatus.PENDING)

            return CareContinuityOverview(
                family_id=family_id,
                detected_care_gaps=gaps,
                active_handoffs=hoffs,
                pending_medications_today=[m for m in meds if m.status_today == MedicationStatus.PENDING],
                upcoming_appointments=[a for a in apts if a.status == AppointmentStatus.SCHEDULED],
                recent_activity=activities,
                high_priority_gaps_count=high_count,
                unconfirmed_meds_count=unconfirmed_meds,
            )

    def resolve_care_gap(self, alert_id: str, user_id: str, notes: Optional[str] = None) -> bool:
        with self._lock:
            self._resolved_gap_ids.add(alert_id)
            user = self._users.get(user_id)
            actor_name = user.full_name if user else "Care Coordinator"
            self.record_activity(
                family_id="fam_sharma_101",
                icon="🛡️",
                title="Care gap alert resolved",
                subtitle=f"Alert [{alert_id}] acknowledged and marked resolved by {actor_name}. {notes or ''}".strip(),
                actor_name=actor_name,
            )
            return True

    # --- Family Circle Invitations & Member Management ---

    def create_invitation(
        self,
        family_id: str,
        family_name: str,
        invited_by_user_id: str,
        invited_by_name: str,
        invitee_email: str,
        role: Role = Role.ADULT_MEMBER,
        target_profile_id: Optional[str] = None,
        relationship: str = "Family Member",
    ) -> FamilyInvitation:
        with self._lock:
            invitation_id = f"inv_{uuid.uuid4().hex[:10]}"
            token = f"invt_{secrets.token_urlsafe(24)}"
            now = datetime.now(timezone.utc)
            expires_at = (now + timedelta(days=7)).isoformat()
            now_iso = now.isoformat()
            link = f"http://127.0.0.1:3000/?invite_token={token}"

            inv = FamilyInvitation(
                invitation_id=invitation_id,
                family_id=family_id,
                family_name=family_name,
                invited_by_user_id=invited_by_user_id,
                invited_by_name=invited_by_name,
                invitee_email=invitee_email.lower().strip(),
                role=role,
                token=token,
                status=InvitationStatus.PENDING,
                target_profile_id=target_profile_id,
                relationship=relationship,
                expires_at=expires_at,
                created_at=now_iso,
                invitation_link=link,
            )
            self._invitations[token] = inv
            self.record_activity(
                family_id=family_id,
                icon="✉️",
                title="Family member invited",
                subtitle=f"{invited_by_name} sent a care circle invitation to {invitee_email} as {role.value.replace('_', ' ').title()}.",
                actor_name=invited_by_name,
            )
            return inv

    def list_invitations(self, family_id: str) -> List[FamilyInvitation]:
        with self._lock:
            now_iso = datetime.now(timezone.utc).isoformat()
            results = []
            for inv in self._invitations.values():
                if inv.family_id == family_id:
                    # Auto-expire if past expires_at
                    if inv.status == InvitationStatus.PENDING and inv.expires_at < now_iso:
                        inv.status = InvitationStatus.EXPIRED
                    results.append(inv)
            return sorted(results, key=lambda x: x.created_at, reverse=True)

    def get_invitation_by_token(self, token: str) -> Optional[FamilyInvitation]:
        with self._lock:
            inv = self._invitations.get(token)
            if not inv:
                return None
            now_iso = datetime.now(timezone.utc).isoformat()
            if inv.status == InvitationStatus.PENDING and inv.expires_at < now_iso:
                inv.status = InvitationStatus.EXPIRED
            return inv

    def accept_invitation(self, token: str, user_id: str, user_email: str) -> Optional[FamilyInvitation]:
        with self._lock:
            inv = self.get_invitation_by_token(token)
            if not inv or inv.status != InvitationStatus.PENDING:
                return None

            user = self._users.get(user_id)
            if not user:
                return None

            # Verify email match (case-insensitive)
            if user_email.lower().strip() != inv.invitee_email.lower().strip():
                return None

            # Add user to the invited family and assign role
            user.family_id = inv.family_id
            user.role = inv.role
            inv.status = InvitationStatus.ACCEPTED

            # If assigned to a target profile as caregiver
            if inv.target_profile_id and inv.role == Role.CAREGIVER:
                profile = self._profiles.get(inv.target_profile_id)
                if profile and user_id not in profile.assigned_caregiver_ids:
                    profile.assigned_caregiver_ids.append(user_id)

            self.record_activity(
                family_id=inv.family_id,
                icon="🤝",
                title="Care circle invitation accepted",
                subtitle=f"{user.full_name} ({user_email}) joined the family care circle as {inv.role.value.replace('_', ' ').title()}.",
                actor_name=user.full_name,
            )
            return inv

    def cancel_invitation(self, invitation_id: str, family_id: str) -> bool:
        with self._lock:
            for token, inv in list(self._invitations.items()):
                if inv.invitation_id == invitation_id and inv.family_id == family_id:
                    inv.status = InvitationStatus.CANCELLED
                    return True
            return False

    def delete_profile(self, profile_id: str, family_id: Optional[str] = None) -> bool:
        with self._lock:
            profile = self._profiles.get(profile_id)
            if not profile:
                return False
            if family_id and profile.family_id != family_id:
                return False
            target_family_id = profile.family_id
            name = profile.full_name
            del self._profiles[profile_id]
            for mid, m in list(self._medications.items()):
                if m.profile_id == profile_id:
                    del self._medications[mid]
            for aid, a in list(self._appointments.items()):
                if a.profile_id == profile_id:
                    del self._appointments[aid]
            self.record_activity(
                family_id=target_family_id,
                icon="🗑️",
                title="Family profile removed",
                subtitle=f"{name}'s profile was removed from the family circle.",
                actor_name="Family Owner",
            )
            return True

    def remove_user_from_family(self, user_id: str, family_id: str) -> bool:
        with self._lock:
            user = self._users.get(user_id)
            if user and user.family_id == family_id:
                user.family_id = f"fam_isolated_{uuid.uuid4().hex[:6]}"
                user.role = Role.FAMILY_OWNER
                for p in self._profiles.values():
                    if user_id in p.assigned_caregiver_ids:
                        p.assigned_caregiver_ids.remove(user_id)
                self.record_activity(
                    family_id=family_id,
                    icon="👤",
                    title="Member removed from care circle",
                    subtitle=f"{user.full_name} was removed from the family circle.",
                    actor_name="Family Owner",
                )
                return True
            return False


# Global repository instance
repository = DataRepository()
