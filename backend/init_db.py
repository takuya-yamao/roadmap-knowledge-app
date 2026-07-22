import argparse
import getpass

from sqlalchemy.exc import IntegrityError

from auth import hash_password
from database import Base, SessionLocal, engine
from models import User


def main() -> None:
    parser = argparse.ArgumentParser(description="Create database tables and an administrator account")
    parser.add_argument("--username", default="admin")
    args = parser.parse_args()

    password = getpass.getpass("Administrator password (12+ characters): ")
    if len(password) < 12:
        raise SystemExit("Password must contain at least 12 characters")

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        username = args.username.strip().lower()
        existing = db.query(User).filter(User.username == username).first()
        if existing:
            raise SystemExit(f"User '{username}' already exists")
        db.add(User(username=username, password_hash=hash_password(password), role="admin"))
        db.commit()
        print(f"Administrator '{username}' was created")
    except IntegrityError:
        db.rollback()
        raise SystemExit("The administrator could not be created")
    finally:
        db.close()


if __name__ == "__main__":
    main()
