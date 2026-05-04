"""add workflow features to stages

Revision ID: d0e1f2a3b4c5
Revises: 1ab809f48142
Create Date: 2026-04-20 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'd0e1f2a3b4c5'
down_revision = '1ab809f48142'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Add workflow columns to stage table
    with op.batch_alter_table('stage', schema=None) as batch_op:
        batch_op.add_column(sa.Column('order', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('parent_stage_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('is_locked', sa.Boolean(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('completion_pct', sa.Integer(), nullable=False, server_default='0'))
        batch_op.create_foreign_key(
            'fk_stage_parent_stage_id', 'stage',
            ['parent_stage_id'], ['id'],
            ondelete='SET NULL',
        )
        batch_op.create_index('ix_stage_order', ['order'])
        batch_op.create_index('ix_stage_parent_stage_id', ['parent_stage_id'])

    # 2. Add payment_milestone_pct to budget table
    with op.batch_alter_table('budget', schema=None) as batch_op:
        batch_op.add_column(sa.Column('payment_milestone_pct', sa.Float(), nullable=False, server_default='100.0'))

    # 3. Create stage_checklist_item table
    op.create_table(
        'stage_checklist_item',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('stage_id', sa.Integer(), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=False),
        sa.Column('is_completed', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('completed_by_user_id', sa.Integer(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['stage_id'], ['stage.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['completed_by_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_stage_checklist_item_stage_id', 'stage_checklist_item', ['stage_id'])

    # 4. Create stage_approval table
    op.create_table(
        'stage_approval',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('stage_id', sa.Integer(), nullable=False),
        sa.Column('required_role', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('approved_by_user_id', sa.Integer(), nullable=True),
        sa.Column('approval_date', sa.DateTime(), nullable=True),
        sa.Column('rejection_reason', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['stage_id'], ['stage.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['approved_by_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_stage_approval_stage_id', 'stage_approval', ['stage_id'])


def downgrade():
    # Drop indexes
    op.drop_index('ix_stage_approval_stage_id', table_name='stage_approval')
    op.drop_table('stage_approval')
    
    op.drop_index('ix_stage_checklist_item_stage_id', table_name='stage_checklist_item')
    op.drop_table('stage_checklist_item')
    
    with op.batch_alter_table('budget', schema=None) as batch_op:
        batch_op.drop_column('payment_milestone_pct')
    
    with op.batch_alter_table('stage', schema=None) as batch_op:
        batch_op.drop_index('ix_stage_parent_stage_id')
        batch_op.drop_index('ix_stage_order')
        batch_op.drop_constraint('fk_stage_parent_stage_id', type_='foreignkey')
        batch_op.drop_column('completion_pct')
        batch_op.drop_column('is_locked')
        batch_op.drop_column('parent_stage_id')
        batch_op.drop_column('order')
