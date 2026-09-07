// validation.ts - Input Validation for Conference Scheduler
import { Session, Room, UnscheduledSession } from './models';
import { timeToMinutes } from './utils';

export interface ValidationResult {
  validSessions: Session[];
  validRooms: Room[];
  invalidSessionErrors: UnscheduledSession[];
  duplicateRoomErrors: string[];
}

export function validateSchedulerInputs(
  sessions: Session[],
  rooms: Room[]
): ValidationResult {
  const validSessions: Session[] = [];
  const invalidSessionErrors: UnscheduledSession[] = [];
  const validRooms: Room[] = [];
  const duplicateRoomErrors: string[] = [];

  const seenSessionIds = new Set<string>();
  const allSessionIdSet = new Set<string>();

  // 1. Initial scan for duplicate and valid session IDs
  if (Array.isArray(sessions)) {
    for (const s of sessions) {
      if (s && typeof s.id === 'string' && s.id.trim() !== '') {
        allSessionIdSet.add(s.id.trim());
      }
    }
  }

  // 2. Validate Sessions
  if (Array.isArray(sessions)) {
    for (const s of sessions) {
      if (!s || typeof s !== 'object') {
        continue;
      }

      const sId = (s.id || '').trim();
      if (!sId) {
        invalidSessionErrors.push({
          sessionId: 'UNKNOWN_SESSION',
          reason: 'INVALID_DATA',
          details: 'Missing or empty session ID',
        });
        continue;
      }

      if (seenSessionIds.has(sId)) {
        invalidSessionErrors.push({
          sessionId: sId,
          reason: 'INVALID_DATA',
          details: `Duplicate session ID: ${sId}`,
        });
        continue;
      }
      seenSessionIds.add(sId);

      if (!s.title || typeof s.title !== 'string' || s.title.trim() === '') {
        invalidSessionErrors.push({
          sessionId: sId,
          reason: 'INVALID_DATA',
          details: `Missing title for session ${sId}`,
        });
        continue;
      }

      if (!s.speakerId || typeof s.speakerId !== 'string' || s.speakerId.trim() === '') {
        invalidSessionErrors.push({
          sessionId: sId,
          reason: 'INVALID_DATA',
          details: `Missing speaker ID for session ${sId}`,
        });
        continue;
      }

      if (
        typeof s.durationMinutes !== 'number' ||
        isNaN(s.durationMinutes) ||
        s.durationMinutes <= 0 ||
        s.durationMinutes > 1440
      ) {
        invalidSessionErrors.push({
          sessionId: sId,
          reason: 'INVALID_DATA',
          details: `Invalid durationMinutes (${s.durationMinutes}) for session ${sId}`,
        });
        continue;
      }

      if (
        typeof s.expectedAttendees !== 'number' ||
        isNaN(s.expectedAttendees) ||
        s.expectedAttendees < 0
      ) {
        invalidSessionErrors.push({
          sessionId: sId,
          reason: 'INVALID_DATA',
          details: `Invalid expectedAttendees (${s.expectedAttendees}) for session ${sId}`,
        });
        continue;
      }

      if (
        typeof s.popularityScore !== 'number' ||
        isNaN(s.popularityScore) ||
        s.popularityScore < 1 ||
        s.popularityScore > 100
      ) {
        invalidSessionErrors.push({
          sessionId: sId,
          reason: 'INVALID_DATA',
          details: `Invalid popularityScore (${s.popularityScore}) for session ${sId}; must be between 1 and 100`,
        });
        continue;
      }

      // Check self-dependency
      const prereqs = Array.isArray(s.prerequisites) ? s.prerequisites : [];
      if (prereqs.includes(sId)) {
        invalidSessionErrors.push({
          sessionId: sId,
          reason: 'CIRCULAR_PREREQUISITE',
          details: `Session ${sId} lists itself as a prerequisite`,
        });
        continue;
      }

      // Check unknown prerequisites
      let hasUnknownPrereq = false;
      for (const p of prereqs) {
        if (!allSessionIdSet.has(p)) {
          invalidSessionErrors.push({
            sessionId: sId,
            reason: 'INVALID_DATA',
            details: `Session ${sId} references unknown prerequisite ${p}`,
          });
          hasUnknownPrereq = true;
          break;
        }
      }
      if (hasUnknownPrereq) {
        continue;
      }

      validSessions.push({
        ...s,
        id: sId,
        title: s.title.trim(),
        speakerId: s.speakerId.trim(),
        prerequisites: prereqs,
        tags: Array.isArray(s.tags) ? s.tags : [],
      });
    }
  }

  // 3. Validate Rooms
  const seenRoomIds = new Set<string>();
  if (Array.isArray(rooms)) {
    for (const r of rooms) {
      if (!r || typeof r !== 'object') continue;
      const rId = (r.id || '').trim();
      if (!rId) continue;

      if (seenRoomIds.has(rId)) {
        duplicateRoomErrors.push(`Duplicate room ID: ${rId}`);
        continue;
      }
      seenRoomIds.add(rId);

      if (typeof r.capacity !== 'number' || isNaN(r.capacity) || r.capacity <= 0) {
        continue;
      }

      const validWindows = [];
      if (Array.isArray(r.availableWindows)) {
        for (const w of r.availableWindows) {
          if (!w || !w.start || !w.end) continue;
          const startMin = timeToMinutes(w.start);
          const endMin = timeToMinutes(w.end);
          if (startMin >= 0 && endMin >= 0 && startMin < endMin) {
            validWindows.push({ start: w.start, end: w.end });
          }
        }
      }

      if (validWindows.length > 0) {
        validRooms.push({
          ...r,
          id: rId,
          name: (r.name || rId).trim(),
          capacity: r.capacity,
          availableWindows: validWindows,
        });
      }
    }
  }

  return {
    validSessions,
    validRooms,
    invalidSessionErrors,
    duplicateRoomErrors,
  };
}
