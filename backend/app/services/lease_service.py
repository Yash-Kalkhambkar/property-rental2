import math
from datetime import date, timedelta

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.lease import Lease
from app.models.unit import Unit
from app.models.tenant import Tenant
from app.models.property import Property
from app.models.payment import Payment
from app.models.owner import Owner
from app.schemas.lease import (
    CreateLeaseRequest,
    UpdateLeaseRequest,
    TerminateLeaseRequest,
    LeaseResponse,
    UnitSummary,
    TenantSummary,
    PaymentsSummary,
)
from app.services.storage_service import storage_service


def list_leases(
    db: Session,
    owner: Owner,
    page: int = 1,
    limit: int = 10,
    lease_status: str | None = None,
    expiring_in_days: int | None = None,
    unit_id: str | None = None,
) -> dict:
    """List leases with pagination and filters."""
    query = (
        db.query(Lease)
        .join(Unit, Unit.id == Lease.unit_id)
        .join(Property, Property.id == Unit.property_id)
        .filter(Property.owner_id == owner.id)
    )

    if lease_status:
        query = query.filter(Lease.status == lease_status)
    if expiring_in_days is not None:
        cutoff = date.today() + timedelta(days=expiring_in_days)
        query = query.filter(
            Lease.status == "ACTIVE",
            Lease.end_date <= cutoff,
            Lease.end_date >= date.today(),
        )
    if unit_id:
        query = query.filter(Lease.unit_id == unit_id)

    total = query.count()
    pages = math.ceil(total / limit) if limit > 0 else 1
    leases = (
        query.order_by(Lease.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "items": [_lease_to_response(db, lease) for lease in leases],
        "total": total,
        "page": page,
        "pages": pages,
    }


def create_lease(
    db: Session, owner: Owner, payload: CreateLeaseRequest
) -> LeaseResponse:
    """Create a new lease. Validates unit ownership and vacancy."""
    # Verify unit ownership
    unit = (
        db.query(Unit)
        .join(Property, Property.id == Unit.property_id)
        .filter(Unit.id == payload.unit_id, Property.owner_id == owner.id)
        .first()
    )
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found or access denied",
        )

    if unit.status != "VACANT":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Unit is not vacant",
        )

    # Verify tenant ownership
    tenant = (
        db.query(Tenant)
        .filter(Tenant.id == payload.tenant_id, Tenant.owner_id == owner.id)
        .first()
    )
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found or access denied",
        )

    lease = Lease(
        unit_id=payload.unit_id,
        tenant_id=payload.tenant_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        monthly_rent=payload.monthly_rent,
        deposit_paid=payload.deposit_paid,
        rent_due_day=payload.rent_due_day,
        notes=payload.notes,
        status="ACTIVE",
    )
    db.add(lease)

    # Mark unit as occupied
    unit.status = "OCCUPIED"

    db.commit()
    db.refresh(lease)

    # Send lease confirmation email to tenant
    try:
        from app.services.email_service import email_service
        from app.core.config import settings
        prop_for_email = db.query(Property).filter(Property.id == unit.property_id).first()
        email_service.send_lease_confirmation(
            to_email=tenant.email,
            tenant_name=tenant.full_name,
            property_name=prop_for_email.name if prop_for_email else "",
            unit_number=unit.unit_number,
            start_date=payload.start_date,
            end_date=payload.end_date,
            monthly_rent=float(payload.monthly_rent),
            portal_url=f"{settings.FRONTEND_URL}/tenant/leases",
        )
    except Exception:
        pass  # Don't fail lease creation if email fails

    return _lease_to_response(db, lease)


def get_lease(
    db: Session, owner: Owner, lease_id: str
) -> LeaseResponse:
    """Get a single lease."""
    lease = _get_lease(db, owner, lease_id)
    return _lease_to_response(db, lease)


def update_lease(
    db: Session,
    owner: Owner,
    lease_id: str,
    payload: UpdateLeaseRequest,
) -> LeaseResponse:
    """Update lease (only notes and end_date)."""
    lease = _get_lease(db, owner, lease_id)

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(lease, key, value)

    db.commit()
    db.refresh(lease)
    return _lease_to_response(db, lease)


