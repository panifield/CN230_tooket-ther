"""Optional poster_url and lineup text for concert discovery UI.

Revision ID: 003_poster_lineup
Revises: 002_host_country
Create Date: 2026-04-06

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003_poster_lineup"
down_revision: Union[str, Sequence[str], None] = "002_host_country"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("concerts", sa.Column("poster_url", sa.String(length=2048), nullable=True))
    op.add_column("concerts", sa.Column("lineup", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("concerts", "lineup")
    op.drop_column("concerts", "poster_url")
