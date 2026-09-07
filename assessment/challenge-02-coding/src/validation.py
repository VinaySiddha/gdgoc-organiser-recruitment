# validation.py - Input Validation for Conference Scheduler

from typing import List, Dict, Tuple, Any
from utils import time_to_minutes

def validate_scheduler_inputs(
    sessions: List[Dict[str, Any]],
    rooms: List[Dict[str, Any]]
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Validates input sessions and rooms.
    Returns (valid_sessions, valid_rooms, invalid_session_errors).
    """
    valid_sessions: List[Dict[str, Any]] = []
    invalid_session_errors: List[Dict[str, Any]] = []
    valid_rooms: List[Dict[str, Any]] = []

    seen_session_ids = set()
    all_session_ids = set()

    if isinstance(sessions, list):
        for s in sessions:
            if isinstance(s, dict) and str(s.get("id", "")).strip():
                all_session_ids.add(str(s["id"]).strip())

    if isinstance(sessions, list):
        for s in sessions:
            if not isinstance(s, dict):
                continue
            s_id = str(s.get("id", "")).strip()
            if not s_id:
                invalid_session_errors.append({
                    "sessionId": "UNKNOWN_SESSION",
                    "reason": "INVALID_DATA",
                    "details": "Missing or empty session ID"
                })
                continue

            if s_id in seen_session_ids:
                invalid_session_errors.append({
                    "sessionId": s_id,
                    "reason": "INVALID_DATA",
                    "details": f"Duplicate session ID: {s_id}"
                })
                continue
            seen_session_ids.add(s_id)

            if not str(s.get("title", "")).strip():
                invalid_session_errors.append({
                    "sessionId": s_id,
                    "reason": "INVALID_DATA",
                    "details": f"Missing title for session {s_id}"
                })
                continue

            if not str(s.get("speakerId", "")).strip():
                invalid_session_errors.append({
                    "sessionId": s_id,
                    "reason": "INVALID_DATA",
                    "details": f"Missing speaker ID for session {s_id}"
                })
                continue

            dur = s.get("durationMinutes")
            if not isinstance(dur, (int, float)) or dur <= 0 or dur > 1440:
                invalid_session_errors.append({
                    "sessionId": s_id,
                    "reason": "INVALID_DATA",
                    "details": f"Invalid durationMinutes ({dur}) for session {s_id}"
                })
                continue

            att = s.get("expectedAttendees")
            if not isinstance(att, (int, float)) or att < 0:
                invalid_session_errors.append({
                    "sessionId": s_id,
                    "reason": "INVALID_DATA",
                    "details": f"Invalid expectedAttendees ({att}) for session {s_id}"
                })
                continue

            pop = s.get("popularityScore")
            if not isinstance(pop, (int, float)) or pop < 1 or pop > 100:
                invalid_session_errors.append({
                    "sessionId": s_id,
                    "reason": "INVALID_DATA",
                    "details": f"Invalid popularityScore ({pop}) for session {s_id}"
                })
                continue

            prereqs = s.get("prerequisites", [])
            if not isinstance(prereqs, list):
                prereqs = []
            
            if s_id in prereqs:
                invalid_session_errors.append({
                    "sessionId": s_id,
                    "reason": "CIRCULAR_PREREQUISITE",
                    "details": f"Session {s_id} lists itself as prerequisite"
                })
                continue

            has_unknown_prereq = False
            for p in prereqs:
                if p not in all_session_ids:
                    invalid_session_errors.append({
                        "sessionId": s_id,
                        "reason": "INVALID_DATA",
                        "details": f"Session {s_id} references unknown prerequisite {p}"
                    })
                    has_unknown_prereq = True
                    break
            if has_unknown_prereq:
                continue

            valid_sessions.append({
                "id": s_id,
                "title": str(s["title"]).strip(),
                "speakerId": str(s["speakerId"]).strip(),
                "durationMinutes": int(dur),
                "expectedAttendees": int(att),
                "popularityScore": int(pop),
                "prerequisites": prereqs,
                "tags": s.get("tags", [])
            })

    seen_room_ids = set()
    if isinstance(rooms, list):
        for r in rooms:
            if not isinstance(r, dict):
                continue
            r_id = str(r.get("id", "")).strip()
            if not r_id or r_id in seen_room_ids:
                continue
            seen_room_ids.add(r_id)

            cap = r.get("capacity")
            if not isinstance(cap, (int, float)) or cap <= 0:
                continue

            valid_windows = []
            windows = r.get("availableWindows", [])
            if isinstance(windows, list):
                for w in windows:
                    if isinstance(w, dict) and "start" in w and "end" in w:
                        s_min = time_to_minutes(w["start"])
                        e_min = time_to_minutes(w["end"])
                        if s_min >= 0 and e_min >= 0 and s_min < e_min:
                            valid_windows.append({"start": w["start"], "end": w["end"]})

            if valid_windows:
                valid_rooms.append({
                    "id": r_id,
                    "name": str(r.get("name", r_id)).strip(),
                    "capacity": int(cap),
                    "availableWindows": valid_windows
                })

    return valid_sessions, valid_rooms, invalid_session_errors
