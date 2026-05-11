from uuid import uuid4

from data.mock_data import mock_db
from schemas.device import DevicePayload, DeviceStatusUpdate


def list_devices():
    return mock_db["devices"]


def create_device(device: DevicePayload):
    slug = device.type.lower().replace(" ", "-")
    new_device = device.model_dump()
    new_device["id"] = f"{slug}-{uuid4().hex[:6]}"
    mock_db["devices"].append(new_device)
    return new_device


def update_device_status(device_id: str, update: DeviceStatusUpdate):
    for device in mock_db["devices"]:
        if device["id"] == device_id:
            device["status"] = update.status
            return device
    return None


def update_device(device_id: str, update: DevicePayload):
    for index, device in enumerate(mock_db["devices"]):
        if device["id"] == device_id:
            updated = update.model_dump()
            updated["id"] = device_id
            mock_db["devices"][index] = updated
            return updated
    return None


def delete_device(device_id: str):
    for index, device in enumerate(mock_db["devices"]):
        if device["id"] == device_id:
            return mock_db["devices"].pop(index)
    return None
