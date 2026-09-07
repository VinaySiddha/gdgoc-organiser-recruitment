"""
test_scheduler.py — Comprehensive test suite for the GDG DevFest Scheduler.

Covers all 5 hard constraints, edge cases, and optimization goals.
"""

import sys
import os
import time

import pytest

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from models import Room, Session, TimeWindow
from scheduler import schedule
from utils import time_to_minutes, minutes_to_time, topological_sort_with_cycles


# ── Fixture helpers ──────────────────────────────────────────────────────

def make_session(**kwargs) -> Session:
    defaults = {
        "id": "s1",
        "title": "Intro to AI",
        "speaker_id": "spk-1",
        "duration_minutes": 60,
        "expected_attendees": 50,
        "popularity_score": 50,
        "prerequisites": [],
        "tags": [],
    }
    defaults.update(kwargs)
    return Session(**defaults)


def make_room(**kwargs) -> Room:
    defaults = {
        "id": "room-1",
        "name": "Auditorium",
        "capacity": 100,
        "available_windows": [TimeWindow("09:00", "17:00")],
    }
    defaults.update(kwargs)
    return Room(**defaults)


# ══════════════════════════════════════════════════════════════════════════
#  CONSTRAINT 1: No Speaker Overlaps
# ══════════════════════════════════════════════════════════════════════════

class TestSpeakerOverlap:
    def test_same_speaker_two_sessions_sequential(self):
        """Same speaker with two sessions — both should be scheduled sequentially."""
        sessions = [
            make_session(id="s1", speaker_id="spk-A", duration_minutes=60, popularity_score=80),
            make_session(id="s2", speaker_id="spk-A", duration_minutes=60, popularity_score=70),
        ]
        rooms = [make_room(id="r1", capacity=100)]

        result = schedule(sessions, rooms, buffer_minutes=10)

        assert result.metrics.scheduled_count == 2
        # Verify no time overlap
        s1 = next(s for s in result.scheduled if s.session_id == "s1")
        s2 = next(s for s in result.scheduled if s.session_id == "s2")
        assert time_to_minutes(s1.end_time) <= time_to_minutes(s2.start_time) or \
               time_to_minutes(s2.end_time) <= time_to_minutes(s1.start_time)

    def test_same_speaker_insufficient_time(self):
        """Same speaker, 3 sessions, but only 2 fit in the window → 1 unscheduled."""
        sessions = [
            make_session(id="s1", speaker_id="spk-A", duration_minutes=120, popularity_score=90),
            make_session(id="s2", speaker_id="spk-A", duration_minutes=120, popularity_score=80),
            make_session(id="s3", speaker_id="spk-A", duration_minutes=120, popularity_score=70),
        ]
        rooms = [make_room(id="r1", capacity=100, available_windows=[TimeWindow("09:00", "14:00")])]

        result = schedule(sessions, rooms, buffer_minutes=10)

        assert result.metrics.scheduled_count == 2
        assert result.metrics.unscheduled_count == 1


# ══════════════════════════════════════════════════════════════════════════
#  CONSTRAINT 2: Room Capacity Matching
# ══════════════════════════════════════════════════════════════════════════

class TestCapacity:
    def test_session_exceeds_all_rooms(self):
        """Session needing 500 seats when largest room has 200 → INSUFFICIENT_CAPACITY."""
        sessions = [make_session(id="s1", expected_attendees=500)]
        rooms = [make_room(id="r1", capacity=200)]

        result = schedule(sessions, rooms)

        assert result.metrics.unscheduled_count == 1
        assert result.unscheduled[0].reason == "INSUFFICIENT_CAPACITY"

    def test_best_fit_room_assignment(self):
        """Session with 80 attendees should go to a 100-seat room (best fit), not 500."""
        sessions = [make_session(id="s1", expected_attendees=80)]
        rooms = [
            make_room(id="r-large", capacity=500),
            make_room(id="r-medium", capacity=100),
        ]

        result = schedule(sessions, rooms)

        assert result.metrics.scheduled_count == 1
        assert result.scheduled[0].room_id == "r-medium"

    def test_exact_capacity_match(self):
        """Session with exactly room capacity should be accepted."""
        sessions = [make_session(id="s1", expected_attendees=100)]
        rooms = [make_room(id="r1", capacity=100)]

        result = schedule(sessions, rooms)
        assert result.metrics.scheduled_count == 1


# ══════════════════════════════════════════════════════════════════════════
#  CONSTRAINT 3: Prerequisite Dependency Ordering
# ══════════════════════════════════════════════════════════════════════════

