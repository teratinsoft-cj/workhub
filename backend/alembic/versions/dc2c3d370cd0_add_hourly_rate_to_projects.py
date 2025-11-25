"""add hourly_rate to projects

Revision ID: dc2c3d370cd0
Revises: 001_add_project_sources
Create Date: 2025-11-22 21:52:51.725812

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dc2c3d370cd0'
down_revision: Union[str, None] = '001_add_project_sources'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

