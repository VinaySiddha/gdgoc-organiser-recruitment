# 📋 GDG on Campus SVEC 4.0 — Candidate Submission Dossier

> **Instructions:** Complete all sections below. This document serves as the primary technical brief reviewed by the GDG on Campus SVEC evaluation panel.

---

## 👤 Candidate Information

- **Candidate Name:** Jitendra Sri Talabattula
- **GitHub Username:** JitendraSri
- **Year:** 4th Year (B.Tech) — CSE AI, SVEC Vizag
- **Department:** Computer Science Engineering (Artificial Intelligence) — SVEC, Vizag
- **College Email / Contact:** 23a81a4361@sves.org.in

---

## 📌 Executive Summary

- **Challenge Completed:**
  - [x] Challenge 01 — Debugging & Root-Cause Analysis
  - [x] Challenge 02 — Coding & Problem Solving
  - [x] Challenge 03 — Practical GDG Community Solution
- **Tech Stack:** TypeScript (ES2022 / NodeNext), Node.js (v20/v22), Express, Node Test Runner, Supertest, Modern Vanilla CSS / HTML5, SVG Graphic Rendering Engine
- **Repository URL:** [YOUR GITHUB REPOSITORY URL]
- **Live Demo URL (if applicable):** Local execution via http://localhost:3000

---

## 🛠️ Challenge 01 — Debugging & Root-Cause Analysis Summary

- **Root Cause Identified:** The original `EventDispatcher` contained five critical flaws: (1) Shared instance state via `activeContext` causing severe cross-talk race conditions between concurrent requests; (2) Timezone-naive date parsing that failed on explicit offsets like Indian Standard Time (`+05:30`); (3) Fire-and-forget asynchronous webhook execution leading to unhandled promise rejections; (4) Immediate tight-loop retries without exponential backoff causing cascading failure; and (5) Silent failure swallowing.
- **Fix Implemented:** Fully refactored `EventDispatcher` in `assessment/challenge-01-debugging/src/dispatcher.ts` using isolated lexical scope per request, defensive cloning, regex-based ISO-8601 validation preserving exact UTC and local offsets, injectable sleep/sender architecture, bounded exponential backoff ($2^{attempt-2}$ delay), and tracked promise lifecycles.
- **Regression Testing Strategy:** Implemented 12 comprehensive test scenarios in `tests/dispatcher.test.ts` covering 50 concurrent registrations with zero data contamination, reproduction of the original race condition, transient 503 retries, timeout enforcement, permanent failures, timezone offset preservation, and duplicate ID prevention.
- *(Full details in `assessment/challenge-01-debugging/DEBUG_REPORT.md`)*

---

## ⚙️ Challenge 02 — Coding & Problem Solving Summary

- **Language & Runtime:** TypeScript / Node.js
- **Algorithm & Data Structures Used:** Kahn's Algorithm for topological sorting and 3-color cycle detection; greedy interval scheduling with dynamic candidate start time evaluation; multi-attribute deterministic sorting; Map/Set index lookups.
- **Time Complexity:** $O(N \log N + N \cdot R \cdot W \cdot S)$ where $N$ is sessions, $R$ is rooms, $W$ is windows, and $S$ is existing slots. Benchmark executes 120 sessions across 10 rooms in ~23ms (well under the 1000ms threshold).
- **Space Complexity:** $O(N + R + K)$ to maintain room timelines, speaker allocations, and dependency graphs.
- **Edge Cases Handled:** Empty inputs, prerequisite cycles ($A \to B \to A$ and deep multi-hop cycles), missing prerequisite IDs, room capacity mismatches, speaker overlaps across different rooms, consecutive room turnover buffer (10 min gap), operating window overflows, and duplicate session IDs.

---

## 🚀 Challenge 03 — Practical Project Breakdown

### Overview & Problem Solved
Built Track A: **Event Check-In & Dynamic Social Badge Hub**. It solves manual registration bottlenecks, duplicate ticket fraud, and lack of real-time attendance visibility during major campus developer gatherings (GDG DevFest SVEC).

