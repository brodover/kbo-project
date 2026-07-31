from pydantic import BaseModel

class PlayerGameStats(BaseModel):
    batter_id: int
    game_id: str
    hits: int
    bbs: int
    hbps: int
    sfs: int
    pas: int

    class Config:
        # This tells Pydantic to work with ORM objects (like SQLAlchemy)
        # if you ever pass database rows directly to the model.
        from_attributes = True