from db import get_connection


def get_live_dashboard():
    with get_connection() as connection:
        row = connection.execute(
            "SELECT grid_draw_kw, solar_generation_kw, net_usage_kw FROM dashboard_live WHERE id = 1"
        ).fetchone()
    return dict(row) if row else {}
