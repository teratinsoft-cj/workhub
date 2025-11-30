"""add_track_summary_to_tasks

Revision ID: ed4b0b92c345
Revises: 3c640f84f86b
Create Date: 2025-11-30 07:33:10.592491

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ed4b0b92c345'
down_revision: Union[str, None] = '3c640f84f86b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add track_summary column to tasks table
    op.add_column('tasks', sa.Column('track_summary', sa.Text(), nullable=True))


def downgrade() -> None:
    # Remove track_summary column from tasks table
    op.drop_column('tasks', 'track_summary')

