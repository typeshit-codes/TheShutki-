# TheShutki — working memory

## Backend (2026-10-06)
The live API is the Node.js/Express backend in `backend/`, taken from `2ad762d9-4c43-471e-9bdf-2f316fdc2bdc.zip` (`export_node/backend`).

Replaced the FastAPI app (`server.py`, `requirements.txt`). HTTP tests remain in `backend/tests/`.

- Start locally: `npm start` from the repo root, or `cd backend && npm start` (port 8001 if `PORT` is unset)
- hPanel Node.js Web App: framework **Express**, Node **22**, build command **empty**, entry file **`server.js`**. Root directory `/` for this repo, or `backend` if only that folder is uploaded. Do not set `PORT` (Hostinger assigns it). Set `MONGO_URL` to MongoDB Atlas and allow `0.0.0.0/0` in Atlas Network Access.
- Mongo: `MONGO_URL` (default `mongodb://localhost:27017`), `DB_NAME` (default `theshutki`). The HTTP server listens before Mongo connects and retries.
- Empty DB auto-seeds admin, catalog, recipes, reviews, settings
- Uploads: `backend/uploads/`, served at `/api/files/<filename>`
- Admin: `admin@theshutki.com` / `Shutki@2026` (override with `ADMIN_PASSWORD`)
- Env template: `backend/.env.example`
- Local Atlas: `backend/.env` (gitignored) points at `cluster0.uvzwhrn.mongodb.net`, database `theshutki`. Same `MONGO_URL` must be pasted into hPanel environment variables. Do not commit the password.
- Google sign-in: `GOOGLE_CLIENT_ID` is in `backend/.env`. The client secret is stored there too, but the API only checks the ID token audience, so the secret is unused. In Google Cloud, add the site origin (and `http://localhost:3000` for local) under Authorized JavaScript origins.
- Phone OTP: Firebase project `theshutki` (`theshutki.firebaseapp.com`). Keys live in `backend/.env` and are sent to the browser by `GET /api/auth/config`. Enable the Phone provider in Firebase Authentication and add the site under Authorized domains.

`node-backend/` and `export_node/backend/` are the same Node API (Hostinger export). Frontend still calls `REACT_APP_BACKEND_URL` + `/api`.
