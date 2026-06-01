from datetime import datetime

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, SessionLocal
from models import Base, KnowledgePost
from schemas import KnowledgePostCreate


app = FastAPI()

Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "https://takuya-roadmap-app.netlify.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/")
def root():
    return {"message": "FastAPI is running"}


@app.get("/posts")
def get_posts(db: Session = Depends(get_db)):
    rows = db.query(KnowledgePost).order_by(KnowledgePost.id.desc()).all()
    return [row.data for row in rows]


@app.post("/posts")
def create_post(payload: KnowledgePostCreate, db: Session = Depends(get_db)):
    post = payload.data
    post_id = post.get("id")

    existing = db.query(KnowledgePost).filter(KnowledgePost.post_id == post_id).first()

    if existing:
        existing.data = post
        db.commit()
        db.refresh(existing)
        return existing.data

    new_row = KnowledgePost(post_id=post_id, data=post)
    db.add(new_row)
    db.commit()
    db.refresh(new_row)

    return new_row.data


@app.put("/posts/{post_id}")
def update_post(post_id: str, payload: KnowledgePostCreate, db: Session = Depends(get_db)):
    row = db.query(KnowledgePost).filter(KnowledgePost.post_id == post_id).first()

    if row is None:
        return {"message": "not found"}

    row.data = payload.data
    db.commit()
    db.refresh(row)

    return row.data


@app.delete("/posts/{post_id}")
def delete_post(post_id: str, db: Session = Depends(get_db)):
    row = db.query(KnowledgePost).filter(KnowledgePost.post_id == post_id).first()

    if row is None:
        return {"message": "not found"}

    db.delete(row)
    db.commit()

    return {"message": "deleted"}


@app.patch("/posts/{post_id}/use")
def increment_use_count(post_id: str, db: Session = Depends(get_db)):
    row = db.query(KnowledgePost).filter(KnowledgePost.post_id == post_id).first()

    if row is None:
        return {"message": "not found"}

    post = dict(row.data)
    now = datetime.now().isoformat()

    post["useCount"] = post.get("useCount", 0) + 1
    post["useHistory"] = post.get("useHistory", []) + [now]

    row.data = post
    db.commit()
    db.refresh(row)

    return row.data