from __future__ import annotations

from collections import defaultdict, deque
from typing import Any, Dict, List, Set, Tuple


def _to_minutes(value: str) -> int:
    if not isinstance(value, str) or ":" not in value:
        raise ValueError(f"Invalid time format: {value!r}")
    hour_str, minute_str = value.split(":", 1)
    hour = int(hour_str)
    minute = int(minute_str)
    if not 0 <= hour <= 23 or not 0 <= minute <= 59:
        raise ValueError(f"Invalid time format: {value!r}")
    return hour * 60 + minute


def _from_minutes(total_minutes: int) -> str:
    hours, minutes = divmod(total_minutes, 60)
    return f"{hours:02d}:{minutes:02d}"


def _session_key(session: Dict[str, Any]) -> Tuple[int, int, str]:
    return (-int(session.get("popularityScore", 0)), -int(session.get("durationMinutes", 0)), str(session.get("id", "")))


def _detect_cycle_nodes(sessions: List[Dict[str, Any]]) -> Set[str]:
    session_map = {str(s["id"]): s for s in sessions if isinstance(s, dict) and s.get("id") is not None}
    adjacency = {sid: list(map(str, session.get("prerequisites", []) or [])) for sid, session in session_map.items()}
    visited: Set[str] = set()
    stack: Set[str] = set()
    cycle_nodes: Set[str] = set()

    def dfs(node: str) -> None:
        visited.add(node)
        stack.add(node)
        for dep in adjacency.get(node, []):
            if dep not in session_map:
                continue
            if dep not in visited:
                dfs(dep)
            elif dep in stack:
                cycle_nodes.add(dep)
                cycle_nodes.add(node)
        stack.remove(node)

    for sid in session_map:
        if sid not in visited:
            dfs(sid)
    return cycle_nodes


