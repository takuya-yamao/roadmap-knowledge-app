from fastapi.testclient import TestClient

from database import DATABASE_URL, SessionLocal
from main import app
from models import KnowledgePost, User


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_auth_roles_and_post_lifecycle():
    assert DATABASE_URL.startswith("sqlite:////tmp/"), "Tests must use an isolated SQLite database under /tmp"

    with TestClient(app) as client:
        db = SessionLocal()
        try:
            db.query(KnowledgePost).delete()
            db.query(User).filter(User.username != "admin").delete()
            db.commit()
        finally:
            db.close()

        assert client.get("/health/live").status_code == 200
        assert client.get("/health/ready").status_code == 200

        login = client.post(
            "/auth/login",
            json={"username": "admin", "password": "AdminPassword123!"},
        )
        assert login.status_code == 200
        admin_token = login.json()["access_token"]

        created_user = client.post(
            "/users",
            headers=auth_header(admin_token),
            json={"username": "operator1", "password": "OperatorPassword123!", "role": "user"},
        )
        assert created_user.status_code == 201

        user_login = client.post(
            "/auth/login",
            json={"username": "operator1", "password": "OperatorPassword123!"},
        )
        assert user_login.status_code == 200
        user_token = user_login.json()["access_token"]

        post = {
            "id": "test-post-1",
            "title": "テスト投稿",
            "service": "iPhone",
            "question": "テスト",
            "rootCause": "公式資料",
            "mode": "normal",
            "solution": "再起動",
            "steps": [],
            "useCount": 0,
            "useHistory": [],
            "createdAt": "2026-07-18T00:00:00+09:00",
        }

        forbidden = client.post(
            "/posts",
            headers=auth_header(user_token),
            json={"data": post},
        )
        assert forbidden.status_code == 403

        created_post = client.post(
            "/posts",
            headers=auth_header(admin_token),
            json={"data": post},
        )
        assert created_post.status_code == 201

        listed = client.get("/posts", headers=auth_header(user_token))
        assert listed.status_code == 200
        assert listed.json()[0]["id"] == "test-post-1"

        used = client.patch("/posts/test-post-1/use", headers=auth_header(user_token))
        assert used.status_code == 200
        assert used.json()["useCount"] == 1

        deleted = client.delete("/posts/test-post-1", headers=auth_header(admin_token))
        assert deleted.status_code == 200

        users_forbidden = client.get("/users", headers=auth_header(user_token))
        assert users_forbidden.status_code == 403

        users = client.get("/users", headers=auth_header(admin_token))
        assert users.status_code == 200
        assert {item["username"] for item in users.json()} >= {"admin", "operator1"}
