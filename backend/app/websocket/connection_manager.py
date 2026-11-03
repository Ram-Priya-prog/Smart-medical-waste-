import json
from typing import Dict, List, Any
from fastapi import WebSocket

class LocationConnectionManager:
    def __init__(self):
        # pickup_id -> List[WebSocket]
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # pickup_id -> latest location data
        self.latest_locations: Dict[int, Dict[str, Any]] = {}

    async def connect(self, pickup_id: int, websocket: WebSocket):
        await websocket.accept()
        if pickup_id not in self.active_connections:
            self.active_connections[pickup_id] = []
        self.active_connections[pickup_id].append(websocket)
        print(f"[WebSocket] Client connected to pickup #{pickup_id}. Total listeners: {len(self.active_connections[pickup_id])}")
        
        # Send latest known location immediately on connection if available
        if pickup_id in self.latest_locations:
            try:
                await websocket.send_text(json.dumps(self.latest_locations[pickup_id]))
            except Exception:
                pass

    def disconnect(self, pickup_id: int, websocket: WebSocket):
        if pickup_id in self.active_connections:
            if websocket in self.active_connections[pickup_id]:
                self.active_connections[pickup_id].remove(websocket)
            if not self.active_connections[pickup_id]:
                del self.active_connections[pickup_id]
        print(f"[WebSocket] Client disconnected from pickup #{pickup_id}")

    async def broadcast_location(self, pickup_id: int, data: Dict[str, Any]):
        self.latest_locations[pickup_id] = data
        if pickup_id in self.active_connections:
            dead_connections = []
            message_text = json.dumps(data)
            for connection in self.active_connections[pickup_id]:
                try:
                    await connection.send_text(message_text)
                except Exception:
                    dead_connections.append(connection)
            
            for dead in dead_connections:
                self.disconnect(pickup_id, dead)

ws_manager = LocationConnectionManager()
