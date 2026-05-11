import logging

from data.mock_data import mock_db

logger = logging.getLogger("voltstream")


def get_live_dashboard():
    logger.info("Dashboard live data requested")
    return mock_db["dashboard_live"]
