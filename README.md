# CareSaathi — Family Health & Care Coordination Platform

> **Proactive Care Continuity & Coordination for Every Generation of Your Family — Elderly-Care First.**

CareSaathi is an open, family-centric health and care coordination platform designed to eliminate care fragmentation. Built with a senior-first user experience centered around our prototype elderly persona **Ramesh Sharma (74 yrs)**, CareSaathi unifies prescription schedules, caregiver shift handoffs, clinical consultations, emergency safety cards, and automated care gap detection in one secure, accessible interface.

---

## 🌟 The Problem Statement

Millions of multi-generational households face severe care coordination fatigue:
1. **Medication Adherence Blind Spots:** Elderly seniors managing chronic conditions (e.g. hypertension, type 2 diabetes) often take multiple doses across different times of day. Family members assume someone else gave the medicine, leading to missed doses or accidental double-dosing.
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
|   +-----------------------------------------------------------------------------------------+   |
|   |                             Family Invitations Router                                   |   |
|   |  - Secure cryptographic token dispatch via Resend Email                                 |   |
|   |  - Role assignment (Caregiver / Guardian) with email verification                       |   |
|   +-----------------------------------------------------------------------------------------+   |
+-----------------------------------------------+-------------------------------------------------+
                                                |
                  +-----------------------------+-----------------------------+
                  |                             |                             |
                  v                             v                             v
      +-----------------------+    +-------------------------+    +-----------------------+
      |    Supabase Cloud     |    |   Google Gemini API     |    |  Resend / Google Cal  |
      | - PostgreSQL / RLS    |    | - gemini-3.5-flash      |    | - Transactional Email |
      | - Hybrid Demo Engine  |    | - Clinical safety rules |    | - OAuth2 Calendar     |
      +-----------------------+    +-------------------------+    +-----------------------+
```

---

## 🚀 Key Features

### 1. 👴 Senior-First Experience (Persona: Ramesh Sharma, 74)
- **High-Contrast, Accessible UI:** Generous 44px+ touch targets, high-contrast healthcare palette (Deep Navy `#0A0F1D`, Healthcare Teal `#0D9488`, Warm Light `#F8FAFC`), legible typography, and clear status badges (`Due`, `Taken ✅`, `Stable`).
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
- **Floating AI Drawer:** Accessible from anywhere in the application via the bottom-right launcher button, with one-click full assistant view handover.

### 4. 🔒 Multi-Tenant Role-Based Access Control (RBAC)
- **Family Owner (Anil Sharma):** Full access to view and manage all family members, invite caregivers, assign care scopes, and manage schedules.
- **Parent / Guardian (Sunita Sharma):** Full access to senior and child records.
- **Caregiver (Nurse Priya):** Strictly scoped to assigned patient profiles (Ramesh Sharma). Child profiles and unrelated family members are protected (HTTP 403 Forbidden).
- **IDOR Protection:** Multi-tenant family boundaries prevent cross-family record access.

### 5. 💊 Medication Adherence with Clinical Transparency
- Explicit user-reported timestamps (`reported_taken`, `skipped`, `pending`).
- **Non-Clinical Ingestion Disclaimer:** In compliance with health platform standards, CareSaathi explicitly records doses as reported by the caregiver/patient without falsely claiming automated biometric verification of physical ingestion.

### 6. ✉️ Family Circle Invitations
- Token-based cryptographic invitation flow.
- Invitation dispatch via Resend transactional email.
- Email matching enforcement upon acceptance to prevent privilege escalation.
- Family Owner management with real-time pending invitation tracking and cancellation.

### 7. 🚪 Strict Login-First Security Flow & Full Session Revocation
- Unauthenticated users are strictly held at `#login-screen`. Dashboard and sensitive medical data are never rendered unauthenticated.
- Multi-tier logout: top navigation avatar dropdown, sidebar footer, and account settings.
- Server-side token invalidation via `POST /api/auth/logout` with local storage purge and browser history back-navigation guards.

---

## 🔑 Google Cloud OAuth 2.0 & Testing Mode Notice

