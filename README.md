# WARRIORS GYM

Premium gym management SaaS experience for members and gym owners.

## Included

- Dark, responsive Warriors Gym landing page with CSS 3D weight-plate artwork
- Member registration and login with bcrypt password hashing and JWT sessions
- Owner role protection at the API layer
- Member dashboard with membership, training, nutrition, fitness analysis, profile, and history-ready data
- Owner command center with member counts, revenue, growth chart, member list, plan catalog, payments, notifications, and settings
- Razorpay checkout with server-side order creation, signature verification, and webhooks
- MongoDB-backed payment, subscription, member, plan, workout, diet, and notification data
- Membership expiry status and authenticated owner/member access controls

## Run locally

```powershell
# Terminal 1
cd server
npm install
Copy-Item .env.example .env
npm run dev

# Terminal 2
cd client
npm install
npm run dev
```

Open http://localhost:5173.

The API runs at http://localhost:4000 and requires MongoDB. A fresh database starts empty. Register members through the application. To create the first owner, set a high-entropy `OWNER_SETUP_TOKEN` in `server/.env` and call the one-time `POST /api/auth/setup-owner` endpoint with that token; no owner account is created automatically.

## First owner setup

Start the backend in one PowerShell terminal:

```powershell
cd server
npm run dev
```

In a second PowerShell terminal, run the interactive setup command from the `server` directory:

```powershell
cd server
npm run setup-owner
```

The command asks for the owner name, a 10-digit Indian mobile number, a password, and password confirmation. Password input is hidden. It reads `OWNER_SETUP_TOKEN` from `server/.env` and calls the existing protected setup endpoint; it never writes directly to MongoDB. If an owner already exists, the backend returns a conflict and no second owner is created. This command is never run automatically by install, dev, start, build, or tests.

## Environment

See `server/.env.example`. Keep `JWT_SECRET`, `OWNER_SETUP_TOKEN`, Razorpay credentials, and production database credentials out of source control. Configure the Razorpay webhook URL as `https://your-domain.example/api/payments/webhook` with the same `RAZORPAY_WEBHOOK_SECRET` value.

Password changes require an authenticated request to `POST /api/auth/change-password` with the current password and a new password.

## Quality checks

```powershell
cd server; npm test
cd ../client; npm run build
```
