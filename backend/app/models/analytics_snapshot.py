from datetime import date

from sqlalchemy import Date, Float, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AnalyticsSnapshot(Base):
    __tablename__ = "analytics_snapshots"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, server_default=func.gen_random_uuid()
    )
    organization_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False)
    active_devices: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    moving_devices: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    idle_devices: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    offline_devices: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_distance_meters: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    total_moving_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_idle_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    trips_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    alerts_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    avg_speed_kmh: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    max_speed_kmh: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    fleet_utilization_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    created_at: Mapped[date] = mapped_column(Date, server_default=func.now(), nullable=False)
