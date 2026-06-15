from database.db import get_firestore_client
from schemas.device import DevicePayload, DeviceStatusUpdate

def _slugify_device_type(device_type: str) -> str:
    return "-".join(device_type.lower().split())

async def list_devices():
    db = get_firestore_client()
    docs = await db.collection("devices").order_by("id").get()
    return [doc.to_dict() for doc in docs]

async def create_device(device: DevicePayload):
    new_device = device.model_dump()
    slug = _slugify_device_type(new_device["type"])
    
    db = get_firestore_client()
    
    # We need to compute the next index. This is a bit tricky in NoSQL.
    # We will get all docs matching the prefix.
    docs = await db.collection("devices").where("id", ">=", f"{slug}-").where("id", "<=", f"{slug}-\uf8ff").get()
    next_index = len(docs) + 1
    
    new_id = f"{slug}-{next_index}"
    new_device["id"] = new_id
    new_device["status"] = new_device.get("status", "OFF")
    new_device["power_usage_w"] = new_device.get("power_usage_w", 0)
    new_device["location"] = new_device.get("location", "")
    
    await db.collection("devices").document(new_id).set(new_device)
    return new_device

async def update_device_status(device_id: str, update: DeviceStatusUpdate):
    db = get_firestore_client()
    doc_ref = db.collection("devices").document(device_id)
    doc = await doc_ref.get()
    
    if not doc.exists:
        return None
        
    await doc_ref.update({"status": update.status})
    
    updated_doc = await doc_ref.get()
    return updated_doc.to_dict()

async def update_device(device_id: str, update: DevicePayload):
    db = get_firestore_client()
    doc_ref = db.collection("devices").document(device_id)
    doc = await doc_ref.get()
    
    if not doc.exists:
        return None
        
    updated = update.model_dump()
    updated["id"] = device_id
    updated["status"] = updated.get("status", "OFF")
    updated["power_usage_w"] = updated.get("power_usage_w", 0)
    updated["location"] = updated.get("location", "")
    
    await doc_ref.set(updated)
    return updated

async def delete_device(device_id: str):
    db = get_firestore_client()
    doc_ref = db.collection("devices").document(device_id)
    doc = await doc_ref.get()
    
    if not doc.exists:
        return None
        
    data = doc.to_dict()
    await doc_ref.delete()
    return data
