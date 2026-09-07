import pytest
import sys
import os
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))

from scheduler import ConferenceScheduler
from utils import time_to_minutes

@pytest.fixture
def default_rooms():
    return [
        {
            "id": "audi-main",
            "name": "Main Auditorium",
            "capacity": 200,
            "availableWindows": [{"start": "09:00", "end": "17:00"}]
        },
        {
            "id": "lab-a",
            "name": "Cloud & AI Lab",
            "capacity": 50,
            "availableWindows": [{"start": "09:00", "end": "17:00"}]
        },
        {
            "id": "seminar-1",
            "name": "Seminar Hall 1",
            "capacity": 100,
            "availableWindows": [{"start": "09:00", "end": "13:00"}, {"start": "14:00", "end": "17:00"}]
        }
    ]

def test_empty_sessions_and_empty_rooms():
    scheduler = ConferenceScheduler()
    res1 = scheduler.schedule([], [])
    assert res1["metrics"]["totalSessions"] == 0
    assert len(res1["scheduled"]) == 0
    assert len(res1["unscheduled"]) == 0

    res2 = scheduler.schedule([{"id": "s1", "title": "Intro", "speakerId": "spk1", "durationMinutes": 60, "expectedAttendees": 30, "popularityScore": 80}], [])
    assert len(res2["scheduled"]) == 0
    assert len(res2["unscheduled"]) == 1
    assert res2["unscheduled"][0]["reason"] == "INSUFFICIENT_CAPACITY"

def test_single_session_happy_path(default_rooms):
    scheduler = ConferenceScheduler(buffer_minutes=10)
    sessions = [{
        "id": "s-keynote",
        "title": "GDG Opening Keynote",
        "speakerId": "lead-organizer",
        "durationMinutes": 60,
        "expectedAttendees": 150,
        "popularityScore": 99
    }]
    output = scheduler.schedule(sessions, default_rooms)
    assert len(output["scheduled"]) == 1
    assert output["scheduled"][0]["sessionId"] == "s-keynote"
    assert output["scheduled"][0]["roomId"] == "audi-main"
    assert output["scheduled"][0]["startTime"] == "09:00"
    assert output["scheduled"][0]["endTime"] == "10:00"
    assert output["metrics"]["scheduledCount"] == 1

def test_speaker_conflict_prevention(default_rooms):
    scheduler = ConferenceScheduler(buffer_minutes=10)
    sessions = [
        {
            "id": "s-speaker1-a",
            "title": "Modern Angular",
            "speakerId": "spk-alex",
            "durationMinutes": 60,
            "expectedAttendees": 40,
            "popularityScore": 90
        },
        {
            "id": "s-speaker1-b",
            "title": "Flutter Deep Dive",
            "speakerId": "spk-alex",
            "durationMinutes": 60,
            "expectedAttendees": 40,
            "popularityScore": 85
        }
    ]
    output = scheduler.schedule(sessions, default_rooms)
    # Both scheduled sequentially without overlap even if multiple rooms are available
    assert len(output["scheduled"]) == 2
    s1 = next(s for s in output["scheduled"] if s["sessionId"] == "s-speaker1-a")
    s2 = next(s for s in output["scheduled"] if s["sessionId"] == "s-speaker1-b")
    
    s1_start, s1_end = time_to_minutes(s1["startTime"]), time_to_minutes(s1["endTime"])
    s2_start, s2_end = time_to_minutes(s2["startTime"]), time_to_minutes(s2["endTime"])
    assert (s1_end <= s2_start) or (s2_end <= s1_start), "Speaker was double booked!"

def test_room_capacity_enforcement(default_rooms):
    scheduler = ConferenceScheduler()
    sessions = [
        {
            "id": "s-huge",
            "title": "Mega Keynote",
            "speakerId": "spk-1",
            "durationMinutes": 60,
            "expectedAttendees": 500,  # Largest room is 200
            "popularityScore": 90
        }
    ]
    output = scheduler.schedule(sessions, default_rooms)
    assert len(output["scheduled"]) == 0
    assert len(output["unscheduled"]) == 1
    assert output["unscheduled"][0]["reason"] == "INSUFFICIENT_CAPACITY"

