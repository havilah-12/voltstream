# VoltStream

> **Smart Energy Monitoring Platform with Multi-Agent AI Architecture**

VoltStream is a next-generation household smart energy monitoring platform. It helps users understand live grid and solar power, control smart devices, track billing, and get instant help through an advanced **Multi-Agent Orchestration** framework powered by Google Cloud Vertex AI (Gemini 2.5 Flash).

---

## ✨ Key Technical Achievements

1. **Multi-Agent Orchestrator (Google ADK):** A dynamic routing system where an Orchestrator LLM delegates tasks to specialized sub-agents (Analyst, Advisor, Device).
2. **Advanced RAG with LLM-as-a-Judge:** The Advisor agent combines unstructured Vector DB chunks (ChromaDB) with structured NoSQL data (Firestore), and strictly verifies its own answers using a secondary LLM Judge prompt.
3. **OpenTelemetry & Jaeger Tracing:** Full distributed tracing embedded into the FastAPI backend, tracking LLM latency, database queries, and agent routing in a local Jaeger UI.
4. **Google Cloud Firestore Migration:** Fully migrated from local SQLite to a scalable NoSQL Google Cloud Firestore database.

---

## 🏗️ Core Architectural Flows

VoltStream relies on a modern React (Vite) frontend, a FastAPI backend, Google Cloud Firestore, and Vertex AI.

### 1. 🤖 The Multi-Agent Orchestrator Flow
The heart of VoltStream's "AI Insights" chat.

```text
User Input: "Show my usage and tell me how to save energy."
   │
   ▼
[FastAPI Router] ──► /api/v1/multi_agent/chat
   │
   ▼
[Orchestrator Agent] ──► (Vertex AI) Analyzes intent
   │
   ├──► Routes to [Analyst Agent] ──► Uses Firestore Tools to fetch Usage History
   └──► Routes to [Advisor Agent] ──► Uses Advanced RAG for solar/energy advice
```

### 2. 🏠 The Device Agent Flow (Standalone)
For ultra-fast, low-latency smart home control, the Device Agent operates independently.

```text
User Input: "Turn off the AC in 5 minutes."
   │
   ▼
[FastAPI Router] ──► /api/v1/device_agent/chat
   │
   ▼
[Device Agent] ──► (Vertex AI) Determines schedule and toggle state
   │
   ▼
[Tools] ──► Uses `schedule_device` tool to queue the command
```

### 3. 🧠 Advanced RAG & LLM-as-a-Judge (Advisor Agent)
The Retrieval-Augmented Generation (RAG) system powers grounded Q&A with strict hallucination checks.

```text
User Question: "What is a solar surplus?"
   │
   ▼
[ChromaDB Vector Store] ──► Searches semantic chunks from 'VoltStream Guide' PDFs
   │
   ▼
[Firestore DB] ──► Fetches real-time user context (Invoices, Device state)
   │
   ▼
[Gemini AI] ──► Generates a "Draft Answer" using combined context
   │
   ▼
[LLM-as-a-Judge] ──► A secondary Vertex AI prompt strictly evaluates the draft
   │                 (Rejects hallucinations, confirms sources)
   ▼
[Frontend SSE] ◄── Streams final verified answer + source citations to UI
```

### 4. 📡 OpenTelemetry Tracing
Every action inside the backend is tracked by OpenTelemetry and visualized in Jaeger.

```text
[FastAPI] ──► [Agent Router] ──► [Tool Execution] ──► [Vertex AI Request]
   │               │                   │                     │
   └───────────────┴─────────┬─────────┴─────────────────────┘
                             ▼
                    [OTLPSpanExporter] (gRPC)
                             │
                             ▼
                    [Jaeger Docker Container] ──► UI on Port 16686
```

---

## 🚀 Deployment Instructions

VoltStream is fully deployed on Google Cloud Platform and Firebase.

### Frontend Deployment (Firebase Hosting)
The React frontend is automatically built and deployed via **GitHub Actions**.
1. Push your code to the `main` branch:
   ```bash
   git add .
   git commit -m "update frontend"
   git push origin main
   ```
2. The GitHub Action (`firebase-hosting-merge.yml`) will automatically run `npm run build` and deploy the output to Firebase Hosting.

### Backend Deployment (Google Cloud Run)
The FastAPI backend is deployed to Google Cloud Run using source-based deployment (Cloud Build).
1. Open your terminal in the root `voltstream` directory.
2. Run the deployment command:
   ```bash
   gcloud run deploy voltstream-api --source backend --region us-east4 --allow-unauthenticated
   ```
3. Cloud Build will automatically containerize the Python app and deploy the live API endpoint.

---

## 💻 Running Locally

### 1. Start the Jaeger Tracing Container
To view `[AGENT TRACES]` and OpenTelemetry waterfalls locally:
```bash
docker run -d --name jaeger -e COLLECTOR_OTLP_ENABLED=true -p 16686:16686 -p 4317:4317 -p 4318:4318 jaegertracing/all-in-one:latest
```
*View the dashboard at `http://localhost:16686`*

### 2. Start the FastAPI Backend
```bash
cd backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload
```

### 3. Start the React Frontend
```bash
cd frontend
npm run dev
```
