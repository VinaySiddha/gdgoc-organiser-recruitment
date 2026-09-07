// utils.ts - Time conversion, interval checks, graph algorithms, and cycle detection

/**
 * Converts "HH:MM" 24-hour string to total minutes from midnight (0 to 1439).
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') return -1;
  const match = timeStr.match(/^(\d{2}):(\d{2})$/);
  if (!match) return -1;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return -1;
  return hours * 60 + minutes;
}

/**
 * Converts minutes from midnight back to "HH:MM" 24-hour string.
 */
export function minutesToTime(minutes: number): string {
  if (typeof minutes !== 'number' || isNaN(minutes) || !isFinite(minutes) || minutes < 0 || minutes >= 1440) {
    return '00:00';
  }
  const totalMinutes = Math.floor(minutes);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Checks if two time intervals [start1, end1) and [start2, end2) overlap.
 */
export function intervalsOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean {
  return Math.max(start1, start2) < Math.min(end1, end2);
}

/**
 * Detects cycles in prerequisite graph using three-color DFS.
 * Returns a set of session IDs that are part of a cycle or depend on a cycle.
 */
export function detectCycles(
  sessionIds: string[],
  prereqMap: Map<string, string[]>
): { cyclicSessionIds: Set<string>; hasCycle: boolean } {
  const cyclicSessionIds = new Set<string>();
  const state = new Map<string, number>(); // 0: unvisited, 1: visiting, 2: visited

  // 1. Direct cycle detection via DFS
  function dfs(node: string, path: string[]): boolean {
    state.set(node, 1); // visiting
    path.push(node);

    const prereqs = prereqMap.get(node) || [];
    for (const prereq of prereqs) {
      if (!prereqMap.has(prereq)) continue; // Handled by validation

      const prereqState = state.get(prereq) || 0;
      if (prereqState === 1) {
        // Cycle detected: all nodes in the cycle path from prereq to current node
        const cycleStartIndex = path.indexOf(prereq);
        if (cycleStartIndex !== -1) {
          for (let i = cycleStartIndex; i < path.length; i++) {
            cyclicSessionIds.add(path[i]);
          }
        } else {
          cyclicSessionIds.add(prereq);
          cyclicSessionIds.add(node);
        }
      } else if (prereqState === 0) {
        dfs(prereq, path);
      }
    }

    path.pop();
    state.set(node, 2); // visited
    return false;
  }

  for (const id of sessionIds) {
    if ((state.get(id) || 0) === 0) {
      dfs(id, []);
    }
  }

  // 2. Propagate circular dependency status to any session that has a path to a cyclic session
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of sessionIds) {
      if (!cyclicSessionIds.has(id)) {
        const prereqs = prereqMap.get(id) || [];
        for (const p of prereqs) {
          if (cyclicSessionIds.has(p)) {
            cyclicSessionIds.add(id);
            changed = true;
            break;
          }
        }
      }
    }
  }

  return {
    cyclicSessionIds,
    hasCycle: cyclicSessionIds.size > 0,
  };
}

/**
 * Computes topological sort levels (longest path / dependency depth) for DAG nodes.
 */
export function computeDependencyDepths(
  validSessionIds: string[],
  prereqMap: Map<string, string[]>
): Map<string, number> {
  const depths = new Map<string, number>();

  function getDepth(id: string, visited: Set<string>): number {
    if (depths.has(id)) return depths.get(id)!;
    if (visited.has(id)) return 0; // Guard against unexpected cycles
    visited.add(id);

    const prereqs = prereqMap.get(id) || [];
    let maxPrereqDepth = 0;
    for (const p of prereqs) {
      if (validSessionIds.includes(p)) {
        maxPrereqDepth = Math.max(maxPrereqDepth, 1 + getDepth(p, new Set(visited)));
      }
    }

    depths.set(id, maxPrereqDepth);
    return maxPrereqDepth;
  }

  for (const id of validSessionIds) {
    getDepth(id, new Set());
  }

  return depths;
}
