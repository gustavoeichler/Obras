"""add project_id to task

Revision ID: b7d2e4f10c83
Revises: a3f1c9e20b47
Create Date: 2026-03-30 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'b7d2e4f10c83'
down_revision = 'a3f1c9e20b47'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('task', schema=None) as batch_op:
        batch_op.add_column(sa.Column('project_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_task_project_id', 'project',
            ['project_id'], ['id'],
            ondelete='CASCADE',
        )


def downgrade():
    with op.batch_alter_table('task', schema=None) as batch_op:
        batch_op.drop_constraint('fk_task_project_id', type_='foreignkey')
        batch_op.drop_column('project_id')
