import json
from typing import List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.routes import menu, orders, slots, scanner, analytics

app = FastAPI(
    title="Astra Smart Campus Canteen Management System API",
    description="API for student pre-ordering, dynamic QR token passes, scheduled pickup slots, kitchen Kanban, and counter crowd reduction.",
    version="1.0.0"
)

# Allow CORS for local and campus intranet access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active WebSocket connections manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

async def broadcast_websocket_event(event_type: str, data: dict):
    await manager.broadcast({
        "event": event_type,
        "data": data
    })

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo or ping/pong support
            try:
                msg = json.loads(data)
                if msg.get("action") == "ping":
                    await websocket.send_json({"event": "pong"})
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

# Mount Routers
app.include_router(menu.router)
app.include_router(orders.router)
app.include_router(slots.router)
app.include_router(scanner.router)
app.include_router(analytics.router)

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Astra Canteen Engine",
        "active_ws_clients": len(manager.active_connections)
    }
