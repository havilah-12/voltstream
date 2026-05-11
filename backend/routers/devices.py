from fastapi import APIRouter, HTTPException
from schemas.device import DevicePayload, DeviceStatusUpdate
from services import device_service

router = APIRouter()

@router.get("/")
def get_devices():
    return device_service.list_devices()

@router.post("/", include_in_schema=False)
def create_device(device: DevicePayload):
    return device_service.create_device(device)

@router.patch("/{id}")
def update_device_status(id: str, update: DeviceStatusUpdate):
    device = device_service.update_device_status(id, update)
    if device:
        return device
    raise HTTPException(status_code=404, detail="Device not found")

@router.put("/{id}", include_in_schema=False)
def update_device(id: str, update: DevicePayload):
    device = device_service.update_device(id, update)
    if device:
        return device
    raise HTTPException(status_code=404, detail="Device not found")

@router.delete("/{id}", include_in_schema=False)
def delete_device(id: str):
    device = device_service.delete_device(id)
    if device:
        return device
    raise HTTPException(status_code=404, detail="Device not found")
