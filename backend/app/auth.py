"""Single-user auth: one password (env), issued as a JWT session token."""
from __future__ import annotations
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

from .config import get_settings

settings = get_settings()
_bearer = HTTPBearer(auto_error=False)
ALGO = "HS256"


def verify_password(candidate: str) -> bool:
    """Constant-ish comparison against the single app password."""
    expected = settings.app_password
    # length-independent compare to avoid trivial timing leaks
    if len(candidate) != len(expected):
        return False
    return sum(a != b for a, b in zip(candidate, expected)) == 0


def create_token() -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode({"sub": "atlas-user", "exp": exp}, settings.jwt_secret, algorithm=ALGO)


def require_auth(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> str:
    """FastAPI dependency: 401 unless a valid session token is present."""
    if creds is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, settings.jwt_secret, algorithms=[ALGO])
        return payload.get("sub", "atlas-user")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")
