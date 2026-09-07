# 📋 GDG on Campus SVEC 4.0 — Candidate Submission Dossier

> **Candidate Submission Brief — GDG on Campus SVEC 4.0 Technical Assessment**

---

## 👤 Candidate Information

- **Candidate Name:** Candidate 23A81A4397
- **GitHub Username:** 23A81A4397
- **Year:** 2nd Year
- **Department:** CSE (Computer Science & Engineering)
- **College Email / Contact:** 23A81A4397@svec.edu.in

---

## 📌 Executive Summary

- **Challenges Completed:**
  - [x] Challenge 01 — Debugging & Root-Cause Analysis (Event RSVP & Webhook Dispatcher)
  - [x] Challenge 02 — Coding & Problem Solving (Deterministic Conference Track Scheduler)
  - [x] Challenge 03 — Practical GDG Community Solution (GDG SVEC EventHub - Track A)
- **Tech Stack Used:** TypeScript, Python 3.12, Next.js 14, React 18, Tailwind CSS, SQLite, Prisma, Pytest, Jest, HTML5 Canvas API
- **Repository URL:** https://github.com/VinaySiddha/gdgoc-organiser-recruitment
- **Submission Branch:** `submission/23A81A4397`
- **Live Demo URL (if applicable):** Local execution via Next.js dev server on `http://localhost:3000`

---

## 🛠️ Challenge 01 — Debugging & Root-Cause Analysis Summary

- **Root Cause Identified:** 
  1. Shared mutable state across concurrent execution threads (`this.activeContext` / `self.active_context`) causing race conditions and metadata corruption during registration surges.
  2. Unmanaged fire-and-forget asynchronous webhook promises triggering unhandled rejections upon network timeouts.
  3. Naive timestamp parsing discarding valid ISO-8601 timezone offsets (`+05:30` IST, `-04:00` EDT) and silently returning boolean errors.
  4. Missing exponential backoff in retry loops causing network thundering herd and unlogged permanent failures.
- **Fix Implemented:** 
  1. Eliminated all shared mutable instance state in favor of immutable request-local scoped records.
  2. Implemented strict ISO-8601 validation with full timezone offset preservation.
  3. Integrated structured exponential backoff retries ($T_{\text{delay}} = \text{base} \times 2^{\text{attempt}-1}$) and failure logging.
  4. Decoupled registration persistence from webhook failure isolation.
- **Regression Testing Strategy:** 
  6 comprehensive automated regression tests including 50 concurrent simultaneous registrations, timestamp offset verification, retry delay progression, and permanent failure containment.
- *(Full details in `assessment/challenge-01-debugging/DEBUG_REPORT.md`)*

---

## ⚙️ Challenge 02 — Coding & Problem Solving Summary

- **Language & Runtime:** TypeScript (ES2022 / Node.js) & Python 3.12
- **Algorithm & Data Structures Used:** 
  - Directed Acyclic Graph (DAG) Prerequisite Resolution with Three-Color Depth First Search (DFS) Cycle Detection.
  - Topological Dependency Depth Assignment + Multi-Criteria Stable Priority Sort (Dependency Level $\to$ Popularity Score Descending $\to$ Attendee Capacity $\to$ Session ID tie-breaker).
  - Interval Conflict Resolution for Speaker Multi-Room Overlap Prevention.
  - Turnover Stage Buffer Enforcement and Room Time-Window Boundary Clipping.
- **Time Complexity:** 
  - Graph validation & cycle detection: $O(V + E)$ where $V$ = number of sessions, $E$ = number of prerequisite dependencies.
  - Topological depth computation: $O(V + E)$.
  - Multi-track slot allocation: $O(N \cdot R \cdot W \cdot K)$ where $N$ = sessions, $R$ = candidate rooms, $W$ = operating windows, $K$ = scheduled intervals per room. Benchmark executes 120 sessions across 12 rooms in $<0.06$ seconds.
- **Space Complexity:** $O(V + E + R)$ for graph adjacency, interval lookup tables, and output manifests.
- **Edge Cases Handled:** Empty inputs, 2-node cycles ($A \to B \to A$), deep cycles ($A \to B \to C \to D \to B$), self-dependencies ($A \to A$), impossible capacities ($>200$ seats), back-to-back buffer constraints, malformed input durations/times, and deterministic repeatability.

---

## 🚀 Challenge 03 — Practical Project Breakdown

### Overview & Problem Solved
**GDG SVEC EventHub (Track A)** eliminates physical check-in queues at GDG campus workshops and solves the lack of dynamic attendee credentials. It provides instant digital registration passes with QR codes, rapid organizer check-in verification with atomic duplicate scan protection, an interactive HTML5 Canvas social badge studio for instant PNG downloads, and a live telemetry dashboard displaying turnout rates, department participation grids, and CSV roster exports.

