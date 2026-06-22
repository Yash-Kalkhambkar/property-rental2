import math
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.payment import Payment
from app.models.lease import Lease
from app.models.unit import Unit
from app.models.property import Property
from app.models.owner import Owner
from app.schemas.payment import (
    CreatePaymentRequest,
    UpdatePaymentRequest,
    PaymentResponse,
)


def list_payments(
    db: Session,
    owner: Owner,
    page: int = 1,
    limit: int = 10,
    payment_status: str | None = None,
    lease_id: str | None = None,
    month: str | None = None,
) -> dict:
    """List payments with pagination and filters."""
    query = (
        db.query(Payment)
        .join(Lease, Lease.id == Payment.lease_id)
        .join(Unit, Unit.id == Lease.unit_id)
        .join(Property, Property.id == Unit.property_id)
        .filter(Property.owner_id == owner.id)
    )

    if payment_status:
        query = query.filter(Payment.status == payment_status)
    if lease_id:
        query = query.filter(Payment.lease_id == lease_id)
    if month:
        # month format: YYYY-MM
        try:
            year, mon = month.split("-")
            from sqlalchemy import extract

            query = query.filter(
                extract("year", Payment.due_date) == int(year),
                extract("month", Payment.due_date) == int(mon),
            )
        except ValueError:
            pass

    total = query.count()
    pages = math.ceil(total / limit) if limit > 0 else 1
    payments = (
        query.order_by(Payment.due_date.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "items": [_payment_to_response(p) for p in payments],
        "total": total,
        "page": page,
        "pages": pages,
    }


def create_payment(
    db: Session, owner: Owner, payload: CreatePaymentRequest
) -> PaymentResponse:
    """Create a payment record."""
    # Verify lease ownership
    lease = (
        db.query(Lease)
        .join(Unit, Unit.id == Lease.unit_id)
        .join(Property, Property.id == Unit.property_id)
        .filter(Lease.id == payload.lease_id, Property.owner_id == owner.id)
        .first()
    )
    if not lease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lease not found or access denied",
        )

    # Determine status based on amounts
    payment_status = _compute_status(payload.amount_paid, payload.amount_due)

    payment = Payment(
        lease_id=payload.lease_id,
        amount_due=payload.amount_due,
        amount_paid=payload.amount_paid,
        due_date=date.fromisoformat(payload.due_date),
        paid_date=date.fromisoformat(payload.paid_date) if payload.paid_date else None,
        payment_method=payload.payment_method,
        reference_number=payload.reference_number,
        status=payment_status,
        notes=payload.notes,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    # Send receipt if fully or partially paid
    if payment.status in ("PAID", "PARTIAL"):
        try:
            from app.services.email_service import email_service
            from app.core.config import settings
            from app.models.tenant import Tenant as TenantModel
            from app.models.unit import Unit as UnitModel
            tenant_obj = db.query(TenantModel).filter(TenantModel.id == lease.tenant_id).first()
            unit_obj = db.query(UnitModel).filter(UnitModel.id == lease.unit_id).first()
            if tenant_obj and unit_obj:
                email_service.send_payment_receipt(
                    to_email=tenant_obj.email,
                    tenant_name=tenant_obj.full_name,
                    amount_paid=float(payment.amount_paid),
                    amount_due=float(payment.amount_due),
                    unit=f"Unit {unit_obj.unit_number}",
                    paid_date=payment.paid_date.isoformat() if payment.paid_date else "",
                    payment_method=payment.payment_method,
                    portal_url=f"{settings.FRONTEND_URL}/tenant/payments",
                )
        except Exception:
            pass

    return _payment_to_response(payment)


def get_payment(
    db: Session, owner: Owner, payment_id: str
) -> PaymentResponse:
    """Get a single payment."""
    payment = _get_payment(db, owner, payment_id)
    return _payment_to_response(payment)


def update_payment(
    db: Session,
    owner: Owner,
    payment_id: str,
    payload: UpdatePaymentRequest,
) -> PaymentResponse:
    """Update a payment."""
    payment = _get_payment(db, owner, payment_id)

    update_data = payload.model_dump(exclude_unset=True)

    # Handle date string -> date conversion
    if "due_date" in update_data and update_data["due_date"]:
        update_data["due_date"] = date.fromisoformat(update_data["due_date"])
    if "paid_date" in update_data and update_data["paid_date"]:
        update_data["paid_date"] = date.fromisoformat(update_data["paid_date"])

    for key, value in update_data.items():
        setattr(payment, key, value)

    # Recompute status if amounts changed
    payment.status = _compute_status(
        float(payment.amount_paid), float(payment.amount_due)
    )

    db.commit()
    db.refresh(payment)
    return _payment_to_response(payment)


def delete_payment(
    db: Session, owner: Owner, payment_id: str
) -> None:
    """Delete a payment."""
    payment = _get_payment(db, owner, payment_id)
    db.delete(payment)
    db.commit()


def _get_payment(db: Session, owner: Owner, payment_id: str) -> Payment:
    """Fetch payment with ownership check."""
    payment = (
        db.query(Payment)
        .join(Lease, Lease.id == Payment.lease_id)
        .join(Unit, Unit.id == Lease.unit_id)
        .join(Property, Property.id == Unit.property_id)
        .filter(Payment.id == payment_id, Property.owner_id == owner.id)
        .first()
    )
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found or access denied",
        )
    return payment


def _compute_status(amount_paid: float, amount_due: float) -> str:
    """Determine payment status from amounts."""
    if amount_paid >= amount_due:
        return "PAID"
    elif amount_paid > 0:
        return "PARTIAL"
    return "PENDING"


def _payment_to_response(payment: Payment) -> PaymentResponse:
    return PaymentResponse(
        id=payment.id,
        lease_id=payment.lease_id,
        amount_due=float(payment.amount_due),
        amount_paid=float(payment.amount_paid),
        due_date=payment.due_date.isoformat() if payment.due_date else "",
        paid_date=payment.paid_date.isoformat() if payment.paid_date else None,
        payment_method=payment.payment_method,
        reference_number=payment.reference_number,
        status=payment.status,
        notes=payment.notes,
        created_at=payment.created_at.isoformat() if payment.created_at else "",
        updated_at=payment.updated_at.isoformat() if payment.updated_at else "",
    )