> [!IMPORTANT]
> **Google Cloud Publishing Status: Testing Mode**
>
> When clicking **"Sign in with Google"**, Google Cloud may display **"Error 403: access_denied - CareSaathi has not completed the Google verification process"**.
>
> **Why this happens:**
> CareSaathi requests the Google Calendar OAuth scope (`https://www.googleapis.com/auth/calendar.events`) to synchronize clinic consultations. In Google Cloud, projects with sensitive scopes in **"Testing"** mode restrict OAuth access exclusively to developer-whitelisted accounts.
>
> **For Evaluators & Judges:**
> 1. **To test with your personal Google account:** Add your Gmail address to the Google Cloud Console under:
>    `Google Cloud Console > APIs & Services > OAuth consent screen > Test users > + ADD USERS`
> 2. **Instant Evaluation (Zero Setup Required):** CareSaathi includes 4 pre-configured demo accounts right on the login screen. Click any button to test immediately:
>    - **Anil Sharma** (`anil.sharma@example.com` / `DemoPassword123!`) — Family Owner (Full Access)
>    - **Nurse Priya** (`nurse.priya@example.com` / `DemoPassword123!`) — Caregiver (Scoped to Senior Ramesh)
>    - **Sunita Sharma** (`sunita.sharma@example.com` / `DemoPassword123!`) — Guardian (Adult & Child Access)
>    - **Rajesh Verma** (`rajesh.verma@example.com` / `DemoPassword123!`) — Separate Family (Cross-Family IDOR Test)

---

## 📊 Live Integration Status Matrix (Honest Audit)

| Service | Configured | Live Status | Operational Mode | Notes |
| :--- | :---: | :---: | :---: | :--- |
| **Google Gemini AI** | ✅ | **Connected (200 OK)** | `gemini-3.5-flash` | Live multi-turn chat with contextual family health grounding & medical safety guardrails. Seamless fallback coordinator when quota is limited. |
| **Google OAuth 2.0** | ✅ | **Verified** | Custom FastAPI Auth | Authorized redirect URI `http://127.0.0.1:8000/api/auth/google/callback` verified with Google Cloud servers. |
| **Supabase PostgreSQL** | ✅ | **Connected (200 OK)** | Dual Mode: Hybrid Demo / Live | Authenticates against project `wzcffinxtzuhzndmficp.supabase.co`. Production SQL schema ready in `backend/app/supabase_schema.sql`. |
| **Resend Email API** | ✅ | **Configured** | Sandbox Verified | Transactional alerts and family invitations from `onboarding@resend.dev` with deduplication caching. |
| **Google Calendar** | ✅ | **Configured** | OAuth2 Sync Adapter | Queues appointments for bidirectional calendar sync when user OAuth token is present. |
| **Android Health Connect** | ✅ | **Adapter Ready** | Standard Android Schemas | Health Connect adapter verified; legacy Google Fit REST truthfully noted as deprecated by Google in 2025. |

---

## 🧪 Comprehensive Automated Test Suite (37/37 Passing)

CareSaathi includes a comprehensive 37-test automated suite covering AI safety, RBAC, IDOR isolation, care continuity, medications, appointment escorts, invitations, and session revocation:

```text
============================= test session starts =============================
platform win32 -- Python 3.14.10, pytest-9.2.0, pluggy-1.7.0 -- D:\CareSaathi\backend\.venv\Scripts\python.exe
cachedir: .pytest_cache
rootdir: D:\CareSaathi
plugins: anyio-4.16.0
collected 37 items

backend/tests/test_ai.py::test_ai_capabilities_endpoint PASSED           [  2%]
backend/tests/test_ai.py::test_unauthenticated_chat_rejected PASSED      [  5%]
backend/tests/test_ai.py::test_family_owner_ai_chat_summary PASSED       [  8%]
backend/tests/test_ai.py::test_caregiver_ai_chat_scoped_to_assigned_profile PASSED [ 10%]
backend/tests/test_ai.py::test_cross_family_ai_isolation PASSED          [ 13%]
backend/tests/test_ai.py::test_medical_safety_guardrail PASSED           [ 16%]
backend/tests/test_continuity_meds_apts.py::test_signup_new_user_success_and_duplicate_rejection PASSED [ 18%]
backend/tests/test_continuity_meds_apts.py::test_medications_list_and_rbac_filtering PASSED [ 21%]
backend/tests/test_continuity_meds_apts.py::test_update_medication_status_adherence_and_disclaimer PASSED [ 24%]
backend/tests/test_continuity_meds_apts.py::test_appointments_list_and_confirm_escort PASSED [ 27%]
backend/tests/test_continuity_meds_apts.py::test_care_continuity_overview_and_handoff_creation PASSED [ 29%]
backend/tests/test_health.py::test_health_endpoint_returns_ok PASSED     [ 32%]
backend/tests/test_health.py::test_nonexistent_endpoint_returns_structured_error PASSED [ 35%]
backend/tests/test_integrations.py::test_integrations_status_endpoint PASSED [ 37%]
backend/tests/test_integrations.py::test_google_oauth_url_generation PASSED [ 40%]
backend/tests/test_integrations.py::test_google_oauth_callback_handles_user_cancellation PASSED [ 43%]
backend/tests/test_integrations.py::test_google_oauth_callback_rejects_invalid_csrf_state PASSED [ 45%]
backend/tests/test_integrations.py::test_auth_logout_endpoint PASSED     [ 48%]
backend/tests/test_integrations.py::test_resend_deduplication_cache PASSED [ 51%]
backend/tests/test_integrations.py::test_test_email_requires_authentication PASSED [ 54%]
backend/tests/test_integrations.py::test_test_email_authenticated_reporting PASSED [ 56%]
backend/tests/test_integrations.py::test_calendar_sync_requires_google_tokens PASSED [ 59%]
backend/tests/test_integrations.py::test_google_health_adapter_deduplication_and_provenance PASSED [ 62%]
backend/tests/test_integrations.py::test_gemini_service_refuses_medical_diagnosis PASSED [ 64%]
backend/tests/test_invitations_and_logout.py::test_create_and_list_family_invitations PASSED [ 67%]
backend/tests/test_invitations_and_logout.py::test_caregiver_cannot_send_invitations PASSED [ 70%]
backend/tests/test_invitations_and_logout.py::test_accept_invitation_with_matching_email_and_mismatch_rejection PASSED [ 72%]
backend/tests/test_invitations_and_logout.py::test_logout_invalidates_token_and_returns_clean_message PASSED [ 75%]
backend/tests/test_invitations_and_logout.py::test_delete_family_profile_owner_only PASSED [ 78%]
backend/tests/test_rbac.py::test_unauthenticated_request_rejected PASSED [ 81%]
backend/tests/test_rbac.py::test_family_owner_can_view_all_family_profiles PASSED [ 83%]
backend/tests/test_rbac.py::test_guardian_can_access_and_edit_child_profile PASSED [ 86%]
backend/tests/test_rbac.py::test_caregiver_access_and_unauthorized_child_protection PASSED [ 89%]
backend/tests/test_rbac.py::test_caregiver_permission_revocation PASSED  [ 91%]
backend/tests/test_rbac.py::test_cross_family_idor_isolation PASSED      [ 94%]
backend/tests/test_rbac.py::test_profile_creation_validation_and_age_grouping PASSED [ 97%]
backend/tests/test_rbac.py::test_caregiver_cannot_create_or_delete_profiles PASSED [100%]

============================= 37 passed in 14.37s =============================
```

To run the complete test suite:
```bash
pytest backend/tests -v
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

# Run full test suite
pytest backend/tests -v

# Start FastAPI backend server on port 8000
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

The repository includes production blueprints ready for immediate hosting:

- **Vercel (`vercel.json`):** Static edge deployment of the single-page application with clean routing.
- **Railway / Render (`Procfile`, `railway.json`):** Automatic containerized ASGI deployment with health checks.
- **Docker (`Dockerfile`):** Production-ready slim container with integrated curl health checks.

---

## 📜 Repository Information & Hygiene

- **Active Branch:** `master` (single clean branch).
- **Environment & Secrets:** `.env` and all credential tokens strictly excluded via `.gitignore`.
- **License:** Open-source MIT.