### Architecture & System Design
Follows a modular, layered architecture:
- **Models (`src/models/types.ts`):** Defines strict TypeScript interfaces for attendees, check-in payloads, and analytics.
- **Service Layer (`src/services/`):** `StoreService` provides thread-safe in-memory caching with composite indexing (Ticket ID, Roll Number, Email) and velocity tracking. `BadgeService` generates personalized vector SVG badges.
- **Controller Layer (`src/controllers/`):** `AttendeeController` and `CheckInController` handle validation, ticket issuance, double check-in prevention (`HTTP 409 Conflict`), and metrics reporting.
- **Presentation (`src/public/`):** Single-page web application featuring Google-branded glassmorphic UI, live dashboard charts, check-in scanner simulator, and badge studio.

### Key Features Delivered
1. **Attendee Registration & QR Pass:** Issues unique `GDG-2026-XXXX` ticket IDs and embedded QR payload upon student registration with duplicate roll/email defense.
2. **Rapid Check-In & Duplicate Prevention Guard:** Verifies tickets instantaneously and blocks reuse attempts with clear conflict alerts.
3. **Live Attendance Analytics Dashboard:** Displays real-time turnout rates, registration velocity (req/min), and department breakdown.
4. **Dynamic SVG Social Badge Studio:** Generates customizable vector attendee badges with role badges, Google accent gradients, and instant download.

### Setup & Local Execution Guide
```bash
# 1. Navigate to Challenge 03 directory
cd assessment/challenge-03-practical

# 2. Install dependencies
npm install

# 3. Environment configuration (optional)
cp .env.example .env

# 4. Run automated integration tests
npm test

# 5. Start application
npm start
# Open http://localhost:3000 in your browser
```

---

## 🤖 AI Assistance & Modern Tooling Disclosure

- **AI Tools Used:** Google Antigravity / Gemini 3.8
- **How AI Was Used:** Code scaffolding, edge-case test generation, regex pattern synthesis for ISO-8601 validation, algorithm optimization for interval candidate evaluation, and markdown documentation formatting.
- **Validation & Refactoring:** Every suggestion was rigorously compiled, reviewed against the repository specifications, refactored to eliminate assumptions, and verified through dedicated automated test suites.
- *(Refer to `starter/AI_DISCLOSURE.md` for full detailed prompts and workflow logs).*

---

## 💡 Engineering Insights & Reflections

### Major Technical Decisions
1. **Elimination of Shared Mutable State in EventDispatcher:**
   - *Rationale:* Concurrency bugs in Node.js event loops occur when request state is stored on class instances (`this.activeContext`). Moving state into function parameters and immutable local copies eliminates race conditions without mutex locks.
2. **Dynamic Candidate Start Times in Conference Scheduler:**
   - *Rationale:* Evaluating candidate start times at window boundaries, after room buffers, AND when a speaker finishes other sessions guarantees conflict-free schedules without expensive fine-grained minute-by-minute discretization.
3. **In-Memory Store with Multi-Key Indexing for Practical Project:**
   - *Rationale:* Eliminates database setup friction for evaluators while maintaining $O(1)$ lookups and duplicate checks across Ticket ID, Email, and Student Roll Number.

### Known Limitations
- *Limitation 1:* The conference scheduler employs greedy interval placement with deterministic ordering; while optimal for priority and seat utilization, mixed-integer linear programming (MILP) could achieve global theoretical optimal packings for small inputs.
- *Limitation 2:* The in-memory data store for Challenge 03 resets on server restart; production deployment would back this with SQLite or PostgreSQL.

### What I Would Improve with More Time

What I Would Improve: Hardware QR camera integration via WebRTC, persistent PostgreSQL storage, and WebSocket live dashboard push notifications.

- *Improvement 1:* Add hardware QR scanner camera integration using WebRTC / `html5-qrcode` in the frontend check-in terminal.
- *Improvement 2:* Implement persistent SQLite / PostgreSQL storage with Prisma ORM migrations for Challenge 03.
- *Improvement 3:* Add WebSocket / SSE live push notifications to update organizer dashboards instantaneously as attendees cross the venue gate.

---

## 📝 Candidate Self-Certification

- [x] I certify that all work presented is my own original solution (with AI tools responsibly disclosed).
- [x] I have not committed any private keys, real credentials, or secrets in this repository.
- [x] I am prepared to present, explain, and defend all architectural decisions and code during the technical interview.

**Signature / Name:** Jitendra
**Date:** 2026-09-08
