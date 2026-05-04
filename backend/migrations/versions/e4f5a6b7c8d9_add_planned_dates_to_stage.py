"""add planned_start_date and planned_end_date to stage

Revision ID: e4f5a6b7c8d9
Revises: d0e1f2a3b4c5
Create Date: 2026-04-20 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'e4f5a6b7c8d9'
down_revision = 'd0e1f2a3b4c5'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('stage', schema=None) as batch_op:
        batch_op.add_column(sa.Column('planned_start_date', sa.Date(), nullable=True))
        batch_op.add_column(sa.Column('planned_end_date', sa.Date(), nullable=True))


def downgrade():
    with op.batch_alter_table('stage', schema=None) as batch_op:
        batch_op.drop_column('planned_end_date')
        batch_op.drop_column('planned_start_date')
