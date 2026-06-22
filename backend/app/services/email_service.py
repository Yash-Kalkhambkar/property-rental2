"""
Email service using Resend.
API key is loaded lazily so the app starts even if RESEND_API_KEY is not set.

Emails sent:
  - Overdue rent alert          → tenant   (triggered by daily cron)
  - Welcome / credentials       → tenant   (triggered on tenant create)
  - Lease confirmation          → tenant   (triggered on lease create)
  - Lease expiry reminder       → owner    (triggered by daily cron, 30 days before)
  - Payment receipt             → tenant   (triggered on payment marked PAID)
  - Password reset              → tenant   (triggered on owner reset-password action)
"""

from __future__ import annotations
from app.core.config import settings


# ── Shared helpers ────────────────────────────────────────────────────────────

def _base_html(body: str) -> str:
    """Wrap content in a consistent branded shell."""
    return f"""
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                background:#f8fafc;padding:40px 0;min-height:100vh">
      <div style="max-width:520px;margin:auto;background:#fff;border-radius:16px;
                  border:1px solid #e2e8f0;overflow:hidden">
        <div style="background:#3b82f6;padding:24px 32px;display:flex;align-items:center;gap:12px">
          <span style="font-size:20px;font-weight:700;color:#fff;letter-spacing:-0.5px">
            🏢 RentEase
          </span>
        </div>
        <div style="padding:32px">
          {body}
        </div>
        <div style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0">
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center">
            RentEase · Property Management Platform<br>
            This is an automated message — please do not reply.
          </p>
        </div>
      </div>
    </div>
    """

def _btn(text: str, url: str) -> str:
    return (
        f'<a href="{url}" style="display:inline-block;margin-top:20px;padding:12px 24px;'
        f'background:#3b82f6;color:#fff;border-radius:10px;text-decoration:none;'
        f'font-weight:600;font-size:14px">{text}</a>'
    )

def _h(text: str) -> str:
    return f'<h2 style="margin:0 0 8px;font-size:20px;color:#0f172a">{text}</h2>'

def _p(text: str, muted: bool = False) -> str:
    color = "#64748b" if muted else "#334155"
    return f'<p style="margin:12px 0;font-size:14px;line-height:1.6;color:{color}">{text}</p>'

def _info_row(label: str, value: str) -> str:
    return (
        f'<tr>'
        f'<td style="padding:8px 12px;font-size:13px;color:#64748b;width:140px">{label}</td>'
        f'<td style="padding:8px 12px;font-size:13px;color:#0f172a;font-weight:600">{value}</td>'
        f'</tr>'
    )

def _table(*rows: str) -> str:
    inner = "".join(rows)
    return (
        f'<table style="width:100%;border-collapse:collapse;margin:16px 0;'
        f'background:#f8fafc;border-radius:10px;overflow:hidden">'
        f'{inner}</table>'
    )


# ── Service class ─────────────────────────────────────────────────────────────

