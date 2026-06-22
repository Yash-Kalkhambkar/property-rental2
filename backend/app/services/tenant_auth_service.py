import random
import string

from fastapi import HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.models.owner import Owner
from app.models.tenant import Tenant
from app.schemas.auth import TokenResponse
from app.schemas.tenant_auth import TenantProfileResponse

# Cookie name for tenant refresh token — separate from owner's "refresh_token"
_TENANT_COOKIE = "tenant_refresh_token"
# Cookie path scoped to the tenant refresh endpoint
_TENANT_COOKIE_PATH = "/api/v1/auth/tenant/refresh"


def tenant_login(
    db: Session,
    email: str,
    password: str,
    response: Response,
) -> TokenResponse:
    """Authenticate tenant by email/password.

    Returns an access token and sets a httpOnly refresh cookie.
    Raises 401 if credentials are invalid (without revealing which field is wrong).
    """
    tenant = db.query(Tenant).filter(Tenant.email == email).first()
    if not tenant or not verify_password(password, tenant.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token = create_access_token(user_id=tenant.id, role="TENANT")
    refresh_token = create_refresh_token(user_id=tenant.id, role="TENANT")

    response.set_cookie(
        key=_TENANT_COOKIE,
        value=refresh_token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path=_TENANT_COOKIE_PATH,
    )

    return TokenResponse(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


def tenant_refresh(request: Request, response: Response) -> TokenResponse:
    """Read the tenant refresh cookie, verify it, and issue new tokens (rotation).

    Raises 401 if the cookie is missing, invalid, expired, or has the wrong role.
    """
    refresh_token = request.cookies.get(_TENANT_COOKIE)
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found",
        )

    user_id, role = decode_token(refresh_token, expected_type="refresh")
    if role != "TENANT":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    new_access_token = create_access_token(user_id=user_id, role="TENANT")
    new_refresh_token = create_refresh_token(user_id=user_id, role="TENANT")

    # Rotate: overwrite old cookie with new one
    response.set_cookie(
        key=_TENANT_COOKIE,
        value=new_refresh_token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path=_TENANT_COOKIE_PATH,
    )

    return TokenResponse(
        access_token=new_access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


def tenant_logout(response: Response) -> None:
    """Delete the tenant refresh token cookie."""
    response.delete_cookie(
        key=_TENANT_COOKIE,
        path=_TENANT_COOKIE_PATH,
    )


def get_tenant_profile(tenant: Tenant) -> TenantProfileResponse:
    """Return the tenant's public profile information."""
    return TenantProfileResponse(
        id=tenant.id,
        email=tenant.email,
        full_name=tenant.full_name,
        phone=tenant.phone,
        created_at=tenant.created_at.isoformat() if tenant.created_at else "",
    )


def change_tenant_password(
    db: Session,
    tenant: Tenant,
    current_password: str,
    new_password: str,
) -> None:
    """Change tenant password after verifying the current one.

    Raises 401 if the current password is incorrect.
    """
    if not verify_password(current_password, tenant.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect current password",
        )

    tenant.password_hash = hash_password(new_password)
    db.commit()


def owner_reset_tenant_password(
    db: Session,
    owner: Owner,
    tenant_id: str,
) -> str:
    """Owner resets a tenant's password.

    Verifies the tenant exists AND belongs to the authenticated owner.
    Returns the plain-text temporary password (12 alphanumeric characters).
    Raises 404 if the tenant is not found or does not belong to the owner.
    """
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant or tenant.owner_id != owner.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )

    # Generate a 12-character random alphanumeric temporary password
    alphabet = string.ascii_letters + string.digits
    temp_password = "".join(random.choices(alphabet, k=12))

    tenant.password_hash = hash_password(temp_password)
    db.commit()

    # Email the new temp password to the tenant
    try:
        from app.services.email_service import email_service
        email_service.send_password_reset(
            to_email=tenant.email,
            tenant_name=tenant.full_name,
            temp_password=temp_password,
            portal_url=f"{settings.FRONTEND_URL}/tenant/login",
        )
    except Exception:
        pass  # Don't fail the reset if email fails

    return temp_password
