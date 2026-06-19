"""
API test suite — tests every available endpoint on the live Render backend.
Skips: file upload (no Supabase storage), email alerts (no Resend key).
Run: python test_api.py
"""

import requests
import sys
from datetime import date, timedelta

BASE = "https://property-rental2.onrender.com/api/v1"
PASS = "✅"
FAIL = "❌"
SKIP = "⏭️ "

results = []

def check(label, response, expected, extra=""):
    ok = response.status_code == expected
    sym = PASS if ok else FAIL
    detail = "" if ok else f"  got {response.status_code} — {response.text[:120]}"
    note = f" | {extra}" if extra and ok else ""
    print(f"{sym} {label}{detail}{note}")
    results.append((ok, label))
    return ok

def section(title):
    print(f"\n{'─'*60}\n  {title}\n{'─'*60}")

# ── helpers ─────────────────────────────────────────────────
today     = date.today().isoformat()
end_date  = (date.today() + timedelta(days=365)).isoformat()
next_month = (date.today() + timedelta(days=30)).isoformat()
# Use the existing test account (created earlier in the session)
EMAIL = "apitest20260618@example.com"
PASSW = "TestPass@99"

# ─────────────────────────────────────────────────────────────
section("1. HEALTH")
# ─────────────────────────────────────────────────────────────
r = requests.get("https://property-rental2.onrender.com/health")
check("GET /health", r, 200, r.json().get("status"))

# ─────────────────────────────────────────────────────────────
section("2. AUTH — REGISTER")
# ─────────────────────────────────────────────────────────────

# Valid registration
NEW_EMAIL = f"apitest{date.today().strftime('%Y%m%d')}@example.com"
r = requests.post(f"{BASE}/auth/register", json={
    "email": NEW_EMAIL, "password": "TestPass@99",
    "full_name": "API Tester", "phone": "9111111111"
})
if r.status_code == 409:
    print(f"{PASS} POST /auth/register — already exists (re-run same day), OK")
    results.append((True, "POST /auth/register"))
else:
    check("POST /auth/register", r, 200)

# Duplicate → 409
r = requests.post(f"{BASE}/auth/register", json={
    "email": NEW_EMAIL, "password": "TestPass@99", "full_name": "Dupe"
})
check("POST /auth/register duplicate → 409", r, 409)

# Weak password → 422
r = requests.post(f"{BASE}/auth/register", json={
    "email": "weak@example.com", "password": "short", "full_name": "Weak"
})
check("POST /auth/register weak password → 422", r, 422)

# Missing field → 422
r = requests.post(f"{BASE}/auth/register", json={"email": "no@example.com"})
check("POST /auth/register missing fields → 422", r, 422)

# ─────────────────────────────────────────────────────────────
section("3. AUTH — LOGIN")
# ─────────────────────────────────────────────────────────────

session = requests.Session()  # keeps the httpOnly cookie automatically

r = session.post(f"{BASE}/auth/login", json={"email": EMAIL, "password": PASSW})
if not check("POST /auth/login", r, 200):
    # Try the new test account if main account password is wrong
    r = session.post(f"{BASE}/auth/login", json={"email": NEW_EMAIL, "password": "TestPass@99"})
    check("POST /auth/login (test account)", r, 200)

TOKEN = r.json().get("data", {}).get("access_token", "")
HEADERS = {"Authorization": f"Bearer {TOKEN}"}
print(f"   token: {TOKEN[:50]}...")
print(f"   refresh cookie: {'refresh_token' in session.cookies}")

# Wrong password → 401
r = session.post(f"{BASE}/auth/login", json={"email": EMAIL, "password": "WrongPass@1"})
check("POST /auth/login wrong password → 401", r, 401)

# Non-existent user → 401
r = session.post(f"{BASE}/auth/login", json={"email": "nobody@example.com", "password": "Pass@123"})
check("POST /auth/login unknown email → 401", r, 401)

