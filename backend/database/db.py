import logging
from google.cloud import firestore
from database.mock_data import mock_db

logger = logging.getLogger("voltstream")

def get_firestore_client() -> firestore.AsyncClient:
    return firestore.AsyncClient(project="voltstreamapp", database="voltstream")

async def initialize_database() -> None:
    await seed_database_if_empty()

async def seed_database_if_empty() -> None:
    db = get_firestore_client()

    # 1. Dashboard
    dash_ref = db.collection("dashboard_live").document("1")
    if not (await dash_ref.get()).exists:
        logger.info("Seeding dashboard_live...")
        await dash_ref.set(mock_db["dashboard_live"])

    # 2. Analytics History
    history_coll = db.collection("analytics_history")
    if len(await history_coll.limit(1).get()) == 0:
        logger.info("Seeding analytics_history...")
        for period, entries in mock_db["analytics_history"].items():
            for entry in entries:
                await history_coll.add({
                    "period": period,
                    "label": entry["label"],
                    "grid": entry["grid"],
                    "solar": entry["solar"]
                })

    # 3. Device Analytics History
    device_history_coll = db.collection("device_analytics_history")
    if "device_analytics_history" in mock_db and len(await device_history_coll.limit(1).get()) == 0:
        logger.info("Seeding device_analytics_history...")
        for period, entries in mock_db["device_analytics_history"].items():
            for entry in entries:
                await device_history_coll.add({
                    "device_name": entry["device_name"],
                    "period": period,
                    "label": entry["label"],
                    "consumption_kwh": entry["consumption_kwh"]
                })

    # 4. Devices
    devices_coll = db.collection("devices")
    if len(await devices_coll.limit(1).get()) == 0:
        logger.info("Seeding devices...")
        for device in mock_db["devices"]:
            await devices_coll.document(device["id"]).set({
                "id": device["id"],
                "type": device["type"],
                "name": device["name"],
                "location": device.get("location", ""),
                "status": device.get("status", "OFF"),
                "power_usage_w": device.get("power_usage_w", 0)
            })

    # 5. Billing
    billing_ref = db.collection("billing_summary").document("1")
    if not (await billing_ref.get()).exists:
        logger.info("Seeding billing_summary...")
        await billing_ref.set(mock_db["billing"])

    # 6. Invoices
    invoices_coll = db.collection("invoice_history")
    if len(await invoices_coll.limit(1).get()) == 0:
        logger.info("Seeding invoice_history...")
        for invoice in mock_db["invoice_history"]:
            await invoices_coll.add({
                "month": invoice["month"],
                "amount": invoice["amount"],
                "status": invoice["status"],
                "invoice_number": invoice["invoice_number"]
            })
