"""add phase 1 acquisition features (RDO, supplier price observations, project geo, user logo)

Revision ID: f9c1a2b34501
Revises: 521128d59142
Create Date: 2026-05-03 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = 'f9c1a2b34501'
down_revision = '521128d59142'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Project: lat/lon/location
    with op.batch_alter_table('project', schema=None) as batch_op:
        batch_op.add_column(sa.Column('lat',      sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('lon',      sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('location', sa.String(length=120), nullable=True))

    # 2. User: logo_path
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('logo_path', sa.String(length=255), nullable=True))

    # 3. Expense: quantity / unit
    with op.batch_alter_table('expense', schema=None) as batch_op:
        batch_op.add_column(sa.Column('quantity', sa.Float(),         nullable=True))
        batch_op.add_column(sa.Column('unit',     sa.String(length=20), nullable=True))

    # 4. daily_report
    op.create_table(
        'daily_report',
        sa.Column('id',                 sa.Integer(),  nullable=False),
        sa.Column('project_id',         sa.Integer(),  nullable=False),
        sa.Column('report_date',        sa.Date(),     nullable=False),
        sa.Column('weather',            sa.String(length=80), nullable=True),
        sa.Column('weather_temp_c',     sa.Float(),    nullable=True),
        sa.Column('headcount_json',     sa.JSON(),     nullable=True),
        sa.Column('notes',              sa.Text(),     nullable=True),
        sa.Column('created_by_user_id', sa.Integer(),  nullable=True),
        sa.Column('pdf_document_id',    sa.Integer(),  nullable=True),
        sa.Column('created_at',         sa.DateTime(), nullable=False),
        sa.Column('updated_at',         sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'],         ['project.id'],   ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'],     ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['pdf_document_id'],    ['document.id'],  ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('project_id', 'report_date', name='uq_daily_report_project_date'),
    )
    op.create_index('ix_daily_report_project_id',  'daily_report', ['project_id'])
    op.create_index('ix_daily_report_report_date', 'daily_report', ['report_date'])

    # 5. daily_report_occurrence
    op.create_table(
        'daily_report_occurrence',
        sa.Column('id',              sa.Integer(),  nullable=False),
        sa.Column('daily_report_id', sa.Integer(),  nullable=False),
        sa.Column('kind',            sa.String(length=30),  nullable=False),
        sa.Column('description',     sa.Text(),     nullable=False),
        sa.Column('stage_id',        sa.Integer(),  nullable=True),
        sa.Column('task_id',         sa.Integer(),  nullable=True),
        sa.Column('created_at',      sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['daily_report_id'], ['daily_report.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['stage_id'],        ['stage.id'],        ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['task_id'],         ['task.id'],         ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_daily_report_occurrence_daily_report_id',
                    'daily_report_occurrence', ['daily_report_id'])

    # 6. photos: daily_report_id
    with op.batch_alter_table('photos', schema=None) as batch_op:
        batch_op.add_column(sa.Column('daily_report_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_photos_daily_report_id', 'daily_report',
            ['daily_report_id'], ['id'],
            ondelete='SET NULL',
        )
        batch_op.create_index('ix_photos_daily_report_id', ['daily_report_id'])

    # 7. supplier_price_observation
    op.create_table(
        'supplier_price_observation',
        sa.Column('id',              sa.Integer(),  nullable=False),
        sa.Column('expense_id',      sa.Integer(),  nullable=False),
        sa.Column('professional_id', sa.Integer(),  nullable=False),
        sa.Column('category_id',     sa.Integer(),  nullable=True),
        sa.Column('supplier_id',     sa.Integer(),  nullable=True),
        sa.Column('unit',            sa.String(length=20),  nullable=True),
        sa.Column('unit_price',      sa.Float(),    nullable=False),
        sa.Column('quantity',        sa.Float(),    nullable=True),
        sa.Column('region_code',     sa.String(length=120), nullable=True),
        sa.Column('observed_at',     sa.Date(),     nullable=False),
        sa.Column('created_at',      sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['expense_id'],      ['expense.id'],  ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['professional_id'], ['users.id'],    ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['category_id'],     ['category.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['supplier_id'],     ['supplier.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('expense_id', name='uq_price_obs_expense'),
    )
    op.create_index('ix_price_obs_professional_id', 'supplier_price_observation', ['professional_id'])
    op.create_index('ix_price_obs_category_id',     'supplier_price_observation', ['category_id'])
    op.create_index('ix_price_obs_unit',            'supplier_price_observation', ['unit'])
    op.create_index('ix_price_obs_region_code',     'supplier_price_observation', ['region_code'])
    op.create_index('ix_price_obs_observed_at',     'supplier_price_observation', ['observed_at'])


def downgrade():
    op.drop_index('ix_price_obs_observed_at',     table_name='supplier_price_observation')
    op.drop_index('ix_price_obs_region_code',     table_name='supplier_price_observation')
    op.drop_index('ix_price_obs_unit',            table_name='supplier_price_observation')
    op.drop_index('ix_price_obs_category_id',     table_name='supplier_price_observation')
    op.drop_index('ix_price_obs_professional_id', table_name='supplier_price_observation')
    op.drop_table('supplier_price_observation')

    with op.batch_alter_table('photos', schema=None) as batch_op:
        batch_op.drop_index('ix_photos_daily_report_id')
        batch_op.drop_constraint('fk_photos_daily_report_id', type_='foreignkey')
        batch_op.drop_column('daily_report_id')

    op.drop_index('ix_daily_report_occurrence_daily_report_id', table_name='daily_report_occurrence')
    op.drop_table('daily_report_occurrence')

    op.drop_index('ix_daily_report_report_date', table_name='daily_report')
    op.drop_index('ix_daily_report_project_id',  table_name='daily_report')
    op.drop_table('daily_report')

    with op.batch_alter_table('expense', schema=None) as batch_op:
        batch_op.drop_column('unit')
        batch_op.drop_column('quantity')

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('logo_path')

    with op.batch_alter_table('project', schema=None) as batch_op:
        batch_op.drop_column('location')
        batch_op.drop_column('lon')
        batch_op.drop_column('lat')
