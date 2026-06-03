import logging

from database.db import get_connection

logger = logging.getLogger("voltstream")


def get_history(period: str):
    logger.info(f"Analytics history requested for period={period}")
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT label, grid, solar
            FROM analytics_history
            WHERE period = ?
            ORDER BY id
            """,
            (period,),
        ).fetchall()
    return [dict(row) for row in rows]
