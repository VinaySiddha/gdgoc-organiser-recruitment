import { Session, Room, TimeWindow } from './models.js';

/**
 * Converts "HH:MM" 24-hour time string to total minutes since midnight.
 * Returns -1 if the format is invalid.
 */
export function timeToMinutes(timeStr: string): number {
  if (typeof timeStr !== 'string') return -1;
  const match = /^(\d{2}):(\d{2})$/.exec(timeStr.trim());
  if (!match) return -1;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return -1;
  }

  return hours * 60 + minutes;
}

/**
 * Converts minutes since midnight back to "HH:MM" 24-hour format.
 */
export function minutesToTime(totalMinutes: number): string {
  const normalized = Math.max(0, Math.min(1439, Math.floor(totalMinutes)));
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Checks if two open intervals [startA, endA) and [startB, endB) overlap.
 */
export function intervalsOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && startB < endA;
}

/**
 * Validates a single TimeWindow object.
 */
export function isValidTimeWindow(window: TimeWindow): boolean {
  if (!window || typeof window !== 'object') return false;
  const startMins = timeToMinutes(window.start);
  const endMins = timeToMinutes(window.end);
  if (startMins === -1 || endMins === -1) return false;
  return startMins < endMins;
}

/**
 * Validates session integrity and defense against malformed inputs.
 */
export function validateSession(session: any): { valid: boolean; error?: string } {
  if (!session || typeof session !== 'object') {
    return { valid: false, error: 'Session must be a non-null object' };
  }
  if (typeof session.id !== 'string' || session.id.trim() === '') {
    return { valid: false, error: 'Missing or empty session ID' };
  }
  if (typeof session.title !== 'string' || session.title.trim() === '') {
    return { valid: false, error: 'Missing or empty session title' };
  }
  if (typeof session.speakerId !== 'string' || session.speakerId.trim() === '') {
    return { valid: false, error: 'Missing or empty speakerId' };
  }
  if (typeof session.durationMinutes !== 'number' || !Number.isInteger(session.durationMinutes) || session.durationMinutes <= 0) {
    return { valid: false, error: 'durationMinutes must be a positive integer' };
  }
  if (typeof session.expectedAttendees !== 'number' || !Number.isInteger(session.expectedAttendees) || session.expectedAttendees < 0) {
    return { valid: false, error: 'expectedAttendees must be a non-negative integer' };
  }
  if (typeof session.popularityScore !== 'number' || session.popularityScore < 0 || session.popularityScore > 100) {
    return { valid: false, error: 'popularityScore must be a number between 0 and 100' };
  }
  if (session.prerequisites && !Array.isArray(session.prerequisites)) {
    return { valid: false, error: 'prerequisites must be an array of strings' };
  }
  return { valid: true };
}

/**
 * Validates room integrity.
 */
export function validateRoom(room: any): { valid: boolean; error?: string } {
  if (!room || typeof room !== 'object') {
    return { valid: false, error: 'Room must be a non-null object' };
  }
  if (typeof room.id !== 'string' || room.id.trim() === '') {
    return { valid: false, error: 'Missing or empty room ID' };
  }
  if (typeof room.name !== 'string' || room.name.trim() === '') {
    return { valid: false, error: 'Missing or empty room name' };
  }
  if (typeof room.capacity !== 'number' || !Number.isInteger(room.capacity) || room.capacity <= 0) {
    return { valid: false, error: 'Room capacity must be a positive integer' };
  }
  if (!Array.isArray(room.availableWindows) || room.availableWindows.length === 0) {
    return { valid: false, error: 'Room availableWindows must be a non-empty array' };
  }
  for (const win of room.availableWindows) {
    if (!isValidTimeWindow(win)) {
      return { valid: false, error: `Invalid room time window: ${JSON.stringify(win)}` };
    }
  }
  return { valid: true };
}

export interface DependencyAnalysisResult {
  hasCycle: boolean;
  cyclicSessionIds: Set<string>;
  topologicalOrder: string[];
  sessionLevels: Map<string, number>;
}

/**
 * Builds the prerequisite dependency graph and performs cycle detection and topological sorting.
 * A session depends on its prerequisites (prereq -> session).
 */
export function analyzeDependencies(sessions: Session[]): DependencyAnalysisResult {
  const sessionMap = new Map<string, Session>();
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>(); // prereq -> dependent sessions

  for (const s of sessions) {
    sessionMap.set(s.id, s);
    inDegree.set(s.id, 0);
    adj.set(s.id, []);
  }

  // Populate edges: prereq -> dependent
  for (const s of sessions) {
    const prereqs = s.prerequisites || [];
    for (const pId of prereqs) {
      if (pId === s.id) {
        // Self-cycle
        inDegree.set(s.id, (inDegree.get(s.id) || 0) + 1);
        adj.get(s.id)?.push(s.id);
        continue;
      }
      if (sessionMap.has(pId)) {
        adj.get(pId)!.push(s.id);
        inDegree.set(s.id, (inDegree.get(s.id) || 0) + 1);
      }
    }
  }

  // Kahn's algorithm for topological sorting and cycle detection
  const queue: string[] = [];
  const topologicalOrder: string[] = [];
  const sessionLevels = new Map<string, number>();

  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) {
      queue.push(id);
      sessionLevels.set(id, 0);
    }
  }

  while (queue.length > 0) {
    const u = queue.shift()!;
    topologicalOrder.push(u);
    const currentLevel = sessionLevels.get(u) || 0;

    for (const v of adj.get(u) || []) {
      if (v === u) continue;
      const nextLevel = Math.max(sessionLevels.get(v) || 0, currentLevel + 1);
      sessionLevels.set(v, nextLevel);

      const newDeg = inDegree.get(v)! - 1;
      inDegree.set(v, newDeg);
      if (newDeg === 0) {
        queue.push(v);
      }
    }
  }

  const cyclicSessionIds = new Set<string>();
  for (const [id, deg] of inDegree.entries()) {
    if (deg > 0) {
      cyclicSessionIds.add(id);
    }
  }

  return {
    hasCycle: cyclicSessionIds.size > 0,
    cyclicSessionIds,
    topologicalOrder,
    sessionLevels
  };
}
