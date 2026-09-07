"""
scheduler.py — GDG DevFest Smart Session & Track Scheduler

Algorithm overview
──────────────────
1. **Validate** all sessions and rooms; reject invalid data immediately.
2. **Detect cycles** in the prerequisite graph via Kahn's topological sort.
   Cyclic sessions are classified as CIRCULAR_PREREQUISITE and excluded.
3. **Filter capacity** — sessions requiring more seats than the largest room
   are classified as INSUFFICIENT_CAPACITY.
4. **Schedule greedily** in topological (dependency-safe) order, breaking
   ties by descending `popularity_score`.  For each session we try every
   eligible room (sorted by best-fit capacity ascending) and every
   available time slot (earliest-fit), also checking that the speaker is
   free during that interval.
5. **Compute metrics** — total counts + room utilisation percentage.

Complexity
──────────
• V = sessions, E = prerequisite edges, R = rooms, W = time-windows
• Topological sort:  O(V + E)
• Greedy placement:  O(V × R × W)  (each room maintains a sorted free-slot
  list; slot splitting is O(W) amortised)
• Overall:  O(V·R·W + E)  — comfortably sub-second for 100+ sessions / 10 rooms.
"""

from __future__ import annotations

from collections import defaultdict
from typing import Dict, List, Optional, Set, Tuple

from models import (
    Room,
    ScheduleMetrics,
    ScheduleOutput,
    ScheduledSession,
    Session,
    TimeWindow,
    UnscheduledSession,
)
from utils import (
    minutes_to_time,
    time_to_minutes,
    topological_sort_with_cycles,
    validate_room,
    validate_session,
)


# ── Internal helpers ─────────────────────────────────────────────────────

class _FreeSlot:
    """Mutable representation of a free time block in a room."""
    __slots__ = ("start", "end")

    def __init__(self, start: int, end: int) -> None:
        self.start = start   # minutes since midnight
        self.end = end

    def duration(self) -> int:
        return self.end - self.start

    def __repr__(self) -> str:
        return f"[{minutes_to_time(self.start)}–{minutes_to_time(self.end)}]"


def _build_free_slots(room: Room) -> List[_FreeSlot]:
    """Convert room availability windows to sorted free-slot list."""
    slots: List[_FreeSlot] = []
    for w in room.available_windows:
        s = time_to_minutes(w.start)
        e = time_to_minutes(w.end)
        if s < e:
            slots.append(_FreeSlot(s, e))
    slots.sort(key=lambda sl: sl.start)
    return slots


# ── Main scheduler ───────────────────────────────────────────────────────

