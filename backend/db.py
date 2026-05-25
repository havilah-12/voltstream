import sqlite3
from pathlib import Path

from data.mock_data import mock_db

BACKEND_DIR = Path(__file__).resolve().parent
DB_PATH = BACKEND_DIR / "voltstream.sqlite3"


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database() -> None:
    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.executescript(
            """
            CREATE TABLE IF NOT EXISTS dashboard_live (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                grid_draw_kw REAL NOT NULL,
                solar_generation_kw REAL NOT NULL,
                net_usage_kw REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS analytics_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                period TEXT NOT NULL,
                label TEXT NOT NULL,
                grid REAL NOT NULL,
                solar REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS devices (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                name TEXT NOT NULL,
                location TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'OFF',
                power_usage_w INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS billing_summary (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                current_balance REAL NOT NULL,
                projected_bill REAL NOT NULL,
                budget_limit REAL NOT NULL,
                current_grid_data_usage REAL NOT NULL,
                solar_energy_usage REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS invoice_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                month TEXT NOT NULL,
                amount REAL NOT NULL,
                status TEXT NOT NULL,
                invoice_number TEXT NOT NULL
            );
            """
        )
        connection.commit()

    seed_database_if_empty()


def seed_database_if_empty() -> None:
    with get_connection() as connection:
        cursor = connection.cursor()
        has_dashboard = cursor.execute("SELECT 1 FROM dashboard_live WHERE id = 1").fetchone()
        has_history = cursor.execute("SELECT 1 FROM analytics_history LIMIT 1").fetchone()
        has_devices = cursor.execute("SELECT 1 FROM devices LIMIT 1").fetchone()
        has_billing = cursor.execute("SELECT 1 FROM billing_summary WHERE id = 1").fetchone()
        has_invoices = cursor.execute("SELECT 1 FROM invoice_history LIMIT 1").fetchone()

        if not has_dashboard:
            dashboard = mock_db["dashboard_live"]
            cursor.execute(
                """
                INSERT INTO dashboard_live (id, grid_draw_kw, solar_generation_kw, net_usage_kw)
                VALUES (1, ?, ?, ?)
                """,
                (
                    dashboard["grid_draw_kw"],
                    dashboard["solar_generation_kw"],
                    dashboard["net_usage_kw"],
                ),
            )

        if not has_history:
            rows = []
            for period, entries in mock_db["analytics_history"].items():
                for entry in entries:
                    rows.append((period, entry["label"], entry["grid"], entry["solar"]))
            cursor.executemany(
                """
                INSERT INTO analytics_history (period, label, grid, solar)
                VALUES (?, ?, ?, ?)
                """,
                rows,
            )

        if not has_devices:
            rows = [
                (
                    device["id"],
                    device["type"],
                    device["name"],
                    device.get("location", ""),
                    device.get("status", "OFF"),
                    device.get("power_usage_w", 0),
                )
                for device in mock_db["devices"]
            ]
            cursor.executemany(
                """
                INSERT INTO devices (id, type, name, location, status, power_usage_w)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                rows,
            )

        if not has_billing:
            billing = mock_db["billing"]
            cursor.execute(
                """
                INSERT INTO billing_summary (
                    id,
                    current_balance,
                    projected_bill,
                    budget_limit,
                    current_grid_data_usage,
                    solar_energy_usage
                )
                VALUES (1, ?, ?, ?, ?, ?)
                """,
                (
                    billing["current_balance"],
                    billing["projected_bill"],
                    billing["budget_limit"],
                    billing["current_grid_data_usage"],
                    billing["solar_energy_usage"],
                ),
            )

        if not has_invoices:
            rows = [
                (
                    invoice["month"],
                    invoice["amount"],
                    invoice["status"],
                    invoice["invoice_number"],
                )
                for invoice in mock_db["invoice_history"]
            ]
            cursor.executemany(
                """
                INSERT INTO invoice_history (month, amount, status, invoice_number)
                VALUES (?, ?, ?, ?)
                """,
                rows,
            )

        connection.commit()
