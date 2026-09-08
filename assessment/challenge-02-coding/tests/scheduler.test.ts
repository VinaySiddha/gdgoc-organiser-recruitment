import { scheduleSessions, timeToMinutes } from '../src/scheduler';
import { Session, Room } from '../src/types';

describe('GDG DevFest Smart Session Scheduler Engine', () => {
  const sampleRooms: Room[] = [
    {
      id: 'audi-1',
      name: 'Auditorium 1',
      capacity: 200,
      availableWindows: [{ start: '09:00', end: '17:00' }],
    },
    {
      id: 'lab-a',
      name: 'Computer Lab A',
      capacity: 50,
      availableWindows: [{ start: '09:00', end: '13:00' }],
    },
  ];

  // Test 1: Basic successful scheduling
  test('1. Basic successful scheduling', () => {
    const sessions: Session[] = [
      {
        id: 'sess-1',
        title: 'Intro to AI',
        speakerId: 'spk-1',
        durationMinutes: 60,
        expectedAttendees: 100,
        popularityScore: 80,
      },
    ];

    const result = scheduleSessions(sessions, sampleRooms);

    expect(result.scheduled).toHaveLength(1);
    expect(result.unscheduled).toHaveLength(0);
    expect(result.scheduled[0]).toEqual({
      sessionId: 'sess-1',
      roomId: 'audi-1',
      startTime: '09:00',
      endTime: '10:00',
    });
    expect(result.metrics.scheduledCount).toBe(1);
    expect(result.metrics.unscheduledCount).toBe(0);
    expect(result.metrics.totalSpeakerCount).toBe(1);
  });

  // Test 2: High popularity session gets priority when resources are constrained
  test('2. High popularity session gets priority when resources are constrained', () => {
    const tightRooms: Room[] = [
      {
        id: 'small-room',
        name: 'Small Room',
        capacity: 100,
        availableWindows: [{ start: '09:00', end: '10:00' }], // Only 60 min window
      },
    ];

    const sessions: Session[] = [
      {
        id: 'low-pop',
        title: 'Obscure Topic',
        speakerId: 'spk-1',
        durationMinutes: 60,
        expectedAttendees: 20,
        popularityScore: 30,
      },
      {
        id: 'high-pop',
        title: 'Keynote Talk',
        speakerId: 'spk-2',
        durationMinutes: 60,
        expectedAttendees: 50,
        popularityScore: 95,
      },
    ];

    const result = scheduleSessions(sessions, tightRooms);

    expect(result.scheduled).toHaveLength(1);
    expect(result.scheduled[0].sessionId).toBe('high-pop');

    expect(result.unscheduled).toHaveLength(1);
    expect(result.unscheduled[0].sessionId).toBe('low-pop');
    expect(result.unscheduled[0].reason).toBe('INSUFFICIENT_TIME');
  });

  // Test 3: Same speaker cannot overlap
  test('3. Same speaker cannot overlap across different rooms', () => {
    const multiRooms: Room[] = [
      {
        id: 'room-1',
        name: 'Room 1',
        capacity: 100,
        availableWindows: [{ start: '09:00', end: '12:00' }],
      },
      {
        id: 'room-2',
        name: 'Room 2',
        capacity: 100,
        availableWindows: [{ start: '09:00', end: '12:00' }],
      },
    ];

    const sessions: Session[] = [
      {
        id: 'sess-a',
        title: 'Talk A',
        speakerId: 'spk-busy',
        durationMinutes: 60,
        expectedAttendees: 50,
        popularityScore: 90,
      },
      {
        id: 'sess-b',
        title: 'Talk B',
        speakerId: 'spk-busy',
        durationMinutes: 60,
        expectedAttendees: 50,
        popularityScore: 80,
      },
    ];

    const result = scheduleSessions(sessions, multiRooms, { bufferMinutes: 10 });

    expect(result.scheduled).toHaveLength(2);
    const startA = timeToMinutes(result.scheduled[0].startTime)!;
    const endA = timeToMinutes(result.scheduled[0].endTime)!;
    const startB = timeToMinutes(result.scheduled[1].startTime)!;
    const endB = timeToMinutes(result.scheduled[1].endTime)!;

    // Ensure intervals do not overlap for spk-busy
    expect(startB >= endA || startA >= endB).toBe(true);
  });

  // Test 4: Capacity mismatch
  test('4. Session with too many attendees for any room fails with INSUFFICIENT_CAPACITY', () => {
    const smallRooms: Room[] = [
      {
        id: 'room-small',
        name: 'Small Room',
        capacity: 30,
        availableWindows: [{ start: '09:00', end: '17:00' }],
      },
    ];

    const sessions: Session[] = [
      {
        id: 'huge-talk',
        title: 'Stadium Talk',
        speakerId: 'spk-1',
        durationMinutes: 60,
        expectedAttendees: 500,
        popularityScore: 100,
      },
    ];

    const result = scheduleSessions(sessions, smallRooms);

    expect(result.scheduled).toHaveLength(0);
    expect(result.unscheduled).toHaveLength(1);
    expect(result.unscheduled[0]).toEqual({
      sessionId: 'huge-talk',
      reason: 'INSUFFICIENT_CAPACITY',
      details: expect.stringContaining('capacity'),
    });
  });

  // Test 5: Prerequisite ordering
  test('5. Every prerequisite session finishes before dependent session starts', () => {
    const sessions: Session[] = [
      {
        id: 'prereq-1',
        title: 'Basics of React',
        speakerId: 'spk-1',
        durationMinutes: 60,
        expectedAttendees: 40,
        popularityScore: 50,
      },
      {
        id: 'advanced-1',
        title: 'Advanced React Internals',
        speakerId: 'spk-2',
        durationMinutes: 60,
        expectedAttendees: 40,
        prerequisites: ['prereq-1'],
        popularityScore: 99, // Even with higher popularity, prereq must run first
      },
    ];

    const result = scheduleSessions(sessions, sampleRooms);

    expect(result.scheduled).toHaveLength(2);
    const prereqSched = result.scheduled.find((s) => s.sessionId === 'prereq-1')!;
    const advSched = result.scheduled.find((s) => s.sessionId === 'advanced-1')!;

    const prereqEnd = timeToMinutes(prereqSched.endTime)!;
    const advStart = timeToMinutes(advSched.startTime)!;

    expect(advStart).toBeGreaterThanOrEqual(prereqEnd);
  });

  // Test 6: Direct prerequisite cycle (A -> B -> A)
  test('6. Detects direct prerequisite cycle (A -> B -> A) and marks as CIRCULAR_PREREQUISITE', () => {
    const sessions: Session[] = [
      {
        id: 'sess-a',
        title: 'Session A',
        speakerId: 'spk-1',
        durationMinutes: 30,
        expectedAttendees: 20,
        prerequisites: ['sess-b'],
        popularityScore: 50,
      },
      {
        id: 'sess-b',
        title: 'Session B',
        speakerId: 'spk-2',
        durationMinutes: 30,
        expectedAttendees: 20,
        prerequisites: ['sess-a'],
        popularityScore: 50,
      },
    ];

    const result = scheduleSessions(sessions, sampleRooms);

    expect(result.scheduled).toHaveLength(0);
    expect(result.unscheduled).toHaveLength(2);
    expect(result.unscheduled.every((u) => u.reason === 'CIRCULAR_PREREQUISITE')).toBe(true);
  });

  // Test 7: Indirect 3-session cycle (A -> B -> C -> A)
  test('7. Detects indirect 3-session cycle (A -> B -> C -> A)', () => {
    const sessions: Session[] = [
      {
        id: 'sess-a',
        title: 'Session A',
        speakerId: 'spk-1',
        durationMinutes: 30,
        expectedAttendees: 20,
        prerequisites: ['sess-c'],
        popularityScore: 50,
      },
      {
        id: 'sess-b',
        title: 'Session B',
        speakerId: 'spk-2',
        durationMinutes: 30,
        expectedAttendees: 20,
        prerequisites: ['sess-a'],
        popularityScore: 50,
      },
      {
        id: 'sess-c',
        title: 'Session C',
        speakerId: 'spk-3',
        durationMinutes: 30,
        expectedAttendees: 20,
        prerequisites: ['sess-b'],
        popularityScore: 50,
      },
    ];

    const result = scheduleSessions(sessions, sampleRooms);

    expect(result.scheduled).toHaveLength(0);
    expect(result.unscheduled).toHaveLength(3);
    expect(result.unscheduled.every((u) => u.reason === 'CIRCULAR_PREREQUISITE')).toBe(true);
  });

  // Test 8: Session depending on a cyclic prerequisite
  test('8. Session depending transitively on a cyclic prerequisite is marked CIRCULAR_PREREQUISITE', () => {
    const sessions: Session[] = [
      {
        id: 'cycle-1',
        title: 'Cycle Node 1',
        speakerId: 'spk-1',
        durationMinutes: 30,
        expectedAttendees: 20,
        prerequisites: ['cycle-2'],
        popularityScore: 50,
      },
      {
        id: 'cycle-2',
        title: 'Cycle Node 2',
        speakerId: 'spk-2',
        durationMinutes: 30,
        expectedAttendees: 20,
        prerequisites: ['cycle-1'],
        popularityScore: 50,
      },
      {
        id: 'dependent-downstream',
        title: 'Downstream Session',
        speakerId: 'spk-3',
        durationMinutes: 30,
        expectedAttendees: 20,
        prerequisites: ['cycle-1'],
        popularityScore: 80,
      },
    ];

    const result = scheduleSessions(sessions, sampleRooms);

    expect(result.scheduled).toHaveLength(0);
    expect(result.unscheduled).toHaveLength(3);
    expect(result.unscheduled.find((u) => u.sessionId === 'dependent-downstream')?.reason).toBe('CIRCULAR_PREREQUISITE');
  });

  // Test 9: Room window boundary
  test('9. Session fits strictly within room window boundaries', () => {
    const strictRooms: Room[] = [
      {
        id: 'room-strict',
        name: 'Strict Window Room',
        capacity: 50,
        availableWindows: [{ start: '10:00', end: '11:00' }], // Exact 60 mins
      },
    ];

    const sessions: Session[] = [
      {
        id: 'fits-exact',
        title: 'Fits Exactly',
        speakerId: 'spk-1',
        durationMinutes: 60,
        expectedAttendees: 20,
        popularityScore: 50,
      },
    ];

    const result = scheduleSessions(sessions, strictRooms);

    expect(result.scheduled).toHaveLength(1);
    expect(result.scheduled[0]).toEqual({
      sessionId: 'fits-exact',
      roomId: 'room-strict',
      startTime: '10:00',
      endTime: '11:00',
    });
  });

  // Test 10: Buffer between sessions
  test('10. Respects bufferMinutes between consecutive sessions in the same room', () => {
    const singleRoom: Room[] = [
      {
        id: 'room-1',
        name: 'Room 1',
        capacity: 100,
        availableWindows: [{ start: '09:00', end: '12:00' }],
      },
    ];

    const sessions: Session[] = [
      {
        id: 'sess-1',
        title: 'First Talk',
        speakerId: 'spk-1',
        durationMinutes: 60,
        expectedAttendees: 30,
        popularityScore: 90,
      },
      {
        id: 'sess-2',
        title: 'Second Talk',
        speakerId: 'spk-2',
        durationMinutes: 60,
        expectedAttendees: 30,
        popularityScore: 80,
      },
    ];

    const result = scheduleSessions(sessions, singleRoom, { bufferMinutes: 15 });

    expect(result.scheduled).toHaveLength(2);
    expect(result.scheduled[0]).toEqual({
      sessionId: 'sess-1',
      roomId: 'room-1',
      startTime: '09:00',
      endTime: '10:00',
    });
    // 10:00 + 15 min buffer = 10:15
    expect(result.scheduled[1]).toEqual({
      sessionId: 'sess-2',
      roomId: 'room-1',
      startTime: '10:15',
      endTime: '11:15',
    });
  });

  // Test 11: Session that does not fit -> INSUFFICIENT_TIME
  test('11. Session exceeding available room windows fails with INSUFFICIENT_TIME', () => {
    const shortRoom: Room[] = [
      {
        id: 'room-short',
        name: 'Short Window',
        capacity: 100,
        availableWindows: [{ start: '09:00', end: '09:30' }], // 30 min
      },
    ];

    const sessions: Session[] = [
      {
        id: 'long-session',
        title: '2-Hour Workshop',
        speakerId: 'spk-1',
        durationMinutes: 120,
        expectedAttendees: 30,
        popularityScore: 50,
      },
    ];

    const result = scheduleSessions(sessions, shortRoom);

    expect(result.scheduled).toHaveLength(0);
    expect(result.unscheduled).toHaveLength(1);
    expect(result.unscheduled[0].reason).toBe('INSUFFICIENT_TIME');
  });

  // Test 12: Invalid input -> INVALID_DATA
  test('12. Handles invalid input fields with INVALID_DATA', () => {
    const sessions: any[] = [
      {
        id: 'bad-duration',
        title: 'Bad Duration',
        speakerId: 'spk-1',
        durationMinutes: -10, // Invalid duration
        expectedAttendees: 20,
        popularityScore: 50,
      },
      {
        id: 'bad-prereq-ref',
        title: 'Missing Prereq Reference',
        speakerId: 'spk-2',
        durationMinutes: 30,
        expectedAttendees: 20,
        prerequisites: ['non-existent-id'],
        popularityScore: 50,
      },
    ];

    const result = scheduleSessions(sessions, sampleRooms);

    expect(result.scheduled).toHaveLength(0);
    expect(result.unscheduled).toHaveLength(2);
    expect(result.unscheduled.every((u) => u.reason === 'INVALID_DATA')).toBe(true);
  });

  // Test 13: Deterministic output for identical input
  test('13. Guarantees identical output for identical input across multiple runs', () => {
    const sessions: Session[] = [
      {
        id: 'sess-b',
        title: 'Session B',
        speakerId: 'spk-2',
        durationMinutes: 45,
        expectedAttendees: 30,
        popularityScore: 70,
      },
      {
        id: 'sess-a',
        title: 'Session A',
        speakerId: 'spk-1',
        durationMinutes: 45,
        expectedAttendees: 30,
        popularityScore: 70, // Tied popularity
      },
    ];

    const run1 = scheduleSessions(sessions, sampleRooms);
    const run2 = scheduleSessions(sessions, sampleRooms);

    expect(run1).toEqual(run2);
  });

  // Test 14: Multiple rooms
  test('14. Distributes sessions across multiple rooms efficiently', () => {
    const multiRooms: Room[] = [
      {
        id: 'audi-1',
        name: 'Audi 1',
        capacity: 200,
        availableWindows: [{ start: '09:00', end: '11:00' }],
      },
      {
        id: 'lab-1',
        name: 'Lab 1',
        capacity: 50,
        availableWindows: [{ start: '09:00', end: '11:00' }],
      },
    ];

    const sessions: Session[] = [
      {
        id: 'big-talk',
        title: 'Big Talk',
        speakerId: 'spk-1',
        durationMinutes: 120,
        expectedAttendees: 150,
        popularityScore: 90,
      },
      {
        id: 'small-talk',
        title: 'Small Talk',
        speakerId: 'spk-2',
        durationMinutes: 120,
        expectedAttendees: 30,
        popularityScore: 85,
      },
    ];

    const result = scheduleSessions(sessions, multiRooms);

    expect(result.scheduled).toHaveLength(2);
    expect(result.scheduled.find((s) => s.sessionId === 'big-talk')?.roomId).toBe('audi-1');
    expect(result.scheduled.find((s) => s.sessionId === 'small-talk')?.roomId).toBe('lab-1');
  });

  // Test 15: Mixed scenario containing several constraints
  test('15. Complex realistic scenario with mixed constraints, prerequisites, and metrics', () => {
    const complexRooms: Room[] = [
      {
        id: 'hall-1',
        name: 'Main Hall',
        capacity: 100,
        availableWindows: [{ start: '09:00', end: '12:00' }], // 180 mins
      },
    ];

    const complexSessions: Session[] = [
      {
        id: 'keynote',
        title: 'Opening Keynote',
        speakerId: 'spk-keynote',
        durationMinutes: 60,
        expectedAttendees: 80,
        popularityScore: 100,
      },
      {
        id: 'track-a',
        title: 'Track A - Deep Dive',
        speakerId: 'spk-a',
        durationMinutes: 60,
        expectedAttendees: 50,
        prerequisites: ['keynote'],
        popularityScore: 80,
      },
      {
        id: 'track-b',
        title: 'Track B - Hands-on',
        speakerId: 'spk-b',
        durationMinutes: 60,
        expectedAttendees: 50,
        prerequisites: ['track-a'],
        popularityScore: 70,
      },
    ];

    const result = scheduleSessions(complexSessions, complexRooms, { bufferMinutes: 0 });

    expect(result.scheduled).toHaveLength(3);
    expect(result.scheduled[0]).toEqual({ sessionId: 'keynote', roomId: 'hall-1', startTime: '09:00', endTime: '10:00' });
    expect(result.scheduled[1]).toEqual({ sessionId: 'track-a', roomId: 'hall-1', startTime: '10:00', endTime: '11:00' });
    expect(result.scheduled[2]).toEqual({ sessionId: 'track-b', roomId: 'hall-1', startTime: '11:00', endTime: '12:00' });

    // Utilization: 180 scheduled mins / 180 total room mins = 100%
    expect(result.metrics.roomUtilizationPercentage).toBe(100);
    expect(result.metrics.totalSpeakerCount).toBe(3);
  });
});
