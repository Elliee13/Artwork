from pydantic import BaseModel


class Category(BaseModel):
    name: str
    images: list[str]
    images_count: int = 0
    unsupported_objects_detected: bool = False
    notes: str | None = None


class CatalogResponse(BaseModel):
    categories: list[Category]
