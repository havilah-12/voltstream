# VoltStream

VoltStream is a full-stack energy monitoring dashboard with a React/Vite frontend and a FastAPI backend. The app shows live usage, analytics history, connected devices, and billing summaries using mock data from the backend.

## Tech Stack

- Frontend: React, Vite, React Router, Axios, Recharts, Tailwind CSS, Lucide icons
- Backend: FastAPI, Uvicorn, Pydantic
- Local runtime: Docker Compose
- Deployment: Firebase Hosting for frontend, Cloud Run for backend

## Project Structure

```text
voltstream/
|-- backend/
|   |-- Dockerfile
|   |-- main.py
|   |-- requirements.txt
|   |-- data/
|   |-- routers/
|   |-- schemas/
|   `-- services/
|-- frontend/
|   |-- firebase.json
|   |-- .firebaserc
|   |-- src/
|   |   |-- api/
|   |   |-- components/
|   |   |-- features/
|   |   `-- pages/
|   `-- package.json
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

## Cloud Deployment Guide

Backend is deployed to Google Cloud Run. Frontend is deployed to Firebase Hosting.

### Part 1 - Backend Deployment: Cloud Run

#### Step 1 - Login to Google Cloud

```powershell
gcloud auth login
```

#### Step 2 - Set the active Google Cloud project

```powershell
gcloud config set project voltstreamapp
```

#### Step 3 - Set the deployment region

```powershell
gcloud config set compute/region us-east4
```

#### Step 4 - Verify the active configuration

```powershell
gcloud config list
```

#### Step 5 - Enable required Google Cloud APIs

```powershell
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

#### Step 6 - Create Artifact Registry repository

If the repository already exists, ignore the error and continue.

```powershell
gcloud artifacts repositories create cloud-run-source-deploy --repository-format=docker --location=us-east4
```

#### Step 7 - Navigate to the backend folder

```powershell
cd C:\Users\HAVILAH\Documents\TACHYON\Voltstream\voltstream\backend
```

#### Step 8 - Build and push backend Docker image

```powershell
gcloud builds submit --tag us-east4-docker.pkg.dev/voltstreamapp/cloud-run-source-deploy/voltstream/voltstream-api
```

#### Step 9 - Deploy backend to Cloud Run

```powershell
gcloud run deploy voltstream-api --image us-east4-docker.pkg.dev/voltstreamapp/cloud-run-source-deploy/voltstream/voltstream-api --region us-east4 --allow-unauthenticated
```

#### Step 10 - Test the deployed backend

- Backend URL: https://voltstream-api-2321325123.us-east4.run.app
- Swagger Docs: https://voltstream-api-2321325123.us-east4.run.app/docs

#### Step 11 - Permission fix, only if Cloud Build gives a 403 error

Run these once only if needed.

```powershell
gcloud projects add-iam-policy-binding voltstreamapp --member="serviceAccount:2321325123-compute@developer.gserviceaccount.com" --role="roles/storage.objectViewer"
gcloud projects add-iam-policy-binding voltstreamapp --member="serviceAccount:2321325123-compute@developer.gserviceaccount.com" --role="roles/cloudbuild.builds.builder"
gcloud projects add-iam-policy-binding voltstreamapp --member="serviceAccount:2321325123-compute@developer.gserviceaccount.com" --role="roles/artifactregistry.writer"
```

#### Step 12 - Redeploy after backend changes

```powershell
cd C:\Users\HAVILAH\Documents\TACHYON\Voltstream\voltstream\backend
gcloud builds submit --tag us-east4-docker.pkg.dev/voltstreamapp/cloud-run-source-deploy/voltstream/voltstream-api
gcloud run deploy voltstream-api --image us-east4-docker.pkg.dev/voltstreamapp/cloud-run-source-deploy/voltstream/voltstream-api --region us-east4 --allow-unauthenticated
```

### Part 2 - Frontend Deployment: Firebase Hosting

#### Step 1 - Navigate to the frontend folder

```powershell
cd C:\Users\HAVILAH\Documents\TACHYON\Voltstream\voltstream\frontend
```

#### Step 2 - Install Firebase CLI, if not already installed

```powershell
npm install -g firebase-tools
```

#### Step 3 - Login to Firebase

```powershell
firebase login
```

#### Step 4 - Install frontend dependencies

```powershell
npm install
```

#### Step 5 - Set the backend API URL

```powershell
$env:VITE_API_BASE_URL="https://voltstream-api-2321325123.us-east4.run.app/api/v1"
```

#### Step 6 - Build the React frontend

```powershell
npm run build
```

This creates the production build inside:

```text
frontend/dist/
```

#### Step 7 - Initialize Firebase Hosting

Run this only the first time.

```powershell
firebase init hosting
```

Select these options when prompted:

```text
Use existing project: Yes
Firebase project: voltstreamapp-12
Public directory: dist
Configure as single-page app: Yes
Set up automatic builds with GitHub: Yes
```

#### Step 8 - Deploy frontend to Firebase Hosting

```powershell
firebase deploy --only hosting
```

#### Step 9 - View the deployed frontend

- Frontend URL: https://voltstreamapp-12.web.app/

#### Step 10 - Redeploy after frontend changes

```powershell
cd C:\Users\HAVILAH\Documents\TACHYON\Voltstream\voltstream\frontend
npm run build
firebase deploy --only hosting
```

### Final Deployed URLs

- Backend Swagger: https://voltstream-api-2321325123.us-east4.run.app/docs
- Frontend: https://voltstreamapp-12.web.app/

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