# ─────────────────────────────────────────────────────────────
section("4. AUTH — ME / REFRESH")
# ─────────────────────────────────────────────────────────────

r = session.get(f"{BASE}/auth/me", headers=HEADERS)
check("GET /auth/me", r, 200, f"name={r.json().get('data',{}).get('full_name')}")

# HTTPBearer returns 401 when Authorization header is absent
r = requests.get(f"{BASE}/auth/me")
check("GET /auth/me no token → 401", r, 401)

# Invalid/fake token → 401
r = requests.get(f"{BASE}/auth/me", headers={"Authorization": "Bearer fake.jwt.token"})
check("GET /auth/me invalid token → 401", r, 401)

# Refresh — uses cookie stored in session
r = session.post(f"{BASE}/auth/refresh")
check("POST /auth/refresh", r, 200, "new token issued")
if r.status_code == 200:
    TOKEN = r.json().get("data", {}).get("access_token", TOKEN)
    HEADERS = {"Authorization": f"Bearer {TOKEN}"}

# Refresh without cookie → 401
r = requests.post(f"{BASE}/auth/refresh")
check("POST /auth/refresh no cookie → 401", r, 401)

# ─────────────────────────────────────────────────────────────
section("5. PROPERTIES — CRUD")
# ─────────────────────────────────────────────────────────────

# Create
r = session.post(f"{BASE}/properties/", headers=HEADERS, json={
    "name": "Test Tower", "address_line": "1 Test Road", "city": "Pune",
    "state": "Maharashtra", "pincode": "411001",
    "property_type": "RESIDENTIAL", "total_units": 3
})
check("POST /properties/", r, 200, f"id={r.json().get('data',{}).get('id','')[:8]}...")
PROP_ID = r.json().get("data", {}).get("id", "")

# List
r = session.get(f"{BASE}/properties/", headers=HEADERS)
check("GET /properties/", r, 200, f"total={r.json().get('data',{}).get('total')}")

# List with city filter
r = session.get(f"{BASE}/properties/?city=Pune", headers=HEADERS)
check("GET /properties/?city=Pune", r, 200)

# Pagination
r = session.get(f"{BASE}/properties/?page=1&limit=2", headers=HEADERS)
check("GET /properties/ pagination", r, 200)

# Get by ID
r = session.get(f"{BASE}/properties/{PROP_ID}", headers=HEADERS)
check("GET /properties/:id", r, 200, f"name={r.json().get('data',{}).get('name')}")

# Update
r = session.patch(f"{BASE}/properties/{PROP_ID}", headers=HEADERS, json={"city": "Mumbai"})
check("PATCH /properties/:id", r, 200, f"city={r.json().get('data',{}).get('city')}")

# Invalid property_type → 422
r = session.post(f"{BASE}/properties/", headers=HEADERS, json={
    "name": "Bad", "address_line": "x", "city": "x", "state": "x",
    "pincode": "123456", "property_type": "INVALID", "total_units": 1
})
check("POST /properties/ invalid type → 422", r, 422)

# No auth → 401 (HTTPBearer returns 401 when Authorization header is absent)
r = requests.get(f"{BASE}/properties/")
check("GET /properties/ no auth → 401", r, 401)

# Other owner can't see this property
r2 = requests.post(f"{BASE}/auth/login", json={"email": "admin@rentease.com", "password": "Admin@1234"})
other_token = ""
if r2.status_code == 200:
    other_token = r2.json().get("data", {}).get("access_token", "")
    r3 = requests.get(f"{BASE}/properties/{PROP_ID}",
                      headers={"Authorization": f"Bearer {other_token}"})
    check("GET /properties/:id cross-owner → 404", r3, 404)

# ─────────────────────────────────────────────────────────────
section("6. UNITS — CRUD")
# ─────────────────────────────────────────────────────────────