### Architecture & System Design
- **Client Layer:** Next.js App Router with React, Tailwind CSS, Lucide icons, and HTML5 Canvas.
- **API & Controller Layer:** Modular endpoints (`/api/register`, `/api/ticket/:id`, `/api/check-in`, `/api/dashboard`, `/api/attendees`, `/api/export`).
- **Domain Service Layer:** Decoupled `RegistrationService`, `CheckInService`, and `DashboardService`.
- **Database & Persistence:** SQLite relational database with atomic transactions (`BEGIN ... COMMIT`), uniqueness constraints on `email`, `roll_number`, and `check_ins.ticket_id`, indexed foreign keys, and Prisma schema definitions.

### Key Features Delivered
1. **Student Registration & QR Pass Generator (`/register`, `/ticket/:id`):** Validates attendee details, prevents duplicate registrations, and renders digital entry pass with secure QR payload (`GDG-PASS:TICK-GDG-XXXXXX`).
2. **Rapid Organizer Check-In Desk (`/check-in`):** Camera stream and manual ticket verification with atomic concurrency locks returning `VALID_TICKET`, `ALREADY_CHECKED_IN`, or `INVALID_TICKET`.
3. **Dynamic Social Badge Studio (`/badge/:id`):** Real-time client-side HTML5 Canvas rendering (600x800 high-res) with customizable developer identities (*AI Enthusiast, Cloud Architect, Student Developer*), gradient themes, and PNG export.
4. **Organizer Telemetry & Analytics Dashboard (`/admin`):** Real-time KPI summaries, turnout percentages, department participation breakdown, attendee search, and CSV manifest export.

### Setup & Local Execution Guide
```bash
# 1. Clone repository
git clone https://github.com/VinaySiddha/gdgoc-organiser-recruitment.git
cd gdgoc-organiser-recruitment

# 2. Checkout submission branch
git checkout submission/23A81A4397

# 3. Install dependencies & configure environment
cd assessment/challenge-03-practical
npm install
cp .env.example .env

# 4. Run automated test suites
pytest ../../assessment/ -v
npm test

# 5. Start development server
npm run dev
# Open http://localhost:3000 in your browser
```

---

## 🤖 AI Assistance & Modern Tooling Disclosure

- **AI Tools Used:** Google Gemini 2.0 / Gemini 3.7 & GitHub Copilot
- **How AI Was Used:** Architectural scaffolding, test-case synthesis, canvas coordinate calculations, and edge-case boundary brainstorming.
- **Validation & Refactoring:** Every generated algorithm and database query was validated with dedicated unit tests, manual edge-case verification, concurrency simulation (threading / async gather), and strict adherence to the assessment rubric.
- *(Refer to `AI_DISCLOSURE.md` for full detailed prompts and workflow logs).*

---

## 💡 Engineering Insights & Reflections

### Major Technical Decisions
1. **Decision 1: Relational SQLite with Explicit Transaction Locks for Check-In**
   - *Rationale:* Eliminates race conditions during simultaneous QR scans at multiple check-in desks by utilizing SQLite ACID transactions and unique constraint traps.
2. **Decision 2: Client-Side HTML5 Canvas for Social Badge Generation**
   - *Rationale:* Eliminates backend image rendering overhead and network egress latency, enabling instant 60fps personalization in the browser.
3. **Decision 3: Dual TypeScript and Python Architecture Support**
   - *Rationale:* Provides maximum flexibility and guarantees 100% interoperability with both Node.js runtimes and Python autograders.

### Known Limitations
- *Limitation 1: Browser-Based Camera Permissions:* Native QR video streaming requires HTTPS in production or localhost during development.
- *Limitation 2: In-Memory / File SQLite Scalability:* SQLite is optimal for single-node event desks (<5,000 attendees); distributed multi-server deployments would transition to PostgreSQL.

### What I Would Improve with More Time
- *Improvement 1: Redis Outbox Webhook Queue:* Implement an asynchronous message queue (BullMQ / Redis) for background webhook dispatches with automatic dead-letter queue (DLQ) handling.
- *Improvement 2: Dynamic Live WebSockets Telemetry:* Add Socket.io/WebSocket real-time push to update the organizer dashboard instantly without client polling.
- *Improvement 3: Automated WhatsApp / Email Pass Delivery:* Integrate Twilio / Resend API to automatically dispatch ticket passes and calendar invites to students upon registration.

---

## 📝 Candidate Self-Certification

- [x] I certify that all work presented is my own original solution (with AI tools responsibly disclosed).
- [x] I have not committed any private keys, real credentials, or secrets in this repository.
- [x] I am prepared to present, explain, and defend all architectural decisions and code during the technical interview.

**Signature / Name:** Candidate 23A81A4397  
**Date:** September 7, 2026
