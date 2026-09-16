# SEPSIS-AI Trajectory Monitor

> ⚠ **RESEARCH PROTOTYPE — NOT FOR CLINICAL USE**
> This tool does not diagnose sepsis. It does not prescribe treatment. It does not replace clinical judgement. All data is entirely synthetic and for demonstration purposes only.

---

## Project Overview

SEPSIS-AI is an AI-assisted clinical decision-support prototype that identifies possible patient deterioration trends using longitudinal vital-sign and laboratory observations.

**What it does:**
- Stores patient assessments permanently in a local SQLite database
- Calculates a transparent risk score from actual entered values (no hardcoded results)
- Tracks risk trajectory over time using multi-assessment trend analysis
- Generates human-readable contributing factors from observed abnormalities
- Creates alerts when high-risk indicators or deteriorating trends are detected
- Serves a live React dashboard showing real-time risk distribution

**What it does not do:**
- Diagnose sepsis
- Prescribe treatment
- Replace clinical judgement
- Connect to any external API

---

## Architecture

```
SEPSIS_AI/
├── backend/          ← FastAPI + SQLite
│   ├── main.py             All API endpoints
│   ├── database.py         SQLAlchemy engine & session
│   ├── models.py           ORM models (Patient, Assessment, Alert)
│   ├── schemas.py          Pydantic request/response models
│   ├── feature_engineering.py  Per-vital abnormality scoring
│   ├── risk_engine.py      Weighted transparent risk calculation
│   ├── trend_analysis.py   Multi-assessment trajectory analysis
│   ├── alerts.py           Alert creation logic
│   ├── seed_data.py        11 synthetic demo patients
│   ├── requirements.txt
│   ├── .env.example
│   └── sepsis_ai.db        SQLite database (created on first run)
├── frontend/         ← React + Vite
│   ├── src/
│   │   ├── services/api.js     API client (all backend calls)
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── PatientDirectory.jsx
│   │   │   ├── PatientDetail.jsx
│   │   │   ├── MonitorPatient.jsx
│   │   │   ├── PatientHistory.jsx
│   │   │   └── Alerts.jsx
│   │   ├── App.jsx             Routing & sidebar layout
│   │   ├── main.jsx
│   │   └── index.css           Dark clinical theme
│   └── .env
└── data/             ← Reserved for exported data files
```

---

## Backend Setup

### Prerequisites
- Python 3.11+ (tested on 3.14)
- pip

### 1 — Install dependencies

```bash
cd backend
pip install --prefer-binary -r requirements.txt
```

> **Note:** On Python 3.13+ use `--prefer-binary` to avoid building packages from source.

### 2 — Configure environment (optional)

```bash
cp .env.example .env
# Edit .env if your frontend runs on a non-default port
```

Default `.env.example`:
```
DATABASE_URL=sqlite:///./sepsis_ai.db
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 3 — Seed the database

```bash
python seed_data.py
```

This creates **11 synthetic patients** with realistic multi-step assessment histories:

| Patient | Name | Target Risk |
|---|---|---|
| PT-9520 | Samuel Okafor | HIGH / Deteriorating |
| PT-8492 | Eleanor Vance | HIGH / Deteriorating |
| PT-7182 | Rosemary Thorne | HIGH / Deteriorating |
| PT-6219 | Marcus Chen | HIGH / Deteriorating |
| PT-1033 | Grace Holloway | HIGH / Deteriorating |
| PT-3091 | Arthur Pendleton | HIGH / Stable |
| PT-2290 | Julian Ramos | MODERATE / Stable |
| PT-5503 | Devon Bradley | MODERATE / Stable |
| PT-1844 | Hannah Davies | LOW / Improving |
| PT-4721 | Claire Moreau | LOW / Stable |
| PT-3914 | Tariq Al-Mansoor | LOW / Stable |

Re-running `seed_data.py` is safe — it skips patients already in the database.

### 4 — Start FastAPI

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The server starts at **http://localhost:8000**

### 5 — API Documentation

Open **http://localhost:8000/docs** for the interactive Swagger UI.

All endpoints are documented with request/response schemas.

---

## Frontend Setup

### Prerequisites
- Node.js 18+
- npm

### 1 — Install dependencies

```bash
cd frontend
npm install
```

### 2 — Configure environment

The `.env` file is already pre-configured:

```
VITE_API_BASE_URL=http://localhost:8000
```

Change this if your backend runs on a different port.

### 3 — Start development server

```bash
npm run dev
```

Frontend runs at **http://localhost:5173**

Make sure the backend is running first.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/patients` | Register a new patient |
| `GET` | `/api/patients` | List patients (filter by status, search, risk_level, trend) |
| `GET` | `/api/patients/{id}` | Get patient with latest assessment data |
| `PATCH` | `/api/patients/{id}/status` | Discharge or re-activate a patient |
| `POST` | `/api/patients/{id}/assessments` | Submit a new clinical observation |
| `GET` | `/api/patients/{id}/history` | Get full assessment history (for trajectory chart) |
| `GET` | `/api/dashboard/summary` | Live counts: active, high/moderate/low risk, alerts |
| `GET` | `/api/dashboard/recent-events` | Latest assessments from active patients |
| `GET` | `/api/alerts` | List alerts (filter by acknowledged, patient_id) |
| `PATCH` | `/api/alerts/{id}/acknowledge` | Acknowledge an alert (does not delete it) |

