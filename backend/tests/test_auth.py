"""Auth: password check + JWT round-trip."""
from app.auth import verify_password, create_token, require_auth
from fastapi.security import HTTPAuthorizationCredentials
import pytest
from fastapi import HTTPException


def test_verify_password_correct_and_wrong():
    assert verify_password("test-pass") is True
    assert verify_password("nope") is False
    assert verify_password("test-pas") is False  # length mismatch


def test_token_round_trip():
    token = create_token()
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    assert require_auth(creds) == "atlas-user"


def test_invalid_token_rejected():
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="garbage")
    with pytest.raises(HTTPException):
        require_auth(creds)


def test_missing_token_rejected():
    with pytest.raises(HTTPException):
        require_auth(None)
