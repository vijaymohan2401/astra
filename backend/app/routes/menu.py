from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.database import MENU_DB
from app.models import MenuItem, StockUpdateRequest

router = APIRouter(prefix="/api/menu", tags=["Menu"])

@router.get("", response_model=List[MenuItem])
async def list_menu(
    category: Optional[str] = Query(None, description="Filter by category"),
    dietary: Optional[str] = Query(None, description="Filter by veg/non-veg"),
    search: Optional[str] = Query(None, description="Search query in name or description")
):
    items = list(MENU_DB.values())
    if category and category.lower() != "all":
        items = [i for i in items if i.category.lower() == category.lower()]
    if dietary and dietary.lower() != "all":
        items = [i for i in items if i.dietary.value.lower() == dietary.lower()]
    if search:
        q = search.lower().strip()
        items = [i for i in items if q in i.name.lower() or q in i.description.lower() or any(q in t.lower() for t in i.tags)]
    return items

@router.get("/{item_id}", response_model=MenuItem)
async def get_menu_item(item_id: str):
    if item_id not in MENU_DB:
        raise HTTPException(status_code=404, detail=f"Menu item '{item_id}' not found.")
    return MENU_DB[item_id]

@router.patch("/{item_id}/stock", response_model=MenuItem)
async def update_item_stock(item_id: str, payload: StockUpdateRequest):
    from app.main import broadcast_websocket_event
    if item_id not in MENU_DB:
        raise HTTPException(status_code=404, detail=f"Menu item '{item_id}' not found.")
    
    item = MENU_DB[item_id]
    item.is_available = payload.is_available
    if payload.stock_quantity is not None:
        item.stock_quantity = max(0, payload.stock_quantity)
        if item.stock_quantity == 0:
            item.is_available = False
    
    # Broadcast stock update to all connected clients
    await broadcast_websocket_event("stock_updated", {
        "item_id": item.id,
        "is_available": item.is_available,
        "stock_quantity": item.stock_quantity,
        "item_name": item.name
    })

    return item