# Create
r = session.post(f"{BASE}/properties/{PROP_ID}/units", headers=HEADERS, json={
    "unit_number": "101", "floor": 1, "area_sqft": 750,
    "unit_type": "2BHK", "monthly_rent": 15000, "deposit_amount": 30000,
    "amenities": ["WiFi", "Parking"]
})
check("POST /properties/:id/units", r, 200,
      f"status={r.json().get('data',{}).get('status')}")
UNIT_ID = r.json().get("data", {}).get("id", "")

# Duplicate unit number → 409
r = session.post(f"{BASE}/properties/{PROP_ID}/units", headers=HEADERS, json={
    "unit_number": "101", "unit_type": "1BHK",
    "monthly_rent": 10000, "deposit_amount": 20000
})
check("POST duplicate unit number → 409", r, 409)

# Create second unit for later tests
r = session.post(f"{BASE}/properties/{PROP_ID}/units", headers=HEADERS, json={
    "unit_number": "102", "unit_type": "1BHK",
    "monthly_rent": 10000, "deposit_amount": 20000
})
check("POST /properties/:id/units (unit 102)", r, 200)
UNIT2_ID = r.json().get("data", {}).get("id", "")

# List units
r = session.get(f"{BASE}/properties/{PROP_ID}/units", headers=HEADERS)
check("GET /properties/:id/units", r, 200,
      f"count={len(r.json().get('data', []))}")

# Filter vacant
r = session.get(f"{BASE}/properties/{PROP_ID}/units?status=VACANT", headers=HEADERS)
check("GET /properties/:id/units?status=VACANT", r, 200,
      f"vacant={len(r.json().get('data', []))}")

# Get single unit
r = session.get(f"{BASE}/units/{UNIT_ID}", headers=HEADERS)
check("GET /units/:id", r, 200,
      f"unit={r.json().get('data',{}).get('unit_number')} status={r.json().get('data',{}).get('status')}")

# Update unit
r = session.patch(f"{BASE}/units/{UNIT_ID}", headers=HEADERS, json={"monthly_rent": 16000})
check("PATCH /units/:id", r, 200,
      f"rent={r.json().get('data',{}).get('monthly_rent')}")

# ─────────────────────────────────────────────────────────────
section("7. TENANTS — CRUD")
# ─────────────────────────────────────────────────────────────

r = session.post(f"{BASE}/tenants/", headers=HEADERS, json={
    "full_name": "Ravi Tester", "phone": "9876500001",
    "email": "ravi@example.com", "id_type": "AADHAAR", "id_number": "1234-5678-9012"
})
check("POST /tenants/", r, 200)
TENANT_ID = r.json().get("data", {}).get("id", "")

# List
r = session.get(f"{BASE}/tenants/", headers=HEADERS)
check("GET /tenants/", r, 200, f"total={r.json().get('data',{}).get('total')}")

# Search
r = session.get(f"{BASE}/tenants/?search=Ravi", headers=HEADERS)
check("GET /tenants/?search=Ravi", r, 200,
      f"found={r.json().get('data',{}).get('total')}")

# Get by ID
r = session.get(f"{BASE}/tenants/{TENANT_ID}", headers=HEADERS)
check("GET /tenants/:id", r, 200,
      f"name={r.json().get('data',{}).get('full_name')}")

# Update
r = session.patch(f"{BASE}/tenants/{TENANT_ID}", headers=HEADERS, json={"phone": "9000099999"})
check("PATCH /tenants/:id", r, 200,
      f"phone={r.json().get('data',{}).get('phone')}")

# Invalid id_type → 422
r = session.post(f"{BASE}/tenants/", headers=HEADERS, json={
    "full_name": "Bad", "phone": "9000000000", "id_type": "VOTER_ID"
})
check("POST /tenants/ invalid id_type → 422", r, 422)

# Cross-owner access blocked
r2 = requests.post(f"{BASE}/auth/login", json={"email": "admin@rentease.com", "password": "Admin@1234"})
if r2.status_code == 200:
    other_token = r2.json().get("data", {}).get("access_token", "")
    r3 = requests.get(f"{BASE}/tenants/{TENANT_ID}",
                      headers={"Authorization": f"Bearer {other_token}"})
    check("GET /tenants/:id cross-owner → 404", r3, 404)

