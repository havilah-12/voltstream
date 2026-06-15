from database.db import get_firestore_client

async def get_live_dashboard():
    db = get_firestore_client()
    doc = await db.collection("dashboard_live").document("1").get()
    if doc.exists:
        data = doc.to_dict()
        # Ensure we don't send the ID if it was stored
        data.pop("id", None)
        return data
    return {}
