# scheduler.py - Deterministic Algorithmic Conference Scheduler
# Implements Topological Graph Resolution, Cycle Detection, Capacity Matching, Speaker Interval Conflict Tracking, and Turnover Buffers

from typing import List, Dict, Optional, Any, Set, Tuple
from utils import (
    time_to_minutes,
    minutes_to_time,
    intervals_overlap,
    detect_cycles,
    compute_dependency_depths,
)
from validation import validate_scheduler_inputs

class ConferenceScheduler:
    def __init__(self, buffer_minutes: int = 10):
        self.buffer_minutes = max(0, buffer_minutes)

    def schedule(
        self,
        sessions: List[Dict[str, Any]],
        rooms: List[Dict[str, Any]],
        buffer_minutes: Optional[int] = None
    ) -> Dict[str, Any]:
        buffer = self.buffer_minutes if buffer_minutes is None else max(0, buffer_minutes)
        total_input_count = len(sessions) if isinstance(sessions, list) else 0

        speaker_ids: Set[str] = set()
        if isinstance(sessions, list):
            for s in sessions:
                if isinstance(s, dict) and str(s.get("speakerId", "")).strip():
                    speaker_ids.add(str(s["speakerId"]).strip())

        # 1. Input Validation
        valid_sessions, valid_rooms, invalid_session_errors = validate_scheduler_inputs(sessions, rooms)
        scheduled: List[Dict[str, Any]] = []
        unscheduled: List[Dict[str, Any]] = list(invalid_session_errors)

        if not valid_rooms:
            for vs in valid_sessions:
                unscheduled.append({
                    "sessionId": vs["id"],
                    "reason": "INSUFFICIENT_CAPACITY",
                    "details": "No valid rooms available for scheduling"
                })
            return self._build_output(total_input_count, scheduled, unscheduled, len(speaker_ids), valid_rooms)

        # 2. Prerequisite Graph & Cycle Detection
        prereq_map: Dict[str, List[str]] = {vs["id"]: vs.get("prerequisites", []) for vs in valid_sessions}
        session_map: Dict[str, Dict[str, Any]] = {vs["id"]: vs for vs in valid_sessions}

        cyclic_session_ids, _ = detect_cycles([vs["id"] for vs in valid_sessions], prereq_map)

        non_cyclic_sessions: List[Dict[str, Any]] = []
        for vs in valid_sessions:
            if vs["id"] in cyclic_session_ids:
                unscheduled.append({
                    "sessionId": vs["id"],
                    "reason": "CIRCULAR_PREREQUISITE",
                    "details": f"Session {vs['id']} is part of or depends on a cyclic prerequisite graph"
                })
            else:
                non_cyclic_sessions.append(vs)

        # 3. Dependency Depth & Sorting
        non_cyclic_ids = [s["id"] for s in non_cyclic_sessions]
        depths = compute_dependency_depths(non_cyclic_ids, prereq_map)

        # Deterministic sort
        def sort_key(s: Dict[str, Any]):
            return (
                depths.get(s["id"], 0),
                -s["popularityScore"],
                -s["expectedAttendees"],
                s["durationMinutes"],
                s["id"]
            )

        non_cyclic_sessions.sort(key=sort_key)

        # 4. State Tracking
        speaker_schedules: Dict[str, List[Tuple[int, int]]] = {}
        room_schedules: Dict[str, List[Tuple[int, int, str]]] = {r["id"]: [] for r in valid_rooms}
        session_end_times: Dict[str, int] = {}

        # 5. Greedy Scheduling
        for session in non_cyclic_sessions:
            s_id = session["id"]
            prereqs = session.get("prerequisites", [])

            # Check prerequisites completion
            missing_prereq = False
            max_prereq_end = 0
            for p in prereqs:
                if p not in session_end_times:
                    missing_prereq = True
                    break
                max_prereq_end = max(max_prereq_end, session_end_times[p])

            if missing_prereq:
                unscheduled.append({
                    "sessionId": s_id,
                    "reason": "INSUFFICIENT_TIME",
                    "details": f"Prerequisites for session {s_id} could not be completed in time"
                })
                continue

            # Candidate rooms with capacity
            candidate_rooms = [r for r in valid_rooms if r["capacity"] >= session["expectedAttendees"]]
            if not candidate_rooms:
                unscheduled.append({
                    "sessionId": s_id,
                    "reason": "INSUFFICIENT_CAPACITY",
                    "details": f"No room has sufficient capacity for {session['expectedAttendees']} attendees"
                })
                continue

            # Sort candidate rooms by capacity ascending, then room id
            candidate_rooms.sort(key=lambda r: (r["capacity"], r["id"]))

            best_slot: Optional[Dict[str, Any]] = None
            speaker_conflict_occurred = False

            for room in candidate_rooms:
                existing_r_intervals = room_schedules.get(room["id"], [])
                for window in room["availableWindows"]:
                    w_start = time_to_minutes(window["start"])
                    w_end = time_to_minutes(window["end"])

                    if w_start < 0 or w_end < 0 or w_end - w_start < session["durationMinutes"]:
                        continue

                    candidate_starts = [max(w_start, max_prereq_end)]
                    for r_start, r_end, _ in existing_r_intervals:
                        pot_start = max(r_end + buffer, max_prereq_end)
                        if pot_start >= w_start and pot_start + session["durationMinutes"] <= w_end:
                            candidate_starts.append(pot_start)

                    unique_starts = sorted(list(set(candidate_starts)))

                    for start_cand in unique_starts:
                        end_cand = start_cand + session["durationMinutes"]
                        if start_cand < w_start or end_cand > w_end:
                            continue

                        # Check room overlap
                        room_overlap = False
                        for r_start, r_end, _ in existing_r_intervals:
                            if intervals_overlap(start_cand, end_cand, r_start, r_end + buffer) or \
                               (start_cand < r_start and end_cand + buffer > r_start):
                                room_overlap = True
                                break
                        if room_overlap:
                            continue

                        # Check speaker overlap
                        speaker_intervals = speaker_schedules.get(session["speakerId"], [])
                        spk_overlap = False
                        for spk_start, spk_end in speaker_intervals:
                            if intervals_overlap(start_cand, end_cand, spk_start, spk_end):
                                spk_overlap = True
                                speaker_conflict_occurred = True
                                break
                        if spk_overlap:
                            continue

                        # Feasible slot found
                        if best_slot is None or start_cand < best_slot["startMin"]:
                            best_slot = {
                                "roomId": room["id"],
                                "startMin": start_cand,
                                "endMin": end_cand
                            }
                            break

            if best_slot:
                scheduled.append({
                    "sessionId": s_id,
                    "roomId": best_slot["roomId"],
                    "startTime": minutes_to_time(best_slot["startMin"]),
                    "endTime": minutes_to_time(best_slot["endMin"])
                })
                session_end_times[s_id] = best_slot["endMin"]

                room_schedules[best_slot["roomId"]].append(
                    (best_slot["startMin"], best_slot["endMin"], s_id)
                )
                room_schedules[best_slot["roomId"]].sort(key=lambda x: x[0])

                if session["speakerId"] not in speaker_schedules:
                    speaker_schedules[session["speakerId"]] = []
                speaker_schedules[session["speakerId"]].append(
                    (best_slot["startMin"], best_slot["endMin"])
                )
                speaker_schedules[session["speakerId"]].sort(key=lambda x: x[0])
            else:
                reason = "SPEAKER_CONFLICT" if speaker_conflict_occurred else "INSUFFICIENT_TIME"
                unscheduled.append({
                    "sessionId": s_id,
                    "reason": reason,
                    "details": "Could not find an available conflict-free time slot"
                })

        scheduled.sort(key=lambda s: (time_to_minutes(s["startTime"]), s["roomId"], s["sessionId"]))
        unscheduled.sort(key=lambda u: u["sessionId"])

        return self._build_output(total_input_count, scheduled, unscheduled, len(speaker_ids), valid_rooms)

    def _build_output(
        self,
        total_sessions: int,
        scheduled: List[Dict[str, Any]],
        unscheduled: List[Dict[str, Any]],
        total_speaker_count: int,
        rooms: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        total_scheduled_minutes = 0
        for s in scheduled:
            s_min = time_to_minutes(s["startTime"])
            e_min = time_to_minutes(s["endTime"])
            if s_min >= 0 and e_min >= s_min:
                total_scheduled_minutes += e_min - s_min

        total_available_minutes = 0
        for r in rooms:
            for w in r.get("availableWindows", []):
                s_min = time_to_minutes(w["start"])
                e_min = time_to_minutes(w["end"])
                if s_min >= 0 and e_min >= s_min:
                    total_available_minutes += e_min - s_min

        utilization = (
            round((total_scheduled_minutes / total_available_minutes) * 100, 2)
            if total_available_minutes > 0
            else 0.0
        )

        return {
            "scheduled": scheduled,
            "unscheduled": unscheduled,
            "metrics": {
                "totalSessions": total_sessions,
                "scheduledCount": len(scheduled),
                "unscheduledCount": len(unscheduled),
                "totalSpeakerCount": total_speaker_count,
                "roomUtilizationPercentage": utilization
            }
        }
