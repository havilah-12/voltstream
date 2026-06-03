
from database.db import get_connection
from schemas.device import DevicePayload, DeviceStatusUpdate


def _slugify_device_type(device_type: str) -> str:
    return "-".join(device_type.lower().split())


def _next_device_index(connection, slug: str) -> int:
    row = connection.execute(
        "SELECT COUNT(*) FROM devices WHERE id LIKE ?",
        (f"{slug}-%",),
    ).fetchone()
    return (row[0] if row else 0) + 1


def list_devices():
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, type, name, location, status, power_usage_w
            FROM devices
            ORDER BY id
            """
        ).fetchall()
    return [dict(row) for row in rows]


def create_device(device: DevicePayload):
    new_device = device.model_dump()
    slug = _slugify_device_type(new_device["type"])

    with get_connection() as connection:
        new_device["id"] = f"{slug}-{_next_device_index(connection, slug)}"
        connection.execute(
            """
            INSERT INTO devices (id, type, name, location, status, power_usage_w)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                new_device["id"],
                new_device["type"],
                new_device["name"],
                new_device.get("location", ""),
                new_device.get("status", "OFF"),
                new_device.get("power_usage_w", 0),
            ),
        )
        connection.commit()
    return new_device


def update_device_status(device_id: str, update: DeviceStatusUpdate):
    with get_connection() as connection:
        cursor = connection.execute(
            """
            UPDATE devices
            SET status = ?
            WHERE id = ?
            """,
            (update.status, device_id),
        )
        if cursor.rowcount == 0:
            return None
        connection.commit()
        row = connection.execute(
            """
            SELECT id, type, name, location, status, power_usage_w
            FROM devices
            WHERE id = ?
            """,
            (device_id,),
        ).fetchone()
    return dict(row) if row else None


def update_device(device_id: str, update: DevicePayload):
    updated = update.model_dump()
    updated["id"] = device_id

    with get_connection() as connection:
        cursor = connection.execute(
            """
            UPDATE devices
            SET type = ?, name = ?, location = ?, status = ?, power_usage_w = ?
            WHERE id = ?
            """,
            (
                updated["type"],
                updated["name"],
                updated.get("location", ""),
                updated.get("status", "OFF"),
                updated.get("power_usage_w", 0),
                device_id,
            ),
        )
        if cursor.rowcount == 0:
            return None
        connection.commit()
    return updated


def delete_device(device_id: str):
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT id, type, name, location, status, power_usage_w
            FROM devices
            WHERE id = ?
            """,
            (device_id,),
        ).fetchone()
        if row is None:
            return None
        connection.execute("DELETE FROM devices WHERE id = ?", (device_id,))
        connection.commit()
    return dict(row)
