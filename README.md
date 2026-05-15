# VoltStream

VoltStream is a household smart energy monitoring platform with a React/Vite frontend and a FastAPI backend. It helps users understand live grid and solar power, device usage, billing impact, conversational platform help, and grounded Q&A through the assistant.

## Tech Stack

- Frontend: React, Vite, React Router, Axios, Recharts, Tailwind CSS, Lucide icons
- Backend: FastAPI, Uvicorn, Pydantic, Gemini API, ChromaDB-based RAG
- Frontend hosting: Firebase Hosting
- Backend deployment: Google Cloud Run

## Project Structure

```text
voltstream/
|-- backend/
|   |-- Dockerfile
|   |-- config.py
|   |-- main.py
|   |-- qa_bot.py
|   |-- requirements.txt
|   |-- streamlit_app.py
|   |-- data/
|   |-- routers/
|   |-- schemas/
|   `-- services/
|-- frontend/
|   |-- firebase.json
|   |-- .firebaserc
|   |-- src/
|   |   |-- api/
|   |   |-- auth/
|   |   |-- components/
|   |   |-- features/
|   |   `-- pages/
|   `-- package.json
`-- README.md
```

## Live Deployment

- Frontend: [https://voltstreamapp-12.web.app](https://voltstreamapp-12.web.app)
- Backend: [https://voltstream-api-2321325123.us-east4.run.app](https://voltstream-api-2321325123.us-east4.run.app)
- API docs: [https://voltstream-api-2321325123.us-east4.run.app/docs](https://voltstream-api-2321325123.us-east4.run.app/docs)

The frontend is configured to call:

```text
https://voltstream-api-2321325123.us-east4.run.app/api/v1
```

## Local Development

### Backend

Create and activate a virtual environment:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Run the API locally:

```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend local URLs:

- API root: [http://localhost:8000](http://localhost:8000)
- Swagger docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### Frontend

Install dependencies and start Vite:

```powershell
cd frontend
npm install
npm run dev
```

Frontend local URL:

- App: [http://localhost:5173](http://localhost:5173)

If needed, set the backend URL before running Vite:

```powershell
$env:VITE_API_BASE_URL="http://localhost:8000/api/v1"
npm run dev
```

## Environment Setup

Create `backend/.env` from `backend/.env.example`.

Example values:

```env
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=models/gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=models/gemini-embedding-001
CHROMA_COLLECTION_NAME=voltstream_guide
CHROMA_PATH=chroma_data
```

If `GEMINI_API_KEY` is not set, the bot falls back to grounded local answers from `backend/data/energy_guide.txt`.

## API Routes

- `GET /api/v1/dashboard/live` - live dashboard metrics
- `GET /api/v1/analytics/history?period=daily|weekly|monthly` - usage history
- `GET /api/v1/devices/` - list devices
- `PATCH /api/v1/devices/{id}` - update device status
- `GET /api/v1/billing/summary` - billing summary
- `POST /api/v1/chat` - conversational Chat Bot endpoint for VoltStream help and assistant replies
- `POST /api/v1/qa` - grounded Q&A Bot endpoint using Chroma retrieval and optional file attachments
- `GET /api/v1/chat/status` - Chroma/Gemini readiness status

## Frontend Routes

- `/` - live dashboard
- `/analytics` - usage history
- `/devices` - smart device control
- `/billing` - billing and invoices
- `/chat` - assistant page with Chat Bot and Q&A Bot modes
- `/login` - demo login page
- `/signup` - demo signup page
- `/welcome` - first-time welcome flow

The login/signup flow is a local demo auth layer using `localStorage`.

## Assistant Features

- Chat Bot mode for conversational platform help
- Q&A Bot mode for grounded energy and document questions
- ChromaDB retrieval for Q&A mode
- Gemini response generation
- File attachments in Q&A (`.txt`, `.md`, `.csv`, `.json`, `.log`, `.pdf`)
- Quick assistant available across pages
- Full assistant page at `/chat`

## Billing Features

- Generated bill and payable bill views
- Solar savings and budget tracking
- Invoice history
- PDF download for current and historical invoices

## Cloud Deployment

VoltStream uses separate deployment paths:

- Backend: deploy `backend/` to Cloud Run using `backend/Dockerfile`
- Frontend: deploy `frontend/` to Firebase Hosting

### Backend: Cloud Run

```powershell
gcloud auth login
gcloud config set project voltstreamapp
gcloud config set compute/region us-east4
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

Create the Artifact Registry repository once if needed:

```powershell
gcloud artifacts repositories create cloud-run-source-deploy --repository-format=docker --location=us-east4
```

Build and deploy:

```powershell
cd C:\Users\HAVILAH\Documents\TACHYON\Voltstream\voltstream\backend
gcloud builds submit --tag us-east4-docker.pkg.dev/voltstreamapp/cloud-run-source-deploy/voltstream/voltstream-api
gcloud run deploy voltstream-api --image us-east4-docker.pkg.dev/voltstreamapp/cloud-run-source-deploy/voltstream/voltstream-api --region us-east4 --allow-unauthenticated
```

### Frontend: Firebase Hosting

```powershell
cd C:\Users\HAVILAH\Documents\TACHYON\Voltstream\voltstream\frontend
npm install
npm run build
firebase deploy --only hosting
```

## Useful Commands

### Frontend

```powershell
cd frontend
npm run build
```

### Backend

```powershell
cd backend
.\venv\Scripts\python.exe -c "import main; print(main.app.title)"
```

Test Chat Bot locally:

```powershell
curl -X POST http://localhost:8000/api/v1/chat -H "Content-Type: application/json" -d "{\"question\":\"What is solar surplus?\"}"
```

Test Q&A Bot locally:

```powershell
curl -X POST http://localhost:8000/api/v1/qa -H "Content-Type: application/json" -d "{\"question\":\"What is the difference between kW and kWh?\"}"
```

Run the CLI Q&A bot:

```powershell
cd backend
.\venv\Scripts\python.exe qa_bot.py
```

Run the Streamlit helper:

```powershell
cd backend
streamlit run streamlit_app.py
```

## Nomenclature

- **Grid Power / Grid Draw**: Live power currently taken from the electricity grid.
- **Solar Power / Solar Generation**: Live power currently generated by the solar panels and available for home usage.
- **Solar Surplus**: Extra solar power left after home usage is covered.
- **Energy Balance / Net Usage**: Difference between grid draw and solar generation.
- **kW**: Live power at one point in time.
- **kWh**: Total energy used or generated over time.
- **Solar Coverage**: Percentage of grid usage offset by solar generation.
- **Bill Savings**: Estimated savings because solar reduced grid power purchase.
- **Peak Grid Period**: Day, week, or month where grid usage was highest.
- **RAG**: Retrieval-Augmented Generation.
- **Chunk**: Smaller section of source context used for retrieval.
- **Embedding Vector**: Numerical representation of text meaning.
- **Grounded Answer**: Answer generated only from VoltStream context.
- **Out-of-Scope Question**: Anything outside VoltStream, solar, grid, devices, billing, or the provided guide.
