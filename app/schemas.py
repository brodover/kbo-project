from datetime import date

from pydantic import BaseModel

class PlayerGameStats(BaseModel):
    batter_id: int
    game_id: str
    hits: int   # hits
    bbs: int    # base on balls (walks)
    hbps: int   # hit by pitches
    sfs: int  # sacrifice flies
    pas: int    # plate appearances
    game_date: date = None

    class Config:
        # This tells Pydantic to work with ORM objects (like SQLAlchemy)
        # if you ever pass database rows directly to the model.
        from_attributes = True