def schedule(
    sessions: List[Session],
    rooms: List[Room],
    buffer_minutes: int = 10,
) -> ScheduleOutput:
    """
    Produce a conflict-free conference schedule respecting all hard
    constraints.

    Parameters
    ----------
    sessions : list[Session]
        Sessions to schedule (may be empty).
    rooms : list[Room]
        Available rooms (may be empty).
    buffer_minutes : int
        Turnover gap between consecutive sessions in the same room.

    Returns
    -------
    ScheduleOutput
        Contains ``scheduled``, ``unscheduled``, and ``metrics``.
    """
    output = ScheduleOutput()
    output.metrics.total_sessions = len(sessions)

    if not sessions:
        output.metrics.total_speaker_count = 0
        return output

    # ── Step 1: Validate inputs ──────────────────────────────────────
    valid_sessions: List[Session] = []
    for s in sessions:
        errors = validate_session(s)
        if errors:
            output.unscheduled.append(
                UnscheduledSession(s.id, "INVALID_DATA", "; ".join(errors))
            )
        else:
            valid_sessions.append(s)

    for r in rooms:
        errors = validate_room(r)
        if errors:
            # We skip bad rooms but don't fail the whole run
            pass  # Could log a warning

    valid_rooms = [r for r in rooms if not validate_room(r)]

    # ── Step 2: Detect prerequisite cycles ───────────────────────────
    ordered_ids, cyclic_ids = topological_sort_with_cycles(valid_sessions)
    session_map: Dict[str, Session] = {s.id: s for s in valid_sessions}

    for cid in cyclic_ids:
        output.unscheduled.append(
            UnscheduledSession(
                cid,
                "CIRCULAR_PREREQUISITE",
                f"Session {cid} is part of a dependency cycle",
            )
        )

    schedulable_ids = [sid for sid in ordered_ids if sid not in cyclic_ids]

    # ── Step 3: Check capacity feasibility ───────────────────────────
    max_capacity = max((r.capacity for r in valid_rooms), default=0)
    capacity_ok: List[str] = []
    for sid in schedulable_ids:
        s = session_map[sid]
        if s.expected_attendees > max_capacity and max_capacity > 0:
            output.unscheduled.append(
                UnscheduledSession(
                    sid,
                    "INSUFFICIENT_CAPACITY",
                    f"Needs {s.expected_attendees} seats; largest room has {max_capacity}",
                )
            )
        elif not valid_rooms:
            output.unscheduled.append(
                UnscheduledSession(
                    sid,
                    "INSUFFICIENT_CAPACITY",
                    "No valid rooms available",
                )
            )
        else:
            capacity_ok.append(sid)

    # ── Step 4: Greedy schedule ──────────────────────────────────────
    # Sort schedulable sessions: topological order first, then by
    # descending popularity within the same topo-level.
    topo_rank = {sid: i for i, sid in enumerate(ordered_ids)}
    capacity_ok.sort(
        key=lambda sid: (topo_rank.get(sid, 999999), -session_map[sid].popularity_score)
    )

    # Room free-slot tracker
    room_slots: Dict[str, List[_FreeSlot]] = {
        r.id: _build_free_slots(r) for r in valid_rooms
    }

    # Speaker busy intervals: speaker_id → list of (start, end) minutes
    speaker_busy: Dict[str, List[Tuple[int, int]]] = defaultdict(list)

    # Track session end times for prerequisite ordering
    session_end_time: Dict[str, int] = {}

    for sid in capacity_ok:
        s = session_map[sid]

        # Determine earliest allowed start (prerequisite constraint)
        earliest_start = 0
        for prereq_id in s.prerequisites:
            if prereq_id in session_end_time:
                earliest_start = max(earliest_start, session_end_time[prereq_id])

        placed = _try_place_session(
            s,
            valid_rooms,
            room_slots,
            speaker_busy,
            session_end_time,
            earliest_start,
            buffer_minutes,
        )

        if placed:
            output.scheduled.append(placed)
            session_end_time[sid] = time_to_minutes(placed.end_time)
        else:
            # Determine the most likely reason
            reason = _classify_failure(
                s, valid_rooms, speaker_busy, room_slots, earliest_start, buffer_minutes
            )
            output.unscheduled.append(
                UnscheduledSession(sid, reason, f"Could not find a valid slot")
            )

    # ── Step 5: Compute metrics ──────────────────────────────────────
    all_speakers: Set[str] = {s.speaker_id for s in sessions}
    output.metrics.scheduled_count = len(output.scheduled)
    output.metrics.unscheduled_count = len(output.unscheduled)
    output.metrics.total_speaker_count = len(all_speakers)
    output.metrics.room_utilization_percentage = _compute_utilization(
        output.scheduled, valid_rooms
    )

    return output


