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
    # Check if we're using PostgreSQL
    bind = op.get_bind()
    is_postgresql = bind.dialect.name == 'postgresql'
    
    # Check what tables exist
    from sqlalchemy import inspect
    inspector = inspect(bind)
    existing_tables = inspector.get_table_names()
    
    # Create project_sources table (only if it doesn't exist)
    if 'project_sources' not in existing_tables:
        # Use proper PostgreSQL syntax for timestamp
        if is_postgresql:
            created_at_default = sa.text('CURRENT_TIMESTAMP')
        else:
            created_at_default = sa.text('(CURRENT_TIMESTAMP)')
        
        op.create_table(
            'project_sources',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(), nullable=False),
            sa.Column('contact_no', sa.String(), nullable=True),
            sa.Column('email', sa.String(), nullable=True),
            sa.Column('address', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=created_at_default, nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('name')
        )
        op.create_index(op.f('ix_project_sources_id'), 'project_sources', ['id'], unique=False)
    
    # Add project_source_id to projects table (only if projects table exists)
    # This handles upgrade scenarios where projects table already exists
    if 'projects' in existing_tables:
        # Check if column already exists
        projects_columns = [col['name'] for col in inspector.get_columns('projects')]
        
        if 'project_source_id' not in projects_columns:
            op.add_column('projects', sa.Column('project_source_id', sa.Integer(), nullable=True))
        
        # Create foreign key if it doesn't exist
        fk_exists = False
        try:
            fks = inspector.get_foreign_keys('projects')
            for fk in fks:
                if 'project_source_id' in fk.get('constrained_columns', []):
                    fk_exists = True
                    break
        except Exception:
            pass
        
        if not fk_exists:
            op.create_foreign_key(
                'fk_projects_project_source_id',
                'projects',
                'project_sources',
                ['project_source_id'],
                ['id']
            )


def downgrade():
    # Add startup_company back
    with op.batch_alter_table('projects', schema=None) as batch_op:
        batch_op.add_column(sa.Column('startup_company', sa.String(), nullable=True))
        batch_op.drop_constraint('fk_projects_project_source_id', type_='foreignkey')
        batch_op.drop_column('project_source_id')
    
    # Drop project_sources table
    op.drop_index(op.f('ix_project_sources_id'), table_name='project_sources')
    op.drop_table('project_sources')

