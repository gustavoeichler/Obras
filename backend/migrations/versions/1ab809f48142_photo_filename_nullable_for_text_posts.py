"""photo filename nullable for text posts

Revision ID: 1ab809f48142
Revises: c9a3d5e81f20
Create Date: 2026-03-30 13:21:55.834868

"""
from alembic import op
import sqlalchemy as sa


revision = '1ab809f48142'
down_revision = 'c9a3d5e81f20'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('photos', schema=None) as batch_op:
        batch_op.alter_column('filename',
               existing_type=sa.VARCHAR(length=255),
               nullable=True)


def downgrade():
    with op.batch_alter_table('photos', schema=None) as batch_op:
        batch_op.alter_column('filename',
               existing_type=sa.VARCHAR(length=255),
               nullable=False)