def _try_place_session(
    session: Session,
    rooms: List[Room],
    room_slots: Dict[str, List[_FreeSlot]],
    speaker_busy: Dict[str, List[Tuple[int, int]]],
    session_end_time: Dict[str, int],
    earliest_start: int,
    buffer_minutes: int,
) -> Optional[ScheduledSession]:
    """
    Try to place *session* in the earliest available slot across all
    eligible rooms.  Returns a ScheduledSession on success or None.
    """
    duration = session.duration_minutes

    # Sort rooms by best-fit capacity (ascending) to maximise utilisation
    eligible_rooms = sorted(
        [r for r in rooms if r.capacity >= session.expected_attendees],
        key=lambda r: r.capacity,
    )

    best: Optional[ScheduledSession] = None
    best_start: int = 999999

    for room in eligible_rooms:
        slots = room_slots[room.id]
        for slot in slots:
            # Effective start: max(slot.start, earliest_start) + possible buffer
            effective_start = max(slot.start, earliest_start)

            # If this is not the very first moment of the slot, we need the
            # buffer from whatever ended just before.  However, if effective_start
            # == slot.start there's no prior session in this gap, so no buffer
            # needed at the very start of a free window.
            if effective_start > slot.start:
                # We are inserting after a prior session ended — apply buffer
                effective_start = max(effective_start, effective_start)
                # Buffer is already accounted for in how we split slots (below)

            end = effective_start + duration
            if end > slot.end:
                continue  # doesn't fit

            # Check speaker conflict
            if _speaker_conflicts(
                session.speaker_id, effective_start, end, speaker_busy
            ):
                continue

            if effective_start < best_start:
                best_start = effective_start
                best = ScheduledSession(
                    session_id=session.id,
                    room_id=room.id,
                    start_time=minutes_to_time(effective_start),
                    end_time=minutes_to_time(end),
                )
                best_room_id = room.id
                best_slot = slot
                best_end = end

    if best is not None:
        # Commit: update room free-slots and speaker busy list
        _consume_slot(
            room_slots[best.room_id],  # type: ignore[arg-type]
            best_start,
            best_end,
            buffer_minutes,
        )
        speaker_busy[session.speaker_id].append((best_start, best_end))
        return best

    return None


def _speaker_conflicts(
    speaker_id: str,
    start: int,
    end: int,
    speaker_busy: Dict[str, List[Tuple[int, int]]],
) -> bool:
    """Return True if the speaker has a conflicting booking."""
    for busy_start, busy_end in speaker_busy.get(speaker_id, []):
        if start < busy_end and end > busy_start:
            return True
    return False


def _consume_slot(
    slots: List[_FreeSlot],
    start: int,
    end: int,
    buffer: int,
) -> None:
    """
    Remove [start, end + buffer] from the free-slot list, splitting
    the enclosing slot into at most two residual slots.
    """
    for i, slot in enumerate(slots):
        if slot.start <= start and end <= slot.end:
            new_slots: List[_FreeSlot] = []
            # Left residual
            if slot.start < start:
                new_slots.append(_FreeSlot(slot.start, start))
            # Right residual (after buffer)
            right_start = end + buffer
            if right_start < slot.end:
                new_slots.append(_FreeSlot(right_start, slot.end))
            slots[i : i + 1] = new_slots
            return


def _classify_failure(
    session: Session,
    rooms: List[Room],
    speaker_busy: Dict[str, List[Tuple[int, int]]],
    room_slots: Dict[str, List[_FreeSlot]],
    earliest_start: int,
    buffer: int,
) -> str:
    """Determine the most likely reason a session could not be placed."""
    eligible = [r for r in rooms if r.capacity >= session.expected_attendees]
    if not eligible:
        return "INSUFFICIENT_CAPACITY"

    # Check if any room has enough time
    has_time = False
    for r in eligible:
        for slot in room_slots[r.id]:
            effective_start = max(slot.start, earliest_start)
            if effective_start + session.duration_minutes <= slot.end:
                has_time = True
                break

    if not has_time:
        return "INSUFFICIENT_TIME"

    # If time exists but we couldn't place, it's a speaker conflict
    return "SPEAKER_CONFLICT"


def _compute_utilization(
    scheduled: List[ScheduledSession],
    rooms: List[Room],
) -> float:
    """Compute overall room utilisation as a percentage."""
    if not rooms:
        return 0.0

    total_available = 0
    for r in rooms:
        for w in r.available_windows:
            total_available += time_to_minutes(w.end) - time_to_minutes(w.start)

    if total_available == 0:
        return 0.0

    total_used = 0
    for s in scheduled:
        total_used += time_to_minutes(s.end_time) - time_to_minutes(s.start_time)

    return min((total_used / total_available) * 100.0, 100.0)
