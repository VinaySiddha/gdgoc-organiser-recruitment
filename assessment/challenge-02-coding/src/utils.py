"""
utils.py — Utility functions for the scheduler.

Provides:
  • Time arithmetic (HH:MM string ↔ minutes-since-midnight)
  • Topological sort with cycle detection (Kahn's algorithm)
  • Input validators
"""

from __future__ import annotations

from collections import defaultdict, deque
from typing import Dict, List, Set, Tuple

from models import Session, Room, TimeWindow


# ── Time helpers ─────────────────────────────────────────────────────────

def time_to_minutes(t: str) -> int:
    """Convert 'HH:MM' to minutes since midnight."""
    parts = t.strip().split(":")
    if len(parts) != 2:
        raise ValueError(f"Invalid time format: {t!r} — expected 'HH:MM'")
    h, m = int(parts[0]), int(parts[1])
    if not (0 <= h <= 23 and 0 <= m <= 59):
        raise ValueError(f"Time out of range: {t!r}")
    return h * 60 + m


def minutes_to_time(m: int) -> str:
    """Convert minutes since midnight back to 'HH:MM'."""
    if m < 0:
        raise ValueError(f"Negative minutes: {m}")
    return f"{m // 60:02d}:{m % 60:02d}"


# ── Topological sort with cycle detection (Kahn's algorithm) ─────────────

def topological_sort_with_cycles(
    sessions: List[Session],
) -> Tuple[List[str], Set[str]]:
    """
    Perform a topological sort of session IDs based on prerequisite
    dependencies.  Returns ``(ordered_ids, cyclic_ids)`` where:

    • ``ordered_ids`` — IDs in valid dependency order (prerequisites first)
    • ``cyclic_ids``  — IDs involved in (or downstream of) a cycle

    Uses Kahn's algorithm (BFS) so that cycles are naturally detected as
    the set of nodes that are never enqueued.
    """
    session_ids: Set[str] = {s.id for s in sessions}

    # Build adjacency list and in-degree map (only for edges within session_ids)
    adj: Dict[str, List[str]] = defaultdict(list)
    in_degree: Dict[str, int] = {sid: 0 for sid in session_ids}

    for s in sessions:
        for prereq in s.prerequisites:
            if prereq in session_ids:
                adj[prereq].append(s.id)
                in_degree[s.id] += 1

    # Seed the queue with nodes that have no in-edges
    queue: deque[str] = deque(
        sid for sid, deg in in_degree.items() if deg == 0
    )
    ordered: List[str] = []

    while queue:
        node = queue.popleft()
        ordered.append(node)
        for neighbour in adj[node]:
            in_degree[neighbour] -= 1
            if in_degree[neighbour] == 0:
                queue.append(neighbour)

    cyclic = session_ids - set(ordered)
    return ordered, cyclic


# ── Input validation ─────────────────────────────────────────────────────

def validate_session(s: Session) -> List[str]:
    """Return a list of validation error strings (empty if valid)."""
    errors: List[str] = []
    if not s.id:
        errors.append("Session id is empty")
    if s.duration_minutes <= 0:
        errors.append(f"Session {s.id}: duration must be > 0")
    if s.expected_attendees < 0:
        errors.append(f"Session {s.id}: expected_attendees must be >= 0")
    if not (0 <= s.popularity_score <= 100):
        errors.append(f"Session {s.id}: popularity_score must be 0–100")
    return errors


def validate_room(r: Room) -> List[str]:
    """Return a list of validation error strings (empty if valid)."""
    errors: List[str] = []
    if not r.id:
        errors.append("Room id is empty")
    if r.capacity <= 0:
        errors.append(f"Room {r.id}: capacity must be > 0")
    for w in r.available_windows:
        try:
            s = time_to_minutes(w.start)
            e = time_to_minutes(w.end)
            if s >= e:
                errors.append(
                    f"Room {r.id}: window {w.start}–{w.end} start >= end"
                )
        except ValueError as exc:
            errors.append(f"Room {r.id}: {exc}")
    return errors
