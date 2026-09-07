// scheduler.ts - Deterministic Algorithmic Conference Scheduler
// Implements Topological Graph Resolution, Cycle Detection, Capacity Matching, Speaker Interval Conflict Tracking, and Turnover Buffers

import {
  Session,
  Room,
  SchedulerConfig,
  ScheduleOutput,
  ScheduledSession,
  UnscheduledSession,
  UnscheduledReason,
  SchedulerMetrics,
} from './models';
import {
  timeToMinutes,
  minutesToTime,
  intervalsOverlap,
  detectCycles,
  computeDependencyDepths,
} from './utils';
import { validateSchedulerInputs } from './validation';

interface ScheduledInterval {
  sessionId: string;
  startMin: number;
  endMin: number;
}

export class ConferenceScheduler {
  private bufferMinutes: number;

  constructor(config?: SchedulerConfig) {
    this.bufferMinutes = config?.bufferMinutes !== undefined && config.bufferMinutes >= 0
      ? config.bufferMinutes
      : 10;
  }

  /**
   * Main scheduling method. Produces deterministic conflict-free conference schedule.
   */
  public schedule(
    sessions: Session[],
    rooms: Room[],
    config?: SchedulerConfig
  ): ScheduleOutput {
    const buffer = config?.bufferMinutes !== undefined && config.bufferMinutes >= 0
      ? config.bufferMinutes
      : this.bufferMinutes;

    const totalInputCount = Array.isArray(sessions) ? sessions.length : 0;
    const speakerIdSet = new Set<string>();

    if (Array.isArray(sessions)) {
      for (const s of sessions) {
        if (s && s.speakerId && typeof s.speakerId === 'string' && s.speakerId.trim()) {
          speakerIdSet.add(s.speakerId.trim());
        }
      }
    }

    // 1. Input Validation
    const { validSessions, validRooms, invalidSessionErrors } = validateSchedulerInputs(
      sessions,
      rooms
    );

    const scheduled: ScheduledSession[] = [];
    const unscheduled: UnscheduledSession[] = [...invalidSessionErrors];

    // If no rooms or no sessions
    if (validRooms.length === 0) {
      for (const vs of validSessions) {
        unscheduled.push({
          sessionId: vs.id,
          reason: 'INSUFFICIENT_CAPACITY',
          details: 'No valid rooms available for scheduling',
        });
      }
      return this.buildOutput(totalInputCount, scheduled, unscheduled, speakerIdSet.size, validRooms);
    }

    // 2. Prerequisite Graph & Cycle Detection
    const prereqMap = new Map<string, string[]>();
    const sessionMap = new Map<string, Session>();
    for (const vs of validSessions) {
      sessionMap.set(vs.id, vs);
      prereqMap.set(vs.id, vs.prerequisites || []);
    }

    const { cyclicSessionIds } = detectCycles(
      validSessions.map((s) => s.id),
      prereqMap
    );

    const nonCyclicSessions: Session[] = [];
    for (const vs of validSessions) {
      if (cyclicSessionIds.has(vs.id)) {
        unscheduled.push({
          sessionId: vs.id,
          reason: 'CIRCULAR_PREREQUISITE',
          details: `Session ${vs.id} is part of or depends on a cyclic prerequisite graph`,
        });
      } else {
        nonCyclicSessions.push(vs);
      }
    }

    // 3. Dependency Depth & Sorting
    const nonCyclicIds = nonCyclicSessions.map((s) => s.id);
    const depths = computeDependencyDepths(nonCyclicIds, prereqMap);

    // Multi-criteria deterministic sort:
    // 1) Dependency depth ascending (prerequisites scheduled before dependents)
    // 2) Popularity score descending (highest priority first)
    // 3) Expected attendees descending (larger audience first)
    // 4) Duration ascending
    // 5) Session ID alphabetical (strict deterministic tie-breaker)
    nonCyclicSessions.sort((a, b) => {
      const depthA = depths.get(a.id) || 0;
      const depthB = depths.get(b.id) || 0;
      if (depthA !== depthB) return depthA - depthB;
      if (b.popularityScore !== a.popularityScore) return b.popularityScore - a.popularityScore;
      if (b.expectedAttendees !== a.expectedAttendees) return b.expectedAttendees - a.expectedAttendees;
      if (a.durationMinutes !== b.durationMinutes) return a.durationMinutes - b.durationMinutes;
      return a.id.localeCompare(b.id);
    });

    // 4. State Tracking
    // speakerSchedules: speakerId -> Array of ScheduledInterval
    const speakerSchedules = new Map<string, ScheduledInterval[]>();
    // roomSchedules: roomId -> Array of ScheduledInterval
    const roomSchedules = new Map<string, ScheduledInterval[]>();
    // sessionEndTimes: sessionId -> number (endTime in minutes)
    const sessionEndTimes = new Map<string, number>();

    for (const r of validRooms) {
      roomSchedules.set(r.id, []);
    }

    // 5. Greedily Schedule Sessions
    for (const session of nonCyclicSessions) {
      // Check if all prerequisites are scheduled
      let maxPrereqEndMin = 0;
      let missingPrereq = false;
      for (const prereqId of session.prerequisites || []) {
        if (!sessionEndTimes.has(prereqId)) {
          missingPrereq = true;
          break;
        }
        maxPrereqEndMin = Math.max(maxPrereqEndMin, sessionEndTimes.get(prereqId)!);
      }

      if (missingPrereq) {
        unscheduled.push({
          sessionId: session.id,
          reason: 'INSUFFICIENT_TIME',
          details: `Prerequisites for session ${session.id} could not be completed in time`,
        });
        continue;
      }

      // Find candidate rooms that have sufficient capacity
      const candidateRooms = validRooms.filter((r) => r.capacity >= session.expectedAttendees);
      if (candidateRooms.length === 0) {
        unscheduled.push({
          sessionId: session.id,
          reason: 'INSUFFICIENT_CAPACITY',
          details: `No room has sufficient capacity for ${session.expectedAttendees} expected attendees`,
        });
        continue;
      }

      // Sort candidate rooms by:
      // 1) Capacity ascending (best fit / minimize wasted seats)
      // 2) Room ID alphabetical (deterministic tie-breaker)
      candidateRooms.sort((a, b) => {
        if (a.capacity !== b.capacity) return a.capacity - b.capacity;
        return a.id.localeCompare(b.id);
      });

      // Search for the earliest feasible slot across all candidate rooms
      let bestSlot: {
        roomId: string;
        startMin: number;
        endMin: number;
      } | null = null;

      let speakerConflictOccurred = false;

      for (const room of candidateRooms) {
        const existingRoomIntervals = roomSchedules.get(room.id) || [];

        for (const window of room.availableWindows) {
          const wStart = timeToMinutes(window.start);
          const wEnd = timeToMinutes(window.end);

          if (wStart < 0 || wEnd < 0 || wEnd - wStart < session.durationMinutes) {
            continue;
          }

          // Candidate start times to test in this window:
          // 1. Window start (or maxPrereqEndMin)
          // 2. After each existing session in this room + buffer
          const candidateStarts: number[] = [];
          candidateStarts.push(Math.max(wStart, maxPrereqEndMin));

          for (const interval of existingRoomIntervals) {
            const potentialStart = Math.max(interval.endMin + buffer, maxPrereqEndMin);
            if (potentialStart >= wStart && potentialStart + session.durationMinutes <= wEnd) {
              candidateStarts.push(potentialStart);
            }
          }

          // Remove duplicates & sort candidate start times
          const uniqueStarts = Array.from(new Set(candidateStarts)).sort((a, b) => a - b);

          for (const startCandidate of uniqueStarts) {
            const endCandidate = startCandidate + session.durationMinutes;

            // Check window boundary
            if (startCandidate < wStart || endCandidate > wEnd) {
              continue;
            }

            // Check room overlap (including turnover buffer with other sessions in this room)
            let roomOverlap = false;
            for (const rInterval of existingRoomIntervals) {
              // The interval occupied with buffer is [rInterval.startMin, rInterval.endMin + buffer)
              // And new session also needs buffer after it if another session follows
              if (
                intervalsOverlap(
                  startCandidate,
                  endCandidate,
                  rInterval.startMin,
                  rInterval.endMin + buffer
                ) ||
                (startCandidate < rInterval.startMin &&
                  endCandidate + buffer > rInterval.startMin)
              ) {
                roomOverlap = true;
                break;
              }
            }
            if (roomOverlap) continue;

            // Check speaker overlap
            const speakerIntervals = speakerSchedules.get(session.speakerId) || [];
            let speakerOverlap = false;
            for (const sInterval of speakerIntervals) {
              if (intervalsOverlap(startCandidate, endCandidate, sInterval.startMin, sInterval.endMin)) {
                speakerOverlap = true;
                speakerConflictOccurred = true;
                break;
              }
            }
            if (speakerOverlap) continue;

            // Feasible slot found!
            if (
              !bestSlot ||
              startCandidate < bestSlot.startMin ||
              (startCandidate === bestSlot.startMin &&
                room.capacity < (sessionMap.get(bestSlot.roomId)?.expectedAttendees || Infinity))
            ) {
              bestSlot = {
                roomId: room.id,
                startMin: startCandidate,
                endMin: endCandidate,
              };
              // Since starts are sorted, this is the earliest slot in this room
              break;
            }
          }
        }
      }

      if (bestSlot) {
        // Schedule session
        scheduled.push({
          sessionId: session.id,
          roomId: bestSlot.roomId,
          startTime: minutesToTime(bestSlot.startMin),
          endTime: minutesToTime(bestSlot.endMin),
        });

        // Record end time for dependent sessions
        sessionEndTimes.set(session.id, bestSlot.endMin);

        // Update room intervals
        const rIntervals = roomSchedules.get(bestSlot.roomId)!;
        rIntervals.push({
          sessionId: session.id,
          startMin: bestSlot.startMin,
          endMin: bestSlot.endMin,
        });
        rIntervals.sort((a, b) => a.startMin - b.startMin);

        // Update speaker intervals
        if (!speakerSchedules.has(session.speakerId)) {
          speakerSchedules.set(session.speakerId, []);
        }
        const sIntervals = speakerSchedules.get(session.speakerId)!;
        sIntervals.push({
          sessionId: session.id,
          startMin: bestSlot.startMin,
          endMin: bestSlot.endMin,
        });
        sIntervals.sort((a, b) => a.startMin - b.startMin);
      } else {
        const reason: UnscheduledReason = speakerConflictOccurred
          ? 'SPEAKER_CONFLICT'
          : 'INSUFFICIENT_TIME';
        unscheduled.push({
          sessionId: session.id,
          reason,
          details: `Could not find an available conflict-free time slot in available room windows`,
        });
      }
    }

    // Deterministic sort on output
    scheduled.sort((a, b) => {
      const timeDiff = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
      if (timeDiff !== 0) return timeDiff;
      if (a.roomId !== b.roomId) return a.roomId.localeCompare(b.roomId);
      return a.sessionId.localeCompare(b.sessionId);
    });

    unscheduled.sort((a, b) => a.sessionId.localeCompare(b.sessionId));

    return this.buildOutput(
      totalInputCount,
      scheduled,
      unscheduled,
      speakerIdSet.size,
      validRooms
    );
  }

