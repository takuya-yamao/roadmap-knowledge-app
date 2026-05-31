from typing import Any, Dict
from pydantic import BaseModel


class KnowledgePostCreate(BaseModel):
    data: Dict[str, Any]