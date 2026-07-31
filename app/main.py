from datetime import date
from typing import Optional

from fastapi import FastAPI, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.schemas import PlayerGameStats
from .database import get_db, engine

app = FastAPI()

@app.get("/stats/obp/{batter_id}", response_model=list[PlayerGameStats])
def get_player_obp(
    batter_id: str,
    start_date: Optional[date] = Query(None, description="Filter from this date (YYYY-MM-DD)"), 
    end_date: Optional[date] = Query(None, description="Filter until this date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    # Base query targeting your materialized view
    query_str = "SELECT * FROM player_game_stats WHERE batter_id = :b_id"
    params = {"b_id": batter_id}

    # Dynamically add date filtering if provided
    if start_date:
        query_str += " AND game_date >= :start_date"
        params["start_date"] = start_date
    if end_date:
        query_str += " AND game_date <= :end_date"
        params["end_date"] = end_date

    query_str += " LIMIT 50"

    result = db.execute(text(query_str), params).fetchall()

    # Map database rows to dictionaries so Pydantic can validate them
    return [dict(row._mapping) for row in result]