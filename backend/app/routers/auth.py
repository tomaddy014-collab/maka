"""Auth endpoints: exchange the app password for a session token."""
from fastapi import APIRouter, HTTPException, status

from ..auth import verify_password, create_token
from ..schemas import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    if not verify_password(body.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Wrong password")
    return TokenResponse(access_token=create_token())
