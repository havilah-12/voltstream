import logging

from data.mock_data import mock_db

logger = logging.getLogger("voltstream")


def get_history(period: str):
    logger.info(f"Analytics history requested for period={period}")
    return mock_db["analytics_history"].get(period, [])
