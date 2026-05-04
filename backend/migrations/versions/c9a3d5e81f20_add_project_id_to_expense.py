"""add project_id to expense

Revision ID: c9a3d5e81f20
Revises: b7d2e4f10c83
Create Date: 2026-03-30 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'c9a3d5e81f20'
down_revision = 'b7d2e4f10c83'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('expense', schema=None) as batch_op:
        batch_op.add_column(sa.Column('project_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_expense_project_id', 'project',
            ['project_id'], ['id'],
            ondelete='CASCADE',
        )
        batch_op.create_index('ix_expense_project_id', ['project_id'])


def downgrade():
    with op.batch_alter_table('expense', schema=None) as batch_op:
        batch_op.drop_index('ix_expense_project_id')
        batch_op.drop_constraint('fk_expense_project_id', type_='foreignkey')
        batch_op.drop_column('project_id')
