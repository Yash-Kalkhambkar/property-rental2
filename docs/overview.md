# RentEase — Project Overview

## What It Is

A web app for property owners to manage their rental properties — units, tenants, leases, and payments — from one dashboard.

**Live URLs**
- Frontend: https://property-rental2.vercel.app
- Backend API: https://property-rental2.onrender.com

---

## How to Start Locally

**Backend**
```bash
cd backend
# First time only
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt

# Every time
.\venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload
# Runs at http://localhost:8000
# API docs at http://localhost:8000/docs
```

**Frontend**
```bash
cd frontend
npm install                    # First time only
npm run dev
# Runs at http://localhost:5173
```

The frontend `.env` controls which backend it talks to:
```
VITE_API_BASE_URL=http://localhost:8000/api/v1   # local
VITE_API_BASE_URL=https://property-rental2.onrender.com/api/v1  # production
```

---

## Tech Stack at a Glance

| Layer | Technology | Hosted on |
|---|---|---|
| Frontend | React 19 + TanStack Router + TanStack Query | Vercel |
| Backend | Python + FastAPI | Render |
| Database | PostgreSQL (via Supabase) | Supabase |
| Auth | JWT (access token) + httpOnly cookie (refresh token) | — |

---

## Business Logic — How the System Works

The app is built around one central idea: **an Owner manages Properties → Units → Tenants → Leases → Payments**.

### The Data Chain

```
Owner
 └── Properties  (buildings the owner manages)
      └── Units   (individual rentable flats/shops)
           └── Leases  (who is renting which unit, when, for how much)
                └── Payments  (monthly rent payment records)
 └── Tenants  (people who can be assigned to leases)
```

Each owner only ever sees their own data. Owner A cannot see Owner B's properties, tenants, or payments.

### Core Business Rules

**Units**
- A unit starts as `VACANT`.
- When an active lease is created for it → automatically becomes `OCCUPIED`.
- When that lease is terminated or expires → automatically returns to `VACANT`.
- A unit can only have **one ACTIVE lease at a time** (enforced by a database-level partial unique index).

**Leases**
- Can only be created for a `VACANT` unit with a tenant that belongs to the same owner.
- Status lifecycle: `ACTIVE` → `TERMINATED` (manually) or `EXPIRED` (when end date passes).
- Termination requires a reason and a termination date. The reason is appended to the lease notes.

**Payments**
- Status is computed automatically from amounts:
  - `amount_paid >= amount_due` → `PAID`
  - `0 < amount_paid < amount_due` → `PARTIAL`
  - `amount_paid == 0` → `PENDING`
- Every night at 9 AM IST, a scheduled job scans all `PENDING` payments whose `due_date` has passed and marks them `OVERDUE`, then sends an email alert to the tenant.

---

## User Flow

### 1. Register & Login
- Owner visits `/register`, creates an account (email + password).
- Password rules: min 8 chars, 1 uppercase, 1 number, 1 special character.
- After registering, they log in at `/login`.
- Login returns a 15-minute access token (stored in memory) and a 7-day refresh token (stored in an httpOnly cookie). The app auto-refreshes the access token silently when it expires.

### 2. Add a Property
- Go to **Properties** → "Add property".
- Fill in name, address, city, state, pincode, type (Residential/Commercial), and number of units.
- The property appears as a card on the properties page.

### 3. Add Units to the Property
- Click on a property → "Add unit".
- Fill in unit number, floor, area, type (1BHK/2BHK/Studio/Shop etc.), rent, and deposit.
- Units start as `VACANT` (shown with a blue badge).

### 4. Add a Tenant
- Go to **Tenants** → "Add tenant".
- Fill in name, phone, email, emergency contact, and ID details (Aadhaar/PAN etc.).
- Tenants are not tied to a unit yet — they exist independently until assigned to a lease.

### 5. Create a Lease
- Go to **Leases** → "New lease".
- Select the property to see its vacant units.
- Select a vacant unit and a tenant.
- Set start date, end date, monthly rent, deposit paid, and rent due day (1–28).
- On creation: the unit status changes to `OCCUPIED` automatically.

### 6. Record Payments
- Go to **Payments** → "Record payment".
- Select the active lease, enter amount due, amount paid, due date, paid date, and payment method (Cash/UPI/Bank Transfer/Cheque).
- Payment status is set automatically based on amounts.

### 7. Terminate a Lease
- Go to **Leases** → click a lease → "Terminate".
- Enter a reason and termination date.
- The lease becomes `TERMINATED`, the unit returns to `VACANT`.

### 8. Dashboard
- The `/` dashboard shows a live summary:
  - Total properties, units, occupancy rate.
  - Revenue collected this month vs. expected.
  - Overdue payments list.
  - Leases expiring in the next 30 days (clickable, goes to the lease).

---

## What Happens in the Background (Automated)

Every day at **9:00 AM IST**, a job runs automatically that:
1. Finds all `PENDING` payments where `due_date < today`.
2. Changes their status to `OVERDUE`.
3. Sends an email alert to the tenant (if they have an email address).

On the free Render plan this is triggered by an external cron service hitting:
```
POST /api/v1/internal/daily-job
Header: X-Internal-Secret: <secret>
```

---

## File Upload Features (requires Supabase Storage keys)

- **Tenant ID documents** — upload Aadhaar/PAN scan as PDF/JPG/PNG (max 5MB).
- **Lease agreements** — upload signed PDF to a lease (max 5MB).
- Files are stored privately in Supabase Storage and accessed via time-limited signed URLs (valid 15 minutes).

These features are disabled if `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are not set in the backend environment.
