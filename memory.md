# TheShutki — working memory

## Backend (2026-10-06)
The live API is the Node.js/Express backend in `backend/`, taken from `2ad762d9-4c43-471e-9bdf-2f316fdc2bdc.zip` (`export_node/backend`).

Replaced the FastAPI app (`server.py`, `requirements.txt`). HTTP tests remain in `backend/tests/`.

- Start locally: `npm start` from the repo root, or `cd backend && npm start` (port 8001 if `PORT` is unset)
- hPanel Node.js Web App (one app): framework **Express**, Node **24** or **22**, root `/`, entry **`server.js`**, build **Default for Express**. `npm install` builds the React shop. The site is served at `/` and the API at `/api`. Do not set `PORT`. Set `MONGO_URL` and allow `0.0.0.0/0` in Atlas.
- Mongo: `MONGO_URL` (default `mongodb://localhost:27017`), `DB_NAME` (default `theshutki`). The HTTP server listens before Mongo connects and retries.
- Empty DB auto-seeds admin, catalog, recipes, reviews, settings
- Uploads: `backend/uploads/`, served at `/api/files/<filename>`
- Admin: `admin@theshutki.com` / `Shutki@2026` (override with `ADMIN_PASSWORD`)
- Env template: `backend/.env.example`
- Local Atlas: `backend/.env` stays on this machine only (gitignored). It points at `cluster0.uvzwhrn.mongodb.net`, database `theshutki`. Paste `MONGO_URL` and the other secrets into hPanel environment variables. Do not commit the password. Atlas Network Access must allow `0.0.0.0/0`.
- Google sign-in: `GOOGLE_CLIENT_ID` is in `backend/.env`. The client secret is stored there too, but the API only checks the ID token audience, so the secret is unused. In Google Cloud, add the site origin (and `http://localhost:3000` for local) under Authorized JavaScript origins.
- Phone OTP: Firebase project `theshutki-a580d` (`theshutki-a580d.firebaseapp.com`). Keys live in `backend/.env` and are sent to the browser by `GET /api/auth/config`. Enable the Phone provider in Firebase Authentication and add the site under Authorized domains. On hPanel set `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, and `FIREBASE_PROJECT_ID` from that file.

`node-backend/` and `export_node/backend/` are the older API-only copies. The live app calls `/api` on the same host unless `REACT_APP_BACKEND_URL` is set.
