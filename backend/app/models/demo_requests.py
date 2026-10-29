from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class DemoCostRequest(BaseModel):
    model_config=ConfigDict(extra='forbid',str_strip_whitespace=True,allow_inf_nan=False)
    procedure:str=Field(min_length=2,max_length=200)
    city:str=Field(default='Hyderabad',min_length=1,max_length=100)
    room_type:Literal['General Ward','Semi-Private','Private Room','ICU']='Semi-Private'
    hospital_id:str|None=None

class ProfileRequest(BaseModel):
    model_config=ConfigDict(extra='forbid',allow_inf_nan=False)
    profile:dict[str,str|int|float|bool|None]=Field(default_factory=dict,max_length=30)
    hospital_id:str|None=None
    specialty:str|None=None

class InsuranceRequest(BaseModel):
    model_config=ConfigDict(extra='forbid',str_strip_whitespace=True)
    hospital_id:str=Field(min_length=1)
    specialty:str=Field(min_length=1)
    cost_inr:str=Field(pattern=r'^\d+(\.\d{1,2})?$')