# ─────────────────────────────────────────────────────────────
section("8. LEASES — CREATE & READ")
# ─────────────────────────────────────────────────────────────

r = session.post(f"{BASE}/leases/", headers=HEADERS, json={
    "unit_id": UNIT_ID, "tenant_id": TENANT_ID,
    "start_date": today, "end_date": end_date,
    "monthly_rent": 16000, "deposit_paid": 32000,
    "rent_due_day": 5, "notes": "API test lease"
})
check("POST /leases/", r, 200,
      f"status={r.json().get('data',{}).get('status')}")
LEASE_ID = r.json().get("data", {}).get("id", "")

# Verify unit → OCCUPIED (trigger fired)
r = session.get(f"{BASE}/units/{UNIT_ID}", headers=HEADERS)
unit_status = r.json().get("data", {}).get("status")
ok = unit_status == "OCCUPIED"
print(f"{'✅' if ok else '❌'} Unit auto-marked OCCUPIED (status={unit_status})")
results.append((ok, "Unit → OCCUPIED on lease create"))

# Duplicate active lease same unit → 409
r = session.post(f"{BASE}/leases/", headers=HEADERS, json={
    "unit_id": UNIT_ID, "tenant_id": TENANT_ID,
    "start_date": today, "end_date": end_date,
    "monthly_rent": 5000, "deposit_paid": 0, "rent_due_day": 1
})
check("POST /leases/ duplicate active → 409", r, 409)

# List leases
r = session.get(f"{BASE}/leases/", headers=HEADERS)
check("GET /leases/", r, 200, f"total={r.json().get('data',{}).get('total')}")

# Filter by status
r = session.get(f"{BASE}/leases/?status=ACTIVE", headers=HEADERS)
check("GET /leases/?status=ACTIVE", r, 200,
      f"active={r.json().get('data',{}).get('total')}")

# Expiring in 30 days
r = session.get(f"{BASE}/leases/?expiring_in_days=30", headers=HEADERS)
check("GET /leases/?expiring_in_days=30", r, 200)

# Get by ID — includes payments_summary
r = session.get(f"{BASE}/leases/{LEASE_ID}", headers=HEADERS)
check("GET /leases/:id", r, 200,
      f"tenant={r.json().get('data',{}).get('tenant',{}).get('full_name')}")
ps = r.json().get("data", {}).get("payments_summary", {})
print(f"   payments_summary: due={ps.get('total_due')} paid={ps.get('total_paid')} overdue={ps.get('overdue_amount')}")

# Update notes/end_date
r = session.patch(f"{BASE}/leases/{LEASE_ID}", headers=HEADERS,
                  json={"notes": "Updated by test"})
check("PATCH /leases/:id (notes)", r, 200)

# ─────────────────────────────────────────────────────────────
section("9. PAYMENTS — CRUD + STATUS LOGIC")
# ─────────────────────────────────────────────────────────────

# PAID payment
r = session.post(f"{BASE}/payments/", headers=HEADERS, json={
    "lease_id": LEASE_ID, "amount_due": 16000, "amount_paid": 16000,
    "due_date": today, "paid_date": today,
    "payment_method": "UPI", "reference_number": "UPI9876TEST"
})
check("POST /payments/ (full → PAID)", r, 200,
      f"status={r.json().get('data',{}).get('status')}")
ok = r.json().get("data", {}).get("status") == "PAID"
results.append((ok, "Status auto-computed PAID"))
PAY1_ID = r.json().get("data", {}).get("id", "")

# PARTIAL payment
r = session.post(f"{BASE}/payments/", headers=HEADERS, json={
    "lease_id": LEASE_ID, "amount_due": 16000, "amount_paid": 8000,
    "due_date": next_month
})
check("POST /payments/ (partial → PARTIAL)", r, 200,
      f"status={r.json().get('data',{}).get('status')}")