### Example: Submit an Assessment

```bash
curl -X POST http://localhost:8000/api/patients/PT-9520/assessments \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 38.7,
    "heart_rate": 112,
    "respiratory_rate": 26,
    "systolic_bp": 88,
    "diastolic_bp": 54,
    "spo2": 91,
    "consciousness": "Voice",
    "wbc": 17.4,
    "hemoglobin": 10.8,
    "lactate": 3.5,
    "creatinine": 1.8
  }'
```

Response:
```json
{
  "assessment_id": "A-1A2B3C4D5E6F",
  "risk_score": 92.4,
  "risk_level": "HIGH",
  "ml_probability": 0.924,
  "clinical_score": 78.2,
  "trend_score": 14.2,
  "trend_direction": "DETERIORATING",
  "risk_delta": 18.6,
  "contributing_factors": [
    "Tachycardia",
    "Tachypnoea",
    "Low systolic blood pressure",
    "Reduced oxygen saturation",
    "Elevated WBC",
    "Elevated lactate",
    "qSOFA-like criteria met (≥2 of 3)",
    "Positive risk trajectory"
  ],
  "recommendation": "High-risk deterioration indicators detected with worsening trajectory. Urgent clinical review recommended according to local protocol.",
  "data_quality": "complete",
  "model_version": "prototype-v1"
}
```

---

## Risk Scoring Methodology

The risk engine is intentionally **transparent and explainable**. No black-box ML model is used.

1. Each vital sign and lab value is scored 0–1 against published adult reference ranges.
2. A weighted sum produces a `clinical_score` (0–100), with highest weights on SBP, lactate, and SpO₂.
3. qSOFA-like and SIRS-like composite indicators add bonus points.
4. Trend analysis compares the current assessment to previous assessments and adds a `trend_score` bonus (0–20) for deteriorating trajectories.
5. `risk_score = clinical_score + trend_score`, clipped to 0–100.

**Risk bands (research prototype only):**
- LOW: score < 40
- MODERATE: score 40–69
- HIGH: score ≥ 70

---

## Safety Disclaimer

This software is a **research and educational prototype** developed for hackathon demonstration purposes.

- It does **not** diagnose sepsis or any other medical condition.
- It does **not** provide medical advice or recommend specific treatments.
- It does **not** replace the clinical judgement of qualified healthcare professionals.
- All patient data used is entirely **synthetic** and does not represent real individuals.
- It must **not** be used in any clinical or patient-care setting.
- Alert wording is deliberately non-prescriptive and defers to local clinical protocols.

If you or someone you know requires medical attention, contact a qualified healthcare professional or emergency services immediately.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI + Uvicorn |
| Database | SQLite via SQLAlchemy |
| Validation | Pydantic v2 |
| Risk Engine | Custom weighted scoring (transparent, no LLM) |
| Frontend | React 18 + Vite |
| Routing | React Router v6 |
| Charts | Recharts |
| Styling | CSS custom properties (dark clinical theme) |
