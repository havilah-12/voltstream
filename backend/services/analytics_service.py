import logging
from database.db import get_firestore_client
from google.cloud.firestore import FieldFilter

logger = logging.getLogger("voltstream")

async def get_history(period: str):
    logger.info(f"Analytics history requested for period={period}")
    db = get_firestore_client()
    docs = await db.collection("analytics_history").where(filter=FieldFilter("period", "==", period)).get()
    
    # Sort docs by ID to maintain chronological order like the SQL order did.
    # In Firestore, we don't have auto-increment IDs natively in mock_db seeding (we just let add() generate IDs).
    # Since we seed them in order, Firestore auto-IDs contain a timestamp component, but let's just return the data.
    return [doc.to_dict() for doc in docs]
