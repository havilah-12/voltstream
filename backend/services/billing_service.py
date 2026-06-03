from database.db import get_connection


def get_billing_summary():
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT
                current_balance,
                projected_bill,
                budget_limit,
                current_grid_data_usage,
                solar_energy_usage
            FROM billing_summary
            WHERE id = 1
            """
        ).fetchone()
    return dict(row) if row else {}