class TestPrerequisites:
    def test_simple_dependency_chain(self):
        """A → B → C: all three scheduled in correct order."""
        sessions = [
            make_session(id="C", speaker_id="spk-3", prerequisites=["B"], popularity_score=50),
            make_session(id="A", speaker_id="spk-1", prerequisites=[], popularity_score=90),
            make_session(id="B", speaker_id="spk-2", prerequisites=["A"], popularity_score=70),
        ]
        rooms = [make_room(id="r1", capacity=100)]

        result = schedule(sessions, rooms)

        assert result.metrics.scheduled_count == 3
        times = {s.session_id: time_to_minutes(s.start_time) for s in result.scheduled}
        end_times = {s.session_id: time_to_minutes(s.end_time) for s in result.scheduled}

        assert end_times["A"] <= times["B"]
        assert end_times["B"] <= times["C"]

    def test_prerequisite_not_in_session_list(self):
        """Prerequisite pointing to non-existent session should not block scheduling."""
        sessions = [
            make_session(id="s1", prerequisites=["nonexistent"]),
        ]
        rooms = [make_room(id="r1", capacity=100)]

        result = schedule(sessions, rooms)
        assert result.metrics.scheduled_count == 1


# ══════════════════════════════════════════════════════════════════════════
#  CONSTRAINT 4: Room Window Boundaries
# ══════════════════════════════════════════════════════════════════════════

class TestRoomWindows:
    def test_session_fits_exactly_in_window(self):
        """60-min session in a 60-min window should fit."""
        sessions = [make_session(id="s1", duration_minutes=60)]
        rooms = [make_room(id="r1", available_windows=[TimeWindow("10:00", "11:00")])]

        result = schedule(sessions, rooms, buffer_minutes=0)
        assert result.metrics.scheduled_count == 1

    def test_session_too_long_for_window(self):
        """90-min session in a 60-min window should not fit."""
        sessions = [make_session(id="s1", duration_minutes=90)]
        rooms = [make_room(id="r1", available_windows=[TimeWindow("10:00", "11:00")])]

        result = schedule(sessions, rooms)
        assert result.metrics.unscheduled_count == 1

    def test_buffer_between_sessions(self):
        """Two 55-min sessions with 10-min buffer in a 2-hour window should fit."""
        sessions = [
            make_session(id="s1", speaker_id="spk-1", duration_minutes=55, popularity_score=80),
            make_session(id="s2", speaker_id="spk-2", duration_minutes=55, popularity_score=70),
        ]
        rooms = [make_room(id="r1", available_windows=[TimeWindow("09:00", "11:00")])]

        result = schedule(sessions, rooms, buffer_minutes=10)
        assert result.metrics.scheduled_count == 2

    def test_multiple_windows(self):
        """Room with morning and afternoon windows — sessions use both."""
        sessions = [
            make_session(id="s1", speaker_id="spk-1", duration_minutes=60, popularity_score=90),
            make_session(id="s2", speaker_id="spk-2", duration_minutes=60, popularity_score=80),
        ]
        rooms = [make_room(
            id="r1",
            available_windows=[TimeWindow("09:00", "10:30"), TimeWindow("14:00", "16:00")],
        )]

        result = schedule(sessions, rooms, buffer_minutes=10)
        assert result.metrics.scheduled_count == 2


# ══════════════════════════════════════════════════════════════════════════
#  CONSTRAINT 5: Cycle Detection
# ══════════════════════════════════════════════════════════════════════════

class TestCycleDetection:
    def test_simple_cycle_a_b_a(self):
        """A → B → A: both classified as CIRCULAR_PREREQUISITE."""
        sessions = [
            make_session(id="A", prerequisites=["B"]),
            make_session(id="B", prerequisites=["A"], speaker_id="spk-2"),
        ]
        rooms = [make_room(id="r1")]

        result = schedule(sessions, rooms)

        assert result.metrics.unscheduled_count == 2
        reasons = {u.session_id: u.reason for u in result.unscheduled}
        assert reasons["A"] == "CIRCULAR_PREREQUISITE"
        assert reasons["B"] == "CIRCULAR_PREREQUISITE"

    def test_deep_cycle(self):
        """A → B → C → D → B: B, C, D are cyclic; A has unresolvable prereq."""
        sessions = [
            make_session(id="A", speaker_id="spk-1", prerequisites=[]),
            make_session(id="B", speaker_id="spk-2", prerequisites=["D"]),
            make_session(id="C", speaker_id="spk-3", prerequisites=["B"]),
            make_session(id="D", speaker_id="spk-4", prerequisites=["C"]),
        ]
        rooms = [make_room(id="r1")]

        result = schedule(sessions, rooms)

        cyclic_ids = {u.session_id for u in result.unscheduled if u.reason == "CIRCULAR_PREREQUISITE"}
        assert {"B", "C", "D"}.issubset(cyclic_ids)

    def test_no_crash_on_cycle(self):
        """Cycles must never cause infinite recursion or crash."""
        sessions = [
            make_session(id=f"s{i}", speaker_id=f"spk-{i}", prerequisites=[f"s{(i+1) % 5}"])
            for i in range(5)
        ]
        rooms = [make_room(id="r1")]

        result = schedule(sessions, rooms)  # Must not hang or crash
        assert result.metrics.unscheduled_count == 5


