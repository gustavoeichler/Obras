"""scope catalogs to project

Adds project_id FK to budget, category, supplier, document. Backfills
orphan rows to the first available project (dev data is small). Drops
orphans that have no project to attach to. Also flips expense.project_id
to NOT NULL.

Revision ID: f1a2b3c4d5e6
Revises: e4f5a6b7c8d9
Create Date: 2026-04-20 14:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = 'f1a2b3c4d5e6'
down_revision = 'e4f5a6b7c8d9'
branch_labels = None
depends_on = None


TABLES = ['budget', 'category', 'supplier', 'document']


def _first_project_id(bind):
    row = bind.execute(sa.text(
        "SELECT id FROM project ORDER BY id LIMIT 1"
    )).fetchone()
    return row[0] if row else None


def upgrade():
    bind = op.get_bind()
    fallback_pid = _first_project_id(bind)

    existing_tables = set(sa.inspect(bind).get_table_names())

    # The `document` table was introduced alongside this migration; on DBs
    # that never had it, create it fully here and skip the add-column path.
    if 'document' not in existing_tables:
        op.create_table(
            'document',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('project_id', sa.Integer(),
                      sa.ForeignKey('project.id', ondelete='CASCADE'),
                      nullable=False, index=True),
            sa.Column('name', sa.String(length=200), nullable=False),
            sa.Column('type', sa.String(length=50), server_default='other'),
            sa.Column('filename', sa.String(length=255), nullable=False),
            sa.Column('original_filename', sa.String(length=255)),
            sa.Column('file_size', sa.Integer()),
            sa.Column('mime_type', sa.String(length=100)),
            sa.Column('uploaded_at', sa.DateTime(), nullable=False,
                      server_default=sa.func.current_timestamp()),
        )
        tables_to_alter = [t for t in TABLES if t != 'document']
    else:
        tables_to_alter = list(TABLES)

    insp = sa.inspect(bind)

    def _has_col(tbl, col):
        return col in {c['name'] for c in insp.get_columns(tbl)}

    def _has_idx(tbl, name):
        return name in {i['name'] for i in insp.get_indexes(tbl)}

    for tbl in tables_to_alter:
        if _has_col(tbl, 'project_id'):
            continue
        with op.batch_alter_table(tbl, schema=None) as batch_op:
            batch_op.add_column(sa.Column('project_id', sa.Integer(), nullable=True))

    # Backfill catalogs + expense
    for tbl in tables_to_alter + ['expense']:
        if fallback_pid is not None:
            bind.execute(sa.text(
                f"UPDATE {tbl} SET project_id = :pid WHERE project_id IS NULL"
            ), {"pid": fallback_pid})
        else:
            bind.execute(sa.text(f"DELETE FROM {tbl} WHERE project_id IS NULL"))

    # NOT NULL + FK + index on the catalog tables we altered
    for tbl in tables_to_alter:
        with op.batch_alter_table(tbl, schema=None) as batch_op:
            batch_op.alter_column('project_id', existing_type=sa.Integer(), nullable=False)
            batch_op.create_foreign_key(
                f'fk_{tbl}_project_id', 'project',
                ['project_id'], ['id'],
                ondelete='CASCADE',
            )
        if not _has_idx(tbl, f'ix_{tbl}_project_id'):
            op.create_index(f'ix_{tbl}_project_id', tbl, ['project_id'])

    # Flip expense.project_id to NOT NULL (FK/index already exist)
    with op.batch_alter_table('expense', schema=None) as batch_op:
        batch_op.alter_column('project_id', existing_type=sa.Integer(), nullable=False)


def downgrade():
    with op.batch_alter_table('expense', schema=None) as batch_op:
        batch_op.alter_column('project_id', existing_type=sa.Integer(), nullable=True)

    for tbl in TABLES:
        with op.batch_alter_table(tbl, schema=None) as batch_op:
            batch_op.drop_index(f'ix_{tbl}_project_id')
            batch_op.drop_constraint(f'fk_{tbl}_project_id', type_='foreignkey')
            batch_op.drop_column('project_id')
