import os
from dataclasses import dataclass

from dotenv import load_dotenv


load_dotenv()


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _as_int(value: str | None, default: int) -> int:
    try:
        return int(value) if value is not None else default
    except ValueError as exc:
        raise ValueError("ACCESS_TOKEN_EXPIRE_MINUTES must be an integer") from exc


def _origins(value: str | None) -> list[str]:
    default = (
        "http://localhost:5173,"
        "http://localhost:5174,"
        "https://takuya-roadmap-app.netlify.app"
    )
    return [origin.strip().rstrip("/") for origin in (value or default).split(",") if origin.strip()]


@dataclass(frozen=True)
class Settings:
    database_url: str | None
    cors_origins: list[str]
    jwt_secret_key: str
    access_token_expire_minutes: int
    auto_create_tables: bool
    initial_admin_username: str | None
    initial_admin_password: str | None
    demo_mode: bool


settings = Settings(
    database_url=os.getenv("DATABASE_URL"),
    cors_origins=_origins(os.getenv("CORS_ORIGINS")),
    jwt_secret_key=os.getenv("JWT_SECRET_KEY", ""),
    access_token_expire_minutes=_as_int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"), 480),
    auto_create_tables=_as_bool(os.getenv("AUTO_CREATE_TABLES"), True),
    initial_admin_username=os.getenv("INITIAL_ADMIN_USERNAME"),
    initial_admin_password=os.getenv("INITIAL_ADMIN_PASSWORD"),
    # デモモード。true の間はログインなしで全APIを利用できます。
    # クライアントが本番運用でアカウント管理を有効化する時は false にします。
    demo_mode=_as_bool(os.getenv("DEMO_MODE"), True),
)
