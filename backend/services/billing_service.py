from database.db import get_firestore_client

async def get_billing_summary():
    db = get_firestore_client()
    doc = await db.collection("billing_summary").document("1").get()
    if doc.exists:
        data = doc.to_dict()
        data.pop("id", None)
        return data
    return {}