def test_prerequisite_dependency_chain(default_rooms):
    scheduler = ConferenceScheduler(buffer_minutes=10)
    sessions = [
        {
            "id": "s-intro",
            "title": "Docker Basics",
            "speakerId": "spk-1",
            "durationMinutes": 60,
            "expectedAttendees": 40,
            "popularityScore": 80
        },
        {
            "id": "s-advanced",
            "title": "Kubernetes Orchestration",
            "speakerId": "spk-2",
            "durationMinutes": 60,
            "expectedAttendees": 40,
            "prerequisites": ["s-intro"],
            "popularityScore": 95  # Higher popularity, but must wait for intro!
        }
    ]
    output = scheduler.schedule(sessions, default_rooms)
    assert len(output["scheduled"]) == 2
    intro = next(s for s in output["scheduled"] if s["sessionId"] == "s-intro")
    adv = next(s for s in output["scheduled"] if s["sessionId"] == "s-advanced")

    intro_end = time_to_minutes(intro["endTime"])
    adv_start = time_to_minutes(adv["startTime"])
    assert adv_start >= intro_end, f"Advanced session started ({adv['startTime']}) before prerequisite ended ({intro['endTime']})"

def test_cycle_detection_two_node_and_deep():
    scheduler = ConferenceScheduler()
    rooms = [{"id": "r1", "name": "Room 1", "capacity": 100, "availableWindows": [{"start": "09:00", "end": "17:00"}]}]
    
    # 2-node cycle: A -> B -> A
    cycle_2 = [
        {"id": "c1", "title": "C1", "speakerId": "spk1", "durationMinutes": 60, "expectedAttendees": 30, "popularityScore": 80, "prerequisites": ["c2"]},
        {"id": "c2", "title": "C2", "speakerId": "spk2", "durationMinutes": 60, "expectedAttendees": 30, "popularityScore": 80, "prerequisites": ["c1"]}
    ]
    out2 = scheduler.schedule(cycle_2, rooms)
    assert len(out2["scheduled"]) == 0
    assert len(out2["unscheduled"]) == 2
    assert all(u["reason"] == "CIRCULAR_PREREQUISITE" for u in out2["unscheduled"])

    # Deep cycle: A -> B -> C -> D -> B
    deep_cycle = [
        {"id": "d-a", "title": "DA", "speakerId": "spk1", "durationMinutes": 30, "expectedAttendees": 20, "popularityScore": 80, "prerequisites": ["d-b"]},
        {"id": "d-b", "title": "DB", "speakerId": "spk2", "durationMinutes": 30, "expectedAttendees": 20, "popularityScore": 80, "prerequisites": ["d-c"]},
        {"id": "d-c", "title": "DC", "speakerId": "spk3", "durationMinutes": 30, "expectedAttendees": 20, "popularityScore": 80, "prerequisites": ["d-d"]},
        {"id": "d-d", "title": "DD", "speakerId": "spk4", "durationMinutes": 30, "expectedAttendees": 20, "popularityScore": 80, "prerequisites": ["d-b"]},
    ]
    out_deep = scheduler.schedule(deep_cycle, rooms)
    assert len(out_deep["scheduled"]) == 0
    assert len(out_deep["unscheduled"]) == 4
    assert all(u["reason"] == "CIRCULAR_PREREQUISITE" for u in out_deep["unscheduled"])

def test_self_dependency_and_unknown_prerequisite():
    scheduler = ConferenceScheduler()
    rooms = [{"id": "r1", "name": "Room 1", "capacity": 100, "availableWindows": [{"start": "09:00", "end": "17:00"}]}]
    
    # Self-dependency
    self_dep = [{"id": "s-self", "title": "Self", "speakerId": "spk1", "durationMinutes": 60, "expectedAttendees": 30, "popularityScore": 80, "prerequisites": ["s-self"]}]
    out_self = scheduler.schedule(self_dep, rooms)
    assert out_self["unscheduled"][0]["reason"] == "CIRCULAR_PREREQUISITE"

    # Unknown prerequisite
    unknown_dep = [{"id": "s-unk", "title": "Unk", "speakerId": "spk1", "durationMinutes": 60, "expectedAttendees": 30, "popularityScore": 80, "prerequisites": ["non-existent-session"]}]
    out_unk = scheduler.schedule(unknown_dep, rooms)
    assert out_unk["unscheduled"][0]["reason"] == "INVALID_DATA"

