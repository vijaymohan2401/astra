import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from app.models import MenuItem, Order, Slot, DietaryType, OrderStatus, PaymentMethod, PaymentStatus, CrowdLevel, OrderItemDetail
from app.utils.qr_generator import generate_qr_code_base64

# In-Memory Database Stores
MENU_DB: Dict[str, MenuItem] = {}
ORDERS_DB: Dict[str, Order] = {}
SLOTS_DB: Dict[str, Slot] = {}
TOKEN_COUNTER = 100

def seed_menu():
    items = [
        MenuItem(
            id="item-01",
            name="Crispy Masala Dosa",
            description="Golden thin rice crepe filled with spiced potato masala, served with 2 chutneys & sambar.",
            price=75.0,
            category="Breakfast",
            dietary=DietaryType.VEG,
            image_url="https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=600&q=80",
            prep_time_mins=8,
            calories=320,
            is_available=True,
            stock_quantity=35,
            tags=["Bestseller", "South Indian", "Crispy"]
        ),
        MenuItem(
            id="item-02",
            name="Steamed Idli Vada Combo",
            description="2 fluffy steamed idlis and 1 crunchy medu vada paired with coconut chutney and hot piping sambar.",
            price=60.0,
            category="Breakfast",
            dietary=DietaryType.VEG,
            image_url="https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80",
            prep_time_mins=5,
            calories=280,
            is_available=True,
            stock_quantity=40,
            tags=["Quick Ready", "Healthy", "Steamed"]
        ),
        MenuItem(
            id="item-03",
            name="Aloo Poha Bowl",
            description="Beaten rice tempered with mustard seeds, curry leaves, crunchy roasted peanuts, and fresh lemon.",
            price=45.0,
            category="Breakfast",
            dietary=DietaryType.VEG,
            image_url="https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80",
            prep_time_mins=4,
            calories=210,
            is_available=True,
            stock_quantity=25,
            tags=["Light Meal", "Breakfast Favorite"]
        ),
        MenuItem(
            id="item-04",
            name="Campus Deluxe Mini Thali",
            description="Paneer butter masala, yellow dal tadka, 3 phulkas, jeera rice, salad & gulab jamun.",
            price=140.0,
            category="Meals & Thalis",
            dietary=DietaryType.VEG,
            image_url="https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=600&q=80",
            prep_time_mins=12,
            calories=680,
            is_available=True,
            stock_quantity=30,
            tags=["Lunch Special", "Full Meal", "Nutritious"]
        ),
        MenuItem(
            id="item-05",
            name="Hyderabadi Chicken Dum Biryani",
            description="Fragrant basmati rice layered with marinated tender chicken and rich spices, served with cooling raita & salan.",
            price=170.0,
            category="Meals & Thalis",
            dietary=DietaryType.NON_VEG,
            image_url="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80",
            prep_time_mins=10,
            calories=720,
            is_available=True,
            stock_quantity=20,
            tags=["Chef's Special", "High Protein", "Bestseller"]
        ),
        MenuItem(
            id="item-06",
            name="Homestyle Rajma Chawal Bowl",
            description="Slow-cooked kidney beans in rich onion-tomato gravy served over aromatic steamed basmati rice with pickle.",
            price=90.0,
            category="Meals & Thalis",
            dietary=DietaryType.VEG,
            image_url="https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80",
            prep_time_mins=6,
            calories=480,
            is_available=True,
            stock_quantity=18,
            tags=["Comfort Food", "Pocket Friendly"]
        ),
        MenuItem(
            id="item-07",
            name="Astra Crunchy Zinger Burger",
            description="Crispy herb patty with melted cheese slice, lettuce, caramelized onions, and signature secret spicy mayo.",
            price=95.0,
            category="Quick Bites",
            dietary=DietaryType.VEG,
            image_url="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
            prep_time_mins=7,
            calories=450,
            is_available=True,
            stock_quantity=22,
            tags=["Trending", "Fast Food"]
        ),
        MenuItem(
            id="item-08",
            name="Smoked Paneer Tikka Kathi Roll",
            description="Charcoal grilled spiced cottage cheese chunks wrapped in flaky paratha with mint relish & crunchy rings.",
            price=110.0,
            category="Quick Bites",
            dietary=DietaryType.VEG,
            image_url="https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80",
            prep_time_mins=9,
            calories=420,
            is_available=True,
            stock_quantity=15,
            tags=["Snacks", "Rolls", "Crowd Favorite"]
        ),
        MenuItem(
            id="item-09",
            name="Delhi Samosa Chaat (2 Pcs)",
            description="Crushed hot potato samosas smothered in chickpea chole, sweet tamarind chutney, spicy green sauce & sev.",
            price=55.0,
            category="Quick Bites",
            dietary=DietaryType.VEG,
            image_url="https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80",
            prep_time_mins=5,
            calories=380,
            is_available=True,
            stock_quantity=40,
            tags=["Street Food", "Spicy"]
        ),
        MenuItem(
            id="item-10",
            name="Thick Iced Cold Coffee Frappe",
            description="Creamy brewed Arabica coffee blended with chilled full-cream milk, dark cocoa dust & vanilla drizzle.",
            price=65.0,
            category="Beverages",
            dietary=DietaryType.VEG,
            image_url="https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80",
            prep_time_mins=4,
            calories=240,
            is_available=True,
            stock_quantity=50,
            tags=["Chilled", "Study Fuel", "Bestseller"]
        ),
        MenuItem(
            id="item-11",
            name="Ginger Elaichi Cutting Chai",
            description="Strong freshly brewed Assam tea infused with fresh crushed ginger and green cardamom pods.",
            price=20.0,
            category="Beverages",
            dietary=DietaryType.VEG,
            image_url="https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80",
            prep_time_mins=3,
            calories=80,
            is_available=True,
            stock_quantity=100,
            tags=["Hot Chai", "Essential"]
        ),
        MenuItem(
            id="item-12",
            name="Fresh Mint Lemon Shikanji",
            description="Energizing chilled lemonade with roasted cumin, black salt, and freshly crushed garden mint leaves.",
            price=35.0,
            category="Beverages",
            dietary=DietaryType.VEG,
            image_url="https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
            prep_time_mins=3,
            calories=90,
            is_available=True,
            stock_quantity=30,
            tags=["Refreshing", "Cooler"]
        )
    ]
    for it in items:
        MENU_DB[it.id] = it

