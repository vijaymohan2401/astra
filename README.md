# Astra Canteen — Smart Campus Food Ordering & Crowd Reduction System

> **Eliminating Canteen Counter Crowds with Pre-Orders, Staggered Scheduled Slots, Real-Time Kitchen Kanban, and High-Speed QR Pickup Passes.**

---

## The Problem
During college lunch hours and class breaks, hundreds of students converge simultaneously on the canteen counter, causing:
1. **Severe Congestion & Uncontrolled Traffic:** 20-30 minute standing queues where students jostle at the counter to place orders, pay cash, and wait for food.
2. **Food Availability Disappointment:** Students queue up only to discover their desired dish is out of stock.
3. **Kitchen Inefficiency:** Kitchen staff receive ad-hoc orders with zero pacing, leading to food prep bottlenecks.
4. **Counter Handoff Delay:** Checking paper tokens and matching paper receipts slows down pickup to 2-3 minutes per student.

---

## The Astra Solution & Key Features

```
[Student Phone / Laptop]                               [Kitchen & Counter Stations]
   │                                                        │
   ├── 1. Browse Live Categorized Menu & Veg/Non-Veg Tags   │
   ├── 2. Live Stock Availability (Instant Out-of-Stock) ───┼── Real-time Stock Toggle
   ├── 3. Pick Staggered Slot (Visual Crowd Density)        │
   ├── 4. Instant Digital Bill & Auto-Calculated GST        │
   ├── 5. Generated Base64 Scannable QR Token Pass          │
   │                                                        │
   └── 6. Real-Time Status Tracker (Placed ➔ Prep ➔ Ready) ──┼── 1-Click Kanban Progression
                                                            │
                                                            └── 7. Counter Camera / Token Scanner
                                                                   Instant ~30s Verification & Pickup!
```

### 1. Separate Subfolders Architecture
- **`backend/`**: Built with Python **FastAPI**, **Uvicorn**, **Pydantic**, and **WebSockets**. Handles RESTful endpoints, QR code generation, order tracking, real-time event broadcasting, and token validation.
- **`frontend/`**: Modern Vanilla HTML5, CSS3, and JavaScript application featuring glassmorphism dark mode, interactive cart, scheduled slot selector, airport boarding-pass style digital pickup voucher, kitchen Kanban, counter scanner, inventory manager, and crowd analytics.

### 2. Feature Breakdown
- **Dynamic Scannable QR Token**: High-contrast, anti-fraud encoded QR pass containing token ID (`#AST-101`), order details, and pickup slot.
- **Staggered Pickup Slots**: Color-coded crowd density heatmap (🟢 Low Crowd / 🟡 Moderate / 🔴 Peak Traffic) encouraging students to select non-congested 15-minute intervals.
- **Real-Time Live Status Tracking**: Multi-step visual progress bar (`Placed` ➔ `In Kitchen Cooking` ➔ `Ready at Counter` ➔ `Picked Up`) updating in real-time without page reload via WebSockets.
- **Kitchen Kanban Order Board**: 4-column live board with preparation elapsed timers, item quantities, cooking notes, and 1-click status advancement.
- **Counter Fast-Track Scanner**: Counter staff optical camera reticle and manual token validator with instant checkmark, item handover checklist, and anti-duplicate redemption protection.
- **Live Stock & Inventory Manager**: Kitchen staff can toggle items between "In Stock" and "Sold Out" in 1 tap, instantly preventing orders for exhausted ingredients.
- **Synthesized Audio Chimes**: Web Audio API-powered chime chords (incoming order alert for kitchen, ready fanfare for student, success tone for scanner) with zero external audio file dependencies.
- **Crowd & Queue Analytics**: Live counter traffic meter, active queue load, bottleneck reduction rate (82.5% time saved), and popular dishes leaderboard.

---

## Quick Start Guide

### Prerequisites
- Python 3.10+ (Verified on Python 3.14)
- Web browser (Chrome, Edge, Firefox, Safari)

### 1. Install Backend Dependencies
```bash
cd backend
python -m pip install -r requirements.txt
```

### 2. Start the Backend API Server
```bash
cd backend
python run_server.py
```
> The API will be available at: **http://127.0.0.1:8000**
> Interactive Swagger API Docs: **http://127.0.0.1:8000/docs**

### 3. Launch the Frontend
You can open `frontend/index.html` directly in any modern browser or serve it via Python's built-in static server:
```bash
cd frontend
python -m http.server 3000
```
Open **http://127.0.0.1:3000** in your browser.

---

## API Documentation Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/menu` | List menu items with optional category, dietary, search filters |
| `PATCH` | `/api/menu/{id}/stock` | Update dish availability & remaining portion count |
| `GET` | `/api/slots` | List pickup slots with calculated crowd density levels |
| `POST` | `/api/orders` | Place order, calculate itemized bill, generate QR token |
| `GET` | `/api/orders` | List canteen orders |
| `GET` | `/api/orders/{id}` | Fetch specific order details & QR code |
| `PATCH` | `/api/orders/{id}/status` | Advance status (`PLACED` ➔ `PREPARING` ➔ `READY` ➔ `PICKED_UP`) |
| `POST` | `/api/scanner/verify` | Counter staff QR verification and duplicate prevention |
| `GET` | `/api/analytics` | Live queue metrics, bottleneck reduction, popular dishes |
| `WS` | `/ws` | WebSocket for real-time order alerts & status broadcasts |
