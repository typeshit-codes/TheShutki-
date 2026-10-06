# TheShutki.com — Full Export

This bundle contains the complete source code and a database export for TheShutki.com
(React + FastAPI + MongoDB).

## Contents
- `backend/`  — FastAPI app (`server.py`, `requirements.txt`, `.env.example`)
- `frontend/` — React app (source, `package.json`). `node_modules` NOT included.
- `export/db_dump/`  — native `mongodump` (BSON) — restore with `mongorestore`
- `export/db_json/`  — one JSON file per collection — import with `mongoimport`

## 1) Install & Run Backend
```
cd backend
python -m venv venv && source venv/bin/activate   # (Windows: venv\Scripts\activate)
pip install -r requirements.txt
cp .env.example .env     # then edit values (see below)
uvicorn server:app --host 0.0.0.0 --port 8001
```

### backend/.env values to set
```
MONGO_URL="mongodb://localhost:27017"      # or your MongoDB Atlas URI
DB_NAME="theshutki"                          # any database name you like
CORS_ORIGINS="*"
JWT_SECRET="<generate a long random hex string>"
ADMIN_EMAIL="admin@theshutki.com"
ADMIN_PASSWORD="<choose a strong password>"
EMERGENT_LLM_KEY=""                          # only needed for admin image uploads
GOOGLE_CLIENT_ID=""                          # optional (can also set in Admin > Settings)
FIREBASE_API_KEY=""                          # optional
FIREBASE_AUTH_DOMAIN=""                       # optional
FIREBASE_PROJECT_ID=""                        # optional
```
> On first startup the backend auto-seeds admin + sample catalog if the DB is empty.
> If you import the DB (below) instead, that seed is skipped.

## 2) Install & Run Frontend
```
cd frontend
yarn install            # (or: npm install)
# set frontend/.env:
#   REACT_APP_BACKEND_URL=http://localhost:8001
yarn start              # dev  (or: yarn build  for production static files)
```
All frontend API calls use `REACT_APP_BACKEND_URL` + `/api`.

## 3) Import the Database (choose ONE)

### Option A — mongorestore (exact copy, recommended)
```
mongorestore --db theshutki ./export/db_dump/test_database
```
(`test_database` is the folder name produced by the export; `--db theshutki` is your target DB name, must match DB_NAME.)

### Option B — mongoimport (per collection, from JSON)
```
cd export/db_json
for f in *.json; do mongoimport --db theshutki --collection "${f%.json}" --jsonArray --file "$f"; done
```
(Windows: import each file individually with `mongoimport --db theshutki --collection users --jsonArray --file users.json`, etc.)

## Default Admin Login (from the exported data)
- Email: admin@theshutki.com
- Password: Shutki@2026   (change this in production!)

## Hostinger / Self-Hosting Notes
- Use MongoDB Atlas (free tier) and put its URI in MONGO_URL.
- Run the FastAPI backend with a process manager (gunicorn/uvicorn + systemd or PM2).
- Build the frontend (`yarn build`) and serve the static files; point REACT_APP_BACKEND_URL to your live backend URL before building.
- Set a strong JWT_SECRET and ADMIN_PASSWORD.