def seed_slots():
    # Dynamically create pickup slots covering next several periods
    slots_data = [
        {"id": "slot-01", "label": "12:15 PM - 12:30 PM", "start": "12:15", "end": "12:30", "capacity": 25, "booked": 18},
        {"id": "slot-02", "label": "12:30 PM - 12:45 PM", "start": "12:30", "end": "12:45", "capacity": 30, "booked": 24},
        {"id": "slot-03", "label": "12:45 PM - 01:00 PM", "start": "12:45", "end": "13:00", "capacity": 30, "booked": 29}, # High crowd
        {"id": "slot-04", "label": "01:00 PM - 01:15 PM", "start": "13:00", "end": "13:15", "capacity": 35, "booked": 14}, # Moderate
        {"id": "slot-05", "label": "01:15 PM - 01:30 PM", "start": "13:15", "end": "13:30", "capacity": 35, "booked": 8},  # Low crowd (ideal)
        {"id": "slot-06", "label": "01:30 PM - 01:45 PM", "start": "13:30", "end": "13:45", "capacity": 30, "booked": 5},  # Low crowd
        {"id": "slot-07", "label": "01:45 PM - 02:00 PM", "start": "13:45", "end": "14:00", "capacity": 25, "booked": 3},  # Low crowd
        {"id": "slot-08", "label": "02:00 PM - 02:15 PM", "start": "14:00", "end": "14:15", "capacity": 25, "booked": 2},
    ]
    for s in slots_data:
        ratio = s["booked"] / s["capacity"]
        if ratio >= 0.8:
            crowd = CrowdLevel.HIGH
        elif ratio >= 0.4:
            crowd = CrowdLevel.MODERATE
        else:
            crowd = CrowdLevel.LOW
        
        SLOTS_DB[s["id"]] = Slot(
            id=s["id"],
            label=s["label"],
            start_time=s["start"],
            end_time=s["end"],
            capacity=s["capacity"],
            booked_count=s["booked"],
            crowd_level=crowd,
            is_available=(s["booked"] < s["capacity"])
        )

