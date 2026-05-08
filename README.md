# VoltStream

VoltStream is a full-stack energy monitoring dashboard with a React/Vite frontend and a FastAPI backend. The app shows live usage, analytics history, connected devices, and billing summaries using mock data from the backend.

## Tech Stack

- Frontend: React, Vite, React Router, Recharts, Tailwind CSS, Lucide icons
- Backend: FastAPI, Uvicorn, Pydantic
- Runtime: Docker Compose

## Project Structure

```text
voltstream/
|-- backend/
|   |-- main.py
|   |-- mock_data.py
|   |-- requirements.txt
|   `-- routers/
|-- frontend/
|   |-- src/
|   |-- package.json
|   |-- Dockerfile
|   `-- nginx.conf
`-- docker-compose.yml
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

- `GET /` - health check
- `GET /api/v1/dashboard/live` - live dashboard metrics
- `GET /api/v1/analytics/history?period=daily|weekly|monthly` - usage history
- `GET /api/v1/devices/` - list devices
- `POST /api/v1/devices/` - create a device
- `PATCH /api/v1/devices/{id}` - update device status
- `PUT /api/v1/devices/{id}` - replace a device
- `DELETE /api/v1/devices/{id}` - delete a device
- `GET /api/v1/billing/summary` - billing summary

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
