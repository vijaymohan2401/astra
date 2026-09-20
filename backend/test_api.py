import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import MENU_DB, ORDERS_DB, SLOTS_DB
from app.models import (
    CreateOrderRequest, OrderItemInput, PaymentMethod,
    StockUpdateRequest, TokenVerifyRequest, StatusUpdateRequest, OrderStatus
)
from app.routes.menu import list_menu, update_item_stock
from app.routes.slots import list_slots
from app.routes.orders import create_order, get_order_by_id, update_order_status
from app.routes.scanner import verify_pickup_token
from app.routes.analytics import get_canteen_analytics

async def run_tests():
    print("=== RUNNING ASTRA CANTEEN BACKEND VERIFICATION ===")

    # 1. Test Menu Listing
    all_items = await list_menu(None, None, None)
    assert len(all_items) >= 10, f"Expected >= 10 items, got {len(all_items)}"
    print(f"PASS: Found {len(all_items)} seeded menu items.")

    # 2. Test Category Filtering
    breakfast_items = await list_menu("Breakfast", None, None)
    assert all(i.category == "Breakfast" for i in breakfast_items), "Category filter failed"
    print(f"PASS: Filtered {len(breakfast_items)} Breakfast items.")

    # 3. Test Slots
    slots = await list_slots()
    assert len(slots) >= 6, "Slots generation failed"
    first_slot = slots[0]
    print(f"PASS: Retrieved {len(slots)} pickup slots. Slot 1 crowd: {first_slot.crowd_level}")

    # 4. Place Order
    sample_order_req = CreateOrderRequest(
        student_name="Aarav Mehta",
        student_id="CS23B088",
        student_phone="9988776655",
        items=[
            OrderItemInput(item_id="item-01", quantity=2),
            OrderItemInput(item_id="item-10", quantity=1)
        ],
        pickup_slot_id=first_slot.id,
        payment_method=PaymentMethod.UPI_QR,
        special_instructions="Crispy dosa please"
    )

    created_order = await create_order(sample_order_req)
    assert created_order.id.startswith("ORD-"), "Invalid order ID"
    assert created_order.token_number.startswith("#AST-"), "Invalid token number"
    assert created_order.qr_code_data_uri.startswith("data:image/png;base64,"), "Invalid QR code"
    assert created_order.total_amount > 0, "Invalid total amount"
    print(f"PASS: Order created! ID: {created_order.id}, Token: {created_order.token_number}, Total: Rs.{created_order.total_amount}")
    print(f"PASS: QR Code generated cleanly (Length: {len(created_order.qr_code_data_uri)} chars)")

    # 5. Advance Status
    updated = await update_order_status(created_order.id, StatusUpdateRequest(status=OrderStatus.READY_FOR_PICKUP))
    assert updated.status == OrderStatus.READY_FOR_PICKUP
    print("PASS: Order transitioned to READY_FOR_PICKUP")

    # 6. Counter Scanner Verification
    verify_res = await verify_pickup_token(TokenVerifyRequest(token_query=created_order.token_number))
    assert verify_res.success is True, f"Token verification failed: {verify_res.message}"
    assert verify_res.order.status == OrderStatus.PICKED_UP
    print(f"PASS: Counter Staff verified token! Message: {verify_res.message}")

    # 7. Test Duplicate Token Prevention
    dup_res = await verify_pickup_token(TokenVerifyRequest(token_query=created_order.token_number))
    assert dup_res.success is False, "Duplicate token was not blocked!"
    assert dup_res.action_taken == "ALREADY_COLLECTED"
    print(f"PASS: Blocked duplicate pickup attempt: '{dup_res.message}'")

    # 8. Test Stock Toggle & Order Blocking
    await update_item_stock("item-02", StockUpdateRequest(is_available=False, stock_quantity=0))
    blocked_order_req = CreateOrderRequest(
        student_name="Test Student",
        student_id="TEST01",
        items=[OrderItemInput(item_id="item-02", quantity=1)],
        pickup_slot_id=first_slot.id
    )
    try:
        await create_order(blocked_order_req)
        assert False, "Should have failed for sold out item"
    except Exception as e:
        print(f"PASS: Successfully rejected order for sold out item (Error: {e.detail})")

    # Restore item-02 stock
    await update_item_stock("item-02", StockUpdateRequest(is_available=True, stock_quantity=40))

    # 9. Test Analytics
    analytics = await get_canteen_analytics()
    assert "counter_traffic" in analytics
    assert "crowd_reduction_stats" in analytics
    print(f"PASS: Analytics calculated! Queue Status: {analytics['counter_traffic']['status']}, Time saved: {analytics['crowd_reduction_stats']['avg_student_time_saved_mins']} mins")

    print("\nALL BACKEND API AND VERIFICATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(run_tests())
