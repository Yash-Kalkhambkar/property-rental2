from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.unit import Unit
from app.models.property import Property
from app.models.lease import Lease
from app.models.tenant import Tenant
from app.models.owner import Owner
from app.schemas.unit import (
    CreateUnitRequest,
    UpdateUnitRequest,
    UnitResponse,
    CurrentTenantSummary,
)


def list_units(
    db: Session,
    owner: Owner,
    property_id: str,
    unit_status: str | None = None,
) -> list[UnitResponse]:
    """List units for a property, optionally filtered by status."""
    # Verify the property belongs to the owner
    prop = (
        db.query(Property)
        .filter(Property.id == property_id, Property.owner_id == owner.id)
        .first()
    )
    if not prop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found or access denied",
        )

    query = db.query(Unit).filter(Unit.property_id == property_id)
    if unit_status:
        query = query.filter(Unit.status == unit_status)

    units = query.order_by(Unit.unit_number).all()
    return [unit_to_response(db, u) for u in units]


def create_unit(
    db: Session,
    owner: Owner,
    property_id: str,
    payload: CreateUnitRequest,
) -> UnitResponse:
    """Create a unit under a property."""
    prop = (
        db.query(Property)
        .filter(Property.id == property_id, Property.owner_id == owner.id)
        .first()
    )
    if not prop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found or access denied",
        )

    # Check duplicate unit number
    existing = (
        db.query(Unit)
        .filter(
            Unit.property_id == property_id,
            Unit.unit_number == payload.unit_number,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Unit number '{payload.unit_number}' already exists in this property",
        )

    unit = Unit(
        property_id=property_id,
        unit_number=payload.unit_number,
        floor=payload.floor,
        area_sqft=payload.area_sqft,
        unit_type=payload.unit_type,
        monthly_rent=payload.monthly_rent,
        deposit_amount=payload.deposit_amount,
        amenities=payload.amenities or [],
    )
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit_to_response(db, unit)


def get_unit(db: Session, owner: Owner, unit_id: str) -> UnitResponse:
    """Get a single unit, verifying ownership."""
    unit = _get_unit_with_owner_check(db, owner, unit_id)
    return unit_to_response(db, unit)


def update_unit(
    db: Session,
    owner: Owner,
    unit_id: str,
    payload: UpdateUnitRequest,
) -> UnitResponse:
    """Update a unit."""
    unit = _get_unit_with_owner_check(db, owner, unit_id)

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(unit, key, value)

    db.commit()
    db.refresh(unit)
    return unit_to_response(db, unit)


def delete_unit(db: Session, owner: Owner, unit_id: str) -> None:
    """Delete a unit. Fails if it has any lease (active or historical)."""
    unit = _get_unit_with_owner_check(db, owner, unit_id)

    active_lease = (
        db.query(Lease)
        .filter(Lease.unit_id == unit.id, Lease.status == "ACTIVE")
        .first()
    )
    if active_lease:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete — unit has an active lease",
        )

    # Also check for historical leases (RESTRICT FK prevents deletion)
    any_lease = (
        db.query(Lease)
        .filter(Lease.unit_id == unit.id)
        .first()
    )
    if any_lease:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete — unit has lease history. Archive or reassign leases first.",
        )

    db.delete(unit)
    db.commit()

    active_lease = (
        db.query(Lease)
        .filter(Lease.unit_id == unit.id, Lease.status == "ACTIVE")
        .first()
    )
    if active_lease:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete — unit has an active lease",
        )

    db.delete(unit)
    db.commit()


def _get_unit_with_owner_check(
    db: Session, owner: Owner, unit_id: str
) -> Unit:
    """Fetch unit and verify ownership via property -> owner chain."""
    unit = (
        db.query(Unit)
        .join(Property, Property.id == Unit.property_id)
        .filter(Unit.id == unit_id, Property.owner_id == owner.id)
        .first()
    )
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found or access denied",
        )
    return unit


def unit_to_response(db: Session, unit: Unit) -> UnitResponse:
    """Convert Unit ORM to response with current_tenant lookup."""
    current_tenant = None
    if unit.status == "OCCUPIED":
        active_lease = (
            db.query(Lease)
            .filter(Lease.unit_id == unit.id, Lease.status == "ACTIVE")
            .first()
        )
        if active_lease:
            tenant = (
                db.query(Tenant).filter(Tenant.id == active_lease.tenant_id).first()
            )
            if tenant:
                current_tenant = CurrentTenantSummary(
                    id=tenant.id,
                    full_name=tenant.full_name,
                    phone=tenant.phone,
                )

    return UnitResponse(
        id=unit.id,
        property_id=unit.property_id,
        unit_number=unit.unit_number,
        floor=int(unit.floor) if unit.floor is not None else None,
        area_sqft=float(unit.area_sqft) if unit.area_sqft is not None else None,
        unit_type=unit.unit_type,
        monthly_rent=float(unit.monthly_rent),
        deposit_amount=float(unit.deposit_amount),
        status=unit.status,
        amenities=unit.amenities or [],
        current_tenant=current_tenant,
        created_at=unit.created_at.isoformat() if unit.created_at else "",
        updated_at=unit.updated_at.isoformat() if unit.updated_at else "",
    )
