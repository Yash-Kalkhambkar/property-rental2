from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_owner
from app.models.owner import Owner
from app.schemas.payment import CreatePaymentRequest, UpdatePaymentRequest
from app.services import payment_service

router = APIRouter()


@router.get("/", response_model=dict)
def list_payments(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    status: str | None = None,
    
    lease_id: str | None = None,
    month: str | None = None,
    db: Session = Depends(get_db),
    current_owner: Owner = Depends(get_current_owner),
):
    result = payment_service.list_payments(
        db, current_owner, page, limit, status, lease_id, month
    )
    return {"data": result, "message": "OK"}


@router.post("/", response_model=dict)
def create_payment(
    payload: CreatePaymentRequest,
    db: Session = Depends(get_db),
    current_owner: Owner = Depends(get_current_owner),
):
    payment = payment_service.create_payment(db, current_owner, payload)
    return {"data": payment, "message": "Payment recorded"}


@router.get("/{payment_id}", response_model=dict)
def get_payment(
    payment_id: str,
    db: Session = Depends(get_db),
    current_owner: Owner = Depends(get_current_owner),
):
    payment = payment_service.get_payment(db, current_owner, payment_id)
    return {"data": payment, "message": "OK"}


@router.patch("/{payment_id}", response_model=dict)
def update_payment(
    payment_id: str,
    payload: UpdatePaymentRequest,
    db: Session = Depends(get_db),
    current_owner: Owner = Depends(get_current_owner),
):
    payment = payment_service.update_payment(
        db, current_owner, payment_id, payload
    )
    return {"data": payment, "message": "Payment updated"}


@router.delete("/{payment_id}", response_model=dict)
def delete_payment(
    payment_id: str,
    db: Session = Depends(get_db),
    current_owner: Owner = Depends(get_current_owner),
):
    payment_service.delete_payment(db, current_owner, payment_id)
    return {"data": None, "message": "Payment deleted"}
