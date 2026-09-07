"""
models.py — Data structures for the GDG DevFest Session Scheduler.

Provides typed dataclasses for Session, Room, TimeWindow, and the
ScheduleOutput result.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class TimeWindow:
    """A contiguous block of availability expressed as HH:MM strings."""
    start: str   # "HH:MM" 24-hour format
    end: str     # "HH:MM" 24-hour format


@dataclass
class Session:
    """A conference session proposed by a speaker."""
    id: str
    title: str
    speaker_id: str
    duration_minutes: int
    expected_attendees: int
    popularity_score: int              # 1–100
    prerequisites: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)


@dataclass
class Room:
    """A physical venue room with capacity and time availability."""
    id: str
    name: str
    capacity: int
    available_windows: List[TimeWindow] = field(default_factory=list)


@dataclass
class ScheduledSession:
    """A session that has been placed on the schedule."""
    session_id: str
    room_id: str
    start_time: str   # "HH:MM"
    end_time: str      # "HH:MM"


@dataclass
class UnscheduledSession:
    """A session that could not be placed, with reason."""
    session_id: str
    reason: str   # SPEAKER_CONFLICT | INSUFFICIENT_CAPACITY | INSUFFICIENT_TIME | CIRCULAR_PREREQUISITE | INVALID_DATA
    details: Optional[str] = None


@dataclass
class ScheduleMetrics:
    total_sessions: int = 0
    scheduled_count: int = 0
    unscheduled_count: int = 0
    total_speaker_count: int = 0
    room_utilization_percentage: float = 0.0


@dataclass
class ScheduleOutput:
    """Complete scheduler result."""
    scheduled: List[ScheduledSession] = field(default_factory=list)
    unscheduled: List[UnscheduledSession] = field(default_factory=list)
    metrics: ScheduleMetrics = field(default_factory=ScheduleMetrics)

    def to_dict(self) -> dict:
        return {
            "scheduled": [
                {
                    "sessionId": s.session_id,
                    "roomId": s.room_id,
                    "startTime": s.start_time,
                    "endTime": s.end_time,
                }
                for s in self.scheduled
            ],
            "unscheduled": [
                {
                    "sessionId": u.session_id,
                    "reason": u.reason,
                    **({"details": u.details} if u.details else {}),
                }
                for u in self.unscheduled
            ],
            "metrics": {
                "totalSessions": self.metrics.total_sessions,
                "scheduledCount": self.metrics.scheduled_count,
                "unscheduledCount": self.metrics.unscheduled_count,
                "totalSpeakerCount": self.metrics.total_speaker_count,
                "roomUtilizationPercentage": round(
                    self.metrics.room_utilization_percentage, 2
                ),
            },
        }