ok = r.json().get("data", {}).get("status") == "PARTIAL"
results.append((ok, "Status auto-computed PARTIAL"))
PAY2_ID = r.json().get("data", {}).get("id", "")

# PENDING payment
r = session.post(f"{BASE}/payments/", headers=HEADERS, json={
    "lease_id": LEASE_ID, "amount_due": 16000, "amount_paid": 0,
    "due_date": (date.today() + timedelta(days=60)).isoformat()
})
check("POST /payments/ (no payment → PENDING)", r, 200,
      f"status={r.json().get('data',{}).get('status')}")
ok = r.json().get("data", {}).get("status") == "PENDING"
results.append((ok, "Status auto-computed PENDING"))
PAY3_ID = r.json().get("data", {}).get("id", "")

# List all
r = session.get(f"{BASE}/payments/", headers=HEADERS)
check("GET /payments/", r, 200, f"total={r.json().get('data',{}).get('total')}")

# Filter by status
r = session.get(f"{BASE}/payments/?status=PAID", headers=HEADERS)
check("GET /payments/?status=PAID", r, 200,
      f"count={r.json().get('data',{}).get('total')}")

# Filter by lease
r = session.get(f"{BASE}/payments/?lease_id={LEASE_ID}", headers=HEADERS)
check("GET /payments/?lease_id=...", r, 200)

# Filter by month
month = date.today().strftime("%Y-%m")
r = session.get(f"{BASE}/payments/?month={month}", headers=HEADERS)
check(f"GET /payments/?month={month}", r, 200)

# Get single
r = session.get(f"{BASE}/payments/{PAY1_ID}", headers=HEADERS)
check("GET /payments/:id", r, 200)

# Update partial → becomes PAID
r = session.patch(f"{BASE}/payments/{PAY2_ID}", headers=HEADERS, json={
    "amount_paid": 16000, "paid_date": today, "payment_method": "CASH"
})
check("PATCH /payments/:id (complete partial → PAID)", r, 200,
      f"status={r.json().get('data',{}).get('status')}")
ok = r.json().get("data", {}).get("status") == "PAID"
results.append((ok, "Status recomputed PAID after update"))

# Verify lease payments_summary reflects new payments
r = session.get(f"{BASE}/leases/{LEASE_ID}", headers=HEADERS)
ps = r.json().get("data", {}).get("payments_summary", {})
check("GET /leases/:id payments_summary updated", r, 200,
      f"paid={ps.get('total_paid')} due={ps.get('total_due')}")

# ─────────────────────────────────────────────────────────────
section("10. DASHBOARD")
# ─────────────────────────────────────────────────────────────

r = session.get(f"{BASE}/dashboard/", headers=HEADERS)
check("GET /dashboard/", r, 200)
if r.status_code == 200:
    d = r.json().get("data", {})
    s = d.get("summary", {})
    f = d.get("financials", {})
    a = d.get("alerts", {})
    print(f"   properties={s.get('total_properties')}  units={s.get('total_units')}")
    print(f"   occupied={s.get('occupied_units')}  vacant={s.get('vacant_units')}")
    print(f"   occupancy={s.get('occupancy_rate')}%")
    print(f"   month_expected=₹{f.get('current_month_expected')}  collected=₹{f.get('current_month_collected')}")
    print(f"   overdue_count={f.get('overdue_count')}  overdue_amount=₹{f.get('overdue_amount')}")
    print(f"   expiring_soon={len(a.get('leases_expiring_soon',[]))}  overdue_payments={len(a.get('overdue_payments',[]))}")

r = requests.get(f"{BASE}/dashboard/")
check("GET /dashboard/ no auth → 401", r, 401)

# ─────────────────────────────────────────────────────────────
section("11. LEASE TERMINATION")
# ─────────────────────────────────────────────────────────────

