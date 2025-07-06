from pydantic import BaseModel, validator
from typing import Optional

class EventSchema(BaseModel):
    id: str
    type: str  # MINT|TRANSFER|SALE
    contract_address: str
    token_id: str
    from_address: Optional[str]
    to_address: str
    value: Optional[float]
    timestamp: int
    
    @validator('type')
    def validate_type(cls, v):
        if v not in ['MINT', 'TRANSFER', 'SALE']:
            raise ValueError('Invalid event type')
        return v