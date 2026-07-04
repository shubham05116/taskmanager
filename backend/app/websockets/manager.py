import json
import logging
from typing import Dict, List
from fastapi import WebSocket, WebSocketDisconnect, APIRouter, Query
from app.core.security import decode_token

logger = logging.getLogger(__name__)
websocket_router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.project_connections: Dict[int, List[Dict]] = {}
        self.user_connections: Dict[int, List[WebSocket]] = {}

    async def connect_project(self, websocket: WebSocket, user_id: int, project_id: int):
        await websocket.accept()
        if project_id not in self.project_connections:
            self.project_connections[project_id] = []
        self.project_connections[project_id].append({"ws": websocket, "user_id": user_id})
        if user_id not in self.user_connections:
            self.user_connections[user_id] = []
        self.user_connections[user_id].append(websocket)

    async def connect_user(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.user_connections:
            self.user_connections[user_id] = []
        self.user_connections[user_id].append(websocket)

    def disconnect_project(self, websocket: WebSocket, user_id: int, project_id: int):
        if project_id in self.project_connections:
            self.project_connections[project_id] = [
                c for c in self.project_connections[project_id] if c["ws"] != websocket
            ]
        if user_id in self.user_connections:
            self.user_connections[user_id] = [
                ws for ws in self.user_connections[user_id] if ws != websocket
            ]

    def disconnect_user(self, websocket: WebSocket, user_id: int):
        if user_id in self.user_connections:
            self.user_connections[user_id] = [
                ws for ws in self.user_connections[user_id] if ws != websocket
            ]

    async def broadcast_to_project(self, project_id: int, message: dict):
        if project_id not in self.project_connections:
            return
        dead = []
        for conn in self.project_connections[project_id]:
            try:
                await conn["ws"].send_json(message)
            except Exception:
                dead.append(conn)
        for d in dead:
            self.project_connections[project_id].remove(d)

    async def send_to_user(self, user_id: int, message: dict):
        if user_id not in self.user_connections:
            return
        dead = []
        for ws in self.user_connections[user_id]:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for d in dead:
            self.user_connections[user_id].remove(d)

    def get_online_users(self, project_id: int) -> List[int]:
        if project_id not in self.project_connections:
            return []
        return list(set(c["user_id"] for c in self.project_connections[project_id]))


ws_manager = ConnectionManager()


@websocket_router.websocket("/ws/{project_id}")
async def project_websocket(
    websocket: WebSocket,
    project_id: int,
    token: str = Query(...),
):
    try:
        payload = decode_token(token)
        user_id = int(payload.get("sub"))
    except Exception:
        await websocket.close(code=4001, reason="Invalid token")
        return

    await ws_manager.connect_project(websocket, user_id, project_id)
    await ws_manager.broadcast_to_project(project_id, {
        "event": "user_joined",
        "user_id": user_id,
        "online_users": ws_manager.get_online_users(project_id),
    })

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                elif msg.get("type") == "typing":
                    await ws_manager.broadcast_to_project(project_id, {
                        "event": "user_typing",
                        "user_id": user_id,
                        "task_id": msg.get("task_id"),
                    })
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect_project(websocket, user_id, project_id)
        await ws_manager.broadcast_to_project(project_id, {
            "event": "user_left",
            "user_id": user_id,
            "online_users": ws_manager.get_online_users(project_id),
        })


@websocket_router.websocket("/ws/user/{user_id}")
async def user_websocket(
    websocket: WebSocket,
    user_id: int,
    token: str = Query(...),
):
    try:
        payload = decode_token(token)
        if int(payload.get("sub")) != user_id:
            await websocket.close(code=4003, reason="Forbidden")
            return
    except Exception:
        await websocket.close(code=4001, reason="Invalid token")
        return

    await ws_manager.connect_user(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect_user(websocket, user_id)
