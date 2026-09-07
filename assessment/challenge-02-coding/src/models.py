# models.py - Data Classes and Types for Conference Scheduler

from dataclasses import dataclass, field
from typing import List, Optional, Literal

UnscheduledReason = Literal[
    'SPEAKER_CONFLICT',
    'INSUFFICIENT_CAPACITY',
    'INSUFFICIENT_TIME',
    'CIRCULAR_PREREQUISITE',
    'INVALID_DATA'
]

@dataclass
class TimeWindow:
    start: str  # "HH:MM"
    end: str    # "HH:MM"

@dataclass
class Room:
    id: str
    name: str
    capacity: number = 0
    availableWindows: List[TimeWindow] = field(default_factory=list)

@dataclass
class Session:
    id: str
    title: str
    speakerId: str
    durationMinutes: int
    expectedAttendees: int
    popularityScore: int
    prerequisites: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)

@dataclass
class SchedulerConfig:
    bufferMinutes: int = 10

@dataclass
class ScheduledSession:
    sessionId: str
    roomId: str
    startTime: str
    endTime: str

@dataclass
class UnscheduledSession:
    sessionId: str
    reason: UnscheduledReason
    details: Optional[str] = None

@dataclass
class SchedulerMetrics:
    totalSessions: int
    scheduledCount: int
    unscheduledCount: int
    totalSpeakerCount: int
    roomUtilizationPercentage: float

@dataclass
class ScheduleOutput:
    scheduled: List[ScheduledSession]
    unscheduled: List[UnscheduledSession]
    metrics: SchedulerMetrics
