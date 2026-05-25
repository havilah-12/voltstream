# VoltStream

> **Smart Energy Monitoring Platform with AI‑Powered Device Control & Conversational Assistant**

VoltStream is a household smart energy monitoring platform that helps users understand live grid and solar power, control smart devices, track billing, and get instant help through an AI assistant.

---

## ✨ Key Features

### 📊 Energy Monitoring
- **Live Dashboard**: Real-time grid draw, solar generation, and net usage.
- **Analytics**: Daily, weekly, and monthly energy consumption trends.
- **Solar Tracking**: Monitor solar coverage and savings.

### 🏠 Smart Device Control
- **Manual Control**: Toggle devices on/off with instant UI feedback.
- **AI Agent**: Natural language device control ("Turn off the AC").
- **Scheduling**: Schedule devices for future times ("Turn on fan in 10 minutes").
- **Seasonal Modes**: Summer, winter, energy‑saving, and vacation presets.

### 💬 AI Assistant
- **Chat Bot**: Conversational help about energy concepts.
- **Q&A Bot**: Grounded answers from VoltStream knowledge base (RAG).
- **Quick Assistant**: Available on every page.

### 💰 Billing & Savings
- **Bill Tracking**: Current balance, projected bill, and payable amount.
- **Solar Savings**: Calculate savings from solar generation.
- **Invoice History**: View and download past invoices.
- **Budget Alerts**: Track spending against budget limits.

---

## 🏗️ Core Architectural Flows

VoltStream relies on a modern React (Vite) frontend, a FastAPI backend, embedded SQLite, and Google Gemini AI. Below are the core technical flows.

### 1. 🤖 Device Agent Flow (Google ADK)
The Device Agent handles natural language commands to control smart home devices.

```text
User Input: "Turn on the AC in 5 minutes" 
   │
   ▼
[FastAPI Router] ──► injects exact current local time (Asia/Kolkata) into prompt
   │
   ▼
[Google ADK Runner] ──► sends prompt to Gemini 2.5 Flash
   │
   ▼
[Gemini AI] ──► determines tools needed based on instructions
   │
   ▼
[Agent Tools]
 ├─► 1. get_device_status("AC") ─► finds device ID 'ac-2'
 ├─► 2. schedule_device_toggle("ac-2", "ON", "2026-05-25T10:45:00")
   │
   ▼
[Python Threading] ──► sets a background timer for 5 minutes
   │
   ▼
[Frontend SSE] ◄── streams "AC 2 will be turned ON in 5 minutes." back to UI
```

### 2. 🧠 RAG Flow (Knowledge Retrieval)
The Retrieval-Augmented Generation (RAG) system powers grounded Q&A.

```text
User Question: "What is a solar surplus?"
   │
   ▼
[ChromaDB Vector Store] ──► searches embedded chunks from 'energy_guide.txt'
   │
   ▼
[SQLite DB] ──► grabs live dashboard and billing context
   │
   ▼
[Context Assembly] ──► merges top 5 guide chunks + SQL live context
   │
   ▼
[Gemini AI] ──► answers strictly using provided context
   │
   ▼
[Response] ◄── sends factual answer + source citations to UI
```

### 3. 💬 Chatbot Flow (Conversational)
A lightweight conversational bot for general energy concepts, strictly scoped.

```text
User Input: "How do solar panels work?"
   │
   ▼
[System Prompt] ──► restricts AI to general concepts (no personal DB access)
   │
   ▼
[Gemini AI] ──► generates short (2-4 sentence) plain text response
   │
   ▼
[Response] ◄── Returns answer to user
```

### 4. 🗄️ Database Flow (SQLite)
Embedded zero-config database using native python `sqlite3`.

```text
[Frontend API Call] ──► e.g. GET /api/v1/devices
   │
   ▼
[FastAPI Service] 
   │
   ▼
[db.py Context Manager] ──► opens thread-safe connection to voltstream.db
   │
   ▼
[SQL Query] ──► SELECT * FROM devices
   │
   ▼
[Data Return] ◄── rows formatted to dicts and served as JSON
```
**Core Tables:**
- `devices` - Smart devices (AC, fan, lights, etc.)
- `dashboard_live` - Real-time energy metrics
- `analytics_history` - Historical usage data
- `billing_summary` - Current billing info
- `invoice_history` - Past invoices

*(DB auto-initializes on startup with seed data from `backend/data/seed_db.py`)*

### 5. 🧩 ChromaDB Flow (Vector Initialization)
Handles the startup sequence for creating the vector database used in RAG.

```text
[App Startup] ──► triggers ChromaDB initialization
   │
   ▼
[Read Document] ──► loads 'backend/data/energy_guide.txt'
   │
   ▼
[Text Chunking] ──► splits text cleanly using double-newlines (\n\n)
   │
   ▼
[Gemini Embeddings] ──► converts text chunks into vector embeddings via API
   │
   ▼
[ChromaDB] ◄── stores vectors locally in 'chroma_data/' folder for fast querying
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ (frontend)
- **Python** 3.10+ (backend)
- **Gemini API Key** (free from Google AI Studio)

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/voltstream.git
cd voltstream
```

### 2. Backend Setup
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Create .env file
copy .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Run backend
uvicorn main:app --reload --port 8000
```
Backend will be available at: http://localhost:8000

### 3. Frontend Setup
```powershell
cd frontend
npm install
npm run dev
```
Frontend will be available at: http://localhost:5173

---

## 📁 Project Structure
```
voltstream/
├── backend/                    # FastAPI backend
│   ├── data/                   # Knowledge base & DB Seeds
│   ├── routers/                # API endpoints
│   ├── services/               # Core business & AI logic
│   ├── schemas/                # Pydantic models
│   ├── db.py                   # SQLite connection
│   ├── config.py               # Configuration
│   ├── main.py                 # FastAPI app
│   └── requirements.txt        
│
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── api/                # API client functions
│   │   ├── components/         # Reusable UI components
│   │   ├── features/           # Feature modules
│   │   ├── pages/              # Main app views
│   │   └── App.jsx             # Main app component
│   └── package.json            
│
└── README.md                   # This file
```

---

## 🔧 Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Recharts, Lucide Icons
- **Backend**: FastAPI, Pydantic, Python 3.10+
- **Database**: Embedded SQLite, ChromaDB (Vector Store)
- **AI/ML**: Google Gemini 2.5 Flash, Gemini Embeddings, Google Agent Development Kit (ADK)

---

## 🌐 Live Deployment
- **Frontend**: https://voltstreamapp-12.web.app (Firebase Hosting)
- **Backend API**: https://voltstream-api-2321325123.us-east4.run.app (Google Cloud Run)
- **API Docs**: https://voltstream-api-2321325123.us-east4.run.app/docs

---

## 🙏 Acknowledgments
- **Google Gemini** - AI model and embeddings
- **ChromaDB** - Vector database
- **FastAPI** - Backend framework
- **React** - Frontend framework