def seed_sample_orders():
    global TOKEN_COUNTER
    now = datetime.now()
    
    # Order 1: Ready for Pickup
    o1_id = "ORD-9801"
    token1 = f"#AST-{TOKEN_COUNTER}"
    TOKEN_COUNTER += 1
    o1_items = [
        OrderItemDetail(
            item_id="item-01",
            name="Crispy Masala Dosa",
            price=75.0,
            quantity=1,
            subtotal=75.0,
            dietary=DietaryType.VEG
        ),
        OrderItemDetail(
            item_id="item-10",
            name="Thick Iced Cold Coffee Frappe",
            price=65.0,
            quantity=1,
            subtotal=65.0,
            dietary=DietaryType.VEG
        )
    ]
    subtotal1 = 140.0
    tax1 = round(subtotal1 * 0.05, 2)
    total1 = round(subtotal1 + tax1, 2)
    qr1 = generate_qr_code_base64({
        "order_id": o1_id,
        "token": token1,
        "student": "Rohan Sharma",
        "items": 2,
        "total": total1,
        "slot": "12:30 PM - 12:45 PM"
    })
    
    ORDERS_DB[o1_id] = Order(
        id=o1_id,
        token_number=token1,
        student_name="Rohan Sharma",
        student_id="CS22B104",
        student_phone="9876543210",
        items=o1_items,
        item_count=2,
        subtotal=subtotal1,
        tax=tax1,
        total_amount=total1,
        pickup_slot_id="slot-02",
        pickup_slot_label="12:30 PM - 12:45 PM",
        status=OrderStatus.READY_FOR_PICKUP,
        payment_method=PaymentMethod.UPI_QR,
        payment_status=PaymentStatus.PAID,
        created_at=(now - timedelta(minutes=14)).strftime("%I:%M %p"),
        estimated_ready_time=(now + timedelta(minutes=1)).strftime("%I:%M %p"),
        qr_code_data_uri=qr1,
        special_instructions="Extra coconut chutney please",
        status_updated_at=(now - timedelta(minutes=2)).strftime("%I:%M %p")
    )

    # Order 2: Preparing in Kitchen
    o2_id = "ORD-9802"
    token2 = f"#AST-{TOKEN_COUNTER}"
    TOKEN_COUNTER += 1
    o2_items = [
        OrderItemDetail(
            item_id="item-05",
            name="Hyderabadi Chicken Dum Biryani",
            price=170.0,
            quantity=1,
            subtotal=170.0,
            dietary=DietaryType.NON_VEG
        ),
        OrderItemDetail(
            item_id="item-12",
            name="Fresh Mint Lemon Shikanji",
            price=35.0,
            quantity=1,
            subtotal=35.0,
            dietary=DietaryType.VEG
        )
    ]
    subtotal2 = 205.0
    tax2 = round(subtotal2 * 0.05, 2)
    total2 = round(subtotal2 + tax2, 2)
    qr2 = generate_qr_code_base64({
        "order_id": o2_id,
        "token": token2,
        "student": "Priya Patel",
        "items": 2,
        "total": total2,
        "slot": "12:45 PM - 01:00 PM"
    })
    
    ORDERS_DB[o2_id] = Order(
        id=o2_id,
        token_number=token2,
        student_name="Priya Patel",
        student_id="EC23B042",
        student_phone="9812345678",
        items=o2_items,
        item_count=2,
        subtotal=subtotal2,
        tax=tax2,
        total_amount=total2,
        pickup_slot_id="slot-03",
        pickup_slot_label="12:45 PM - 01:00 PM",
        status=OrderStatus.PREPARING,
        payment_method=PaymentMethod.STUDENT_WALLET,
        payment_status=PaymentStatus.PAID,
        created_at=(now - timedelta(minutes=8)).strftime("%I:%M %p"),
        estimated_ready_time=(now + timedelta(minutes=5)).strftime("%I:%M %p"),
        qr_code_data_uri=qr2,
        special_instructions="Spicy salan",
        status_updated_at=(now - timedelta(minutes=4)).strftime("%I:%M %p")
    )

# Run initial seeds
seed_menu()
seed_slots()
seed_sample_orders()

def get_next_token_number() -> str:
    global TOKEN_COUNTER
    TOKEN_COUNTER += 1
    return f"#AST-{TOKEN_COUNTER}"
