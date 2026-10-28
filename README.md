# MediSlot

MediSlot is a full-stack clinic appointment booking app. Patients can find doctors, see real availability, book and manage appointments, and use a deterministic chat assistant to find and confirm slots. Doctors can manage their schedules, handle appointments, and review weekly utilization.

## Stack

- Client: React, Vite, React Router, Tailwind CSS, Axios, Recharts, Lucide React
- Server: Node.js, Express, Mongoose, MongoDB, Zod, bcryptjs, JWT
- Tests: Vitest and Supertest

## Requirements

- Node.js compatible with the installed Vite version (Node 20.19+ or 22.12+)
- MongoDB local instance or MongoDB Atlas database
- PowerShell commands below assume Windows

## Setup

Create private environment files from the examples:

```powershell
Set-Location .\server
Copy-Item .env.example .env
Set-Location ..\client
Copy-Item .env.example .env
```

Set `MONGO_URI` in `server/.env` to your MongoDB connection string and use a disposable, separate database for tests. For Atlas, use the connection string from Atlas, confirm the database user has access, and allow your development IP address in Network Access. Keep credentials and JWT secrets in ignored `.env` files; never commit them.

Install and run the API in one terminal:

```powershell
Set-Location .\server
npm install
npm run dev
```

Install and run the Vite client in a second terminal:

```powershell
Set-Location .\client
npm install
npm run dev
```

Open `http://localhost:5173`. Use `localhost`, not `127.0.0.1`, so the browser origin matches the default Express CORS origin. The Vite development server proxies `/api` to `http://localhost:5000`.

The API also has `npm start`; the client has `npm run build`, `npm run preview`, and `npm run lint`.

## Environment

`server/.env.example` documents server settings. `client/.env.example` documents the Vite API base URL.

| Variable | Used by | Purpose |
| --- | --- | --- |
| `PORT` | Server | Express port; defaults to `5000` |
| `MONGO_URI` | Server | Development/runtime MongoDB URI |
| `MONGO_TEST_URI` | Server tests | Dedicated test MongoDB URI; required when `NODE_ENV=test` |
| `JWT_SECRET` | Server | Secret used to sign and verify JWTs; replace the example value |
| `JWT_EXPIRES_IN` | Server | JWT lifetime, for example `7d` |
| `CLINIC_TIMEZONE` | Server | IANA clinic timezone; defaults to `Asia/Kolkata` |
| `CLIENT_ORIGIN` | Server | Allowed browser origin for CORS |
| `NODE_ENV` | Server | Runtime mode, such as `development` or `test` |
| `VITE_API_BASE_URL` | Client | API base; use `/api` with the development proxy |

### Seed data

```powershell
Set-Location .\server
npm run seed
```

**Warning:** the seed script deletes all appointments, doctors, and users in the database named by the active MongoDB URI before inserting demo records. Run it only against a disposable database. It creates three demo doctors (Cardiology, Dermatology, Pediatrics), two patients, and sample appointments. Demo accounts use `password123`; do not use these credentials outside local development.

## Architecture and request flow

The React pages call a single Axios client in `client/src/services/api.js`. In development, Vite forwards `/api` requests to Express. Express routes authenticate and validate requests, controllers adapt HTTP input/output, services own booking and availability rules, and Mongoose models persist users, doctors, schedules, and appointments in MongoDB. Passwords are hashed with bcryptjs; protected routes use JWT bearer tokens.

For a chatbot booking, the patient sends a message to the chat API. A replaceable intent provider extracts specialty, date, and time preference. The chat service searches persisted doctors and calls the existing availability service. The UI presents only returned slots. After the patient explicitly selects and confirms one, the server rechecks availability and calls the existing booking service; it reports success only after persistence succeeds. The chatbot does not write directly to MongoDB and has no external AI/API-key dependency.

## API

Successful responses use `{ "success": true, "data": ... }`. Validation errors return HTTP 400 with an `errors` array. Protected routes use `Authorization: Bearer <token>`.

