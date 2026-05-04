"""add project_id and planned dates to stage

Revision ID: a3f1c9e20b47
Revises: ca2b670f5fff
Create Date: 2026-03-30 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'a3f1c9e20b47'
down_revision = 'ca2b670f5fff'
branch_labels = None
depends_on = None


def upgrade():
    # planned_start_date and planned_end_date already exist in the DB;
    # only project_id (with its FK) needs to be added.
    with op.batch_alter_table('stage', schema=None) as batch_op:
        batch_op.add_column(sa.Column('project_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_stage_project_id', 'project',
            ['project_id'], ['id'],
            ondelete='CASCADE',
        )


def downgrade():
    with op.batch_alter_table('stage', schema=None) as batch_op:
        batch_op.drop_constraint('fk_stage_project_id', type_='foreignkey')
        batch_op.drop_column('project_id')