# ══════════════════════════════════════════════════════════════════════════
#  OPTIMIZATION: Priority-based scheduling
# ══════════════════════════════════════════════════════════════════════════

class TestOptimization:
    def test_higher_popularity_scheduled_first(self):
        """When only 1 slot available, the higher-popularity session wins."""
        sessions = [
            make_session(id="low", speaker_id="spk-1", popularity_score=10, duration_minutes=60),
            make_session(id="high", speaker_id="spk-2", popularity_score=99, duration_minutes=60),
        ]
        rooms = [make_room(id="r1", available_windows=[TimeWindow("09:00", "10:00")])]

        result = schedule(sessions, rooms, buffer_minutes=0)

        assert result.metrics.scheduled_count == 1
        assert result.scheduled[0].session_id == "high"


# ══════════════════════════════════════════════════════════════════════════
#  EDGE CASES
# ══════════════════════════════════════════════════════════════════════════

class TestEdgeCases:
    def test_empty_sessions(self):
        """No sessions → empty result."""
        result = schedule([], [make_room()])
        assert result.metrics.total_sessions == 0
        assert result.metrics.scheduled_count == 0

    def test_empty_rooms(self):
        """No rooms → all sessions unscheduled."""
        result = schedule([make_session()], [])
        assert result.metrics.unscheduled_count == 1

    def test_both_empty(self):
        """No sessions and no rooms → empty result without crash."""
        result = schedule([], [])
        assert result.metrics.total_sessions == 0

    def test_zero_duration_session(self):
        """Session with 0-minute duration → INVALID_DATA."""
        sessions = [make_session(id="s1", duration_minutes=0)]
        rooms = [make_room()]

        result = schedule(sessions, rooms)
        assert result.unscheduled[0].reason == "INVALID_DATA"

    def test_negative_attendees(self):
        """Negative attendees → INVALID_DATA."""
        sessions = [make_session(id="s1", expected_attendees=-5)]
        rooms = [make_room()]

        result = schedule(sessions, rooms)
        assert result.unscheduled[0].reason == "INVALID_DATA"

    def test_output_to_dict(self):
        """Verify the to_dict() serialisation matches expected schema."""
        result = schedule(
            [make_session()],
            [make_room()],
        )
        d = result.to_dict()
        assert "scheduled" in d
        assert "unscheduled" in d
        assert "metrics" in d
        assert "totalSessions" in d["metrics"]

    def test_metrics_speaker_count(self):
        """Speaker count should reflect unique speakers across ALL sessions."""
        sessions = [
            make_session(id="s1", speaker_id="spk-1"),
            make_session(id="s2", speaker_id="spk-2"),
            make_session(id="s3", speaker_id="spk-1"),  # duplicate speaker
        ]
        rooms = [make_room(id="r1", capacity=100)]

        result = schedule(sessions, rooms)
        assert result.metrics.total_speaker_count == 2


# ══════════════════════════════════════════════════════════════════════════
#  SCALE: High-volume benchmark
# ══════════════════════════════════════════════════════════════════════════

class TestScale:
    def test_100_sessions_10_rooms_sub_second(self):
        """100+ sessions across 10 rooms must complete in < 1 second."""
        sessions = [
            Session(
                id=f"sess-{i}",
                title=f"Session {i}",
                speaker_id=f"spk-{i % 30}",
                duration_minutes=30 + (i % 4) * 15,
                expected_attendees=20 + (i % 5) * 10,
                popularity_score=max(1, 100 - i),
                prerequisites=[],
                tags=[],
            )
            for i in range(120)
        ]
        rooms = [
            Room(
                id=f"room-{r}",
                name=f"Room {r}",
                capacity=50 + r * 20,
                available_windows=[TimeWindow("08:00", "18:00")],
            )
            for r in range(10)
        ]

        start = time.perf_counter()
        result = schedule(sessions, rooms, buffer_minutes=5)
        elapsed = time.perf_counter() - start

        assert elapsed < 1.0, f"Scheduling took {elapsed:.2f}s (> 1s limit)"
        assert result.metrics.scheduled_count > 0
        assert result.metrics.total_sessions == 120

    def test_deterministic_results(self):
        """Running twice with the same input produces identical output."""
        sessions = [
            make_session(id=f"s{i}", speaker_id=f"spk-{i}", popularity_score=100 - i)
            for i in range(10)
        ]
        rooms = [make_room(id="r1"), make_room(id="r2", name="Lab")]

        r1 = schedule(sessions, rooms)
        r2 = schedule(sessions, rooms)

        assert r1.to_dict() == r2.to_dict()
