import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from auth import (
    authenticate_user,
    create_access_token,
    get_current_user,
    hash_password,
    require_admin,
)
from config import settings
from database import Base, SessionLocal, engine, get_db
from models import KnowledgePost, User
from schemas import (
    KnowledgePostCreate,
    LoginRequest,
    LoginResponse,
    PasswordReset,
    UserCreate,
    UserRead,
    UserUpdate,
)


logger = logging.getLogger(__name__)


def initialize_database() -> None:
    if not settings.auto_create_tables:
        return

    try:
        Base.metadata.create_all(bind=engine)
    except SQLAlchemyError:
        # DB停止中でもAPI自体は起動し、/health/ready と画面で原因を確認できるようにします。
        logger.exception("Database initialization failed. The API will remain live but not ready.")
        return

    if not settings.initial_admin_username or not settings.initial_admin_password:
        return
    if len(settings.initial_admin_password) < 12:
        logger.error("INITIAL_ADMIN_PASSWORD must contain at least 12 characters")
        return

    db = SessionLocal()
    try:
        admin_exists = db.query(User).filter(User.role == "admin").first()
        if not admin_exists:
            db.add(
                User(
                    username=settings.initial_admin_username.strip().lower(),
                    password_hash=hash_password(settings.initial_admin_password),
                    role="admin",
                    is_active=True,
                )
            )
            db.commit()
            logger.info("Initial administrator created")
    except (IntegrityError, SQLAlchemyError):
        db.rollback()
        logger.exception("Initial administrator creation failed")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(
    title="誰でもロードマップナレッジ API",
    version="2.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/")
def root():
    return {"message": "FastAPI is running", "docs": "/docs"}


@app.get("/health/live")
def health_live():
    return {"status": "ok"}


@app.get("/health/ready")
def health_ready(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ready", "database": "connected"}
    except SQLAlchemyError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is unavailable",
        )


@app.post("/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    try:
        user = authenticate_user(db, payload.username, payload.password)
    except SQLAlchemyError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is unavailable",
        )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return LoginResponse(access_token=create_access_token(user), user=user)


@app.get("/auth/me", response_model=UserRead)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user


@app.get("/users", response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return db.query(User).order_by(User.id.asc()).all()


@app.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=True,
    )
    db.add(user)
    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")
    return user


def _active_admin_count(db: Session) -> int:
    return db.query(User).filter(User.role == "admin", User.is_active.is_(True)).count()


@app.patch("/users/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    next_role = payload.role if payload.role is not None else user.role
    next_active = payload.is_active if payload.is_active is not None else user.is_active
    removes_admin = user.role == "admin" and user.is_active and (next_role != "admin" or not next_active)

    if user.id == current_admin.id and (next_role != "admin" or not next_active):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot remove your own admin access")
    if removes_admin and _active_admin_count(db) <= 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one active admin is required")

    user.role = next_role
    user.is_active = next_active
    db.commit()
    db.refresh(user)
    return user


@app.post("/users/{user_id}/reset-password")
def reset_user_password(
    user_id: int,
    payload: PasswordReset,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.password_hash = hash_password(payload.new_password)
    user.token_version += 1
    db.commit()
    return {"message": "Password updated"}


@app.get("/posts")
def get_posts(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    try:
        rows = db.query(KnowledgePost).order_by(KnowledgePost.id.desc()).all()
        return [row.data for row in rows]
    except SQLAlchemyError:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database is unavailable")


@app.post("/posts", status_code=status.HTTP_201_CREATED)
def create_post(
    payload: KnowledgePostCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    post = payload.data
    post_id = post.get("id")
    if not isinstance(post_id, str) or not post_id.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Post id is required")

    existing = db.query(KnowledgePost).filter(KnowledgePost.post_id == post_id).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Post already exists")

    new_row = KnowledgePost(post_id=post_id, data=post)
    db.add(new_row)
    try:
        db.commit()
        db.refresh(new_row)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Post already exists")
    return new_row.data


@app.put("/posts/{post_id}")
def update_post(
    post_id: str,
    payload: KnowledgePostCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    row = db.query(KnowledgePost).filter(KnowledgePost.post_id == post_id).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    updated_data = dict(payload.data)
    updated_data["id"] = post_id
    row.data = updated_data
    db.commit()
    db.refresh(row)
    return row.data


@app.delete("/posts/{post_id}")
def delete_post(
    post_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    row = db.query(KnowledgePost).filter(KnowledgePost.post_id == post_id).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    db.delete(row)
    db.commit()
    return {"message": "deleted"}


@app.patch("/posts/{post_id}/use")
def increment_use_count(
    post_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    row = db.query(KnowledgePost).filter(KnowledgePost.post_id == post_id).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    post = dict(row.data)
    now = datetime.now(timezone.utc).isoformat()
    post["useCount"] = post.get("useCount", 0) + 1
    post["useHistory"] = post.get("useHistory", []) + [now]

    row.data = post
    db.commit()
    db.refresh(row)
    return row.data
