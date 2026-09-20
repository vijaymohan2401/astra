from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum
from datetime import datetime

class DietaryType(str, Enum):
    VEG = "veg"
    NON_VEG = "non-veg"
    EGG = "egg"

class OrderStatus(str, Enum):
    PLACED = "PLACED"
    PREPARING = "PREPARING"
    READY_FOR_PICKUP = "READY_FOR_PICKUP"
    PICKED_UP = "PICKED_UP"
    CANCELLED = "CANCELLED"

class PaymentMethod(str, Enum):
    STUDENT_WALLET = "STUDENT_WALLET"
    UPI_QR = "UPI_QR"
    COUNTER_CASH = "COUNTER_CASH"

class PaymentStatus(str, Enum):
    PAID = "PAID"
    PENDING = "PENDING"

class CrowdLevel(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"

class MenuItem(BaseModel):
    id: str
    name: str
    description: str
    price: float
    category: str
    dietary: DietaryType
    image_url: str
    prep_time_mins: int
    calories: int
    is_available: bool = True
    stock_quantity: int = 50
    tags: List[str] = []

class OrderItemInput(BaseModel):
    item_id: str
    quantity: int = Field(gt=0)
    notes: Optional[str] = None

class OrderItemDetail(BaseModel):
    item_id: str
    name: str
    price: float
    quantity: int
    subtotal: float
    dietary: DietaryType

class CreateOrderRequest(BaseModel):
    student_name: str
    student_id: str
    student_phone: Optional[str] = "9876543210"
    items: List[OrderItemInput]
    pickup_slot_id: str
    payment_method: PaymentMethod = PaymentMethod.UPI_QR
    special_instructions: Optional[str] = ""

class Order(BaseModel):
    id: str
    token_number: str
    student_name: str
    student_id: str
    student_phone: Optional[str] = None
    items: List[OrderItemDetail]
    item_count: int
    subtotal: float
    tax: float
    total_amount: float
    pickup_slot_id: str
    pickup_slot_label: str
    status: OrderStatus = OrderStatus.PLACED
    payment_method: PaymentMethod
    payment_status: PaymentStatus
    created_at: str
    estimated_ready_time: str
    qr_code_data_uri: str
    special_instructions: Optional[str] = ""
    status_updated_at: Optional[str] = None

class StockUpdateRequest(BaseModel):
    is_available: bool
    stock_quantity: Optional[int] = None

class Slot(BaseModel):
    id: str
    label: str
    start_time: str
    end_time: str
    capacity: int = 40
    booked_count: int = 0
    crowd_level: CrowdLevel = CrowdLevel.LOW
    is_available: bool = True

class TokenVerifyRequest(BaseModel):
    token_query: str  # Can be token_number (e.g. #AST-101 or AST-101) or full raw QR text

class TokenVerifyResponse(BaseModel):
    success: bool
    message: str
    order: Optional[Order] = None
    action_taken: Optional[str] = None

class StatusUpdateRequest(BaseModel):
    status: OrderStatus
