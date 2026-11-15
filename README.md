# CareSaathi — Family Health & Care Coordination Platform

> **Proactive Care Continuity & Coordination for Every Generation of Your Family — Elderly-Care First.**

CareSaathi is an open, family-centric health and care coordination platform designed to eliminate care fragmentation. Built with a senior-first user experience centered around our prototype elderly persona **Ramesh Sharma (74 yrs)**, CareSaathi unifies prescription schedules, caregiver shift handoffs, clinical consultations, emergency safety cards, and automated care gap detection in one secure, accessible interface.

---

## 🌟 The Problem Statement

Millions of multi-generational households face severe care coordination fatigue:
1. **Medication Adherence Blind Spots:** Elderly seniors managing chronic conditions (e.g. hypertension, type 2 diabetes) often have multiple doses across different times of day. Family members assume someone else gave the medicine, leading to missed doses or accidental double-dosing.
2. **Refill Shortages:** Prescriptions run out unnoticed until the morning dose is due, causing avoidable treatment lapses.
3. **Unescorted Elderly Clinic Visits:** Frail seniors sometimes arrive unescorted at hospital reviews because family members did not coordinate who would drive or assist them.
4. **Caregiver Handoff Gaps:** Shift handoffs between adult children and home-care nurses are verbal and easily forgotten.
5. **Generic, Context-Blind AI Tools:** Existing AI assistants have no awareness of what family members are authorized to see or what medications were scheduled this morning.

**CareSaathi solves this with a unified care circle, Role-Based Access Control (RBAC), and our automated Care Continuity Engine.**

---

## 🏛️ System Architecture

```text
                                  +---------------------------------------+
                                  |         CareSaathi Frontend           |
                                  |   (Vanilla HTML5 / CSS3 / ES6+)       |
                                  +-------------------+-------------------+
                                                      |
                                    HTTP / REST JSON  |  Bearer Token (RBAC)
                                                      v
+-------------------------------------------------------------------------------------------------+
|                                    FastAPI Backend (Python)                                     |
|                                                                                                 |
|   +-----------------------+   +----------------------+   +----------------------------------+   |
|   |   Auth Router         |   |  Family RBAC Router  |   |  Care Continuity Engine Router   |   |
|   |  - Email/Pass Signup  |   |  - Profile isolation |   |  - Proactive gap detection       |   |
|   |  - Session Revocation |   |  - Multi-tenant IDOR |   |  - Shift handoffs                |   |
|   |  - Google OAuth 2.0   |   |  - Caregiver scopes  |   |  - Escort confirmations          |   |
|   +-----------------------+   +----------------------+   +----------------------------------+   |
|                                                                                                 |
|   +-----------------------+   +----------------------+   +----------------------------------+   |
|   |  Medications Router   |   | Appointments Router  |   |    AI Context Assistant Router   |   |
|   |  - Prescription sched |   |  - Doctor reviews    |   |  - Scoped family health context  |   |
|   |  - Adherence tracking |   |  - Escort assignment |   |  - Medical safety guardrails     |   |
|   |  - User-reported audit|   |  - Calendar sync     |   |  - Context-aware summaries       |   |
|   +-----------------------+   +----------------------+   +----------------------------------+   |
|                                                                                                 |
+-----------------------------------------------+-------------------------------------------------+
                                                |
                  +-----------------------------+-----------------------------+
                  |                             |                             |
                  v                             v                             v
      +-----------------------+    +-------------------------+    +-----------------------+
      |    Supabase Cloud     |    |   Google Gemini API     |    |  Resend / Google Cal  |
      | - PostgreSQL / RLS    |    | - gemini-3.5-flash      |    | - Transactional Email |
      | - Fallback Demo Cache |    | - Clinical safety rules |    | - OAuth2 Calendar     |
      +-----------------------+    +-------------------------+    +-----------------------+
```

---

## 🚀 Key Features

### 1. 👴 Senior-First Experience (Persona: Ramesh Sharma, 74)
- **High-Contrast, Accessible UI:** Generous touch targets, high-contrast healthcare palette (Navy `#0A0F1D`, Healthcare Teal `#0D9488`, Warm White `#FFFFFF`), legible typography, and clear status badges (`Due`, `Taken ✅`, `Stable`).
- **Emergency Safety Network & Go-Bag:** One-click emergency contact cards, hospital admission checklist, and instant printable doctor briefs.

