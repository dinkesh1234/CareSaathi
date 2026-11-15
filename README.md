# CareSaathi — Family Health & Care Coordination Platform

> **Proactive Care Continuity & Coordination for Every Generation of Your Family — Elderly-Care First.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue.svg?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![Tests Passing](https://img.shields.io/badge/Tests-54%2F54%20Passing-brightgreen.svg?style=flat&logo=pytest&logoColor=white)](https://docs.pytest.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-teal.svg?style=flat)](LICENSE)
[![Production Backend](https://img.shields.io/badge/Railway-Production%20Live-black.svg?style=flat&logo=railway&logoColor=white)](https://web-production-6d958779.up.railway.app/api/health)

CareSaathi is an open, family-centric health and care coordination platform designed to eliminate care fragmentation in multi-generational households. Centered around elderly care circles and seniors managing chronic conditions (such as hypertension, arthritis, and diabetes), CareSaathi unifies prescription schedules, clinical consultations, interactive monthly calendars, emergency safety cards, caregiver shift handoffs, and context-grounded AI assistance into one secure, accessible, white-themed interface.

---

## Table of Contents

1. [Project Overview & Problem Statement](#1-project-overview--problem-statement)
2. [Key Features Overview](#2-key-features-overview)
3. [Personal Healthcare Dashboard](#3-personal-healthcare-dashboard)
4. [Authentication & Session Security](#4-authentication--session-security)
5. [Personal & Family Health Profiles](#5-personal--family-health-profiles)
6. [Interactive Calendar & Appointment Management](#6-interactive-calendar--appointment-management)
7. [Medication Management & Adherence Tracking](#7-medication-management--adherence-tracking)
8. [CareSaathi Gemini AI Assistant](#8-caresathi-gemini-ai-assistant)
9. [Settings & Account Management](#9-settings--account-management)
10. [Technology Stack](#10-technology-stack)
11. [System Architecture](#11-system-architecture)
12. [UI Design Philosophy & White Theme](#12-ui-design-philosophy--white-theme)
13. [Local Installation & Setup Instructions](#13-local-installation--setup-instructions)
14. [Environment Variables & Security Guidance](#14-environment-variables--security-guidance)
15. [Project Folder Structure](#15-project-folder-structure)
16. [Deployment Architecture (Vercel, Railway & Supabase)](#16-deployment-architecture-vercel-railway--supabase)
17. [Automated Testing & Quality Assurance](#17-automated-testing--quality-assurance)
18. [Future Roadmap & Improvements](#18-future-roadmap--improvements)
19. [Medical Disclaimer](#19-medical-disclaimer)
20. [Project Information & Repository Links](#20-project-information--repository-links)
21. [Project Vision & Acknowledgements](#21-project-vision--acknowledgements)

---

## 1. Project Overview & Problem Statement

Millions of multi-generational households face severe care coordination fatigue:

- **Medication Adherence Blind Spots:** Elderly seniors managing complex chronic conditions often take multiple doses across different times of day. Family members assume someone else gave the medicine, leading to missed doses or accidental double-dosing.
- **Refill Shortages:** Prescriptions run out unnoticed until the morning dose is due, causing avoidable treatment lapses.
- **Unescorted Elderly Clinic Visits:** Frail seniors sometimes arrive unescorted at hospital reviews because working family members did not coordinate who would drive or accompany them.
- **Caregiver Shift Gaps:** Handoff notes between adult children and visiting nurses are verbal and easily lost.
- **Generic, Context-Blind AI Tools:** Existing health chatbots have no awareness of family authorized records, upcoming appointments, or prescribed medications.

**CareSaathi solves this with a unified care circle, Role-Based Access Control (RBAC), and an automated Care Continuity Engine.**

---

## 2. Key Features Overview

| Feature Module | Core Capability | User Benefit |
| :--- | :--- | :--- |
| **Personal Dashboard** | Centralized health feed, quick metrics, pending actions, and active care gaps | Real-time family status at a glance without navigating multiple menus |
| **Interactive Calendar** | Full monthly calendar grid, date selection, and appointment timeline filtering | Clear visibility of upcoming consultations with day-by-day mapping |
| **Escort Confirmation** | Dedicated escort coordination for clinic visits | Ensures elderly family members never attend appointments unescorted |
| **Medication Tracking** | Daily dosage schedules, prescribed-by tags, and one-click dose confirmation | Prevents missed doses and double-dosing with user-reported transparency |
| **Care Continuity Engine** | Automated detection of unconfirmed doses, low refills, and shift gaps | Proactive problem detection before health emergencies occur |
| **Gemini AI Companion** | Context-grounded health assistant with strict clinical safety guardrails | Instant schedule summaries, preparation briefs, and caregiver guidance |
| **Multi-Tenant RBAC** | Fine-grained roles (`family_owner`, `parent_guardian`, `caregiver`) | Strictly isolates family boundaries and protects sensitive child records |
| **Family Invitations** | Cryptographic token-based invitation workflow via transactional email | Securely brings doctors, nurses, and relatives into the care circle |

---

## 3. Personal Healthcare Dashboard

The CareSaathi Dashboard serves as the operational cockpit for the household's care coordinator:

- **Family Care Metrics:** Displays live summary tiles showing total managed family members, active daily prescriptions, upcoming appointments, and pending care continuity alerts.
- **Today's Medication Queue:** Lists morning, afternoon, and evening prescriptions with real-time status indicators (`Due`, `Taken ✅`, `Pending`).
- **Upcoming Medical Reviews:** Displays physician consultations scheduled for the week, with doctor specialty and assigned clinic locations.
- **Care Continuity Notifications:** Highlights proactive care gaps, such as medications with $\le 5$ days of pharmacy supply remaining or elderly appointments requiring an escort.

---

## 4. Authentication & Session Security

CareSaathi implements a strict **Login-First Security Architecture**:

- **Protected View State:** Unauthenticated users are strictly held at the login view. Dashboard data, prescription schedules, and family profiles are never rendered until a verified token is stored.
- **Dual Authentication Methods:**
  - **Email & Password Authentication:** Secure signup and login backed by cryptographic salt-hashed passwords.
  - **Google OAuth 2.0:** Secure Single Sign-On flow (`/api/auth/google/url` & `/api/auth/google/callback`) integrating Google identity.
- **Evaluator 1-Click Demo Account:**
  - Built-in demonstration login for hackathon evaluators and reviewers:
    - **Anil Sharma (Family Owner):** `anil.sharma@example.com` / `DemoPassword123!`
    - Instantly populates realistic multi-generational data (senior, adult, child).
- **Session Revocation:**
  - Complete server-side token invalidation via `POST /api/auth/logout`.
  - Clears `localStorage` session tokens, resets DOM state, and blocks browser back-navigation into sensitive health views.

---

## 5. Personal & Family Health Profiles

CareSaathi provides structured health profile management across family generations:

- **Multi-Generational Roster:**
  - **Seniors:** Focused on chronic disease management, mobility support, and emergency vitals (e.g., *Ramesh Sharma, 74*).
  - **Adults & Guardians:** Care coordinators managing appointments and permissions (e.g., *Anil Sharma*, *Sunita Sharma*).
  - **Children:** Pediatric profiles protected from external caregiver visibility (e.g., *Aarav Sharma, 10*).
- **Profile Attributes:** Full name, relationship, age, age-group categorization (`senior`, `adult`, `child`), blood group, known allergies, chronic conditions, and emergency contact details.
- **Role-Based Profile Access:**
  - Family owners have full administrative permissions to create, edit, and delete profiles.
  - Caregivers are restricted exclusively to their assigned senior patients.

---

## 6. Interactive Calendar & Appointment Management

The Appointment module features an interactive monthly calendar engine:

- **Dynamic Month Navigation:** Seamlessly browse between past, present, and future months with automated calculation of days, leap years, and weekday alignment.
- **Date-Filtered Timeline:** Selecting any day cell on the calendar immediately updates the consultation timeline, displaying only the visits scheduled for that specific date.
- **Calendar Event Indicators:** Calendar cells display visual dot badges (`.cal-apt-dot`) and count pills (`.cal-apt-pill`) indicating scheduled reviews.
- **Escort Confirmation Workflow:** Each appointment card includes an interactive "Confirm Escort" toggle (`/api/appointments/{id}/confirm-escort`), assigning a family member or nurse to accompany the patient.
- **Appointment Scheduling Modal:** A clean modal form allows users to book new consultations with doctor name, specialty, clinic/hospital, date, time, and preparation notes with immediate backend persistence.

---

## 7. Medication Management & Adherence Tracking

Prescription management in CareSaathi emphasizes clarity and clinical transparency:

- **Dosage Schedules:** Displays active prescriptions categorized by time of day (Morning, Afternoon, Evening, Bedtime) with exact dosages (e.g., *Amlodipine 5mg*, *Metformin 500mg*).
- **Adherence Logging:** One-click status toggling (`Reported Taken`, `Skipped`, `Pending`) persists adherence state to the backend database.
- **Refill Tracking & Thresholds:** Tracks remaining tablet counts and automatically triggers low-supply alerts when fewer than 5 days of medication remain.
- **Clinical Transparency Disclaimer:** In compliance with digital health standards, CareSaathi records adherence as reported by the user or caregiver without falsely asserting biometric proof of physical ingestion.

---

## 8. CareSaathi Gemini AI Assistant

CareSaathi features an integrated AI assistant powered by Google Gemini (`gemini-2.5-flash`):

- **Context-Grounded Health Intelligence:**
  - When responding to user queries, the assistant is dynamically injected with the authenticated user's authorized family member profiles, today's medication schedule, and upcoming doctor appointments.
- **Strict Clinical Non-Diagnostic Guardrails:**
  - The assistant is strictly restricted from diagnosing medical conditions, interpreting complex lab results, or suggesting prescription dosage alterations.
  - For acute symptoms (e.g., chest pain, shortness of breath, sudden numbness), the assistant immediately directs users to emergency medical services (108/112 in India, 911 globally).
  - Excels at schedule organization, meal timing suggestions relative to medications, doctor visit preparation briefs, and family health summaries.
- **Dual Interface:** Accessible both through a dedicated full-screen workspace (`view-ai-assistant`) and a persistent floating assistant launcher available across all views.

---

## 9. Settings & Account Management

The Settings module provides straightforward account control without unnecessary complexity:

- **Personal Information:** Displays registered user name, email address, unique account identifier, and assigned access role.
- **Emergency Configuration:** Manage primary family emergency contacts and preferred hospital designations.
- **Notification Settings:** Configure alert channels for medication reminders, appointment alerts, and caregiver handoffs.
- **Session Controls:** One-click secure sign-out triggering complete local token purging and backend session invalidation.

---

## 10. Technology Stack

### Backend
| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Language** | Python | 3.11+ / 3.14 | Modern, asynchronous backend runtime |
| **Web Framework** | FastAPI | 0.115+ | High-performance ASGI REST API framework |
| **Data Validation** | Pydantic | 2.10+ | Typed schema validation and request parsing |
| **Server** | Uvicorn | 0.34+ | ASGI web server implementation |
| **Testing** | Pytest & AnyIO | 9.2+ | Comprehensive asynchronous automated test suite |

### Frontend
| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Structure** | Semantic HTML5 | Accessible, responsive single-page application |
| **Styling** | Custom CSS3 | High-contrast White Theme design system (zero CSS framework overhead) |
| **Scripting** | Modern ES6+ JavaScript | Fast, dependency-free DOM manipulation and REST API client |
| **Icons** | Clean Monochrome SVG | Lightweight, accessible visual cues |

### Cloud & Third-Party Services
| Service | Provider | Purpose |
| :--- | :--- | :--- |
| **AI Companion** | Google Gemini API | Context-aware health and schedule assistance (`gemini-2.5-flash`) |
| **Database (Production)** | Supabase PostgreSQL | Relational persistence with Row-Level Security (RLS) schemas |
| **Transactional Email** | Resend API | Family circle invitations and emergency care alert dispatch |
| **OAuth 2.0** | Google Cloud Console | Single Sign-On identity provider |
| **Hosting (Backend)** | Railway | Containerized ASGI service running on Linux |
| **Hosting (Frontend)** | Vercel | Static edge hosting with `/api/*` reverse proxy |

---

## 11. System Architecture

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
      | - PostgreSQL / RLS    |    | - gemini-2.5-flash      |    | - Transactional Email |
      | - Hybrid Demo Engine  |    | - Clinical safety rules |    | - OAuth2 Calendar     |
      +-----------------------+    +-------------------------+    +-----------------------+
```

---

## 12. UI Design Philosophy & White Theme

CareSaathi follows an accessible, human-centric design philosophy:

- **White Theme Palette:**
  - **Page Background:** Pure White (`#FFFFFF`)
  - **Surface & Cards:** Crisp Slate Tint (`#F8FAFC`)
  - **Primary Text:** Charcoal Black (`#111827`)
  - **Secondary Text:** Muted Slate Gray (`#64748B`)
  - **Card & Divider Borders:** Clean Gray (`#E5E7EB`)
  - **Primary Brand Accent:** Healthcare Teal (`#0F766E` / `#0D9488`)
- **Senior Accessibility Principles:**
  - Generous clickable touch targets ($\ge 44\text{px}$) across buttons, inputs, and navigation links.
  - High color contrast meeting WCAG AA requirements.
  - Keyboard navigation with explicit `:focus-visible` outline rings.
  - Elimination of decorative emojis, loud gradients, and dark mode glare in favor of crisp typography and monochrome line iconography.

---

## 13. Local Installation & Setup Instructions

Follow these steps to run CareSaathi locally on your workstation:

### Prerequisites
- Python 3.11 or newer
- Git
- Web browser (Chrome, Edge, Firefox, or Safari)

### 1. Clone the Repository
```bash
git clone https://github.com/dinkesh1234/CareSaathi-.git
cd CareSaathi
```

### 2. Backend Environment Setup
```bash
# Create Python virtual environment
python -m venv backend/.venv

# Activate virtual environment
# Windows (PowerShell):
.\backend\.venv\Scripts\Activate.ps1
# Windows (CMD):
# .\backend\.venv\Scripts\activate.bat
# macOS / Linux:
# source backend/.venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt
```

### 3. Run Automated Tests
```bash
# Verify system integrity (54 tests)
pytest backend/tests -v
```

### 4. Start the FastAPI Backend
```bash
# Start backend server on port 8000
uvicorn app.main:app --port 8000 --app-dir backend --reload
```
The backend API is now accessible at `http://127.0.0.1:8000`.  
Interactive Swagger documentation is available at `http://127.0.0.1:8000/docs`.

### 5. Start the Frontend Server
In a separate terminal window:
```bash
# Serve static frontend on port 3000
python -m http.server --bind 127.0.0.1 --directory frontend 3000
```
Open your browser and navigate to: **`http://127.0.0.1:3000`**

---

## 14. Environment Variables & Security Guidance

Create a `backend/.env` file by copying the provided `backend/.env.example` template:

```bash
cp backend/.env.example backend/.env
```

### Configurable Parameters

| Variable | Required | Default / Example | Purpose |
| :--- | :---: | :--- | :--- |
| `APP_ENV` | Optional | `development` | Runtime environment (`development`, `production`) |
| `PORT` | Optional | `8000` | Local port for FastAPI Uvicorn server |
| `FRONTEND_ORIGIN` | Optional | `http://127.0.0.1:3000` | Allowed CORS origin for frontend client requests |
| `GOOGLE_CLIENT_ID` | Optional | `your-id.apps.googleusercontent.com` | Google Cloud OAuth 2.0 client credential |
| `GOOGLE_CLIENT_SECRET` | Optional | `your-secret` | Google Cloud OAuth 2.0 client secret |
| `GOOGLE_REDIRECT_URI` | Optional | `http://127.0.0.1:8000/api/auth/google/callback` | OAuth redirect endpoint |
| `SUPABASE_URL` | Optional | `https://your-project.supabase.co` | Supabase PostgreSQL project URL |
| `SUPABASE_ANON_KEY` | Optional | `your-anon-key` | Supabase public API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | `your-service-role-key` | Supabase private administrative key |
| `GEMINI_API_KEY` | Optional | `AIzaSy...` | Google AI Studio API key for Gemini assistant |
| `GEMINI_MODEL` | Optional | `gemini-2.5-flash` | Gemini model variant |
| `RESEND_API_KEY` | Optional | `re_...` | Resend API key for transactional emails |
| `RESEND_FROM_EMAIL` | Optional | `notifications@caresaathi.in` | Sender email address for notifications |
| `GOOGLE_HEALTH_PROJECT_NUMBER`| Optional | `your-project-number` | Android Health Connect adapter configuration |

> [!NOTE]
> CareSaathi includes a resilient in-memory repository fallback. If third-party API keys (such as Gemini, Supabase, or Resend) are omitted in local development, the application runs fully functional mock and demo workflows without crashing.

---

## 15. Project Folder Structure

```text
CareSaathi/
├── .gitignore                          # Version control exclusions (.env, caches, venv)
├── CareSaathi-LinkedIn-Showcase.zip    # Full-resolution LinkedIn showcase screenshots archive
├── Dockerfile                          # Production container configuration
├── Procfile                            # Process file for cloud container deployment
├── railway.json                        # Railway deployment and healthcheck blueprint
├── requirements.txt                    # Top-level dependency reference
├── vercel.json                         # Vercel edge rewrite proxy configuration
├── README.md                           # Master project documentation
│
├── backend/                            # FastAPI Backend Service
│   ├── .env.example                    # Environment variable template
│   ├── requirements.txt                # Python backend package dependencies
│   ├── app/
│   │   ├── __init__.py
│   │   ├── auth.py                     # Password hashing, salt, and JWT token logic
│   │   ├── config.py                   # Pydantic Settings and environment variable loader
│   │   ├── main.py                     # FastAPI application factory, CORS, and router registration
│   │   ├── rbac.py                     # Role-Based Access Control and authorization guards
│   │   ├── repository.py               # Data repository with in-memory store and demo seeder
│   │   ├── schemas.py                  # Pydantic request/response data contracts
│   │   ├── supabase_schema.sql         # Production PostgreSQL table definitions with RLS policies
│   │   ├── routers/                    # Modular API route controllers
│   │   │   ├── ai.py                   # Gemini AI assistant endpoints
│   │   │   ├── appointments.py         # Appointment scheduling and escort confirmations
│   │   │   ├── auth.py                 # Login, signup, logout, and OAuth endpoints
│   │   │   ├── continuity.py           # Care continuity overview and handoff records
│   │   │   ├── integrations.py         # Third-party service status and audit endpoints
│   │   │   ├── invitations.py          # Family circle invitation lifecycle
│   │   │   ├── medications.py          # Prescription scheduling and adherence logging
│   │   │   └── profiles.py             # Family member profile management
│   │   └── services/                   # External service client adapters
│   │       ├── ai_service.py           # AI interface contract
│   │       ├── gemini_service.py       # Google Gemini SDK integration with clinical safety prompt
│   │       ├── google_auth_service.py  # Google OAuth 2.0 token exchange client
│   │       ├── google_calendar_service.py # Google Calendar event synchronization
│   │       ├── google_health_service.py   # Android Health Connect adapter
│   │       ├── resend_service.py       # Resend transactional email client
│   │       └── supabase_service.py     # Supabase REST and PostgreSQL client
│   └── tests/                          # Automated Pytest Test Suite
│       ├── test_ai.py                  # AI assistant, safety guardrails, and role scoping
│       ├── test_auth_and_dashboard.py  # Session lifecycle, persistence, and dashboard operations
│       ├── test_continuity_meds_apts.py # Care continuity, adherence tracking, and escorts
│       ├── test_health.py              # Health check endpoints and error response schemas
│       ├── test_integrations.py        # Third-party integration audits and adapters
│       ├── test_invitations_and_logout.py # Invitation flows and server-side token revocation
│       └── test_rbac.py                # Multi-tenant IDOR isolation and role permission limits
│
├── frontend/                           # Single-Page Web Client
│   ├── index.html                      # Semantic single-page application structure
│   ├── vercel.json                     # Frontend Vercel routing and Railway API proxy
│   ├── assets/
│   │   └── logo.svg                    # CareSaathi vector branding mark
│   ├── css/
│   │   └── style.css                   # White Theme design system, layout, and calendar styles
│   └── js/
│       └── app.js                      # Application state, router, calendar engine, and API client
│
└── linkedin-showcase/                  # High-resolution (1440x1000) desktop screenshots
    ├── 01-login.png                    # Login view with Google OAuth and Demo access
    ├── 02-dashboard.png                # Comprehensive family healthcare overview
    ├── 03-family-members.png           # Multi-generational profile cards
    ├── 04-medication-management.png    # Prescription schedule and adherence logger
    ├── 05-appointments-calendar.png    # Interactive monthly calendar and escort tracking
    ├── 06-care-continuity.png          # Clinical handoffs and care continuity overview
    ├── 07-ai-assistant.png             # Gemini AI health assistant in action
    └── 08-settings.png                 # Personal information and account settings
```

---

## 16. Deployment Architecture (Vercel, Railway & Supabase)

CareSaathi uses a modern decoupled production topology:

```text
                     +---------------------------------------+
                     |         User Web Browser              |
                     +-------------------+-------------------+
                                         |
                                         | HTTPS Requests
                                         v
                     +---------------------------------------+
                     |           Vercel Edge Network         |
                     |      (Frontend Static SPA Files)      |
                     +-------------------+-------------------+
                                         |
                       /api/(.*) Proxy   |  Rewrites rule
                                         v
+---------------------------------------------------------------------------------+
|                                 Railway Cloud                                   |
|                        (FastAPI ASGI Container Service)                         |
|                                                                                 |
|   - URL: https://web-production-6d958779.up.railway.app                        |
|   - Health Check: GET /api/health (200 OK)                                      |
|   - CORS Handling & Bearer Token Authentication                                 |
+----------------------------------------+----------------------------------------+
                                         |
                  +----------------------+----------------------+
                  |                                             |
                  v                                             v
+-----------------------------------+         +-----------------------------------+
|         Supabase Cloud            |         |          Google Cloud             |
|   (PostgreSQL Relational DB)      |         |     (Gemini API & OAuth 2.0)      |
+-----------------------------------+         +-----------------------------------+
```

1. **Frontend Hosting (Vercel):**
   - Hosts static assets (`index.html`, `style.css`, `app.js`, `logo.svg`).
   - Configured with `vercel.json` rewrites that forward all `/api/(.*)` requests to Railway, eliminating Cross-Origin Resource Sharing (CORS) roadblocks in browser clients.
2. **Backend Hosting (Railway):**
   - Hosts the Python FastAPI ASGI container running Uvicorn.
   - Built via Nixpacks/Dockerfile with automated health check monitoring at `/api/health`.
3. **Database (Supabase):**
   - Hosts production relational data in PostgreSQL with Row-Level Security policies enforcing family isolation.

---

## 17. Automated Testing & Quality Assurance

CareSaathi is protected by an extensive 54-test automated test suite:

```bash
pytest backend/tests -v
```

### Test Suite Coverage Matrix

| Test Module | Tests | Primary Verification Areas |
| :--- | :---: | :--- |
| `test_ai.py` | 6 | Unauthenticated chat rejection, family profile grounding, caregiver scope limitation, IDOR isolation, and medical safety guardrails |
| `test_auth_and_dashboard.py`| 8 | User registration, credential validation, session persistence (`/api/auth/me`), token logout, profile editing, medication creation, and escort confirmation |
| `test_continuity_meds_apts.py`| 5 | Medication adherence recording, user-reported disclaimers, appointment escort confirmation, and shift handoff creation |
| `test_health.py` | 2 | Backend health check payload verification and structured 404 error envelope validation |
| `test_integrations.py` | 11 | Integration status endpoint, Google OAuth URL generation, state validation, Resend deduplication, and Google Calendar sync requirements |
| `test_invitations_and_logout.py`| 5 | Family circle invitation lifecycle, caregiver permission restrictions, email mismatch rejections, and profile deletion authorization |
| `test_master_qa.py` | 9 | Calendar & appointment CRUD/persistence, input validation, medication status toggles, profile age limits, and CORS preflight |
| `test_rbac.py` | 8 | Multi-tenant family isolation, IDOR prevention, guardian access to child records, and caregiver profile manipulation guards |
| **Total** | **54** | **100% Pass Rate Across All Suites** |

---

## 18. Future Roadmap & Improvements

- [ ] **WhatsApp & SMS Alerts:** Native integration with WhatsApp Business API and Twilio for one-tap medication adherence confirmation via messaging.
- [ ] **Bi-directional Health Connect:** Automated synchronization of blood glucose and blood pressure data from paired Android Health Connect monitors.
- [ ] **Multi-Language Support (Indic Languages):** Full interface and voice assistant localization in Hindi, Tamil, Telugu, Marathi, and Bengali.
- [ ] **Offline-First PWA:** Progressive Web App service worker caching for offline medication viewing during cellular connectivity dropouts.
- [ ] **Hospital EMR Integrations:** FHIR/HL7 clinical summary export to share patient consultation prep notes directly with treating hospital systems.

---

## 19. Medical Disclaimer

> [!CAUTION]
> **CareSaathi is an assistive care coordination, organization, and communication platform.**
> 
> - CareSaathi **does NOT provide medical advice, clinical diagnoses, or treatment prescriptions**.
> - CareSaathi is **NOT a certified medical device** and should never be used as a substitute for professional clinical judgment, diagnosis, or treatment.
> - Always seek the advice of a qualified physician or healthcare provider with any questions you may have regarding a medical condition.
> - **In the event of a medical emergency, call your local emergency services immediately:**
>   - **India:** Dial **108** (Ambulance) or **112** (National Emergency)
>   - **United States:** Dial **911**
>   - **United Kingdom:** Dial **999**

---

## 20. Project Information & Repository Links

- **Project Name:** CareSaathi
- **Author / Developer:** Dinkesh Sharma
- **GitHub Repository:** [https://github.com/dinkesh1234/CareSaathi-.git](https://github.com/dinkesh1234/CareSaathi-.git)
- **Production Backend URL:** [https://web-production-6d958779.up.railway.app](https://web-production-6d958779.up.railway.app)
- **License:** Open-source under the [MIT License](LICENSE).

---

## 21. Project Vision & Acknowledgements

CareSaathi was built with a clear vision: **No elderly family member should face a medical emergency or clinic visit alone, and no family caregiver should have to manage the burden of care in isolation.**

By uniting modern web standards, role-based security, automated care gap detection, and safe AI assistance, CareSaathi transforms anxious, fragmented family caregiving into an organized, proactive circle of support.

*CareSaathi — Caring for those who once cared for us.*