def terminate_lease(
    db: Session,
    owner: Owner,
    lease_id: str,
    payload: TerminateLeaseRequest,
) -> LeaseResponse:
    """Terminate a lease and mark unit as vacant."""
    lease = _get_lease(db, owner, lease_id)

    if lease.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only active leases can be terminated",
        )

    lease.status = "TERMINATED"
    # Only update end_date if termination_date is after start_date (DB constraint: end_date > start_date)
    if payload.termination_date > lease.start_date:
        lease.end_date = payload.termination_date
    lease.notes = (
        f"{lease.notes}\n\nTerminated: {payload.reason}"
        if lease.notes
        else f"Terminated: {payload.reason}"
    )

    # Mark unit as vacant
    unit = db.query(Unit).filter(Unit.id == lease.unit_id).first()
    if unit:
        unit.status = "VACANT"

    db.commit()
    db.refresh(lease)
    return _lease_to_response(db, lease)


async def upload_agreement(
    db: Session, owner: Owner, lease_id: str, file: UploadFile
) -> dict:
    """Upload a lease agreement PDF."""
    lease = _get_lease(db, owner, lease_id)

    if file.content_type not in ["application/pdf"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are accepted",
        )
    if file.size and file.size > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size must be under 5MB",
        )

    contents = await file.read()
    key = f"leases/{lease.id}/agreement.pdf"
    storage_service.upload(key=key, body=contents, content_type="application/pdf")

    lease.agreement_url = key
    db.commit()

    signed = storage_service.signed_url(key)
    return {"document_url": key, "presigned_url": signed}


def get_document_url(
    db: Session, owner: Owner, lease_id: str
) -> dict:
    """Get a signed URL for the lease agreement."""
    lease = _get_lease(db, owner, lease_id)

    if not lease.agreement_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No agreement uploaded for this lease",
        )

    signed = storage_service.signed_url(lease.agreement_url)
    return {"presigned_url": signed}


def _get_lease(db: Session, owner: Owner, lease_id: str) -> Lease:
    """Fetch lease with ownership check via unit -> property -> owner."""
    lease = (
        db.query(Lease)
        .join(Unit, Unit.id == Lease.unit_id)
        .join(Property, Property.id == Unit.property_id)
        .filter(Lease.id == lease_id, Property.owner_id == owner.id)
        .first()
    )
    if not lease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lease not found or access denied",
        )
    return lease


def _lease_to_response(db: Session, lease: Lease) -> LeaseResponse:
    """Convert Lease ORM to response with nested summaries."""
    # Load related objects
    unit = db.query(Unit).filter(Unit.id == lease.unit_id).first()
    tenant = db.query(Tenant).filter(Tenant.id == lease.tenant_id).first()
    prop = db.query(Property).filter(Property.id == unit.property_id).first() if unit else None

    # Compute payments summary
    total_due = (
        db.query(func.coalesce(func.sum(Payment.amount_due), 0))
        .filter(Payment.lease_id == lease.id)
        .scalar()
    )
    total_paid = (
        db.query(func.coalesce(func.sum(Payment.amount_paid), 0))
        .filter(Payment.lease_id == lease.id)
        .scalar()
    )
    overdue_amount = (
        db.query(func.coalesce(func.sum(Payment.amount_due), 0))
        .filter(Payment.lease_id == lease.id, Payment.status == "OVERDUE")
        .scalar()
    )

    return LeaseResponse(
        id=lease.id,
        unit_id=lease.unit_id,
        tenant_id=lease.tenant_id,
        unit=UnitSummary(
            id=unit.id if unit else "",
            unit_number=unit.unit_number if unit else "",
            property_name=prop.name if prop else "",
            property_id=prop.id if prop else "",
        ),
        tenant=TenantSummary(
            id=tenant.id if tenant else "",
            full_name=tenant.full_name if tenant else "",
            phone=tenant.phone if tenant else "",
            email=tenant.email if tenant else None,
        ),
        start_date=lease.start_date.isoformat() if lease.start_date else "",
        end_date=lease.end_date.isoformat() if lease.end_date else "",
        monthly_rent=float(lease.monthly_rent),
        deposit_paid=float(lease.deposit_paid),
        rent_due_day=lease.rent_due_day,
        status=lease.status,
        agreement_url=lease.agreement_url,
        notes=lease.notes,
        payments_summary=PaymentsSummary(
            total_due=float(total_due),
            total_paid=float(total_paid),
            overdue_amount=float(overdue_amount),
        ),
        created_at=lease.created_at.isoformat() if lease.created_at else "",
        updated_at=lease.updated_at.isoformat() if lease.updated_at else "",
    )
