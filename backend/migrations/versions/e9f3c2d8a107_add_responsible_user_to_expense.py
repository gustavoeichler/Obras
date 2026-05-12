"""add responsible_user_id to expense

Revision ID: e9f3c2d8a107
Revises: d8e2a1c7b903
Create Date: 2026-05-12 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'e9f3c2d8a107'
down_revision = 'd8e2a1c7b903'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('expense', schema=None) as batch_op:
        batch_op.add_column(sa.Column('responsible_user_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_expense_responsible_user', 'users',
            ['responsible_user_id'], ['id'],
            ondelete='SET NULL',
        )


def downgrade():
    with op.batch_alter_table('expense', schema=None) as batch_op:
        batch_op.drop_constraint('fk_expense_responsible_user', type_='foreignkey')
        batch_op.drop_column('responsible_user_id')
