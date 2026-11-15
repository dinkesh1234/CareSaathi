# CareSaathi — Family Health & Care Coordination Platform

> **Connected Care for Every Generation of Your Family**

CareSaathi is a family-centric health and care coordination platform designed to organize medical histories, caregiver schedules, medication adherence, and emergency summaries in one unified, privacy-first interface.

---

## 📁 Project Architecture & Directory Structure

```text
CareSaathi/
├── .gitignore               # Git rules excluding caches, virtual environments, and secrets
├── README.md                # Comprehensive project documentation & onboarding guide
├── requirements.txt         # Core Python dependencies pinned for reproducible builds
├── backend/
│   ├── requirements.txt     # Backend dependency specification
│   ├── app/
│   │   ├── __init__.py      # Python package marker
│   │   └── main.py          # FastAPI application entry point, CORS, routes & error handling
│   └── tests/
│       ├── __init__.py      # Test package marker
│       └── test_health.py   # Pytest unit tests for API health and error handling
└── frontend/
    ├── index.html           # Semantic, accessible HTML5 single-page application
    ├── assets/
    │   └── logo.svg         # Crisp SVG vector branding (Navy & Teal care emblem)
    ├── css/
    │   └── style.css        # Premium Navy & Healthcare Teal design system with responsive grid
    └── js/
        └── app.js           # Client controller for real-time health checks & latency tracking
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Vanilla HTML5, CSS3, ES6+ JavaScript | Zero-build fast load, accessible, easy for beginners to understand |
| **Backend** | Python 3.10+ / 3.14 with FastAPI | High performance, async-ready, automatic OpenAPI / Swagger documentation |
| **ASGI Server** | Uvicorn | Lightning-fast ASGI production and development server |
| **Testing** | Pytest + Starlette/HTTPX TestClient | Automated unit testing and endpoint verification |
| **Database** | Supabase PostgreSQL *(Planned in upcoming phase)* | Relational health data with Row-Level Security (RLS) |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Python 3.10 or higher installed (`python --version`)
- Modern web browser (Chrome, Edge, Firefox, Safari)

---

### 2. Backend Setup & Dependency Installation

#### Step A: Create and Activate Virtual Environment
Keeping your dependencies inside a virtual environment prevents conflicts with system Python packages.

**On Windows (PowerShell):**
```powershell
# Create the virtual environment inside backend/
python -m venv backend/.venv

# Activate the virtual environment
.\backend\.venv\Scripts\Activate.ps1
```
*(If you encounter an execution policy warning in PowerShell, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` first).*

**On macOS / Linux:**
```bash
python3 -m venv backend/.venv
source backend/.venv/bin/activate
```

#### Step B: Install Required Packages
```bash
pip install -r requirements.txt
```

---

### 3. Running the Backend Server

Start the FastAPI application using Uvicorn with auto-reload enabled:

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

Once running, you will see output similar to:
```text
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Application startup complete.
```

#### Accessing Interactive API Documentation:
- **Interactive Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Alternative ReDoc UI**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

### 4. Running the Frontend

You can launch the frontend using any of the following beginner-friendly methods:

#### Option A (Recommended): Python Built-in HTTP Server
In a new terminal window from the project root:
```bash
python -m http.server 3000 --directory frontend
```
Then open your browser at:
👉 **[http://localhost:3000](http://localhost:3000)**

#### Option B: Live Server Extension
If using VS Code or an Antigravity workspace with the Live Server extension, right-click `frontend/index.html` and select **"Open with Live Server"**.

#### Option C: Direct Browser Open
Double-click `frontend/index.html` to open it directly in your browser. (The CORS configuration in `backend/app/main.py` explicitly supports local origins).

---

### 5. Testing the Health Endpoint

#### Method 1: Using the Frontend UI
1. Open the CareSaathi frontend in your browser.
2. Observe the **Backend Connectivity & Service Health** card.
3. When the backend is running, the indicator turns **green ("Backend Online & Operational")** displaying:
   - Live roundtrip latency in milliseconds.
   - Identified service name (`CareSaathi API`).
   - Version (`v1.0.0`).
   - Server timestamp.
4. Click **"View Raw API Response Payload"** to inspect the JSON returned by the server.

#### Method 2: In Your Browser or Curl
Open [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health) or run in terminal:

```bash
curl -X GET http://127.0.0.1:8000/api/health
```

Expected JSON response:
```json
{
  "status": "healthy",
  "service": "CareSaathi API",
  "version": "1.0.0",
  "timestamp": "2026-11-15T04:20:00.000000+00:00"
}
```

---

### 6. Running Automated Backend Tests

The backend test suite uses `pytest` and `fastapi.testclient.TestClient`:

```bash
# From project root:
pytest backend/tests -v
```

Expected test results:
```text
backend/tests/test_health.py::test_health_endpoint_returns_ok PASSED      [ 50%]
backend/tests/test_health.py::test_nonexistent_endpoint_returns_structured_error PASSED [100%]
======================== 2 passed in 0.50s ========================
```

---

## 💡 Important Technical Decisions Explained

1. **Why FastAPI for Backend?**
   - **Type Hints & Validation**: Powered by Pydantic, invalid incoming data is caught and formatted automatically.
   - **Auto-Generated Documentation**: Every endpoint is automatically documented at `/docs` with interactive testing capabilities, ideal for learning and testing.
   - **Asynchronous Foundation**: Built on Starlette and ASGI, supporting concurrent requests efficiently.

2. **Why CORS (Cross-Origin Resource Sharing) Middleware?**
   - Browsers enforce security rules preventing a website hosted on port `3000` (or `file://`) from requesting data from an API on port `8000` unless explicitly allowed by the server. We configured `CORSMiddleware` in `backend/app/main.py` to allow seamless local development.

3. **Structured Global Error Handling:**
   - Standard FastAPI returns raw or inconsistent formats on unhandled exceptions. We implemented custom exception handlers for `StarletteHTTPException` and generic `Exception` to guarantee that all errors return a uniform JSON schema (`{"success": false, "error": {"code": ..., "message": ...}}`).

4. **Zero-Mock Policy:**
   - The application does not pretend to save data or fake database operations. The platform roadmap transparently outlines upcoming phases (Family Vault, Care Circles, Vitals Tracking) which will be integrated with Supabase PostgreSQL in subsequent iterations.

---

## 📜 License
Open-source under the MIT License.