| Method and path | Access | Purpose |
| --- | --- | --- |
| `POST /api/auth/register` | Public | Register a patient or doctor |
| `POST /api/auth/login` | Public | Authenticate and return a JWT |
| `GET /api/auth/me` | Authenticated | Return the current account |
| `GET /api/doctors` | Public | Browse doctors; optional `specialty` filter |
| `GET /api/doctors/:id` | Public | Doctor profile |
| `GET /api/doctors/:id/availability?date=YYYY-MM-DD` | Public | Real free slots for a clinic date |
| `PUT /api/doctors/:id/availability` | Owning doctor | Update schedule, breaks, slot duration, or blocked dates |
| `GET /api/appointments/available-slots?doctorId=...&date=YYYY-MM-DD` | Public | Available slots |
| `POST /api/appointments` | Patient | Book a slot |
| `GET /api/appointments/my` | Patient | Upcoming and past appointments |
| `GET /api/appointments/doctor/today` | Doctor | Today's appointments |
| `PATCH /api/appointments/:id/cancel` | Owner patient or doctor | Cancel, subject to the two-hour rule |
| `PATCH /api/appointments/:id/reschedule` | Patient owner | Reschedule, subject to the two-hour rule |
| `PATCH /api/appointments/:id/status` | Owning doctor | Mark `completed` or `no-show` |
| `GET /api/analytics/doctor-weekly?weekStart=YYYY-MM-DD` | Doctor | Weekly schedule and appointment metrics; optional Monday date |
| `POST /api/chat/message` | Patient | Parse a booking request and return real slot options or a follow-up |
| `POST /api/chat/confirm-booking` | Patient | Revalidate and create the selected booking |
| `GET /api/health` | Public | Health check |

Example chat message request:

```json
{
  "message": "I need a dermatologist tomorrow afternoon",
  "context": {}
}
```

The response contains `reply`, `intent`, `context`, and `slots`. A confirmation request contains `doctorId` and the selected slot's `slotStartTime`. The authenticated patient ID is read from the JWT, not from the request body.

## Data and booking decisions

- `User` stores account identity, role, and bcrypt-hashed password.
- `Doctor` stores specialty, weekly schedule, breaks, 15/30-minute duration, and blocked dates.
- `Appointment` stores patient/doctor references, UTC start/end timestamps, status, and cancellation/reschedule metadata.
- Slots are generated from the doctor's local schedule; past, break, blocked, and occupied slots are excluded. API timestamps are UTC ISO strings; display and schedule calculations use `CLINIC_TIMEZONE`.
- Analytics capacity is working time minus overlapping breaks and full-day blocks. Booked hours include `booked`, `completed`, and `no-show`; cancelled appointments are excluded. Overlapping appointment intervals count once. Utilization is booked hours divided by scheduled hours, or `0` when the week has no scheduled hours. Seeded appointments are persisted data and appear in metrics.
- Booking uses a MongoDB partial unique index on `(doctorId, slotStartTime)` for active appointments. This atomically rejects concurrent attempts for the same start time with HTTP 409. It is not a transaction across rescheduling steps, and the service must enforce the schedule's slot grid to rule out differently-started overlapping requests. Treat arbitrary-client booking as not production-ready until that grid-alignment edge case is closed.

## Tests

Tests live in `server/src/tests`. They cover slot generation, time filtering, booking and conflicts, cancellation/rescheduling limits, ownership, authentication, chat parsing, real availability lookup, and confirmation. Database-backed suites use `MONGO_TEST_URI`; they never fall back to `MONGO_URI` when `NODE_ENV=test`.

For a local MongoDB test instance:

```powershell
Set-Location .\server
$env:NODE_ENV = 'test'
$env:MONGO_TEST_URI = 'mongodb://localhost:27017/medislot_test'
npm test
```

For Atlas, derive a separate test database URI from your private `.env` without pasting credentials into the terminal command:

```powershell
Set-Location .\server
$mongoLine = Get-Content .env | Where-Object { $_ -match '^MONGO_URI=' } | Select-Object -First 1
$env:MONGO_TEST_URI = $mongoLine.Substring('MONGO_URI='.Length) -replace '/medislot\?', '/medislot_test?'
$env:NODE_ENV = 'test'
npm test
```

The second command assumes the development database path is `/medislot`. If yours differs, set `MONGO_TEST_URI` to the equivalent Atlas URI with a different database name. A connection/selection error means the test URI, Atlas access list, database user, or network is unavailable. An assertion failure points to application behavior. A duplicate-key 409 during the concurrency test is expected for the losing request; the test fails if both requests succeed or neither succeeds.

## Limitations and delivery

- The rule-based assistant supports the specialties currently present in MongoDB, `today`, `tomorrow`, ISO dates, morning/afternoon/evening, and explicit 12-hour times. It does not provide diagnosis or treatment advice. An LLM provider is not configured or required.
- Weekly analytics use the doctor's current weekly schedule for the selected week; historical schedule versions are not stored.
- The repository has no configured Git remote and no deployment target was provided. No public GitHub repository or deployed demo is claimed. Before publishing, rotate any credentials that have been exposed, set production secrets, fix the off-grid overlapping booking limitation, and review Atlas access controls.
- No demo video is included. Suggested recording: patient search and booking, assistant follow-up/confirmation, doctor schedule/status management, weekly charts, then a short walkthrough of routes, services, index, and tests.

## AI tools

GitHub Copilot assisted with code exploration, implementation, and test authoring. The in-app booking assistant itself uses deterministic local rules and does not call an LLM.