  /**
   * Helper to compute metrics and assemble ScheduleOutput.
   */
  private buildOutput(
    totalSessions: number,
    scheduled: ScheduledSession[],
    unscheduled: UnscheduledSession[],
    totalSpeakerCount: number,
    rooms: Room[]
  ): ScheduleOutput {
    let totalScheduledMinutes = 0;
    for (const s of scheduled) {
      const startMin = timeToMinutes(s.startTime);
      const endMin = timeToMinutes(s.endTime);
      if (startMin >= 0 && endMin >= startMin) {
        totalScheduledMinutes += endMin - startMin;
      }
    }

    let totalAvailableMinutes = 0;
    for (const r of rooms) {
      for (const w of r.availableWindows) {
        const sMin = timeToMinutes(w.start);
        const eMin = timeToMinutes(w.end);
        if (sMin >= 0 && eMin >= sMin) {
          totalAvailableMinutes += eMin - sMin;
        }
      }
    }

    const roomUtilizationPercentage =
      totalAvailableMinutes > 0
        ? Math.round((totalScheduledMinutes / totalAvailableMinutes) * 10000) / 100
        : 0;

    const metrics: SchedulerMetrics = {
      totalSessions,
      scheduledCount: scheduled.length,
      unscheduledCount: unscheduled.length,
      totalSpeakerCount,
      roomUtilizationPercentage,
    };

    return {
      scheduled,
      unscheduled,
      metrics,
    };
  }
}