def build_schedule(sessions: List[Dict[str, Any]], rooms: List[Dict[str, Any]], buffer_minutes: int = 10) -> Dict[str, Any]:
    if not sessions or not rooms:
        return {
            "scheduled": [],
            "unscheduled": [],
            "scheduledCount": 0,
            "unscheduledCount": 0,
            "metrics": {
                "totalSessions": 0,
                "scheduledCount": 0,
                "unscheduledCount": 0,
                "totalSpeakerCount": 0,
                "roomUtilizationPercentage": 0.0,
            },
        }

    session_map = {str(s["id"]): s for s in sessions if isinstance(s, dict) and s.get("id") is not None}
    cycle_nodes = _detect_cycle_nodes(sessions)
    scheduled: List[Dict[str, str]] = []
    unscheduled: List[Dict[str, Any]] = []
    speaker_bookings: Dict[str, List[Tuple[str, str]]] = defaultdict(list)
    room_bookings: Dict[str, List[Tuple[str, str]]] = defaultdict(list)
    scheduled_by_id: Dict[str, Dict[str, Any]] = {}

    for session_id, session in session_map.items():
        if session_id in cycle_nodes:
            unscheduled.append({"sessionId": session_id, "reason": "CIRCULAR_PREREQUISITE", "details": "Cycle detected in prerequisite graph"})

    ready_queue = deque(sorted(
        [sid for sid in session_map if sid not in cycle_nodes],
        key=lambda sid: _session_key(session_map[sid]),
    ))

    while ready_queue:
        session_id = ready_queue.popleft()
        session = session_map[session_id]
        valid_rooms = [room for room in rooms if room.get("capacity", 0) >= int(session.get("expectedAttendees", 0))]
        if not valid_rooms:
            unscheduled.append({"sessionId": session_id, "reason": "INSUFFICIENT_CAPACITY", "details": "No room matches attendee demand"})
            continue

        speaker = str(session.get("speakerId", ""))
        speaker_conflict = False
        for start, end in speaker_bookings.get(speaker, []):
            if start < _to_minutes("23:59") and end > _to_minutes("00:00"):
                pass
        candidate = None
        for room in sorted(valid_rooms, key=lambda r: str(r.get("id", ""))):
            for window in room.get("availableWindows", []):
                window_start = _to_minutes(window["start"])
                window_end = _to_minutes(window["end"])
                earliest_start = window_start
                for prereq in session.get("prerequisites", []) or []:
                    prereq_entry = scheduled_by_id.get(str(prereq))
                    if prereq_entry is None:
                        continue
                    earliest_start = max(earliest_start, _to_minutes(prereq_entry["endTime"]))

                duration = int(session.get("durationMinutes", 0))
                if duration <= 0:
                    unscheduled.append({"sessionId": session_id, "reason": "INVALID_DATA", "details": "Duration must be positive"})
                    speaker_conflict = True
                    break

                candidate_start = earliest_start
                candidate_end = candidate_start + duration
                while candidate_end <= window_end:
                    overlap = False
                    if speaker in speaker_bookings:
                        for existing_start, existing_end in speaker_bookings[speaker]:
                            if candidate_start < existing_end and candidate_end > existing_start:
                                overlap = True
                                break
                    if not overlap:
                        room_slots = room_bookings.get(room["id"], [])
                        for existing_start, existing_end in room_slots:
                            if candidate_start < existing_end + buffer_minutes and candidate_end + buffer_minutes > existing_start:
                                overlap = True
                                break
                        if not overlap:
                            candidate = {
                                "sessionId": session_id,
                                "roomId": room["id"],
                                "startTime": _from_minutes(candidate_start),
                                "endTime": _from_minutes(candidate_end),
                            }
                            break
                    candidate_start += 5
                    candidate_end = candidate_start + duration
                if candidate is not None:
                    break

        if candidate is None:
            unscheduled.append({"sessionId": session_id, "reason": "INSUFFICIENT_TIME", "details": "No valid time slot fits room windows and constraints"})
            continue

        scheduled.append(candidate)
        scheduled_by_id[session_id] = candidate
        room_bookings[str(candidate["roomId"])].append((_to_minutes(candidate["startTime"]), _to_minutes(candidate["endTime"])))
        speaker_bookings[speaker].append((_to_minutes(candidate["startTime"]), _to_minutes(candidate["endTime"])))

        for dependent_session in sessions:
            dep_id = str(dependent_session.get("id", ""))
            prereqs = dependent_session.get("prerequisites", []) or []
            if session_id in map(str, prereqs):
                if dep_id not in cycle_nodes and dep_id not in scheduled_by_id and dep_id not in ready_queue:
                    ready_queue.append(dep_id)

    # ensure all remaining sessions have a status
    speaker_to_ids: Dict[str, List[str]] = defaultdict(list)
    for session in sessions:
        speaker = str(session.get("speakerId", ""))
        speaker_to_ids[speaker].append(str(session.get("id", "")))

    for speaker, session_ids in speaker_to_ids.items():
        if len(session_ids) > 1 and any(
            any(item["sessionId"] == sid and item["reason"] == "INSUFFICIENT_CAPACITY" for item in unscheduled)
            for sid in session_ids
        ):
            for sid in session_ids:
                if sid not in {item["sessionId"] for item in scheduled} and not any(item["sessionId"] == sid for item in unscheduled):
                    unscheduled.append({"sessionId": sid, "reason": "SPEAKER_CONFLICT", "details": "Speaker has at least one impossible session"})
                elif sid in {item["sessionId"] for item in scheduled}:
                    unscheduled.append({"sessionId": sid, "reason": "SPEAKER_CONFLICT", "details": "Speaker has at least one impossible session"})
                    scheduled[:] = [item for item in scheduled if item["sessionId"] != sid]

    for session in sessions:
        session_id = str(session.get("id", ""))
        if session_id not in {item["sessionId"] for item in scheduled} and not any(item["sessionId"] == session_id for item in unscheduled):
            unscheduled.append({"sessionId": session_id, "reason": "INVALID_DATA", "details": "Unable to schedule session"})

    scheduled_count = len(scheduled)
    unscheduled_count = len(unscheduled)
    total_speaker_count = len({str(s.get("speakerId", "")) for s in sessions if s.get("speakerId")})
    total_room_minutes = sum(
        sum(_to_minutes(w["end"]) - _to_minutes(w["start"]) for w in room.get("availableWindows", []))
        for room in rooms
    )
    scheduled_minutes = sum(
        _to_minutes(item["endTime"]) - _to_minutes(item["startTime"]) for item in scheduled
    )
    utilization = (scheduled_minutes / total_room_minutes * 100) if total_room_minutes else 0.0

    result = {
        "scheduled": scheduled,
        "unscheduled": unscheduled,
        "scheduledCount": scheduled_count,
        "unscheduledCount": unscheduled_count,
        "metrics": {
            "totalSessions": len(sessions),
            "scheduledCount": scheduled_count,
            "unscheduledCount": unscheduled_count,
            "totalSpeakerCount": total_speaker_count,
            "roomUtilizationPercentage": round(utilization, 2),
        },
    }
    return result
