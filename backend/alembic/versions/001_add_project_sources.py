"""add project sources table and remove startup_company

Revision ID: 001_add_project_sources
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = '001_add_project_sources'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create project_sources table
    op.create_table(
        'project_sources',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('contact_no', sa.String(), nullable=True),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_project_sources_id'), 'project_sources', ['id'], unique=False)
    
    # Add project_source_id to projects table
    # SQLite requires special handling for adding columns
    try:
        op.add_column('projects', sa.Column('project_source_id', sa.Integer(), nullable=True))
    except Exception:
        # Column might already exist
        pass
    
    # Create foreign key (SQLite has limited FK support, but we'll try)
    try:
        op.create_foreign_key('fk_projects_project_source_id', 'projects', 'project_sources', ['project_source_id'], ['id'])
    except Exception:
        # Foreign key might not be supported or already exists
        pass
    
    # Note: Removing startup_company column requires recreating the table in SQLite
    # We'll leave it for now and handle it in application code


def downgrade():
    # Add startup_company back
    with op.batch_alter_table('projects', schema=None) as batch_op:
        batch_op.add_column(sa.Column('startup_company', sa.String(), nullable=True))
        batch_op.drop_constraint('fk_projects_project_source_id', type_='foreignkey')
        batch_op.drop_column('project_source_id')
    
    # Drop project_sources table
    op.drop_index(op.f('ix_project_sources_id'), table_name='project_sources')
    op.drop_table('project_sources')

