"""add whitelabel branding fields to users

Revision ID: d8e2a1c7b903
Revises: ba5d2ab1a1a9
Create Date: 2026-05-12 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'd8e2a1c7b903'
down_revision = 'ba5d2ab1a1a9'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('brand_name', sa.String(length=80), nullable=True))
        batch_op.add_column(sa.Column('brand_color_primary', sa.String(length=7), nullable=True))
        batch_op.add_column(sa.Column('brand_default_theme', sa.String(length=10), nullable=True))
        batch_op.add_column(sa.Column('theme_preference', sa.String(length=10), nullable=True))


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('theme_preference')
        batch_op.drop_column('brand_default_theme')
        batch_op.drop_column('brand_color_primary')
        batch_op.drop_column('brand_name')
