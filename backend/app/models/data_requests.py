from datetime import date, datetime, timedelta, timezone
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


def india_today():return datetime.now(timezone(timedelta(hours=5,minutes=30))).date()

class CostRequest(BaseModel):
    model_config=ConfigDict(extra='forbid',str_strip_whitespace=True)
    treatment_id: str=Field(min_length=1,max_length=150)
    city: str=Field(min_length=1,max_length=100)
    room_type: Literal['General Ward','Semi-Private','Private Room','ICU','Not Applicable']
    billing_unit: Literal['per_procedure','per_consultation','per_scan','per_day']
    comparison_group: str=Field(min_length=1,max_length=200)
    on_date: date=Field(default_factory=india_today)
    hospital_id: str | None=Field(default=None,min_length=1,max_length=150)

class MatchRequest(BaseModel):
    model_config=ConfigDict(extra='forbid')
    answers: dict[str,str|int|float|bool|None]=Field(default_factory=dict,max_length=30)
    on_date: date=Field(default_factory=india_today)
