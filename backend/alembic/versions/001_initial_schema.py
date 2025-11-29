"""Initial schema - all tables

Revision ID: 001_initial_schema
Revises: 
Create Date: 2024-01-20 00:00:00.000000

This migration creates the complete WorkHub database schema.
Designed for PostgreSQL production use, compatible with SQLite for development.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    """Create all tables in the correct order"""
    bind = op.get_bind()
    is_postgresql = bind.dialect.name == 'postgresql'
    
    # Create enum types for PostgreSQL
    if is_postgresql:
        op.execute("""
            DO $$ BEGIN
                CREATE TYPE userrole AS ENUM ('super_admin', 'project_lead', 'project_owner', 'developer');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        """)
        
        op.execute("""
            DO $$ BEGIN
                CREATE TYPE timesheetstatus AS ENUM ('pending', 'approved', 'rejected');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        """)
        
        op.execute("""
            DO $$ BEGIN
                CREATE TYPE paymentstatus AS ENUM ('pending', 'paid', 'partial');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        """)
        
        op.execute("""
            DO $$ BEGIN
                CREATE TYPE projectstatus AS ENUM ('open', 'active', 'hold', 'closed');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        """)
    
    # 1. Users table (referenced by many other tables)
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('username', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=False),
        sa.Column('role', sa.Enum('super_admin', 'project_lead', 'project_owner', 'developer', name='userrole', create_type=not is_postgresql) if not is_postgresql else sa.Enum('super_admin', 'project_lead', 'project_owner', 'developer', name='userrole', create_type=False), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('is_approved', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('can_act_as_developer', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('can_act_as_super_admin', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)
    
    # 2. Project Sources table
    op.create_table(
        'project_sources',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('contact_no', sa.String(), nullable=True),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_project_sources_id'), 'project_sources', ['id'], unique=False)
    
    # 3. Projects table (depends on users and project_sources)
    op.create_table(
        'projects',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('project_lead_id', sa.Integer(), nullable=False),
        sa.Column('project_owner_id', sa.Integer(), nullable=True),
        sa.Column('project_source_id', sa.Integer(), nullable=True),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('deadline', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.Enum('open', 'active', 'hold', 'closed', name='projectstatus', create_type=not is_postgresql) if not is_postgresql else sa.Enum('open', 'active', 'hold', 'closed', name='projectstatus', create_type=False), nullable=True, server_default='open'),
        sa.Column('hold_reason', sa.Text(), nullable=True),
        sa.Column('rate_per_hour', sa.Numeric(10, 2), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['project_lead_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['project_owner_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['project_source_id'], ['project_sources.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_projects_id'), 'projects', ['id'], unique=False)
    
    # 4. Tasks table (depends on projects)
    op.create_table(
        'tasks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(), nullable=True, server_default='todo'),
        sa.Column('estimation_hours', sa.Float(), nullable=False),
        sa.Column('billable_hours', sa.Float(), nullable=True),
        sa.Column('productivity_hours', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tasks_id'), 'tasks', ['id'], unique=False)
    
    # 5. Developer Projects table (depends on users and projects)
    op.create_table(
        'developer_projects',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('developer_id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('hourly_rate', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['developer_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_developer_projects_id'), 'developer_projects', ['id'], unique=False)
    
    # 6. Task Developers table (depends on tasks and users)
    op.create_table(
        'task_developers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('developer_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['developer_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_task_developers_id'), 'task_developers', ['id'], unique=False)
    
    # 7. Timesheets table (depends on users, projects, tasks)
    op.create_table(
        'timesheets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('hours', sa.Float(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('pending', 'approved', 'rejected', name='timesheetstatus', create_type=not is_postgresql) if not is_postgresql else sa.Enum('pending', 'approved', 'rejected', name='timesheetstatus', create_type=False), nullable=True, server_default='pending'),
        sa.Column('validated_by', sa.Integer(), nullable=True),
        sa.Column('validated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['validated_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_timesheets_id'), 'timesheets', ['id'], unique=False)
    
    # 8. Invoices table (depends on projects and users)
    op.create_table(
        'invoices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('invoice_amount', sa.Float(), nullable=False),
        sa.Column('invoice_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('date_range_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('date_range_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_invoices_id'), 'invoices', ['id'], unique=False)
    
    # 9. Payments table (depends on invoices and users)
    op.create_table(
        'payments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('invoice_id', sa.Integer(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('payment_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('evidence_file', sa.String(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_payments_id'), 'payments', ['id'], unique=False)
    
    # 10. Invoice Tasks table (depends on invoices and tasks)
    op.create_table(
        'invoice_tasks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('invoice_id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_invoice_tasks_id'), 'invoice_tasks', ['id'], unique=False)
    
    # 11. Payment Vouchers table (depends on users and projects)
    op.create_table(
        'payment_vouchers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('developer_id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('voucher_amount', sa.Float(), nullable=False),
        sa.Column('voucher_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('date_range_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('date_range_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('pending', 'paid', 'partial', name='paymentstatus', create_type=not is_postgresql) if not is_postgresql else sa.Enum('pending', 'paid', 'partial', name='paymentstatus', create_type=False), nullable=True, server_default='pending'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['developer_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_payment_vouchers_id'), 'payment_vouchers', ['id'], unique=False)
    
    # 12. Payment Voucher Tasks table (depends on payment_vouchers and tasks)
    op.create_table(
        'payment_voucher_tasks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('voucher_id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('productivity_hours', sa.Float(), nullable=False),
        sa.Column('hourly_rate', sa.Float(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ),
        sa.ForeignKeyConstraint(['voucher_id'], ['payment_vouchers.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_payment_voucher_tasks_id'), 'payment_voucher_tasks', ['id'], unique=False)
    
    # 13. Developer Payments table (depends on payment_vouchers, users, projects)
    op.create_table(
        'developer_payments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('voucher_id', sa.Integer(), nullable=True),
        sa.Column('developer_id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('payment_amount', sa.Float(), nullable=False),
        sa.Column('payment_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['developer_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
        sa.ForeignKeyConstraint(['voucher_id'], ['payment_vouchers.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_developer_payments_id'), 'developer_payments', ['id'], unique=False)
    
    # 14. Developer Payment Tasks table (depends on developer_payments and tasks)
    op.create_table(
        'developer_payment_tasks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('payment_id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('productivity_hours', sa.Float(), nullable=False),
        sa.Column('hourly_rate', sa.Float(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['payment_id'], ['developer_payments.id'], ),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_developer_payment_tasks_id'), 'developer_payment_tasks', ['id'], unique=False)


def downgrade():
    """Drop all tables in reverse order"""
    op.drop_table('developer_payment_tasks')
    op.drop_table('developer_payments')
    op.drop_table('payment_voucher_tasks')
    op.drop_table('payment_vouchers')
    op.drop_table('invoice_tasks')
    op.drop_table('payments')
    op.drop_table('invoices')
    op.drop_table('timesheets')
    op.drop_table('task_developers')
    op.drop_table('developer_projects')
    op.drop_table('tasks')
    op.drop_table('projects')
    op.drop_table('project_sources')
    op.drop_table('users')
    
    # Drop enum types for PostgreSQL
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        op.execute('DROP TYPE IF EXISTS userrole CASCADE')
        op.execute('DROP TYPE IF EXISTS timesheetstatus CASCADE')
        op.execute('DROP TYPE IF EXISTS paymentstatus CASCADE')
        op.execute('DROP TYPE IF EXISTS projectstatus CASCADE')

