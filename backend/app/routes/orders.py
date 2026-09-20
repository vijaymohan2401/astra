import uuid
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from app.database import MENU_DB, ORDERS_DB, SLOTS_DB, get_next_token_number
from app.models import (
    Order, OrderItemDetail, CreateOrderRequest, OrderStatus, 
    PaymentStatus, StatusUpdateRequest
)
from app.utils.qr_generator import generate_qr_code_base64

router = APIRouter(prefix="/api/orders", tags=["Orders"])

@router.post("", response_model=Order, status_code=201)
async def create_order(payload: CreateOrderRequest):
    from app.main import broadcast_websocket_event
    
    if not payload.items:
        raise HTTPException(status_code=400, detail="Order must contain at least one item.")

    if payload.pickup_slot_id not in SLOTS_DB:
        raise HTTPException(status_code=400, detail="Invalid pickup slot selected.")
    
    slot = SLOTS_DB[payload.pickup_slot_id]
    if slot.booked_count >= slot.capacity:
        raise HTTPException(status_code=400, detail="Selected pickup slot is at full capacity. Please choose another slot.")

    # Validate stock and assemble order items
    order_items_detail: List[OrderItemDetail] = []
    subtotal = 0.0
    max_prep_time = 0

    for itm in payload.items:
        if itm.item_id not in MENU_DB:
            raise HTTPException(status_code=404, detail=f"Item with ID '{itm.item_id}' not found.")
        
        menu_item = MENU_DB[itm.item_id]
        if not menu_item.is_available:
            raise HTTPException(status_code=400, detail=f"'{menu_item.name}' is currently Sold Out.")
        
        if menu_item.stock_quantity < itm.quantity:
            raise HTTPException(
                status_code=400, 
                detail=f"Only {menu_item.stock_quantity} portion(s) remaining for '{menu_item.name}'."
            )
        
        line_total = round(menu_item.price * itm.quantity, 2)
        subtotal += line_total
        max_prep_time = max(max_prep_time, menu_item.prep_time_mins)

        order_items_detail.append(
            OrderItemDetail(
                item_id=menu_item.id,
                name=menu_item.name,
                price=menu_item.price,
                quantity=itm.quantity,
                subtotal=line_total,
                dietary=menu_item.dietary
            )
        )

    # Deduct stock
    for itm in payload.items:
        menu_item = MENU_DB[itm.item_id]
        menu_item.stock_quantity -= itm.quantity
        if menu_item.stock_quantity <= 0:
            menu_item.stock_quantity = 0
            menu_item.is_available = False

    # Increment slot count
    slot.booked_count += 1

    subtotal = round(subtotal, 2)
    tax = round(subtotal * 0.05, 2)  # 5% GST
    total_amount = round(subtotal + tax, 2)

    order_id = f"ORD-{uuid.uuid4().hex[:6].upper()}"
    token_number = get_next_token_number()

    now = datetime.now()
    est_ready = now + timedelta(minutes=max_prep_time if max_prep_time > 0 else 10)

    # Generate scannable QR payload
    qr_payload = {
        "order_id": order_id,
        "token": token_number,
        "student": payload.student_name,
        "student_id": payload.student_id,
        "slot": slot.label,
        "total": total_amount,
        "item_count": sum(i.quantity for i in payload.items),
        "security_hash": f"ASTRA-{order_id}-{token_number.replace('#', '')}"
    }
    qr_data_uri = generate_qr_code_base64(qr_payload)

    new_order = Order(
        id=order_id,
        token_number=token_number,
        student_name=payload.student_name,
        student_id=payload.student_id,
        student_phone=payload.student_phone,
        items=order_items_detail,
        item_count=sum(i.quantity for i in payload.items),
        subtotal=subtotal,
        tax=tax,
        total_amount=total_amount,
        pickup_slot_id=slot.id,
        pickup_slot_label=slot.label,
        status=OrderStatus.PLACED,
        payment_method=payload.payment_method,
        payment_status=PaymentStatus.PAID,
        created_at=now.strftime("%I:%M %p"),
        estimated_ready_time=est_ready.strftime("%I:%M %p"),
        qr_code_data_uri=qr_data_uri,
        special_instructions=payload.special_instructions or "",
        status_updated_at=now.strftime("%I:%M %p")
    )

    ORDERS_DB[order_id] = new_order

    # Broadcast new order to Kitchen Live Kanban
    await broadcast_websocket_event("new_order", {
        "order": new_order.model_dump(),
        "alert": f"New Order {token_number} placed for {new_order.pickup_slot_label}"
    })

    return new_order

@router.get("", response_model=List[Order])
async def list_orders(
    status: Optional[str] = Query(None, description="Filter by status"),
    student_id: Optional[str] = Query(None, description="Filter by student ID")
):
    orders = list(ORDERS_DB.values())
    if status and status.upper() != "ALL":
        orders = [o for o in orders if o.status.value.upper() == status.upper()]
    if student_id:
        orders = [o for o in orders if o.student_id.lower() == student_id.lower()]
    
    # Sort newest first
    orders.reverse()
    return orders

@router.get("/{order_id}", response_model=Order)
async def get_order_by_id(order_id: str):
    if order_id not in ORDERS_DB:
        raise HTTPException(status_code=404, detail=f"Order '{order_id}' not found.")
    return ORDERS_DB[order_id]

@router.get("/by-token/{token_number}", response_model=Order)
async def get_order_by_token(token_number: str):
    clean_token = token_number.strip().upper()
    if not clean_token.startswith("#"):
        clean_token = f"#{clean_token}"
    
    for o in ORDERS_DB.values():
        if o.token_number.upper() == clean_token:
            return o
    raise HTTPException(status_code=404, detail=f"No order found with token '{token_number}'.")

@router.patch("/{order_id}/status", response_model=Order)
async def update_order_status(order_id: str, payload: StatusUpdateRequest):
    from app.main import broadcast_websocket_event
    if order_id not in ORDERS_DB:
        raise HTTPException(status_code=404, detail=f"Order '{order_id}' not found.")
    
    order = ORDERS_DB[order_id]
    order.status = payload.status
    now_str = datetime.now().strftime("%I:%M %p")
    order.status_updated_at = now_str

    # Broadcast status change to student tracker & kitchen screens
    await broadcast_websocket_event("order_status_updated", {
        "order_id": order.id,
        "token_number": order.token_number,
        "status": order.status.value,
        "updated_at": now_str,
        "order": order.model_dump()
    })

    return order
