import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scheduleConference } from '../src/scheduler.js';
import type { Session, Room } from '../src/models.js';

describe('Challenge 02 — Conference Scheduler Test Suite', () => {
  const standardRooms: Room[] = [
    {
      id: 'Room-A',
      name: 'Main Auditorium',
      capacity: 200,
      availableWindows: [{ start: '09:00', end: '17:00' }]
    },
    {
      id: 'Room-B',
      name: 'Workshop Lab',
      capacity: 50,
      availableWindows: [{ start: '09:00', end: '17:00' }]
    }
  ];

  it('TEST 1 — Empty Sessions Input', () => {
    const result = scheduleConference([], standardRooms);
    assert.equal(result.scheduled.length, 0);
    assert.equal(result.unscheduled.length, 0);
    assert.equal(result.metrics.totalSessions, 0);
  });

  it('TEST 2 — Empty Rooms Input', () => {
    const sessions: Session[] = [
      {
        id: 's1',
        title: 'Keynote',
        speakerId: 'sp1',
        durationMinutes: 60,
        expectedAttendees: 100,
        popularityScore: 90
      }
    ];
    const result = scheduleConference(sessions, []);
    assert.equal(result.scheduled.length, 0);
    assert.equal(result.unscheduled.length, 1);
    assert.equal(result.unscheduled[0].reason, 'INSUFFICIENT_CAPACITY');
  });

  it('TEST 3 — Minimal Valid Single Session', () => {
    const sessions: Session[] = [
      {
        id: 's1',
        title: 'Introduction to GDG',
        speakerId: 'sp1',
        durationMinutes: 45,
        expectedAttendees: 30,
        popularityScore: 80
      }
    ];
    const result = scheduleConference(sessions, standardRooms);
    assert.equal(result.scheduled.length, 1);
    assert.equal(result.unscheduled.length, 0);
    assert.equal(result.scheduled[0].sessionId, 's1');
    assert.equal(result.scheduled[0].startTime, '09:00');
    assert.equal(result.scheduled[0].endTime, '09:45');
    assert.equal(result.scheduled[0].roomId, 'Room-B'); // Best-fit capacity (50 >= 30 instead of 200)
  });

  it('TEST 4 — Invalid Duration (Zero or Negative)', () => {
    const sessions: any[] = [
      {
        id: 's-zero',
        title: 'Zero Duration',
        speakerId: 'sp1',
        durationMinutes: 0,
        expectedAttendees: 20,
        popularityScore: 50
      },
      {
        id: 's-neg',
        title: 'Negative Duration',
        speakerId: 'sp2',
        durationMinutes: -30,
        expectedAttendees: 20,
        popularityScore: 50
      }
    ];
    const result = scheduleConference(sessions, standardRooms);
    assert.equal(result.scheduled.length, 0);
    assert.equal(result.unscheduled.length, 2);
    assert.equal(result.unscheduled[0].reason, 'INVALID_DATA');
    assert.equal(result.unscheduled[1].reason, 'INVALID_DATA');
  });

  it('TEST 5 — Invalid Time Format in Room', () => {
    const badRooms: Room[] = [
      {
        id: 'Room-BadTime',
        name: 'Bad Window',
        capacity: 100,
        availableWindows: [{ start: '25:00', end: '17:00' }]
      }
    ];
    const sessions: Session[] = [
      {
        id: 's1',
        title: 'Session 1',
        speakerId: 'sp1',
        durationMinutes: 60,
        expectedAttendees: 50,
        popularityScore: 80
      }
    ];
    const result = scheduleConference(sessions, badRooms);
    assert.equal(result.scheduled.length, 0);
    assert.equal(result.unscheduled.length, 1);
    assert.equal(result.unscheduled[0].reason, 'INSUFFICIENT_CAPACITY');
  });

  it('TEST 6 — Invalid Room Capacity', () => {
    const invalidRooms: any[] = [
      {
        id: 'Room-NegCap',
        name: 'Negative Capacity Room',
        capacity: -10,
        availableWindows: [{ start: '09:00', end: '17:00' }]
      }
    ];
    const sessions: Session[] = [
      {
        id: 's1',
        title: 'Session 1',
        speakerId: 'sp1',
        durationMinutes: 60,
        expectedAttendees: 10,
        popularityScore: 80
      }
    ];
    const result = scheduleConference(sessions, invalidRooms);
    assert.equal(result.scheduled.length, 0);
    assert.equal(result.unscheduled.length, 1);
  });

  it('TEST 7 — Insufficient Room Capacity', () => {
    const sessions: Session[] = [
      {
        id: 's-huge',
        title: 'Mega Stadium Keynote',
        speakerId: 'sp1',
        durationMinutes: 60,
        expectedAttendees: 500, // Largest room is 200
        popularityScore: 100
      }
    ];
    const result = scheduleConference(sessions, standardRooms);
    assert.equal(result.scheduled.length, 0);
    assert.equal(result.unscheduled.length, 1);
    assert.equal(result.unscheduled[0].reason, 'INSUFFICIENT_CAPACITY');
  });

  it('TEST 8 — Speaker Overlap in Same Room Blocked', () => {
    const singleRoom: Room[] = [
      {
        id: 'Room-1',
        name: 'Hall',
        capacity: 100,
        availableWindows: [{ start: '09:00', end: '11:00' }]
      }
    ];
    const sessions: Session[] = [
      {
        id: 's1',
        title: 'Session 1',
        speakerId: 'speaker-sarah',
        durationMinutes: 60,
        expectedAttendees: 50,
        popularityScore: 90
      },
      {
        id: 's2',
        title: 'Session 2',
        speakerId: 'speaker-sarah',
        durationMinutes: 60,
        expectedAttendees: 50,
        popularityScore: 80
      }
    ];
    // Room window is 09:00-11:00 (120 mins). s1 takes 09:00-10:00. buffer takes 10 mins (10:10). s2 needs 60 mins (10:10-11:10), which overflows 11:00!
    const result = scheduleConference(sessions, singleRoom);
    assert.equal(result.scheduled.length, 1);
    assert.equal(result.unscheduled.length, 1);
  });

  it('TEST 9 — Same Speaker Across Different Rooms (Conflict Prevented)', () => {
    const twoRooms: Room[] = [
      {
        id: 'Room-A',
        name: 'Audi A',
        capacity: 100,
        availableWindows: [{ start: '09:00', end: '11:00' }]
      },
      {
        id: 'Room-B',
        name: 'Audi B',
        capacity: 100,
        availableWindows: [{ start: '09:00', end: '11:00' }]
      }
    ];
    const sessions: Session[] = [
      {
        id: 's1',
        title: 'AI Talk Part 1',
        speakerId: 'speaker-busy',
        durationMinutes: 60,
        expectedAttendees: 50,
        popularityScore: 90
      },
      {
        id: 's2',
        title: 'AI Talk Part 2',
        speakerId: 'speaker-busy',
        durationMinutes: 60,
        expectedAttendees: 50,
        popularityScore: 80
      }
    ];
    const result = scheduleConference(sessions, twoRooms);
    assert.equal(result.scheduled.length, 2);
    // Ensure the two sessions do not overlap in time
    const sched1 = result.scheduled.find((s) => s.sessionId === 's1')!;
    const sched2 = result.scheduled.find((s) => s.sessionId === 's2')!;
    assert.ok(sched1);
    assert.ok(sched2);

    const s1Start = parseInt(sched1.startTime.replace(':', ''));
    const s1End = parseInt(sched1.endTime.replace(':', ''));
    const s2Start = parseInt(sched2.startTime.replace(':', ''));
    const s2End = parseInt(sched2.endTime.replace(':', ''));

    assert.ok(s1End <= s2Start || s2End <= s1Start, 'Speaker must not have overlapping sessions');
  });

  it('TEST 10 — Prerequisite Dependency Ordering (A finishes before B starts)', () => {
    const sessions: Session[] = [
      {
        id: 'sess-advanced',
        title: 'Advanced Kubernetes',
        speakerId: 'sp2',
        durationMinutes: 60,
        expectedAttendees: 30,
        popularityScore: 95, // Higher popularity, but depends on basic
        prerequisites: ['sess-basic']
      },
      {
        id: 'sess-basic',
        title: 'Docker Basics',
        speakerId: 'sp1',
        durationMinutes: 60,
        expectedAttendees: 30,
        popularityScore: 60
      }
    ];
    const result = scheduleConference(sessions, standardRooms);
    assert.equal(result.scheduled.length, 2);

    const basic = result.scheduled.find((s) => s.sessionId === 'sess-basic')!;
    const advanced = result.scheduled.find((s) => s.sessionId === 'sess-advanced')!;

    assert.ok(basic && advanced);
    // Basic ends at or before Advanced starts
    assert.ok(basic.endTime <= advanced.startTime, `Basic (${basic.endTime}) must end before Advanced (${advanced.startTime}) starts`);
  });

  it('TEST 11 — Missing Prerequisite ID Handled Cleanly', () => {
    const sessions: Session[] = [
      {
        id: 's1',
        title: 'Orphan Dependent',
        speakerId: 'sp1',
        durationMinutes: 45,
        expectedAttendees: 20,
        popularityScore: 70,
        prerequisites: ['non-existent-prereq-id']
      }
    ];
    const result = scheduleConference(sessions, standardRooms);
    assert.equal(result.scheduled.length, 0);
    assert.equal(result.unscheduled.length, 1);
    assert.equal(result.unscheduled[0].reason, 'INVALID_DATA');
  });

  it('TEST 12 — Direct Cycle (A -> B -> A) Detected Gracefully', () => {
    const sessions: Session[] = [
      {
        id: 'cycle-a',
        title: 'Cycle A',
        speakerId: 'sp1',
        durationMinutes: 30,
        expectedAttendees: 20,
        popularityScore: 80,
        prerequisites: ['cycle-b']
      },
      {
        id: 'cycle-b',
        title: 'Cycle B',
        speakerId: 'sp2',
        durationMinutes: 30,
        expectedAttendees: 20,
        popularityScore: 80,
        prerequisites: ['cycle-a']
      }
    ];
    const result = scheduleConference(sessions, standardRooms);
    assert.equal(result.scheduled.length, 0);
    assert.equal(result.unscheduled.length, 2);
    assert.equal(result.unscheduled.every((u) => u.reason === 'CIRCULAR_PREREQUISITE'), true);
  });

  it('TEST 13 — Deep Cycle (A -> B -> C -> D -> B)', () => {
    const sessions: Session[] = [
      {
        id: 'node-a',
        title: 'Node A',
        speakerId: 'sp1',
        durationMinutes: 30,
        expectedAttendees: 10,
        popularityScore: 80,
        prerequisites: ['node-b']
      },
      {
        id: 'node-b',
        title: 'Node B',
        speakerId: 'sp2',
        durationMinutes: 30,
        expectedAttendees: 10,
        popularityScore: 80,
        prerequisites: ['node-c']
      },
      {
        id: 'node-c',
        title: 'Node C',
        speakerId: 'sp3',
        durationMinutes: 30,
        expectedAttendees: 10,
        popularityScore: 80,
        prerequisites: ['node-d']
      },
      {
        id: 'node-d',
        title: 'Node D',
        speakerId: 'sp4',
        durationMinutes: 30,
        expectedAttendees: 10,
        popularityScore: 80,
        prerequisites: ['node-b'] // cycle b -> c -> d -> b
      }
    ];
    const result = scheduleConference(sessions, standardRooms);
    assert.equal(result.scheduled.length, 0);
    assert.equal(result.unscheduled.every((u) => u.reason === 'CIRCULAR_PREREQUISITE'), true);
  });

  it('TEST 14 — Multiple Room Windows (Morning & Afternoon)', () => {
    const splitWindowRooms: Room[] = [
      {
        id: 'Room-Split',
        name: 'Split Hall',
        capacity: 100,
        availableWindows: [
          { start: '09:00', end: '12:00' },
          { start: '13:00', end: '17:00' }
        ]
      }
    ];
    const sessions: Session[] = [
      {
        id: 's-morn',
        title: 'Morning Session',
        speakerId: 'sp1',
        durationMinutes: 120,
        expectedAttendees: 40,
        popularityScore: 90
      },
      {
        id: 's-afternoon',
        title: 'Afternoon Session',
        speakerId: 'sp2',
        durationMinutes: 120,
        expectedAttendees: 40,
        popularityScore: 85
      }
    ];
    const result = scheduleConference(sessions, splitWindowRooms);
    assert.equal(result.scheduled.length, 2);
    assert.equal(result.scheduled[0].startTime, '09:00');
    assert.equal(result.scheduled[1].startTime, '13:00');
  });

  it('TEST 15 — Window Overflow Boundary Defense', () => {
    const tightRoom: Room[] = [
      {
        id: 'Room-Tight',
        name: 'Tight Hall',
        capacity: 50,
        availableWindows: [{ start: '09:00', end: '09:30' }] // 30 minutes total
      }
    ];
    const sessions: Session[] = [
      {
        id: 's-too-long',
        title: 'Session Too Long',
        speakerId: 'sp1',
        durationMinutes: 45, // Exceeds 30 mins
        expectedAttendees: 20,
        popularityScore: 70
      }
    ];
    const result = scheduleConference(sessions, tightRoom);
    assert.equal(result.scheduled.length, 0);
    assert.equal(result.unscheduled.length, 1);
    assert.equal(result.unscheduled[0].reason, 'INSUFFICIENT_TIME');
  });

  it('TEST 16 — Exact Window Fit', () => {
    const exactRoom: Room[] = [
      {
        id: 'Room-Exact',
        name: 'Exact Hall',
        capacity: 50,
        availableWindows: [{ start: '10:00', end: '11:00' }] // Exactly 60 mins
      }
    ];
    const sessions: Session[] = [
      {
        id: 's-exact',
        title: 'Exact Fit Session',
        speakerId: 'sp1',
        durationMinutes: 60,
        expectedAttendees: 25,
        popularityScore: 80
      }
    ];
    const result = scheduleConference(sessions, exactRoom);
    assert.equal(result.scheduled.length, 1);
    assert.equal(result.scheduled[0].startTime, '10:00');
    assert.equal(result.scheduled[0].endTime, '11:00');
  });

  it('TEST 17 — Turnover Buffer Enforcement (10 min gap)', () => {
    const singleRoom: Room[] = [
      {
        id: 'Room-Buffer',
        name: 'Buffer Hall',
        capacity: 100,
        availableWindows: [{ start: '09:00', end: '12:00' }]
      }
    ];
    const sessions: Session[] = [
      {
        id: 's1',
        title: 'Session 1',
        speakerId: 'sp1',
        durationMinutes: 60,
        expectedAttendees: 50,
        popularityScore: 90
      },
      {
        id: 's2',
        title: 'Session 2',
        speakerId: 'sp2',
        durationMinutes: 45,
        expectedAttendees: 50,
        popularityScore: 80
      }
    ];
    const result = scheduleConference(sessions, singleRoom, { bufferMinutes: 10 });
    assert.equal(result.scheduled.length, 2);
    assert.equal(result.scheduled[0].startTime, '09:00');
    assert.equal(result.scheduled[0].endTime, '10:00');
    // Buffer of 10 mins pushes s2 to 10:10
    assert.equal(result.scheduled[1].startTime, '10:10');
    assert.equal(result.scheduled[1].endTime, '10:55');
  });

  it('TEST 18 — Best-fit Capacity Allocation', () => {
    const rooms: Room[] = [
      { id: 'Audi-Big', name: 'Big Hall', capacity: 250, availableWindows: [{ start: '09:00', end: '17:00' }] },
      { id: 'Audi-Mid', name: 'Mid Hall', capacity: 80, availableWindows: [{ start: '09:00', end: '17:00' }] }
    ];
    const sessions: Session[] = [
      {
        id: 's-small',
        title: 'Small Meetup',
        speakerId: 'sp1',
        durationMinutes: 45,
        expectedAttendees: 30, // Fits Mid (80) better than Big (250)
        popularityScore: 75
      }
    ];
    const result = scheduleConference(sessions, rooms);
    assert.equal(result.scheduled.length, 1);
    assert.equal(result.scheduled[0].roomId, 'Audi-Mid');
  });

  it('TEST 19 — Deterministic Output Reproducibility', () => {
    const sessions: Session[] = Array.from({ length: 15 }, (_, i) => ({
      id: `sess-${i + 1}`,
      title: `Talk ${i + 1}`,
      speakerId: `sp-${(i % 5) + 1}`,
      durationMinutes: 30 + (i % 3) * 15,
      expectedAttendees: 20 + (i % 4) * 10,
      popularityScore: 50 + (i * 3) % 45
    }));

    const run1 = scheduleConference(sessions, standardRooms);
    const run2 = scheduleConference(sessions, standardRooms);

    assert.deepEqual(run1.scheduled, run2.scheduled);
    assert.deepEqual(run1.unscheduled, run2.unscheduled);
    assert.deepEqual(run1.metrics, run2.metrics);
  });

  it('TEST 20 — Accurate Metrics Calculation', () => {
    const rooms: Room[] = [
      { id: 'R1', name: 'Hall 1', capacity: 100, availableWindows: [{ start: '09:00', end: '11:00' }] } // 120 mins
    ];
    const sessions: Session[] = [
      {
        id: 's1',
        title: 'Talk 1',
        speakerId: 'sp1',
        durationMinutes: 60,
        expectedAttendees: 50,
        popularityScore: 90
      }
    ];
    const result = scheduleConference(sessions, rooms);
    assert.equal(result.metrics.totalSessions, 1);
    assert.equal(result.metrics.scheduledCount, 1);
    assert.equal(result.metrics.unscheduledCount, 0);
    assert.equal(result.metrics.totalSpeakerCount, 1);
    // 60 / 120 * 100 = 50%
    assert.equal(result.metrics.roomUtilizationPercentage, 50);
  });

  it('TEST 21 — High-Volume Scale Benchmark (100+ Sessions across 10 Rooms in <1s)', () => {
    const tenRooms: Room[] = Array.from({ length: 10 }, (_, i) => ({
      id: `Room-${i + 1}`,
      name: `Track Hall ${i + 1}`,
      capacity: 50 + i * 20,
      availableWindows: [
        { start: '09:00', end: '13:00' },
        { start: '14:00', end: '18:00' }
      ]
    }));

    const hundredSessions: Session[] = Array.from({ length: 120 }, (_, i) => ({
      id: `session-scale-${i + 1}`,
      title: `Conference Presentation ${i + 1}`,
      speakerId: `speaker-${(i % 25) + 1}`,
      durationMinutes: 30 + (i % 3) * 15,
      expectedAttendees: 30 + (i % 10) * 15,
      popularityScore: 30 + (i % 70),
      prerequisites: i > 0 && i % 10 === 0 ? [`session-scale-${i}`] : undefined
    }));

    const startTime = Date.now();
    const result = scheduleConference(hundredSessions, tenRooms);
    const elapsedMs = Date.now() - startTime;

    assert.ok(elapsedMs < 1000, `Execution took ${elapsedMs}ms, expected sub-second (<1000ms)`);
    assert.ok(result.scheduled.length > 50, 'A majority of sessions should be scheduled');
    assert.equal(result.metrics.totalSessions, 120);
  });
});
