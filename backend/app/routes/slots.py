from fastapi import APIRouter, HTTPException
from typing import List
from app.database import SLOTS_DB
from app.models import Slot, CrowdLevel

router = APIRouter(prefix="/api/slots", tags=["Pickup Slots"])

@router.get("", response_model=List[Slot])
async def list_slots():
    # Return slots in order
    slots = list(SLOTS_DB.values())
    for s in slots:
        ratio = s.booked_count / s.capacity if s.capacity > 0 else 0
        if ratio >= 0.8:
            s.crowd_level = CrowdLevel.HIGH
        elif ratio >= 0.4:
            s.crowd_level = CrowdLevel.MODERATE
        else:
            s.crowd_level = CrowdLevel.LOW
        s.is_available = s.booked_count < s.capacity
    return slots

@router.get("/{slot_id}", response_model=Slot)
async def get_slot(slot_id: str):
    if slot_id not in SLOTS_DB:
        raise HTTPException(status_code=404, detail="Pickup slot not found.")
    return SLOTS_DB[slot_id]