class EmailService:

    def _enabled(self) -> bool:
        return bool(settings.RESEND_API_KEY and settings.EMAIL_SENDER)

    def _send(self, to: str, subject: str, html: str) -> None:
        if not self._enabled():
            return  # silently skip — email not configured
        import resend
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from": settings.EMAIL_SENDER,
            "to": [to],
            "subject": subject,
            "html": _base_html(html),
        })

    # ── 1. Overdue rent alert → tenant ────────────────────────────────────────
    def send_overdue_alert(
        self,
        to_email: str,
        tenant_name: str,
        amount: float,
        days_overdue: int,
        unit: str,
    ) -> None:
        html = (
            _h("⚠️ Overdue Rent Notice") +
            _p(f"Dear {tenant_name},") +
            _p(
                f"Your rent of <strong>₹{amount:,.0f}</strong> for "
                f"<strong>{unit}</strong> is now "
                f"<strong style='color:#ef4444'>{days_overdue} days overdue</strong>."
            ) +
            _p("Please arrange payment as soon as possible and contact your landlord if you need to discuss.") +
            _p("If you have already paid, you can disregard this message.", muted=True)
        )
        self._send(to_email, f"⚠️ Overdue Rent — {unit}", html)

    # ── 2. Welcome email with credentials → tenant ────────────────────────────
    def send_tenant_welcome(
        self,
        to_email: str,
        tenant_name: str,
        password: str,
        portal_url: str,
    ) -> None:
        html = (
            _h("Welcome to RentEase 👋") +
            _p(f"Hi {tenant_name}, your landlord has set up your resident account. "
               f"Use the credentials below to access your portal.") +
            _table(
                _info_row("Email", to_email),
                _info_row("Password", f'<code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">{password}</code>'),
            ) +
            _p("You can view your lease, track payments, and update your profile after signing in.", muted=True) +
            _btn("Sign in to Resident Portal", portal_url) +
            _p("Please change your password after your first login.", muted=True)
        )
        self._send(to_email, "Welcome to RentEase — Your Account is Ready", html)

    # ── 3. Lease confirmation → tenant ────────────────────────────────────────
    def send_lease_confirmation(
        self,
        to_email: str,
        tenant_name: str,
        property_name: str,
        unit_number: str,
        start_date: str,
        end_date: str,
        monthly_rent: float,
        portal_url: str,
    ) -> None:
        html = (
            _h("Lease Confirmed ✅") +
            _p(f"Dear {tenant_name}, a lease agreement has been created for you.") +
            _table(
                _info_row("Property", property_name),
                _info_row("Unit", unit_number),
                _info_row("Start date", start_date),
                _info_row("End date", end_date),
                _info_row("Monthly rent", f"₹{monthly_rent:,.0f}"),
            ) +
            _p("Log in to your portal to view the full lease details.", muted=True) +
            _btn("View Lease", portal_url)
        )
        self._send(to_email, f"Lease Confirmed — {property_name}, Unit {unit_number}", html)

    # ── 4. Lease expiry reminder → owner ──────────────────────────────────────
    def send_lease_expiry_reminder(
        self,
        to_email: str,
        owner_name: str,
        tenant_name: str,
        unit: str,
        end_date: str,
        days_remaining: int,
        dashboard_url: str,
    ) -> None:
        html = (
            _h(f"📅 Lease Expiring in {days_remaining} Days") +
            _p(f"Hi {owner_name},") +
            _p(
                f"The lease for <strong>{tenant_name}</strong> at "
                f"<strong>{unit}</strong> expires on <strong>{end_date}</strong> "
                f"({days_remaining} days from today)."
            ) +
            _p("Consider reaching out to discuss renewal or prepare the unit for re-listing.", muted=True) +
            _btn("View Dashboard", dashboard_url)
        )
        self._send(to_email, f"📅 Lease Expiring Soon — {unit}", html)

    # ── 5. Payment receipt → tenant ───────────────────────────────────────────
    def send_payment_receipt(
        self,
        to_email: str,
        tenant_name: str,
        amount_paid: float,
        amount_due: float,
        unit: str,
        paid_date: str,
        payment_method: str | None,
        portal_url: str,
    ) -> None:
        status = "Paid in full" if amount_paid >= amount_due else f"Partial payment (₹{amount_paid:,.0f} of ₹{amount_due:,.0f})"
        method_row = _info_row("Method", payment_method.replace("_", " ").title()) if payment_method else ""
        html = (
            _h("Payment Received 🧾") +
            _p(f"Dear {tenant_name}, your payment has been recorded.") +
            _table(
                _info_row("Unit", unit),
                _info_row("Amount paid", f"₹{amount_paid:,.0f}"),
                _info_row("Amount due", f"₹{amount_due:,.0f}"),
                _info_row("Status", status),
                _info_row("Date", paid_date),
                method_row,
            ) +
            _p("Keep this email as your payment record.", muted=True) +
            _btn("View Payment History", portal_url)
        )
        self._send(to_email, f"Payment Receipt — {unit}", html)

    # ── 6. Password reset → tenant ────────────────────────────────────────────
    def send_password_reset(
        self,
        to_email: str,
        tenant_name: str,
        temp_password: str,
        portal_url: str,
    ) -> None:
        html = (
            _h("🔑 Your Password Has Been Reset") +
            _p(f"Dear {tenant_name},") +
            _p("Your landlord has reset your RentEase portal password. Use the temporary password below to sign in.") +
            _table(
                _info_row("Email", to_email),
                _info_row("Temporary password",
                    f'<code style="background:#f1f5f9;padding:2px 8px;border-radius:4px;'
                    f'font-size:15px;letter-spacing:1px">{temp_password}</code>'),
            ) +
            _p("Please change your password immediately after logging in.", muted=True) +
            _btn("Sign in to Portal", portal_url)
        )
        self._send(to_email, "Your RentEase Password Has Been Reset", html)


email_service = EmailService()
