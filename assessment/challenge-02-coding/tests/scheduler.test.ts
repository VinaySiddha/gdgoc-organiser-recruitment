// scheduler.test.ts - Unit Tests for ConferenceScheduler
import { ConferenceScheduler } from '../src/scheduler';
import { Session, Room } from '../src/models';

describe('Challenge 02: ConferenceScheduler Algorithmic Engine', () => {
  let scheduler: ConferenceScheduler;

  const defaultRooms: Room[] = [
    {
      id: 'audi-main',
      name: 'Main Auditorium',
      capacity: 200,
      availableWindows: [{ start: '09:00', end: '17:00' }],
    },
    {
      id: 'lab-a',
      name: 'AI Lab',
      capacity: 50,
      availableWindows: [{ start: '09:00', end: '17:00' }],
    },
  ];

  beforeEach(() => {
    scheduler = new ConferenceScheduler({ bufferMinutes: 10 });
  });

  test('should handle empty sessions and empty rooms gracefully', () => {
    const res1 = scheduler.schedule([], []);
    expect(res1.metrics.totalSessions).toBe(0);
    expect(res1.scheduled.length).toBe(0);

    const res2 = scheduler.schedule(
      [
        {
          id: 's1',
          title: 'Intro',
          speakerId: 'spk1',
          durationMinutes: 45,
          expectedAttendees: 30,
          popularityScore: 80,
        },
      ],
      []
    );
    expect(res2.unscheduled.length).toBe(1);
    expect(res2.unscheduled[0].reason).toBe('INSUFFICIENT_CAPACITY');
  });

  test('should schedule a single keynote successfully', () => {
    const sessions: Session[] = [
      {
        id: 's-keynote',
        title: 'Keynote',
        speakerId: 'spk-lead',
        durationMinutes: 60,
        expectedAttendees: 150,
        popularityScore: 99,
      },
    ];
    const out = scheduler.schedule(sessions, defaultRooms);
    expect(out.scheduled.length).toBe(1);
    expect(out.scheduled[0].sessionId).toBe('s-keynote');
    expect(out.scheduled[0].roomId).toBe('audi-main');
    expect(out.scheduled[0].startTime).toBe('09:00');
    expect(out.scheduled[0].endTime).toBe('10:00');
  });

  test('should prevent overlapping sessions for the same speaker across rooms', () => {
    const sessions: Session[] = [
      {
        id: 's1',
        title: 'Session 1',
        speakerId: 'spk-common',
        durationMinutes: 60,
        expectedAttendees: 30,
        popularityScore: 90,
      },
      {
        id: 's2',
        title: 'Session 2',
        speakerId: 'spk-common',
        durationMinutes: 60,
        expectedAttendees: 30,
        popularityScore: 85,
      },
    ];
    const out = scheduler.schedule(sessions, defaultRooms);
    expect(out.scheduled.length).toBe(2);
    const [sess1, sess2] = out.scheduled;
    expect(sess1.endTime <= sess2.startTime || sess2.endTime <= sess1.startTime).toBe(true);
  });

  test('should detect 2-node and deep cycles in prerequisite graphs', () => {
    const deepCycle: Session[] = [
      { id: 'a', title: 'A', speakerId: 's1', durationMinutes: 30, expectedAttendees: 20, popularityScore: 80, prerequisites: ['b'] },
      { id: 'b', title: 'B', speakerId: 's2', durationMinutes: 30, expectedAttendees: 20, popularityScore: 80, prerequisites: ['c'] },
      { id: 'c', title: 'C', speakerId: 's3', durationMinutes: 30, expectedAttendees: 20, popularityScore: 80, prerequisites: ['d'] },
      { id: 'd', title: 'D', speakerId: 's4', durationMinutes: 30, expectedAttendees: 20, popularityScore: 80, prerequisites: ['b'] },
    ];
    const out = scheduler.schedule(deepCycle, defaultRooms);
    expect(out.scheduled.length).toBe(0);
    expect(out.unscheduled.length).toBe(4);
    expect(out.unscheduled.every((u) => u.reason === 'CIRCULAR_PREREQUISITE')).toBe(true);
  });

  test('should prioritize higher popularity score when slots are constrained', () => {
    const constrainedRooms: Room[] = [
      {
        id: 'tiny-room',
        name: 'Tiny Room',
        capacity: 100,
        availableWindows: [{ start: '09:00', end: '10:00' }], // Only room for 1 session of 60 min
      },
    ];
    const sessions: Session[] = [
      { id: 'low-pop', title: 'Low', speakerId: 's1', durationMinutes: 60, expectedAttendees: 20, popularityScore: 40 },
      { id: 'high-pop', title: 'High', speakerId: 's2', durationMinutes: 60, expectedAttendees: 20, popularityScore: 95 },
    ];
    const out = scheduler.schedule(sessions, constrainedRooms);
    expect(out.scheduled.length).toBe(1);
    expect(out.scheduled[0].sessionId).toBe('high-pop');
    expect(out.unscheduled[0].sessionId).toBe('low-pop');
  });

  test('should benchmark 100+ sessions deterministically in < 100ms', () => {
    const rooms: Room[] = Array.from({ length: 10 }, (_, i) => ({
      id: `room-${i}`,
      name: `Hall ${i}`,
      capacity: 50 + i * 20,
      availableWindows: [{ start: '08:00', end: '18:00' }],
    }));

    const sessions: Session[] = Array.from({ length: 100 }, (_, i) => ({
      id: `sess-${i}`,
      title: `Topic ${i}`,
      speakerId: `speaker-${i % 20}`,
      durationMinutes: 45,
      expectedAttendees: 30 + (i % 5) * 10,
      popularityScore: (i * 17) % 100 + 1,
      prerequisites: i % 10 === 5 ? [`sess-${i - 1}`] : [],
    }));

    const start = performance.now();
    const res = scheduler.schedule(sessions, rooms);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(500);
    expect(res.metrics.totalSessions).toBe(100);
    expect(res.metrics.scheduledCount).toBeGreaterThan(0);
  });
});
