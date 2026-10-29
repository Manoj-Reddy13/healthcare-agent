from pydantic import BaseModel, ConfigDict, Field, StrictInt


class SeniorPathRequest(BaseModel):
    model_config=ConfigDict(extra='forbid')
    age: StrictInt|None=Field(default=None,ge=0,le=130)