### 2. 🛡️ Proactive Care Continuity Engine
Rather than relying on human memory, the Care Continuity Engine continuously scans stored operational records to identify care gaps before they turn into emergencies:
- **Unconfirmed Morning Doses:** Detects scheduled medications past due without recorded confirmation.
- **Low Pharmacy Refills:** Automatically flags medications with $\le 5$ days remaining.
- **Unassigned Escorts:** Alerts family members when an elderly patient has an upcoming clinical consultation without an assigned escort.
- **Pending Shift Handoffs:** Tracks unacknowledged caregiver shift handoffs between shifts.

### 3. 🤖 Context-Aware Gemini AI Assistant (`gemini-3.5-flash`)
- **Authorized Profile Grounding:** Unlike generic chatbots, CareSaathi AI is dynamically injected with the user's authorized family member profiles, today's scheduled medications, upcoming visits, and active care gaps.
- **Strict Clinical Guardrails:** Enforces the non-diagnostic rule. The assistant refuses to diagnose acute medical symptoms and directs users to emergency care (108/112) or their primary physician, while excelling at coordination, scheduling, and family history summaries.

### 4. 🔒 Multi-Tenant Role-Based Access Control (RBAC)
- **Family Owner (Anil Sharma):** Full access to view and manage all family members, assign caregivers, and manage schedules.
- **Parent / Guardian (Sunita Sharma):** Full access to senior and child records.
- **Caregiver (Nurse Priya):** Strictly scoped to assigned patient profiles (Ramesh Sharma). Child profiles and unrelated family members are protected (HTTP 403 Forbidden).
- **IDOR Protection:** Multi-tenant family boundaries prevent cross-family record access.

### 5. 💊 Medication Adherence with Clinical Transparency
- Explicit user-reported timestamps (`reported_taken`, `skipped`, `pending`).
- **Non-Clinical Ingestion Disclaimer:** In compliance with health platform standards, CareSaathi explicitly records doses as reported by the caregiver/patient without falsely claiming automated biometric verification of physical ingestion.

---

## 📊 Live Integration Status Matrix (Honest Audit)

| Service | Configured | Live Status | Operational Mode | Notes |
| :--- | :---: | :---: | :---: | :--- |
| **Google Gemini AI** | ✅ | **Connected (200 OK)** | `gemini-3.5-flash` | Live multi-turn chat with contextual family health grounding & medical safety guardrails. |
| **Google OAuth 2.0** | ✅ | **Verified** | Custom FastAPI Auth | Redirect URI `http://127.0.0.1:8000/api/auth/google/callback` verified with Google Cloud servers. |
| **Supabase PostgreSQL** | ✅ | **Connected (200 OK)** | Dual Mode: Hybrid Demo / Live | Authenticates against project `wzcffinxtzuhzndmficp.supabase.co`. SQL schema available in `backend/app/supabase_schema.sql`. |
| **Resend Email API** | ✅ | **Configured** | Sandbox Verified | Transactional alerts from `onboarding@resend.dev` with deduplication caching. |
| **Google Calendar** | ✅ | **Configured** | OAuth2 Sync Adapter | Queues appointments for bidirectional calendar sync when user OAuth token is present. |
| **Android Health Connect** | ✅ | **Adapter Ready** | Standard Android Schemas | Health Connect adapter verified; legacy Google Fit REST truthfully noted as deprecated by Google. |

---

## 🧪 Comprehensive Automated Test Suite

CareSaathi includes a 32-test automated suite covering AI safety, RBAC, IDOR isolation, care continuity, medications, and appointment escorts:

```text
============================= test session starts =============================
platform win32 -- Python 3.14.10, pytest-9.2.0, pluggy-1.7.0
rootdir: D:\CareSaathi
plugins: anyio-4.16.0
collected 32 items

backend/tests/test_ai.py::test_ai_capabilities_endpoint PASSED           [  3%]
backend/tests/test_ai.py::test_unauthenticated_chat_rejected PASSED      [  6%]
backend/tests/test_ai.py::test_family_owner_ai_chat_summary PASSED       [  9%]
backend/tests/test_ai.py::test_caregiver_ai_chat_scoped_to_assigned_profile PASSED [ 12%]
backend/tests/test_ai.py::test_cross_family_ai_isolation PASSED          [ 15%]
backend/tests/test_ai.py::test_medical_safety_guardrail PASSED           [ 18%]
backend/tests/test_continuity_meds_apts.py::test_signup_new_user_success_and_duplicate_rejection PASSED [ 21%]
backend/tests/test_continuity_meds_apts.py::test_medications_list_and_rbac_filtering PASSED [ 25%]
backend/tests/test_continuity_meds_apts.py::test_update_medication_status_adherence_and_disclaimer PASSED [ 28%]
backend/tests/test_continuity_meds_apts.py::test_appointments_list_and_confirm_escort PASSED [ 31%]
backend/tests/test_continuity_meds_apts.py::test_care_continuity_overview_and_handoff_creation PASSED [ 34%]
backend/tests/test_health.py::test_health_endpoint_returns_ok PASSED     [ 37%]
backend/tests/test_health.py::test_nonexistent_endpoint_returns_structured_error PASSED [ 40%]
backend/tests/test_integrations.py::test_integrations_status_endpoint PASSED [ 43%]
backend/tests/test_integrations.py::test_google_oauth_url_generation PASSED [ 46%]
backend/tests/test_integrations.py::test_google_oauth_callback_handles_user_cancellation PASSED [ 50%]
backend/tests/test_integrations.py::test_google_oauth_callback_rejects_invalid_csrf_state PASSED [ 53%]
backend/tests/test_integrations.py::test_auth_logout_endpoint PASSED     [ 56%]
backend/tests/test_integrations.py::test_resend_deduplication_cache PASSED [ 59%]
backend/tests/test_integrations.py::test_test_email_requires_authentication PASSED [ 62%]
backend/tests/test_integrations.py::test_test_email_authenticated_reporting PASSED [ 65%]
backend/tests/test_integrations.py::test_calendar_sync_requires_google_tokens PASSED [ 68%]
backend/tests/test_integrations.py::test_google_health_adapter_deduplication_and_provenance PASSED [ 71%]
backend/tests/test_integrations.py::test_gemini_service_refuses_medical_diagnosis PASSED [ 75%]
backend/tests/test_rbac.py::test_unauthenticated_request_rejected PASSED [ 78%]
backend/tests/test_rbac.py::test_family_owner_can_view_all_family_profiles PASSED [ 81%]
backend/tests/test_rbac.py::test_guardian_can_access_and_edit_child_profile PASSED [ 84%]
backend/tests/test_rbac.py::test_caregiver_access_and_unauthorized_child_protection PASSED [ 87%]
backend/tests/test_rbac.py::test_caregiver_permission_revocation PASSED  [ 90%]
backend/tests/test_rbac.py::test_cross_family_idor_isolation PASSED      [ 93%]
backend/tests/test_rbac.py::test_profile_creation_validation_and_age_grouping PASSED [ 96%]
backend/tests/test_rbac.py::test_caregiver_cannot_create_or_delete_profiles PASSED [100%]

============================= 32 passed in 48.02s =============================
```

---

## 🛠️ Quick Local Setup

### 1. Clone & Enter Directory
```bash
git clone https://github.com/dinkesh/CareSaathi.git
cd CareSaathi
```

### 2. Backend Setup
```bash
# Create virtual environment
python -m venv backend/.venv

# Activate (Windows)
.\backend\.venv\Scripts\activate
# Activate (macOS/Linux)
# source backend/.venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run test suite
pytest backend/tests -v

# Start FastAPI backend server
uvicorn app.main:app --port 8000 --app-dir backend --reload
```

### 3. Frontend Setup
In a separate terminal:
```bash
python -m http.server --bind 127.0.0.1 --directory frontend 3000
```

- **Frontend App:** [http://127.0.0.1:3000](http://127.0.0.1:3000)
- **Backend API:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive Swagger Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Backend Health Check:** [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)
- **Live Integrations Audit:** [http://127.0.0.1:8000/api/integrations/status](http://127.0.0.1:8000/api/integrations/status)

---

## ☁️ Deployment Configurations

The project includes deployment blueprints ready for zero-downtime hosting:

- **Vercel (`vercel.json`):** Static edge deployment of the single-page application with clean routing.
- **Railway / Render (`Procfile`, `railway.json`):** Automatic containerized ASGI deployment with health checks.
- **Docker (`Dockerfile`):** Production-ready slim container with integrated curl health checks.

---

## 📜 Repository Information & Hygiene

- **Active Branch:** `master` (single clean branch).
- **Repository Size:** ~222 KiB (strictly under the 10 MB limit).
- **Environment & Secrets:** `.env` and all credential tokens strictly excluded via `.gitignore`.
- **License:** Open-source MIT.
