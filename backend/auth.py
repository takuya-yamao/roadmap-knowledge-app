from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models import User


password_hash = PasswordHash.recommended()
bearer_scheme = HTTPBearer(auto_error=False)
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def _secret_key() -> str:
    if len(settings.jwt_secret_key) < 32:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="JWT_SECRET_KEY is not configured correctly",
        )
    return settings.jwt_secret_key


def create_access_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        "username": user.username,
        "role": user.role,
        "ver": user.token_version,
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(payload, _secret_key(), algorithm=ALGORITHM)


def authenticate_user(db: Session, username: str, password: str) -> User | None:
    user = db.query(User).filter(User.username == username.strip().lower()).first()
    if not user or not user.is_active or not verify_password(password, user.password_hash):
        return None
    return user


def demo_user() -> User:
    # デモモード用の仮の管理者。DBには保存されず、権限だけ「管理者」として振る舞います。
    return User(
        id=0,
        username="demo",
        password_hash="",
        role="admin",
        is_active=True,
        token_version=0,
        created_at=datetime.now(timezone.utc),
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if settings.demo_mode:
        # デモモードではトークンを検証せず、常に管理者として扱います。
        return demo_user()

    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not credentials or credentials.scheme.lower() != "bearer":
        raise credentials_error

    try:
        payload = jwt.decode(credentials.credentials, _secret_key(), algorithms=[ALGORITHM])
        user_id = int(payload.get("sub", ""))
        token_version = int(payload.get("ver", -1))
    except (InvalidTokenError, TypeError, ValueError):
        raise credentials_error

    try:
        user = db.query(User).filter(User.id == user_id).first()
    except SQLAlchemyError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is unavailable",
        )
    if not user or not user.is_active or user.token_version != token_version:
        raise credentials_error
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin permission required")
    return current_user
