# SkyLink Backend (Node.js + Express + MongoDB)

This is the backend service for the SkyLink flight agency platform (middle-man between passengers and airlines). It stores passengers/bookings, generates notifications, runs automation via cron jobs, and can enrich reminders with destination weather.

## What this backend provides

- JWT-secured REST API under `/api/*`
- MongoDB storage (Mongoose models)
- Sensitive document encryption (AES-256-GCM)
- Notification creation with dedupe keys (prevents double sends)
- Cron jobs:
  - Flight reminder ~24h before departure (runs every 15 minutes)
  - Passport/card expiry alerts (runs daily)
- Optional "demo" endpoints for the React frontend:
  - `GET /passenger`
  - `GET /flights`
  - `GET /notifications`

These demo endpoints are enabled only when `PUBLIC_DEMO=true`.

## Project structure

- `src/server.js` — Express server
- `src/config/*` — env + db
- `src/models/*` — Mongoose schemas
- `src/routes/*` — REST routes
- `src/services/*` — notification/weather/audit services
- `src/jobs/*` — cron job logic

## Environment variables

Copy `.env.example` to `.env` and fill values:

- `PORT` (default: 5000)
- `MONGODB_URI` (default: `mongodb://127.0.0.1:27017/skylink`)
- `JWT_SECRET` + `JWT_EXPIRES_IN`
- `DOC_ENCRYPTION_KEY_BASE64` (**required** to store passport/card numbers)
- `WEATHER_API_KEY` (optional; OpenWeather)
- `CORS_ORIGIN` (default: React Vite `http://localhost:5173`)
- `PUBLIC_DEMO=true` (recommended initially so your current React app can fetch without auth)

### Generate encryption key

You need a 32-byte key encoded as base64.

Option A (Node):

```js
console.log(require('crypto').randomBytes(32).toString('base64'));
```

## Install & run

From the `backend` folder:

```bash
npm install
npm run seed
npm run dev
```

Health check:

- `GET http://localhost:5000/health`

## Connect the React frontend

In your **frontend** `.env` (project root), set:

```env
VITE_API_BASE_URL=http://localhost:5000
```

## Demo mode (recommended for now)

1. Ensure MongoDB is running.
2. Create `backend/.env` from `.env.example`.
3. Set:
   - `PUBLIC_DEMO=true`
   - `DOC_ENCRYPTION_KEY_BASE64=...` (required for `npm run seed`)
4. Run:

```bash
npm install
npm run seed
npm run dev
```

This enables:

- `GET /passenger`
- `GET /flights`
- `GET /notifications`

which match the current React app fetch calls.

With `PUBLIC_DEMO=true`, your existing React integration will work immediately because it fetches:

- `/passenger`
- `/flights`
- `/notifications`

If you prefer strictly JWT-secured endpoints, disable demo mode and update the frontend to call:

- `/api/passengers`
- `/api/bookings`
- `/api/notifications`

## API endpoints (secured)

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

### Passengers

- `GET /api/passengers`
- `POST /api/passengers`
- `GET /api/passengers/:id`
- `PATCH /api/passengers/:id`
- `POST /api/passengers/:id/documents`

### Bookings

- `GET /api/bookings`
- `POST /api/bookings`
- `GET /api/bookings/:id`
- `PATCH /api/bookings/:id`
- `POST /api/bookings/:id/resend-reminder`

### Notifications

- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`

## Notes / next steps

- Email delivery is not wired yet (currently in-app notifications are persisted in MongoDB). Next step is to add an email provider (SendGrid/Mailgun) behind `NotificationService`.
- Weather integration uses OpenWeather current weather endpoint (can be extended to forecast + caching).
