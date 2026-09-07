# ⚙️ Challenge 02 — Coding & Algorithmic Problem Solving
**Evaluation Weight:** 20 Points  
**Recommended Time:** 3 – 4 Hours  
**Deliverable:** Complete algorithmic engine, edge-case validation, and automated unit test suite.

---

## 📌 Problem Scenario: GDG DevFest Smart Session & Track Scheduler

Organizing a large-scale developer conference like **GDG DevFest SVEC** requires coordinating multiple parallel tracks, diverse speakers, prerequisite skill tracks, room capacities, and tight venue time windows.

Manual scheduling often leads to double-booked speakers, overcrowded workshop halls, and broken learning prerequisites.

Your objective is to design and implement an **algorithmic scheduling and constraint-resolution engine** that produces an optimal, conflict-free conference schedule.

---

## 📋 Input Specifications

Your scheduler must accept two primary data structures: `Session[]` and `Room[]`, plus optional configuration options.

### 1. `Session` Definition
```typescript
interface Session {
  id: string;                      // Unique session identifier (e.g. "sess-101")
  title: string;                   // Session title
  speakerId: string;               // Unique speaker ID
  durationMinutes: number;         // Session duration in minutes (e.g. 30, 45, 60, 90)
  expectedAttendees: number;       // Expected attendance volume
  prerequisites?: string[];        // Array of session IDs that MUST conclude before this starts
  popularityScore: number;         // Priority weight from 1 to 100
  tags?: string[];                 // E.g., ["ai-ml", "cloud", "web"]
}
```

### 2. `Room` Definition
```typescript
interface TimeWindow {
  start: string;                   // "HH:MM" 24-hour format (e.g., "09:00")
  end: string;                     // "HH:MM" 24-hour format (e.g., "17:00")
}

interface Room {
  id: string;                      // Unique room identifier (e.g., "Audi-1", "Lab-B")
  name: string;                    // Room display name
  capacity: number;                // Maximum seating capacity
  availableWindows: TimeWindow[];  // Available operating hours
}
```

### 3. `SchedulerConfig` (Optional / Configurable)
- `bufferMinutes`: Time required between consecutive sessions in the same room for stage turnover (Default: `10` minutes).

---

## 🔒 Hard Constraints (Must Satisfy)

1. **No Speaker Overlaps:** A speaker (`speakerId`) cannot be scheduled in two different rooms at overlapping times.
2. **Room Capacity Matching:** A session can ONLY be placed in a room where `room.capacity >= session.expectedAttendees`.
3. **Prerequisite Dependency Ordering:** If Session `B` requires Session `A`, then Session `A` must finish before Session `B` starts (i.e. `endTime(A) <= startTime(B)`).
4. **Room Window Boundaries:** Sessions must start and end strictly within the room's `availableWindows`, respecting the turnover buffer between back-to-back sessions.
5. **Cycle Detection:** If the prerequisite graph contains a cycle (e.g., $A \to B \to C \to A$), the engine must detect the cycle, fail gracefully, and classify affected sessions without crashing or entering infinite recursion.

---

## 🎯 Optimization Goal

When venue capacity or time is constrained:
- Prioritize higher `popularityScore` sessions.
- Maximize room seat utilization and total scheduled sessions.
- Provide deterministic, reproducible scheduling results.

---

## 📤 Output Specification

Your scheduler must return a structured result:

```typescript
interface ScheduleOutput {
  scheduled: Array<{
    sessionId: string;
    roomId: string;
    startTime: string;            // "HH:MM"
    endTime: string;              // "HH:MM"
  }>;
  unscheduled: Array<{
    sessionId: string;
    reason: 'SPEAKER_CONFLICT' | 'INSUFFICIENT_CAPACITY' | 'INSUFFICIENT_TIME' | 'CIRCULAR_PREREQUISITE' | 'INVALID_DATA';
    details?: string;
  }>;
  metrics: {
    totalSessions: number;
    scheduledCount: number;
    unscheduledCount: number;
    totalSpeakerCount: number;
    roomUtilizationPercentage: number;
  };
}
```

---

## 🧪 Edge Cases to Test

Your implementation will be benchmarked on:
- **Empty & Minimal Inputs:** Empty session lists, empty rooms, or zero duration.
- **Circular Prerequisite Graphs:** $A \to B \to A$ or deep cycles ($A \to B \to C \to D \to B$).
- **Impossible Constraints:** Session requiring 500 seats when the largest room has 200 seats.
- **Overlapping Speaker Requests:** Multiple sessions with the same speaker requesting simultaneous slots.
- **Buffer & Window Limits:** Back-to-back sessions spanning lunch breaks or exact boundary limits.
- **High-volume Scale:** Handling 100+ sessions across 10 rooms within sub-second execution time.

---

## 🚀 Deliverables & Structure

You may write your solution in **TypeScript, JavaScript, Python, Go, Java, or C++**.

```
assessment/challenge-02-coding/
├── README.md               # This file
├── package.json / requirements.txt / go.mod
├── src/
│   ├── scheduler.*         # Main scheduling engine implementation
│   ├── models.*            # Types / data structures / graphs
│   └── utils.*             # Time parsing, topological sort, conflict checkers
└── tests/
    └── scheduler.test.*    # Comprehensive test suite covering all constraints & edge cases
```

---

## ⚖️ Scoring Criteria (20 Points)

| Category | Points | Description |
| :--- | :---: | :--- |
| **Constraint Correctness** | 8 | All 5 hard constraints (speaker overlap, prerequisites, capacity, room windows, cycle detection) strictly satisfied. |
| **Algorithm & Efficiency** | 5 | Thoughtful algorithmic design (topological sort, greedy/interval scheduling, priority queues) with clean time/space complexity. |
| **Edge Case Handling & Robustness** | 4 | Resilient input validation, error handling, and boundary case defense. |
| **Test Suite Completeness** | 3 | High test coverage with clear assertions for edge cases and constraint violations. |
