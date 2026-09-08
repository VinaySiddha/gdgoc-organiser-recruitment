import {
  Session,
  Room,
  SchedulerConfig,
  ScheduleOutput,
  ScheduledSession,
  UnscheduledSession,
  UnscheduledReason,
  TimeWindow,
} from './types';

// ==========================================
// Time Helpers
// ==========================================

export function timeToMinutes(timeStr: string): number | null {
  if (typeof timeStr !== 'string') return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeStr);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return hours * 60 + minutes;
}

export function minutesToTime(mins: number): string {
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

interface ParsedTimeWindow {
  startMinutes: number;
  endMinutes: number;
}

interface ParsedRoom {
  id: string;
  name: string;
  capacity: number;
  availableWindows: ParsedTimeWindow[];
}

// ==========================================
// Main Scheduler Engine
// ==========================================

export function scheduleSessions(
  sessions: Session[],
  rooms: Room[],
  config?: SchedulerConfig
): ScheduleOutput {
  const bufferMinutes = config?.bufferMinutes ?? 10;
  const unscheduled: UnscheduledSession[] = [];
  const scheduled: ScheduledSession[] = [];

  // Guard: Handle empty/invalid inputs
  if (!Array.isArray(sessions)) sessions = [];
  if (!Array.isArray(rooms)) rooms = [];

  // Calculate total distinct speakers from raw input sessions
  const totalSpeakerCount = new Set(
    sessions.filter((s) => s && typeof s.speakerId === 'string' && s.speakerId.trim() !== '').map((s) => s.speakerId)
  ).size;

  // 1. Validate & Parse Rooms
  const validRooms: ParsedRoom[] = [];
  let totalAvailableRoomWindowMinutes = 0;

  for (const r of rooms) {
    if (!r || typeof r.id !== 'string' || !r.id.trim() || typeof r.capacity !== 'number' || r.capacity <= 0 || !Array.isArray(r.availableWindows)) {
      continue;
    }

    const parsedWindows: ParsedTimeWindow[] = [];
    for (const w of r.availableWindows) {
      if (!w) continue;
      const start = timeToMinutes(w.start);
      const end = timeToMinutes(w.end);
      if (start !== null && end !== null && start < end) {
        parsedWindows.push({ startMinutes: start, endMinutes: end });
        totalAvailableRoomWindowMinutes += end - start;
      }
    }

    if (parsedWindows.length > 0) {
      validRooms.push({
        id: r.id,
        name: r.name,
        capacity: r.capacity,
        availableWindows: parsedWindows,
      });
    }
  }

  // 2. Validate Sessions
  const validSessionsMap = new Map<string, Session>();
  const invalidSessionIds = new Set<string>();

  for (const s of sessions) {
    if (
      !s ||
      typeof s.id !== 'string' ||
      !s.id.trim() ||
      typeof s.title !== 'string' ||
      typeof s.speakerId !== 'string' ||
      !s.speakerId.trim() ||
      typeof s.durationMinutes !== 'number' ||
      s.durationMinutes <= 0 ||
      typeof s.expectedAttendees !== 'number' ||
      s.expectedAttendees < 0 ||
      typeof s.popularityScore !== 'number' ||
      s.popularityScore < 1 ||
      s.popularityScore > 100
    ) {
      const sessionId = s && typeof s.id === 'string' && s.id.trim() ? s.id : 'unknown';
      unscheduled.push({
        sessionId,
        reason: 'INVALID_DATA',
        details: 'Session fields are invalid or missing',
      });
      if (s && s.id) invalidSessionIds.add(s.id);
      continue;
    }

    validSessionsMap.set(s.id, s);
  }

  // Validate prerequisite references (must reference existing valid session IDs)
  const sessionIdsToProcess: Session[] = [];
  for (const s of validSessionsMap.values()) {
    let hasInvalidPrereq = false;
    if (Array.isArray(s.prerequisites)) {
      for (const prereqId of s.prerequisites) {
        if (!validSessionsMap.has(prereqId)) {
          unscheduled.push({
            sessionId: s.id,
            reason: 'INVALID_DATA',
            details: `Prerequisite session "${prereqId}" does not exist`,
          });
          invalidSessionIds.add(s.id);
          hasInvalidPrereq = true;
          break;
        }
      }
    }
    if (!hasInvalidPrereq) {
      sessionIdsToProcess.push(s);
    }
  }

  // 3. Cycle Detection (Direct and Indirect Prerequisite Cycles)
  const circularSessionIds = new Set<string>();
  const visitedState = new Map<string, number>(); // 0: UNVISITED, 1: VISITING, 2: VISITED

  const detectCycle = (sessionId: string, pathStack: string[]): boolean => {
    visitedState.set(sessionId, 1);
    pathStack.push(sessionId);

    const session = validSessionsMap.get(sessionId);
    if (session && Array.isArray(session.prerequisites)) {
      for (const pId of session.prerequisites) {
        const state = visitedState.get(pId) ?? 0;
        if (state === 1) {
          // Cycle found! Mark all sessions currently in path as circular
          const cycleStartIndex = pathStack.indexOf(pId);
          for (let i = cycleStartIndex; i < pathStack.length; i++) {
            circularSessionIds.add(pathStack[i]);
          }
          return true;
        } else if (state === 0) {
          if (detectCycle(pId, pathStack)) {
            circularSessionIds.add(sessionId);
          }
        } else if (circularSessionIds.has(pId)) {
          // Transitive dependency on a cycle
          circularSessionIds.add(sessionId);
        }
      }
    }

    pathStack.pop();
    visitedState.set(sessionId, 2);
    return circularSessionIds.has(sessionId);
  };

  for (const s of sessionIdsToProcess) {
    if ((visitedState.get(s.id) ?? 0) === 0) {
      detectCycle(s.id, []);
    }
  }

  // Record unscheduled circular prerequisite sessions
  const candidateSessions: Session[] = [];
  for (const s of sessionIdsToProcess) {
    if (circularSessionIds.has(s.id)) {
      unscheduled.push({
        sessionId: s.id,
        reason: 'CIRCULAR_PREREQUISITE',
        details: 'Session is part of or transitively depends on a prerequisite cycle',
      });
    } else {
      candidateSessions.push(s);
    }
  }

  // 4. Calculate Prerequisite Depth for Topological Sorting
  const depthMap = new Map<string, number>();
  const getDepth = (sessionId: string): number => {
    if (depthMap.has(sessionId)) return depthMap.get(sessionId)!;
    const session = validSessionsMap.get(sessionId);
    if (!session || !Array.isArray(session.prerequisites) || session.prerequisites.length === 0) {
      depthMap.set(sessionId, 0);
      return 0;
    }

    let maxPDepth = 0;
    for (const pId of session.prerequisites) {
      maxPDepth = Math.max(maxPDepth, getDepth(pId));
    }
    const depth = maxPDepth + 1;
    depthMap.set(sessionId, depth);
    return depth;
  };

  for (const s of candidateSessions) {
    getDepth(s.id);
  }

  // Sort candidate sessions deterministically:
  // 1. Prerequisite Depth ASC (Prerequisites scheduled first)
  // 2. Popularity Score DESC
  // 3. Session ID ASC
  candidateSessions.sort((a, b) => {
    const depthA = depthMap.get(a.id) ?? 0;
    const depthB = depthMap.get(b.id) ?? 0;
    if (depthA !== depthB) return depthA - depthB;
    if (b.popularityScore !== a.popularityScore) return b.popularityScore - a.popularityScore;
    return a.id.localeCompare(b.id);
  });

  // 5. Scheduling Tracking Structures
  const scheduledMap = new Map<string, { roomId: string; startMinutes: number; endMinutes: number }>();
  const roomAssignments = new Map<string, Array<{ startMinutes: number; endMinutes: number; sessionId: string }>>();
  const speakerAssignments = new Map<string, Array<{ startMinutes: number; endMinutes: number; sessionId: string }>>();

  for (const r of validRooms) {
    roomAssignments.set(r.id, []);
  }

  let totalScheduledSessionMinutes = 0;

  // 6. Execute Greedy Placement
  for (const session of candidateSessions) {
    // Check venue capacity
    const eligibleRooms = validRooms
      .filter((r) => r.capacity >= session.expectedAttendees)
      .sort((a, b) => a.id.localeCompare(b.id));

    if (eligibleRooms.length === 0) {
      unscheduled.push({
        sessionId: session.id,
        reason: 'INSUFFICIENT_CAPACITY',
        details: `No room has sufficient capacity for ${session.expectedAttendees} expected attendees`,
      });
      continue;
    }

    // Determine min start time based on prerequisite completion
    let minStartTime = 0;
    let prereqFailed = false;

    if (Array.isArray(session.prerequisites)) {
      for (const pId of session.prerequisites) {
        const pSchedule = scheduledMap.get(pId);
        if (!pSchedule) {
          prereqFailed = true;
          break;
        }
        minStartTime = Math.max(minStartTime, pSchedule.endMinutes);
      }
    }

    if (prereqFailed) {
      unscheduled.push({
        sessionId: session.id,
        reason: 'INSUFFICIENT_TIME',
        details: 'Required prerequisite session could not be scheduled',
      });
      continue;
    }

    // Search for earliest valid time slot across eligible rooms
    let bestSlot: { roomId: string; startMinutes: number; endMinutes: number } | null = null;
    let speakerConflictCount = 0;
    let totalCheckedSlots = 0;

    for (const room of eligibleRooms) {
      const roomSchedule = roomAssignments.get(room.id) ?? [];
      const speakerSchedule = speakerAssignments.get(session.speakerId) ?? [];

      for (const window of room.availableWindows) {
        if (window.endMinutes - window.startMinutes < session.durationMinutes) {
          continue;
        }

        // Collect potential start time candidates in this window
        const startCandidates = new Set<number>();
        const initialStart = Math.max(window.startMinutes, minStartTime);
        if (initialStart <= window.endMinutes - session.durationMinutes) {
          startCandidates.add(initialStart);
        }

        for (const rItem of roomSchedule) {
          const cand = rItem.endMinutes + bufferMinutes;
          if (cand >= window.startMinutes && cand >= minStartTime && cand <= window.endMinutes - session.durationMinutes) {
            startCandidates.add(cand);
          }
        }

        for (const spItem of speakerSchedule) {
          const cand = spItem.endMinutes;
          if (cand >= window.startMinutes && cand >= minStartTime && cand <= window.endMinutes - session.durationMinutes) {
            startCandidates.add(cand);
          }
        }

        const sortedStarts = Array.from(startCandidates).sort((a, b) => a - b);

        for (const sStart of sortedStarts) {
          const sEnd = sStart + session.durationMinutes;
          if (sEnd > window.endMinutes) continue;

          totalCheckedSlots++;

          // Check room overlap (with buffer)
          let roomOverlap = false;
          for (const rItem of roomSchedule) {
            if (sStart < rItem.endMinutes + bufferMinutes && sEnd + bufferMinutes > rItem.startMinutes) {
              roomOverlap = true;
              break;
            }
          }
          if (roomOverlap) continue;

          // Check speaker overlap
          let speakerOverlap = false;
          for (const spItem of speakerSchedule) {
            if (sStart < spItem.endMinutes && sEnd > spItem.startMinutes) {
              speakerOverlap = true;
              break;
            }
          }
          if (speakerOverlap) {
            speakerConflictCount++;
            continue;
          }

          // Found valid slot
          if (bestSlot === null || sStart < bestSlot.startMinutes) {
            bestSlot = {
              roomId: room.id,
              startMinutes: sStart,
              endMinutes: sEnd,
            };
          }
        }
      }
    }

    if (bestSlot !== null) {
      // Successfully scheduled!
      scheduledMap.set(session.id, bestSlot);
      scheduled.push({
        sessionId: session.id,
        roomId: bestSlot.roomId,
        startTime: minutesToTime(bestSlot.startMinutes),
        endTime: minutesToTime(bestSlot.endMinutes),
      });

      roomAssignments.get(bestSlot.roomId)!.push({
        startMinutes: bestSlot.startMinutes,
        endMinutes: bestSlot.endMinutes,
        sessionId: session.id,
      });

      if (!speakerAssignments.has(session.speakerId)) {
        speakerAssignments.set(session.speakerId, []);
      }
      speakerAssignments.get(session.speakerId)!.push({
        startMinutes: bestSlot.startMinutes,
        endMinutes: bestSlot.endMinutes,
        sessionId: session.id,
      });

      totalScheduledSessionMinutes += session.durationMinutes;
    } else {
      // Determine failure reason
      if (speakerConflictCount > 0 && totalCheckedSlots === speakerConflictCount) {
        unscheduled.push({
          sessionId: session.id,
          reason: 'SPEAKER_CONFLICT',
          details: `Speaker "${session.speakerId}" has overlapping session commitments`,
        });
      } else {
        unscheduled.push({
          sessionId: session.id,
          reason: 'INSUFFICIENT_TIME',
          details: 'No available room window can fit session duration and required buffers',
        });
      }
    }
  }

  // Sort scheduled array deterministically by startTime, then roomId, then sessionId
  scheduled.sort((a, b) => {
    const timeA = timeToMinutes(a.startTime) ?? 0;
    const timeB = timeToMinutes(b.startTime) ?? 0;
    if (timeA !== timeB) return timeA - timeB;
    if (a.roomId !== b.roomId) return a.roomId.localeCompare(b.roomId);
    return a.sessionId.localeCompare(b.sessionId);
  });

  // Calculate Metrics
  const roomUtilizationPercentage =
    totalAvailableRoomWindowMinutes > 0
      ? Math.round((totalScheduledSessionMinutes / totalAvailableRoomWindowMinutes) * 100 * 100) / 100
      : 0;

  return {
    scheduled,
    unscheduled,
    metrics: {
      totalSessions: sessions.length,
      scheduledCount: scheduled.length,
      unscheduledCount: unscheduled.length,
      totalSpeakerCount,
      roomUtilizationPercentage,
    },
  };
}
