import {
  Session,
  Room,
  SchedulerConfig,
  ScheduleOutput,
  ScheduledSession,
  UnscheduledSession,
  ScheduleMetrics
} from './models.js';
import {
  timeToMinutes,
  minutesToTime,
  intervalsOverlap,
  validateSession,
  validateRoom,
  analyzeDependencies
} from './utils.js';

interface PlacedSlot {
  sessionId: string;
  start: number;
  end: number;
}

interface SpeakerSlot {
  sessionId: string;
  roomId: string;
  start: number;
  end: number;
}

export function scheduleConference(
  sessions: Session[],
  rooms: Room[],
  config?: SchedulerConfig
): ScheduleOutput {
  const bufferMinutes = config?.bufferMinutes ?? 10;
  const scheduled: ScheduledSession[] = [];
  const unscheduled: UnscheduledSession[] = [];

  // Defensive check for non-array inputs
  if (!Array.isArray(sessions) || !Array.isArray(rooms)) {
    return {
      scheduled: [],
      unscheduled: [],
      metrics: {
        totalSessions: 0,
        scheduledCount: 0,
        unscheduledCount: 0,
        totalSpeakerCount: 0,
        roomUtilizationPercentage: 0
      }
    };
  }

  // 1. Validate Rooms and Deduplicate IDs
  const validRooms: Room[] = [];
  const roomIds = new Set<string>();
  for (const r of rooms) {
    const v = validateRoom(r);
    if (!v.valid || roomIds.has(r.id)) {
      continue; // Skip invalid or duplicate room
    }
    roomIds.add(r.id);
    validRooms.push(r);
  }

  // Calculate total available room capacity in minutes for metrics
  let totalAvailableRoomMinutes = 0;
  for (const r of validRooms) {
    for (const w of r.availableWindows) {
      const s = timeToMinutes(w.start);
      const e = timeToMinutes(w.end);
      if (s !== -1 && e !== -1 && e > s) {
        totalAvailableRoomMinutes += e - s;
      }
    }
  }

  // 2. Validate Sessions & Track Duplicates
  const validSessions: Session[] = [];
  const seenSessionIds = new Set<string>();
  const allSpeakerIds = new Set<string>();

  for (const s of sessions) {
    const v = validateSession(s);
    if (!v.valid) {
      unscheduled.push({
        sessionId: s?.id || 'UNKNOWN',
        reason: 'INVALID_DATA',
        details: v.error
      });
      continue;
    }

    if (seenSessionIds.has(s.id)) {
      unscheduled.push({
        sessionId: s.id,
        reason: 'INVALID_DATA',
        details: `Duplicate session ID: ${s.id}`
      });
      continue;
    }

    seenSessionIds.add(s.id);
    allSpeakerIds.add(s.speakerId);
    validSessions.push(s);
  }

  // 3. Verify Prerequisite Reference Validity & Cycles
  const sessionMap = new Map<string, Session>(validSessions.map((s) => [s.id, s]));
  const missingPrereqSessions = new Set<string>();

  for (const s of validSessions) {
    for (const pId of s.prerequisites || []) {
      if (!sessionMap.has(pId)) {
        missingPrereqSessions.add(s.id);
        break;
      }
    }
  }

  // Filter sessions that have missing prerequisite IDs
  const activeSessions: Session[] = [];
  for (const s of validSessions) {
    if (missingPrereqSessions.has(s.id)) {
      unscheduled.push({
        sessionId: s.id,
        reason: 'INVALID_DATA',
        details: `Prerequisite session does not exist in conference catalog`
      });
    } else {
      activeSessions.push(s);
    }
  }

  // Dependency analysis for remaining sessions
  const depResult = analyzeDependencies(activeSessions);
  const circularSet = depResult.cyclicSessionIds;

  const candidateSessions: Session[] = [];
  for (const s of activeSessions) {
    if (circularSet.has(s.id)) {
      unscheduled.push({
        sessionId: s.id,
        reason: 'CIRCULAR_PREREQUISITE',
        details: 'Participates in or downstream from a prerequisite dependency cycle'
      });
    } else {
      candidateSessions.push(s);
    }
  }

  // 4. Deterministic Prioritization
  candidateSessions.sort((a, b) => {
    // Level in dependency graph ASC (prerequisites scheduled before dependents)
    const levelA = depResult.sessionLevels.get(a.id) || 0;
    const levelB = depResult.sessionLevels.get(b.id) || 0;
    if (levelA !== levelB) return levelA - levelB;

    // Popularity score DESC
    if (b.popularityScore !== a.popularityScore) return b.popularityScore - a.popularityScore;

    // Expected attendees DESC
    if (b.expectedAttendees !== a.expectedAttendees) return b.expectedAttendees - a.expectedAttendees;

    // Duration ASC
    if (a.durationMinutes !== b.durationMinutes) return a.durationMinutes - b.durationMinutes;

    // Session ID ASC
    return a.id.localeCompare(b.id);
  });

  // Track state
  const roomSchedules = new Map<string, PlacedSlot[]>();
  for (const r of validRooms) {
    roomSchedules.set(r.id, []);
  }

  const speakerSchedules = new Map<string, SpeakerSlot[]>();
  const scheduledSessionTimes = new Map<string, { start: number; end: number }>();
  let totalScheduledMinutes = 0;

  // 5. Schedule Sessions
  for (const session of candidateSessions) {
    // Verify room capacity requirement
    const eligibleRooms = validRooms
      .filter((r) => r.capacity >= session.expectedAttendees)
      .sort((a, b) => {
        if (a.capacity !== b.capacity) return a.capacity - b.capacity; // Best-fit capacity
        return a.id.localeCompare(b.id);
      });

    if (eligibleRooms.length === 0) {
      unscheduled.push({
        sessionId: session.id,
        reason: 'INSUFFICIENT_CAPACITY',
        details: `No room has capacity >= ${session.expectedAttendees}`
      });
      continue;
    }

    // Minimum start time dictated by prerequisites
    let minPrereqEndTime = 0;
    let prereqFailed = false;
    for (const pId of session.prerequisites || []) {
      const pPlaced = scheduledSessionTimes.get(pId);
      if (!pPlaced) {
        prereqFailed = true;
        break;
      }
      minPrereqEndTime = Math.max(minPrereqEndTime, pPlaced.end);
    }

    if (prereqFailed) {
      unscheduled.push({
        sessionId: session.id,
        reason: 'INSUFFICIENT_TIME',
        details: 'One or more required prerequisites could not be scheduled'
      });
      continue;
    }

    // Search for best (earliest) valid slot across eligible rooms
    let bestSlot: { roomId: string; capacity: number; start: number; end: number } | null = null;
    let hadSpeakerConflict = false;

    for (const room of eligibleRooms) {
      const existingSlots = roomSchedules.get(room.id) || [];
      const sortedWindows = [...room.availableWindows].sort((w1, w2) => {
        return timeToMinutes(w1.start) - timeToMinutes(w2.start);
      });

      for (const window of sortedWindows) {
        const winStart = timeToMinutes(window.start);
        const winEnd = timeToMinutes(window.end);
        if (winStart === -1 || winEnd === -1 || winEnd - winStart < session.durationMinutes) {
          continue;
        }

        // Potential candidate start times in this room window
        const candidateStarts = new Set<number>();
        candidateStarts.add(Math.max(winStart, minPrereqEndTime));

        for (const slot of existingSlots) {
          if (slot.end + bufferMinutes >= winStart && slot.end + bufferMinutes < winEnd) {
            candidateStarts.add(Math.max(slot.end + bufferMinutes, minPrereqEndTime));
          }
        }

        // Also consider when this speaker finishes previous commitments in other rooms
        const speakerSlots = speakerSchedules.get(session.speakerId) || [];
        for (const sp of speakerSlots) {
          if (sp.end >= winStart && sp.end < winEnd) {
            candidateStarts.add(Math.max(sp.end, minPrereqEndTime));
          }
        }

        const sortedStarts = Array.from(candidateStarts).sort((a, b) => a - b);

        for (const candStart of sortedStarts) {
          const candEnd = candStart + session.durationMinutes;

          // Boundary constraint: Must start and finish completely inside window
          if (candStart < winStart || candEnd > winEnd) {
            continue;
          }

          // Buffer & room overlap constraint against existing placed slots in this room
          let roomConflict = false;
          for (const s of existingSlots) {
            // Need bufferMinutes gap between consecutive sessions
            // Overlap occurs if candStart < s.end + buffer && s.start < candEnd + buffer
            if (intervalsOverlap(candStart, candEnd + bufferMinutes, s.start, s.end + bufferMinutes)) {
              roomConflict = true;
              break;
            }
          }
          if (roomConflict) continue;

          // Speaker constraint: speaker cannot be in any overlapping session across any room
          let speakerConflict = false;
          for (const sp of speakerSlots) {
            if (intervalsOverlap(candStart, candEnd, sp.start, sp.end)) {
              speakerConflict = true;
              hadSpeakerConflict = true;
              break;
            }
          }
          if (speakerConflict) continue;

          // Valid slot found! Compare against bestSlot
          // Prioritize: earliest start, then minimum room capacity (best-fit), then room ID
          const isBetter =
            !bestSlot ||
            candStart < bestSlot.start ||
            (candStart === bestSlot.start &&
              (room.capacity < bestSlot.capacity ||
                (room.capacity === bestSlot.capacity && room.id < bestSlot.roomId)));

          if (isBetter) {
            bestSlot = {
              roomId: room.id,
              capacity: room.capacity,
              start: candStart,
              end: candEnd
            };
          }
        }
      }
    }

    if (bestSlot) {
      // Place session
      roomSchedules.get(bestSlot.roomId)!.push({
        sessionId: session.id,
        start: bestSlot.start,
        end: bestSlot.end
      });

      if (!speakerSchedules.has(session.speakerId)) {
        speakerSchedules.set(session.speakerId, []);
      }
      speakerSchedules.get(session.speakerId)!.push({
        sessionId: session.id,
        roomId: bestSlot.roomId,
        start: bestSlot.start,
        end: bestSlot.end
      });

      scheduledSessionTimes.set(session.id, { start: bestSlot.start, end: bestSlot.end });
      totalScheduledMinutes += session.durationMinutes;

      scheduled.push({
        sessionId: session.id,
        roomId: bestSlot.roomId,
        startTime: minutesToTime(bestSlot.start),
        endTime: minutesToTime(bestSlot.end)
      });
    } else {
      unscheduled.push({
        sessionId: session.id,
        reason: hadSpeakerConflict ? 'SPEAKER_CONFLICT' : 'INSUFFICIENT_TIME',
        details: hadSpeakerConflict
          ? `Speaker ${session.speakerId} has overlapping commitments`
          : `No room window has sufficient continuous slot for ${session.durationMinutes} min`
      });
    }
  }

  // Calculate room utilization percentage
  const roomUtilizationPercentage =
    totalAvailableRoomMinutes > 0
      ? Math.round((totalScheduledMinutes / totalAvailableRoomMinutes) * 10000) / 100
      : 0;

  const metrics: ScheduleMetrics = {
    totalSessions: sessions.length,
    scheduledCount: scheduled.length,
    unscheduledCount: unscheduled.length,
    totalSpeakerCount: allSpeakerIds.size,
    roomUtilizationPercentage
  };

  return {
    scheduled,
    unscheduled,
    metrics
  };
}