r = session.patch(f"{BASE}/leases/{LEASE_ID}/terminate", headers=HEADERS, json={
    "reason": "Test complete — tenant vacating",
    "termination_date": today
})
check("PATCH /leases/:id/terminate", r, 200,
      f"status={r.json().get('data',{}).get('status')}")
ok = r.json().get("data", {}).get("status") == "TERMINATED"
results.append((ok, "Lease status → TERMINATED"))

# Unit auto back to VACANT (trigger)
r = session.get(f"{BASE}/units/{UNIT_ID}", headers=HEADERS)
unit_status = r.json().get("data", {}).get("status")
ok = unit_status == "VACANT"
print(f"{'✅' if ok else '❌'} Unit auto-marked VACANT after termination (status={unit_status})")
results.append((ok, "Unit → VACANT on termination"))

# Terminate already terminated → 409
r = session.patch(f"{BASE}/leases/{LEASE_ID}/terminate", headers=HEADERS, json={
    "reason": "Again", "termination_date": today
})
check("PATCH /leases/:id/terminate again → 409", r, 409)

# ─────────────────────────────────────────────────────────────
section("12. INTERNAL CRON ENDPOINT")
# ─────────────────────────────────────────────────────────────

import os, sys as _sys
_sys.path.insert(0, ".")
try:
    from app.core.config import settings
    secret = settings.INTERNAL_JOB_SECRET
    r = requests.post(f"{BASE}/internal/daily-job",
                      headers={"X-Internal-Secret": secret})
    check("POST /internal/daily-job (correct secret)", r, 200,
          f"marked_overdue={r.json().get('result',{}).get('marked_overdue')}")
except Exception as e:
    print(f"⚠️  Skipped cron test (settings not loadable locally): {e}")

r = requests.post(f"{BASE}/internal/daily-job",
                  headers={"X-Internal-Secret": "wrong"})
check("POST /internal/daily-job wrong secret → 403", r, 403)

# ─────────────────────────────────────────────────────────────
section("13. CLEANUP — delete test data")
# ─────────────────────────────────────────────────────────────

# Unit 101 has lease history (RESTRICT FK) → 409
r = session.delete(f"{BASE}/units/{UNIT_ID}", headers=HEADERS)
check("DELETE /units/:id with history → 409", r, 409)

# Unit 102 — no lease, should delete fine
r = session.delete(f"{BASE}/units/{UNIT2_ID}", headers=HEADERS)
check("DELETE /units/:id (unit 102, no leases)", r, 200)

# Tenant has lease history → RESTRICT FK → 409
r = session.delete(f"{BASE}/tenants/{TENANT_ID}", headers=HEADERS)
check("DELETE /tenants/:id with history → 409", r, 409)

# Delete property — has units with lease history → 409
r = session.delete(f"{BASE}/properties/{PROP_ID}", headers=HEADERS)
check("DELETE /properties/:id with history → 409", r, 409)

# ─────────────────────────────────────────────────────────────
section("14. AUTH — LOGOUT")
# ─────────────────────────────────────────────────────────────

r = session.post(f"{BASE}/auth/logout", headers=HEADERS)
check("POST /auth/logout", r, 200)

# Refresh cookie is cleared — should fail
r = session.post(f"{BASE}/auth/refresh")
check("POST /auth/refresh after logout → 401", r, 401)

print(f"\n   skipped: file upload (no Supabase keys)")
print(f"   skipped: email alerts (no Resend key)")

# ─────────────────────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────────────────────
passed = sum(1 for ok, _ in results if ok)
failed = sum(1 for ok, _ in results if not ok)
print(f"\n{'═'*60}")
print(f"  RESULTS:  {PASS} {passed} passed   {FAIL} {failed} failed   (total {len(results)})")
print(f"{'═'*60}")
if failed:
    print("  Failed:")
    for ok, label in results:
        if not ok:
            print(f"    {FAIL} {label}")
sys.exit(0 if failed == 0 else 1)
