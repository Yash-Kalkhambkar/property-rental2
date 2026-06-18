import math

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.property import Property
from app.models.unit import Unit
from app.models.owner import Owner
from app.schemas.property import (
    CreatePropertyRequest,
    UpdatePropertyRequest,
    PropertyResponse,
    PropertyDetailResponse,
)
from app.services.unit_service import unit_to_response


def list_properties(
    db: Session,
    owner: Owner,
    page: int = 1,
    limit: int = 10,
    city: str | None = None,
) -> dict:
    """List properties with pagination and optional city filter."""
    query = db.query(Property).filter(Property.owner_id == owner.id)
    if city:
        query = query.filter(Property.city.ilike(f"%{city}%"))

    total = query.count()
    pages = math.ceil(total / limit) if limit > 0 else 1
    properties = (
        query.order_by(Property.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "items": [_property_to_response(db, p) for p in properties],
        "total": total,
        "page": page,
        "pages": pages,
    }


def create_property(
    db: Session, owner: Owner, payload: CreatePropertyRequest
) -> PropertyResponse:
    """Create a new property for the owner."""
    prop = Property(
        owner_id=owner.id,
        name=payload.name,
        address_line=payload.address_line,
        city=payload.city,
        state=payload.state,
        pincode=payload.pincode,
        property_type=payload.property_type,
        total_units=payload.total_units,
    )
    db.add(prop)
    db.commit()
    db.refresh(prop)
    return _property_to_response(db, prop)


def get_property(
    db: Session, owner: Owner, property_id: str
) -> PropertyDetailResponse:
    """Get property detail with embedded units."""
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

    units = db.query(Unit).filter(Unit.property_id == prop.id).all()
    base = _property_to_response(db, prop)

    return PropertyDetailResponse(
        **base.model_dump(),
        units=[unit_to_response(db, u) for u in units],
    )


def update_property(
    db: Session,
    owner: Owner,
    property_id: str,
    payload: UpdatePropertyRequest,
) -> PropertyResponse:
    """Update a property."""
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

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(prop, key, value)

    db.commit()
    db.refresh(prop)
    return _property_to_response(db, prop)


def delete_property(
    db: Session, owner: Owner, property_id: str
) -> None:
    """Delete a property. Fails if any unit has an active lease."""
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

    # Check for active leases across all units
    from app.models.lease import Lease

    active_leases = (
        db.query(Lease)
        .join(Unit, Unit.id == Lease.unit_id)
        .filter(Unit.property_id == prop.id, Lease.status == "ACTIVE")
        .count()
    )
    if active_leases > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete — one or more units have active leases",
        )

    db.delete(prop)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete — one or more units have lease history",
        )


def _property_to_response(db: Session, prop: Property) -> PropertyResponse:
    """Convert Property ORM to response with computed fields."""
    occupied = (
        db.query(func.count(Unit.id))
        .filter(Unit.property_id == prop.id, Unit.status == "OCCUPIED")
        .scalar()
        or 0
    )
    revenue = (
        db.query(func.coalesce(func.sum(Unit.monthly_rent), 0))
        .filter(Unit.property_id == prop.id, Unit.status == "OCCUPIED")
        .scalar()
        or 0
    )

    return PropertyResponse(
        id=prop.id,
        owner_id=prop.owner_id,
        name=prop.name,
        address_line=prop.address_line,
        city=prop.city,
        state=prop.state,
        pincode=prop.pincode,
        property_type=prop.property_type,
        total_units=prop.total_units,
        occupied_units=occupied,
        monthly_revenue=float(revenue),
        created_at=prop.created_at.isoformat() if prop.created_at else "",
        updated_at=prop.updated_at.isoformat() if prop.updated_at else "",
    )
