# TheShutki.com — Node.js Edition (Hostinger-ready)

Full stack: **React frontend + Node.js/Express backend + MongoDB**.
This is the Node.js backend version (Hostinger supports Node.js).

## Contents
- `backend/`  — Node.js + Express API (`server.js`, `seed.js`, `util.js`, `package.json`, `.env.example`)
- `frontend/` — React app (source + `package.json`). `node_modules` NOT included.
- `db_dump/`  — native `mongodump` (BSON). Restore with `mongorestore`.
- `db_json/`  — one JSON file per collection. Import with `mongoimport`.

The Node backend exposes the EXACT same `/api/...` routes as the React app expects,
so the frontend works unchanged.

---

## 1) MongoDB
Use a local MongoDB or a free **MongoDB Atlas** cluster. Note the connection string.

## 2) Backend (Node.js)
```
cd backend
npm install
cp .env.example .env     # then edit values
npm start                # starts on PORT (default 8001)
```
### backend/.env
```
PORT=8001
MONGO_URL="mongodb://localhost:27017"   # or your Atlas URI
DB_NAME="theshutki"
JWT_SECRET="<long random string>"
ADMIN_EMAIL="admin@theshutki.com"
ADMIN_PASSWORD="<strong password>"
GOOGLE_CLIENT_ID=""                      # optional (also settable in Admin > Settings)
FIREBASE_API_KEY=""                      # optional
FIREBASE_AUTH_DOMAIN=""
FIREBASE_PROJECT_ID=""
SITE_URL="https://yourdomain.com"
```
> On first run, if the DB is empty the backend auto-seeds admin + full catalog +
> recipes + reviews + settings. If you import the provided DB instead, seeding is skipped.

Uploaded product images are stored on disk in `backend/uploads/` and served at
`/api/files/<filename>`. Set `UPLOAD_DIR` env to change the folder. Keep this folder
persistent/backed up on your server.

## 3) Frontend (React)
```
cd frontend
npm install
# set frontend/.env:
#   REACT_APP_BACKEND_URL=https://your-backend-domain.com
npm run build            # outputs static files in frontend/build
```
Serve `frontend/build` with any static host / Nginx, or from the same Node server.
For local dev: `REACT_APP_BACKEND_URL=http://localhost:8001` then `npm start`.

## 4) Import the database (optional — choose one)
### Option A — mongorestore (exact copy)
```
mongorestore --db theshutki ./db_dump/test_database
```
### Option B — mongoimport (per collection)
```
cd db_json
for f in *.json; do mongoimport --db theshutki --collection "${f%.json}" --jsonArray --file "$f"; done
```

## Default admin login
- Email: admin@theshutki.com
- Password: Shutki@2026   (change in production!)

## Enabling Google / Phone-OTP login
Open the app → login as admin → **Admin → Settings → Login / Authentication**,
paste your Google Client ID and/or Firebase web config, Save. The login buttons
appear automatically. (The Node backend verifies Google & Firebase tokens against
Google's public certificates — no service-account file needed.)

## Hostinger tips
- Node app: set the start file to `backend/server.js`, Node 18+.
- Add all env vars in Hostinger's Node app environment settings.
- Point your domain to the frontend build; set REACT_APP_BACKEND_URL to the API URL before building.
- Use MongoDB Atlas for the database.

## Payment notes
COD and UPI-QR work out of the box. Stripe/Razorpay/Cashfree/PhonePe are admin
toggles only and require you to wire the respective SDK + keys before going live.
