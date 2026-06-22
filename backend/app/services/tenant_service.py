import math

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.models.tenant import Tenant
from app.models.owner import Owner
from app.schemas.tenant import (
    CreateTenantRequest,
    UpdateTenantRequest,
    TenantResponse,
)
from app.services.storage_service import storage_service
from app.core.security import hash_password
from app.core.config import settings
from app.services.email_service import email_service


def list_tenants(
    db: Session,
    owner: Owner,
    page: int = 1,
    limit: int = 10,
    search: str | None = None,
) -> dict:
    """List tenants with pagination and optional search."""
    query = db.query(Tenant).filter(Tenant.owner_id == owner.id)
    if search:
        query = query.filter(
            Tenant.full_name.ilike(f"%{search}%")
            | Tenant.phone.ilike(f"%{search}%")
            | Tenant.email.ilike(f"%{search}%")
        )

    total = query.count()
    pages = math.ceil(total / limit) if limit > 0 else 1
    tenants = (
        query.order_by(Tenant.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "items": [_tenant_to_response(t) for t in tenants],
        "total": total,
        "page": page,
        "pages": pages,
    }


def create_tenant(
    db: Session, owner: Owner, payload: CreateTenantRequest
) -> TenantResponse:
    """Create a new tenant."""
    # Check for duplicate email across all owners (global uniqueness)
    existing = db.query(Tenant).filter(Tenant.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    tenant = Tenant(
        owner_id=owner.id,
        full_name=payload.full_name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        phone=payload.phone,
        emergency_contact_name=payload.emergency_contact_name,
        emergency_contact_phone=payload.emergency_contact_phone,
        id_type=payload.id_type,
        id_number=payload.id_number,
        notes=payload.notes,
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)

    # Send welcome email with login credentials
    try:
        email_service.send_tenant_welcome(
            to_email=tenant.email,
            tenant_name=tenant.full_name,
            password=payload.password,
            portal_url=f"{settings.FRONTEND_URL}/tenant/login",
        )
    except Exception:
        pass  # Don't fail tenant creation if email fails

    return _tenant_to_response(tenant)


def get_tenant(
    db: Session, owner: Owner, tenant_id: str
) -> TenantResponse:
    """Get a single tenant."""
    tenant = _get_tenant(db, owner, tenant_id)
    return _tenant_to_response(tenant)


def update_tenant(
    db: Session,
    owner: Owner,
    tenant_id: str,
    payload: UpdateTenantRequest,
) -> TenantResponse:
    """Update a tenant."""
    tenant = _get_tenant(db, owner, tenant_id)

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(tenant, key, value)

    db.commit()
    db.refresh(tenant)
    return _tenant_to_response(tenant)


def delete_tenant(
    db: Session, owner: Owner, tenant_id: str
) -> None:
    """Delete a tenant. Will fail if they have lease history (RESTRICT FK)."""
    tenant = _get_tenant(db, owner, tenant_id)
    try:
        db.delete(tenant)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete — tenant has lease history",
        )


async def upload_document(
    db: Session, owner: Owner, tenant_id: str, file: UploadFile
) -> dict:
    """Upload an ID document for a tenant."""
    tenant = _get_tenant(db, owner, tenant_id)

    if file.content_type not in [
        "application/pdf",
        "image/jpeg",
        "image/png",
    ]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF, JPEG, and PNG files are accepted",
        )
    if file.size and file.size > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size must be under 5MB",
        )

    contents = await file.read()
    key = f"tenants/{tenant.id}/id-doc.pdf"
    storage_service.upload(key=key, body=contents, content_type=file.content_type)

    tenant.id_document_url = key
    db.commit()

    signed = storage_service.signed_url(key)
    return {"document_url": key, "presigned_url": signed}


def _get_tenant(db: Session, owner: Owner, tenant_id: str) -> Tenant:
    tenant = (
        db.query(Tenant)
        .filter(Tenant.id == tenant_id, Tenant.owner_id == owner.id)
        .first()
    )
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found or access denied",
        )
    return tenant


def _tenant_to_response(tenant: Tenant) -> TenantResponse:
    return TenantResponse(
        id=tenant.id,
        owner_id=tenant.owner_id,
        full_name=tenant.full_name,
        email=tenant.email,
        phone=tenant.phone,
        emergency_contact_name=tenant.emergency_contact_name,
        emergency_contact_phone=tenant.emergency_contact_phone,
        id_type=tenant.id_type,
        id_number=tenant.id_number,
        id_document_url=tenant.id_document_url,
        notes=tenant.notes,
        created_at=tenant.created_at.isoformat() if tenant.created_at else "",
        updated_at=tenant.updated_at.isoformat() if tenant.updated_at else "",
    )
