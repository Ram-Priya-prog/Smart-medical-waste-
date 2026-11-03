import json
import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websocket.connection_manager import ws_manager
from app.database import SessionLocal
from app.models.location import CollectorLocation
from app.models.pickup import PickupRequest

router = APIRouter(tags=["WebSocket Realtime GPS"])

@router.websocket("/ws/location/{pickup_id}")
async def websocket_location_endpoint(websocket: WebSocket, pickup_id: int):
    """
    WebSocket endpoint for real-time live GPS streaming during active pickup.
    - Collector sends periodic GPS coordinate packets.
    - Server broadcasts coordinate packets to Hospital and Admin dashboards listening to this pickup_id.
    """
    await ws_manager.connect(pickup_id, websocket)
    try:
        while True:
            raw_data = await websocket.receive_text()
            try:
                msg = json.loads(raw_data)
                
                # If this is a location update from collector
                if msg.get("type") == "LOCATION_UPDATE" or ("latitude" in msg and "longitude" in msg):
                    lat = float(msg["latitude"])
                    lon = float(msg["longitude"])
                    collector_id = msg.get("collector_id")

                    # Persist location to DB asynchronously
                    db = SessionLocal()
                    try:
                        loc = CollectorLocation(
                            collector_id=collector_id or 1,
                            pickup_id=pickup_id,
                            latitude=lat,
                            longitude=lon
                        )
                        db.add(loc)
                        db.commit()
                    except Exception as e:
                        db.rollback()
                        print(f"[WebSocket DB Error] {e}")
                    finally:
                        db.close()

                    # Broadcast payload to all listeners (Hospital & Admin)
                    payload = {
                        "type": "LOCATION_UPDATE",
                        "pickup_id": pickup_id,
                        "collector_id": collector_id,
                        "collector_name": msg.get("collector_name", "Collector"),
                        "latitude": lat,
                        "longitude": lon,
                        "timestamp": datetime.datetime.utcnow().isoformat()
                    }
                    await ws_manager.broadcast_location(pickup_id, payload)

            except json.JSONDecodeError:
                pass
            except Exception as e:
                print(f"[WebSocket Processing Error] {e}")

    except WebSocketDisconnect:
        ws_manager.disconnect(pickup_id, websocket)
    except Exception as e:
        print(f"[WebSocket Fatal Error] {e}")
        ws_manager.disconnect(pickup_id, websocket)
