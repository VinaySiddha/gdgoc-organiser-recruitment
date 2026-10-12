import importlib.util
from pathlib import Path

MODULE_PATH = Path(__file__).resolve().parents[1] / "src" / "scheduler.py"
SPEC = importlib.util.spec_from_file_location("scheduler_module", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)
build_schedule = MODULE.build_schedule


def test_basic_schedule_succeeds():
    sessions = [
        {"id": "s1", "title": "AI Basics", "speakerId": "sp1", "durationMinutes": 60, "expectedAttendees": 60, "popularityScore": 90},
        {"id": "s2", "title": "Flutter Workshop", "speakerId": "sp2", "durationMinutes": 90, "expectedAttendees": 80, "popularityScore": 85},
    ]
    rooms = [{"id": "r1", "name": "Room A", "capacity": 100, "availableWindows": [{"start": "09:00", "end": "17:00"}]}, {"id": "r2", "name": "Room B", "capacity": 120, "availableWindows": [{"start": "09:00", "end": "16:00"}]}]

    result = build_schedule(sessions, rooms)
    assert result["scheduledCount"] == 2
    assert result["unscheduledCount"] == 0


def test_cycle_detection_marks_unscheduled_sessions():
    sessions = [
        {"id": "a", "title": "A", "speakerId": "sp1", "durationMinutes": 60, "expectedAttendees": 50, "prerequisites": ["b"], "popularityScore": 30},
        {"id": "b", "title": "B", "speakerId": "sp2", "durationMinutes": 60, "expectedAttendees": 50, "prerequisites": ["a"], "popularityScore": 20},
        {"id": "c", "title": "C", "speakerId": "sp3", "durationMinutes": 60, "expectedAttendees": 50, "popularityScore": 80},
    ]
    rooms = [{"id": "r1", "name": "Room A", "capacity": 100, "availableWindows": [{"start": "09:00", "end": "17:00"}]}]

    result = build_schedule(sessions, rooms)
    assert result["scheduledCount"] == 1
    assert any(item["sessionId"] in {"a", "b"} for item in result["unscheduled"])
    assert any(item["reason"] == "CIRCULAR_PREREQUISITE" for item in result["unscheduled"])


def test_capacity_and_speaker_conflicts_are_rejected():
    sessions = [
        {"id": "s1", "title": "Big Workshop", "speakerId": "sp1", "durationMinutes": 60, "expectedAttendees": 500, "popularityScore": 90},
        {"id": "s2", "title": "Duplicate Speaker", "speakerId": "sp1", "durationMinutes": 60, "expectedAttendees": 80, "popularityScore": 80},
    ]
    rooms = [{"id": "r1", "name": "Room A", "capacity": 100, "availableWindows": [{"start": "09:00", "end": "12:00"}]}]

    result = build_schedule(sessions, rooms)
    assert result["scheduledCount"] == 0
    assert any(item["reason"] in {"INSUFFICIENT_CAPACITY", "SPEAKER_CONFLICT"} for item in result["unscheduled"])


def test_invalid_data_is_rejected():
    result = build_schedule([], [])
    assert result["scheduledCount"] == 0
    assert result["unscheduledCount"] >= 0
