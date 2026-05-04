"""
Run once to apply new columns and tables to the existing SQLite database.
Usage: python db_upgrade.py
"""
import sys
sys.path.insert(0, ".")

from app import create_app
from app.extensions import db
from sqlalchemy import text, inspect

app = create_app()

with app.app_context():
    inspector = inspect(db.engine)
    existing_stage_cols = {c["name"] for c in inspector.get_columns("stage")}

    with db.engine.connect() as conn:
        for col in ("planned_start_date", "planned_end_date"):
            if col not in existing_stage_cols:
                conn.execute(text(f"ALTER TABLE stage ADD COLUMN {col} DATE"))
                print(f"  + stage.{col}")
        conn.commit()

    # Create all new tables — safe to call multiple times
    from app.models import Budget, Task, Project, Document  # noqa: ensure mapped
    db.create_all()

    print("Database upgrade complete.")
