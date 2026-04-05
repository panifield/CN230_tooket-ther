"""Add concerts.host_country_code for local-priority MVP.

Revision ID: 002_host_country
Revises: 001_initial
Create Date: 2026-04-05

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002_host_country"
down_revision: Union[str, Sequence[str], None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "concerts",
        sa.Column("host_country_code", sa.String(length=2), server_default="TH", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("concerts", "host_country_code")
