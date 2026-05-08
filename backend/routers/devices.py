from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from mock_data import mock_db
from uuid import uuid4

router = APIRouter()

class DeviceStatusUpdate(BaseModel):
    status: str

class DevicePayload(BaseModel):
    type: str
    name: str
    location: str = ""
    status: str = "OFF"
    power_usage_w: int = 0

@router.get("/")
def get_devices():
    return mock_db["devices"]

@router.post("/", include_in_schema=False)
def create_device(device: DevicePayload):
    slug = device.type.lower().replace(" ", "-")
    new_device = device.model_dump()
    new_device["id"] = f"{slug}-{uuid4().hex[:6]}"
    mock_db["devices"].append(new_device)
    return new_device

@router.patch("/{id}")
def update_device_status(id: str, update: DeviceStatusUpdate):
    for device in mock_db["devices"]:
        if device["id"] == id:
            device["status"] = update.status
            return device
    raise HTTPException(status_code=404, detail="Device not found")

@router.put("/{id}", include_in_schema=False)
def update_device(id: str, update: DevicePayload):
    for index, device in enumerate(mock_db["devices"]):
        if device["id"] == id:
            updated = update.model_dump()
            updated["id"] = id
            mock_db["devices"][index] = updated
            return updated
    raise HTTPException(status_code=404, detail="Device not found")

@router.delete("/{id}", include_in_schema=False)
def delete_device(id: str):
    for index, device in enumerate(mock_db["devices"]):
        if device["id"] == id:
            return mock_db["devices"].pop(index)
    raise HTTPException(status_code=404, detail="Device not found")
