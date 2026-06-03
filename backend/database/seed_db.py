from database.db import DB_PATH, initialize_database


def main() -> None:
    if DB_PATH.exists():
        DB_PATH.unlink()
    initialize_database()
    print(f"Seeded SQLite database at {DB_PATH}")


if __name__ == "__main__":
    main()