def test_room_window_boundaries_and_buffers():
    scheduler = ConferenceScheduler(buffer_minutes=15)
    rooms = [{
        "id": "strict-room",
        "name": "Strict Window Hall",
        "capacity": 100,
        "availableWindows": [{"start": "09:00", "end": "11:00"}]  # 120 minutes
    }]
    sessions = [
        {"id": "sess-1", "title": "Part 1", "speakerId": "spk1", "durationMinutes": 50, "expectedAttendees": 30, "popularityScore": 90},
        {"id": "sess-2", "title": "Part 2", "speakerId": "spk2", "durationMinutes": 50, "expectedAttendees": 30, "popularityScore": 85},
        {"id": "sess-3", "title": "Part 3", "speakerId": "spk3", "durationMinutes": 50, "expectedAttendees": 30, "popularityScore": 80},
    ]
    # Sess 1: 09:00-09:50. Buffer: 09:50-10:05. Sess 2: 10:05-10:55. Buffer: 10:55-11:10 (exceeds 11:00). Sess 3 cannot fit!
    output = scheduler.schedule(sessions, rooms)
    assert len(output["scheduled"]) == 2
    assert output["scheduled"][0]["startTime"] == "09:00"
    assert output["scheduled"][0]["endTime"] == "09:50"
    assert output["scheduled"][1]["startTime"] == "10:05"
    assert output["scheduled"][1]["endTime"] == "10:55"
    assert len(output["unscheduled"]) == 1
    assert output["unscheduled"][0]["sessionId"] == "sess-3"
    assert output["unscheduled"][0]["reason"] == "INSUFFICIENT_TIME"

def test_invalid_input_data():
    scheduler = ConferenceScheduler()
    rooms = [{"id": "r1", "name": "Room 1", "capacity": 100, "availableWindows": [{"start": "09:00", "end": "17:00"}]}]
    invalid_sessions = [
        {"id": "", "title": "No ID", "speakerId": "spk1", "durationMinutes": 30, "expectedAttendees": 10, "popularityScore": 50},
        {"id": "neg-dur", "title": "Neg", "speakerId": "spk1", "durationMinutes": -30, "expectedAttendees": 10, "popularityScore": 50},
        {"id": "neg-att", "title": "Neg Att", "speakerId": "spk1", "durationMinutes": 30, "expectedAttendees": -10, "popularityScore": 50},
        {"id": "bad-pop", "title": "Bad Pop", "speakerId": "spk1", "durationMinutes": 30, "expectedAttendees": 10, "popularityScore": 150},
    ]
    output = scheduler.schedule(invalid_sessions, rooms)
    assert len(output["scheduled"]) == 0
    assert len(output["unscheduled"]) == 4
    assert all(u["reason"] == "INVALID_DATA" for u in output["unscheduled"])

def test_deterministic_scheduling():
    scheduler = ConferenceScheduler()
    rooms = [
        {"id": "r-1", "name": "Room 1", "capacity": 100, "availableWindows": [{"start": "09:00", "end": "17:00"}]},
        {"id": "r-2", "name": "Room 2", "capacity": 80, "availableWindows": [{"start": "09:00", "end": "17:00"}]}
    ]
    sessions = [
        {"id": f"s-{i}", "title": f"Session {i}", "speakerId": f"spk-{i%5}", "durationMinutes": 45, "expectedAttendees": 40, "popularityScore": (i * 13) % 100 + 1}
        for i in range(20)
    ]
    res1 = scheduler.schedule(sessions, rooms)
    res2 = scheduler.schedule(sessions, rooms)
    assert res1 == res2, "Scheduler output must be strictly deterministic across repeated runs"

def test_large_scale_performance_and_metrics():
    """Benchmark on 120 sessions across 12 rooms. Target execution time < 200ms."""
    scheduler = ConferenceScheduler(buffer_minutes=10)
    rooms = [
        {
            "id": f"hall-{i}",
            "name": f"Hall {i}",
            "capacity": 50 + (i * 15),
            "availableWindows": [{"start": "08:30", "end": "18:00"}]
        }
        for i in range(12)
    ]
    sessions = [
        {
            "id": f"sess-scale-{i}",
            "title": f"Workshop Topic {i}",
            "speakerId": f"speaker-scale-{i % 25}",
            "durationMinutes": 30 + ((i % 4) * 15),
            "expectedAttendees": 20 + ((i % 8) * 10),
            "popularityScore": (i * 7) % 100 + 1,
            "prerequisites": [f"sess-scale-{i-1}"] if (i % 6 == 0 and i > 0) else []
        }
        for i in range(120)
    ]

    start_time = time.time()
    output = scheduler.schedule(sessions, rooms)
    elapsed = time.time() - start_time

    assert elapsed < 0.5, f"Execution took {elapsed:.4f}s, expected < 0.5s"
    assert output["metrics"]["totalSessions"] == 120
    assert output["metrics"]["scheduledCount"] > 50
    assert output["metrics"]["roomUtilizationPercentage"] > 0
    assert output["metrics"]["totalSpeakerCount"] == 25
