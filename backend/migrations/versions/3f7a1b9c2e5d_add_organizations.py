"""add organizations table and org_id to users and project

Revision ID: 3f7a1b9c2e5d
Revises: e9f3c2d8a107
Create Date: 2026-05-12 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '3f7a1b9c2e5d'
down_revision = 'e9f3c2d8a107'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Create the organizations table
    op.create_table(
        'organizations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('logo_path', sa.String(length=255), nullable=True),
        sa.Column('brand_name', sa.String(length=80), nullable=True),
        sa.Column('brand_color_primary', sa.String(length=7), nullable=True),
        sa.Column('brand_default_theme', sa.String(length=10), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('plan', sa.String(length=20), nullable=True),
        sa.Column('plan_expires_at', sa.DateTime(), nullable=True),
        sa.Column('admin_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # 2. Add org_id, is_org_admin, is_superadmin columns to users
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('org_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('is_org_admin', sa.Boolean(), server_default='false', nullable=False))
        batch_op.add_column(sa.Column('is_superadmin', sa.Boolean(), server_default='false', nullable=False))
        batch_op.create_foreign_key('fk_users_org_id', 'organizations', ['org_id'], ['id'], ondelete='SET NULL')

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.create_index('ix_users_org_id', ['org_id'])

    # 3. Add org_id column to project
    with op.batch_alter_table('project', schema=None) as batch_op:
        batch_op.add_column(sa.Column('org_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_project_org_id', 'organizations', ['org_id'], ['id'], ondelete='SET NULL')

    # 4. Data migration — create one org per existing professional
    conn = op.get_bind()
    professionals = conn.execute(
        sa.text(
            "SELECT id, email, logo_path, brand_name, brand_color_primary, brand_default_theme "
            "FROM users WHERE role='professional'"
        )
    ).fetchall()

    for p in professionals:
        org_name = p.email.split('@')[0] if p.email else 'Org'
        result = conn.execute(
            sa.text(
                """INSERT INTO organizations
                       (name, logo_path, brand_name, brand_color_primary, brand_default_theme,
                        is_active, created_at)
                   VALUES
                       (:name, :logo_path, :brand_name, :brand_color_primary, :brand_default_theme,
                        true, now())
                   RETURNING id"""
            ),
            {
                "name": org_name,
                "logo_path": p.logo_path,
                "brand_name": p.brand_name,
                "brand_color_primary": p.brand_color_primary,
                "brand_default_theme": p.brand_default_theme,
            }
        )
        org_id = result.fetchone()[0]

        conn.execute(
            sa.text("UPDATE users SET org_id=:org_id, is_org_admin=true WHERE id=:user_id"),
            {"org_id": org_id, "user_id": p.id}
        )
        conn.execute(
            sa.text("UPDATE project SET org_id=:org_id WHERE professional_id=:user_id"),
            {"org_id": org_id, "user_id": p.id}
        )

    # 5. Drop branding columns from users (now stored in organizations)
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('logo_path')
        batch_op.drop_column('brand_name')
        batch_op.drop_column('brand_color_primary')
        batch_op.drop_column('brand_default_theme')


def downgrade():
    # 1. Re-add branding columns to users (nullable — no data back-fill)
    # logo_path is owned by migration f9c1a2b34501 — not restored here
    # WARNING: branding data in organizations is NOT restored to users on downgrade (lossy)
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('brand_name', sa.String(length=80), nullable=True))
        batch_op.add_column(sa.Column('brand_color_primary', sa.String(length=7), nullable=True))
        batch_op.add_column(sa.Column('brand_default_theme', sa.String(length=10), nullable=True))

    # 2. Drop org_id index, FK, and columns from users
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index('ix_users_org_id')
        batch_op.drop_constraint('fk_users_org_id', type_='foreignkey')
        batch_op.drop_column('is_superadmin')
        batch_op.drop_column('is_org_admin')
        batch_op.drop_column('org_id')

    # 3. Drop org_id FK and column from project
    with op.batch_alter_table('project', schema=None) as batch_op:
        batch_op.drop_constraint('fk_project_org_id', type_='foreignkey')
        batch_op.drop_column('org_id')

    # 4. Drop the organizations table
    op.drop_table('organizations')
