import math
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
            if isinstance(s, dict) and s.get("id") is not None and str(s["id"]).strip():
                all_session_ids.add(str(s["id"]).strip())

    if isinstance(sessions, list):
        for s in sessions:
            if not isinstance(s, dict):
                invalid_session_errors.append({
                    "sessionId": "UNKNOWN_SESSION",
                    "reason": "INVALID_DATA",
                    "details": "Session entry is not a dictionary"
                })
                continue

            raw_id = s.get("id")
            s_id = str(raw_id).strip() if raw_id is not None else ""
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

            title_val = s.get("title")
            if title_val is None or not str(title_val).strip():
                invalid_session_errors.append({
                    "sessionId": s_id,
                    "reason": "INVALID_DATA",
                    "details": f"Missing title for session {s_id}"
                })
                continue

            speaker_val = s.get("speakerId")
            if speaker_val is None or not str(speaker_val).strip():
                invalid_session_errors.append({
                    "sessionId": s_id,
                    "reason": "INVALID_DATA",
                    "details": f"Missing speaker ID for session {s_id}"
                })
                continue

            dur = s.get("durationMinutes")
            if (
                dur is None or
                not isinstance(dur, (int, float)) or
                isinstance(dur, bool) or
                math.isnan(dur) or
                not math.isfinite(dur) or
                dur <= 0 or
                dur > 1440 or
                dur % 1 != 0
            ):
                invalid_session_errors.append({
                    "sessionId": s_id,
                    "reason": "INVALID_DATA",
                    "details": f"Invalid durationMinutes ({dur}) for session {s_id}"
                })
                continue

            att = s.get("expectedAttendees")
            if (
                att is None or
                not isinstance(att, (int, float)) or
                isinstance(att, bool) or
                math.isnan(att) or
                not math.isfinite(att) or
                att < 0 or
                att % 1 != 0
            ):
                invalid_session_errors.append({
                    "sessionId": s_id,
                    "reason": "INVALID_DATA",
                    "details": f"Invalid expectedAttendees ({att}) for session {s_id}"
                })
                continue

            pop = s.get("popularityScore")
            if (
                pop is None or
                not isinstance(pop, (int, float)) or
                isinstance(pop, bool) or
                math.isnan(pop) or
                not math.isfinite(pop) or
                pop < 1 or
                pop > 100 or
                pop % 1 != 0
            ):
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
                if str(p).strip() not in all_session_ids:
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
                "prerequisites": [str(p).strip() for p in prereqs],
                "tags": s.get("tags", []) if isinstance(s.get("tags"), list) else []
            })

    seen_room_ids = set()
    if isinstance(rooms, list):
        for r in rooms:
            if not isinstance(r, dict):
                continue
            raw_r_id = r.get("id")
            r_id = str(raw_r_id).strip() if raw_r_id is not None else ""
            if not r_id or r_id in seen_room_ids:
                continue
            seen_room_ids.add(r_id)

            cap = r.get("capacity")
            if (
                cap is None or
                not isinstance(cap, (int, float)) or
                isinstance(cap, bool) or
                math.isnan(cap) or
                not math.isfinite(cap) or
                cap <= 0
            ):
                continue

            valid_windows = []
            windows = r.get("availableWindows", [])
            if isinstance(windows, list):
                for w in windows:
                    if isinstance(w, dict) and "start" in w and "end" in w:
                        s_min = time_to_minutes(str(w["start"]))
                        e_min = time_to_minutes(str(w["end"]))
                        if s_min >= 0 and e_min >= 0 and s_min < e_min:
                            valid_windows.append({"start": str(w["start"]), "end": str(w["end"])})

            if valid_windows:
                valid_rooms.append({
                    "id": r_id,
                    "name": str(r.get("name") if r.get("name") is not None else r_id).strip(),
                    "capacity": int(cap),
                    "availableWindows": valid_windows
                })

    return valid_sessions, valid_rooms, invalid_session_errors
