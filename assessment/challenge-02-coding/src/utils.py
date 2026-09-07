# utils.py - Time conversion, interval checks, graph algorithms, and cycle detection

import re
from typing import List, Dict, Set, Tuple

def time_to_minutes(time_str: str) -> int:
    """Converts 'HH:MM' 24-hour string to total minutes from midnight (0 to 1439)."""
    if not time_str or not isinstance(time_str, str):
        return -1
    match = re.match(r"^(\d{2}):(\d{2})$", time_str.strip())
    if not match:
        return -1
    hours, minutes = int(match.group(1)), int(match.group(2))
    if hours < 0 or hours > 23 or minutes < 0 or minutes > 59:
        return -1
    return hours * 60 + minutes

def minutes_to_time(minutes: int) -> str:
    """Converts minutes from midnight back to 'HH:MM' 24-hour string."""
    if minutes < 0 or minutes >= 1440:
        return "00:00"
    hours = minutes // 60
    mins = minutes % 60
    return f"{hours:02d}:{mins:02d}"

def intervals_overlap(start1: int, end1: int, start2: int, end2: int) -> bool:
    """Checks if two time intervals [start1, end1) and [start2, end2) overlap."""
    return max(start1, start2) < min(end1, end2)

def detect_cycles(session_ids: List[str], prereq_map: Dict[str, List[str]]) -> Tuple[Set[str], bool]:
    """
    Detects cycles in prerequisite graph using three-color DFS.
    Returns (cyclic_session_ids, has_cycle).
    """
    cyclic_session_ids: Set[str] = set()
    state: Dict[str, int] = {}  # 0: unvisited, 1: visiting, 2: visited

    def dfs(node: str, path: List[str]):
        state[node] = 1
        path.append(node)

        prereqs = prereq_map.get(node, [])
        for p in prereqs:
            if p not in prereq_map:
                continue
            p_state = state.get(p, 0)
            if p_state == 1:
                # Cycle found
                if p in path:
                    idx = path.index(p)
                    for n in path[idx:]:
                        cyclic_session_ids.add(n)
                else:
                    cyclic_session_ids.add(p)
                    cyclic_session_ids.add(node)
            elif p_state == 0:
                dfs(p, path)

        path.pop()
        state[node] = 2

    for s_id in session_ids:
        if state.get(s_id, 0) == 0:
            dfs(s_id, [])

    # Propagate to dependent nodes
    changed = True
    while changed:
        changed = False
        for s_id in session_ids:
            if s_id not in cyclic_session_ids:
                prereqs = prereq_map.get(s_id, [])
                if any(p in cyclic_session_ids for p in prereqs):
                    cyclic_session_ids.add(s_id)
                    changed = True

    return cyclic_session_ids, len(cyclic_session_ids) > 0

def compute_dependency_depths(valid_session_ids: List[str], prereq_map: Dict[str, List[str]]) -> Dict[str, int]:
    """Computes topological depth for sessions."""
    depths: Dict[str, int] = {}
    valid_set = set(valid_session_ids)

    def get_depth(node: str, visited: Set[str]) -> int:
        if node in depths:
            return depths[node]
        if node in visited:
            return 0
        visited.add(node)

        prereqs = prereq_map.get(node, [])
        max_p = 0
        for p in prereqs:
            if p in valid_set:
                max_p = max(max_p, 1 + get_depth(p, set(visited)))
        depths[node] = max_p
        return max_p

    for s_id in valid_session_ids:
        get_depth(s_id, set())

    return depths
