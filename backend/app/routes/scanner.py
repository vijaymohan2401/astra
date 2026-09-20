import json
from datetime import datetime
from fastapi import APIRouter, HTTPException
from app.database import ORDERS_DB
from app.models import TokenVerifyRequest, TokenVerifyResponse, OrderStatus

router = APIRouter(prefix="/api/scanner", tags=["Counter Scanner"])

@router.post("/verify", response_model=TokenVerifyResponse)
async def verify_pickup_token(payload: TokenVerifyRequest):
    from app.main import broadcast_websocket_event
    
    query = payload.token_query.strip()
    target_order = None

    # Try parsing query as JSON payload from QR scan
    if query.startswith("{") and query.endswith("}"):
        try:
            data = json.loads(query)
            order_id = data.get("order_id")
            token = data.get("token")
            if order_id and order_id in ORDERS_DB:
                target_order = ORDERS_DB[order_id]
            elif token:
                for o in ORDERS_DB.values():
                    if o.token_number.upper() == token.upper():
                        target_order = o
                        break
        except Exception:
            pass

    # If not matched by JSON, try direct lookup by order_id or token_number
    if not target_order:
        if query in ORDERS_DB:
            target_order = ORDERS_DB[query]
        else:
            clean_token = query.upper()
            if not clean_token.startswith("#"):
                clean_token = f"#{clean_token}"
            for o in ORDERS_DB.values():
                if o.token_number.upper() == clean_token or o.id.upper() == query.upper():
                    target_order = o
                    break

    if not target_order:
        return TokenVerifyResponse(
            success=False,
            message="Invalid QR Code / Token. No matching order found in the canteen system.",
            order=None,
            action_taken="REJECTED"
        )

    # Check order states
    now_str = datetime.now().strftime("%I:%M %p")

    if target_order.status == OrderStatus.PICKED_UP:
        return TokenVerifyResponse(
            success=False,
            message=f"ALREADY REDEEMED: This token was already picked up at {target_order.status_updated_at or 'earlier'}. Duplicate pickup attempt blocked!",
            order=target_order,
            action_taken="ALREADY_COLLECTED"
        )
    
    if target_order.status == OrderStatus.CANCELLED:
        return TokenVerifyResponse(
            success=False,
            message="REJECTED: This order has been cancelled.",
            order=target_order,
            action_taken="CANCELLED"
        )

    if target_order.status == OrderStatus.PLACED:
        return TokenVerifyResponse(
            success=False,
            message="ORDER NOT READY: The order has just been placed and is waiting for the kitchen to start preparation.",
            order=target_order,
            action_taken="WAITING_KITCHEN"
        )

    if target_order.status == OrderStatus.PREPARING:
        # Prompt counter staff that it is still cooking, but allow manual override if food is ready
        target_order.status = OrderStatus.PICKED_UP
        target_order.status_updated_at = now_str
        
        await broadcast_websocket_event("order_status_updated", {
            "order_id": target_order.id,
            "token_number": target_order.token_number,
            "status": target_order.status.value,
            "updated_at": now_str,
            "order": target_order.model_dump()
        })
        
        return TokenVerifyResponse(
            success=True,
            message="VERIFIED (Fast Track): Order was still flagged in preparation, but has now been validated and marked as PICKED UP.",
            order=target_order,
            action_taken="PICKED_UP"
        )

    if target_order.status == OrderStatus.READY_FOR_PICKUP:
        # Perfect valid redemption
        target_order.status = OrderStatus.PICKED_UP
        target_order.status_updated_at = now_str

        await broadcast_websocket_event("order_status_updated", {
            "order_id": target_order.id,
            "token_number": target_order.token_number,
            "status": target_order.status.value,
            "updated_at": now_str,
            "order": target_order.model_dump()
        })

        return TokenVerifyResponse(
            success=True,
            message="TOKEN VERIFIED! Food is ready at counter. Hand over items to student.",
            order=target_order,
            action_taken="PICKED_UP"
        )

    return TokenVerifyResponse(
        success=False,
        message=f"Order status: {target_order.status.value}",
        order=target_order,
        action_taken="UNKNOWN"
    )
