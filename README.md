# VoltStream

VoltStream is a full-stack energy monitoring dashboard with a React/Vite frontend and a FastAPI backend. The app shows live usage, analytics history, connected devices, and billing summaries using mock data from the backend.

## Tech Stack

- Frontend: React, Vite, React Router, Recharts, Tailwind CSS, Lucide icons
- Backend: FastAPI, Uvicorn, Pydantic
- Local runtime: Docker Compose
- Deployment: Firebase Hosting for frontend, Cloud Run for backend

## Project Structure

```text
voltstream/
|-- backend/
|   |-- Dockerfile
|   |-- main.py
|   |-- mock_data.py
|   |-- requirements.txt
|   `-- routers/
|-- frontend/
|   |-- firebase.json
|   |-- src/
|   |-- package.json
|   |-- Dockerfile
|   `-- nginx.conf
`-- docker-compose.yml
```

## Live Deployment

- Frontend: https://voltstreamapp-12.web.app
- Backend: https://voltstream-api-2321325123.us-east4.run.app
- API docs: https://voltstream-api-2321325123.us-east4.run.app/docs

The deployed frontend is configured through `frontend/.env.production` to call the Cloud Run backend at:

```text
https://voltstream-api-2321325123.us-east4.run.app/api/v1
```

## Run With Docker

Build and start both services:

```powershell
docker compose up --build
```

Open the app:

- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- API docs: http://localhost:8000/docs

To rebuild only the backend after dependency changes:

```powershell
docker compose build backend
docker compose up -d backend
```

## Run Locally

### Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

If the backend is running on a non-default URL, set `VITE_API_BASE_URL` before starting Vite:

```powershell
$env:VITE_API_BASE_URL="http://localhost:8000/api/v1"
npm run dev
```

## API Routes

- `GET /api/v1/dashboard/live` - live dashboard metrics
- `GET /api/v1/analytics/history?period=daily|weekly|monthly` - usage history
- `GET /api/v1/devices/` - list devices
- `PATCH /api/v1/devices/{id}` - update device status
- `GET /api/v1/billing/summary` - billing summary

## Deployment

### Backend - Cloud Run

Run these commands after backend changes:

```powershell
cd C:\Users\HAVILAH\Documents\TACHYON\Voltstream\voltstream\backend
gcloud builds submit --tag us-east4-docker.pkg.dev/voltstreamapp/cloud-run-source-deploy/voltstream/voltstream-api
gcloud run deploy voltstream-api --image us-east4-docker.pkg.dev/voltstreamapp/cloud-run-source-deploy/voltstream/voltstream-api --region us-east4 --allow-unauthenticated
```

### Frontend - Firebase Hosting

Run these commands after frontend changes:

```powershell
cd C:\Users\HAVILAH\Documents\TACHYON\Voltstream\voltstream\frontend
npm run build
npx firebase deploy --only hosting
```

Firebase Hosting config lives in `frontend/firebase.json`, and GitHub Actions deploy from the `frontend` entry point.

## Useful Commands

```powershell
# Frontend checks
cd frontend
npm run lint
npm run build

# Backend import smoke test
cd backend
.\venv\Scripts\python.exe -c "import main; print(main.app.title)"

# Docker logs
docker compose logs -f backend
docker compose logs -f frontend
```

## Troubleshooting

If the backend fails on startup with `ForwardRef._evaluate() missing 1 required keyword-only argument: 'recursive_guard'`, rebuild the backend image after installing the current dependencies. That error usually means an old Pydantic v1 package is being used with a newer Python runtime.

```powershell
docker compose build backend
docker compose up -d backend
```

The local `backend/venv` and the Docker image can use different Python versions. Check them separately:

```powershell
python --version
.\backend\venv\Scripts\python.exe --version
docker compose exec backend python --version
```
