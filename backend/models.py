from sqlalchemy import Column, Integer, String, DateTime, JSON
from sqlalchemy.sql import func

from database import Base


class KnowledgePost(Base):
    __tablename__ = "knowledge_posts_v2"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(String(255), unique=True, index=True, nullable=False)
    data = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())