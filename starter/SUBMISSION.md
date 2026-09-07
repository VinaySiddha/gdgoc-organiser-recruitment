# 📋 GDG on Campus SVEC 4.0 — Candidate Submission Dossier

> **Candidate Submission Brief — GDG on Campus SVEC 4.0 Technical Assessment**

---

## 👤 Candidate Information

- **Candidate Name:** Ibba Devendra sagar
- **GitHub Username:** Devendra1306
- **Year:** 4th Year
- **Department:** CSE (Computer Science & Engineering)
- **College Email / Contact:** devendrasagar0988@gmail.com

---

## 📌 Executive Summary

- **Challenges Completed:**
  - [x] Challenge 01 — Debugging & Root-Cause Analysis (Event RSVP & Webhook Dispatcher)
  - [x] Challenge 02 — Coding & Problem Solving (Deterministic Conference Track Scheduler)
  - [x] Challenge 03 — Practical GDG Community Solution (GDG SVEC EventHub - Track A)
- **Tech Stack:** TypeScript, Python 3.12, Next.js 14, React 18, Tailwind CSS, SQLite, Prisma, Pytest, Jest, HTML5 Canvas API
- **Repository URL:** https://github.com/Devendra1306/gdgoc-organiser-recruitment
- **Submission Branch:** `submission/23A81A4397`
- **Live Demo URL (if applicable):** Local execution via Next.js dev server on `http://localhost:3000`

---

## 🛠️ Challenge 01 — Debugging & Root-Cause Analysis Summary

- **Root Cause:** Shared mutable instance state causing race conditions, unhandled fire-and-forget promise rejections, naive timezone offset discarding, and missing exponential backoff.
- **Code Changes:** Request-local immutable scopes, ISO-8601 offset support (+05:30 IST / -04:00), exponential backoff retry loop, and decoupled failure isolation.
- **Regression Testing Strategy:** 6 automated test suites covering 50 simultaneous registrations, timezone offsets, retry delay progression, and permanent failure logging.
- *(Full details in `assessment/challenge-01-debugging/DEBUG_REPORT.md`)*

---

## ⚙️ Challenge 02 — Coding & Problem Solving Summary

- **Language & Runtime:** TypeScript (ES2022 / Node.js) & Python 3.12
- **Algorithm & Data Structures Used:** Directed Acyclic Graph (DAG) Prerequisite Resolution with Three-Color DFS Cycle Detection, Topological Depth Rank Sorting, Interval Conflict Tracking, and Turnover Stage Buffer Enforcement.
- **Time Complexity:** O(V + E) for graph cycle detection and topological sorting; O(N * R * W * K) for slot scheduling where benchmark schedules 120 sessions in under 0.06s.
- **Space Complexity:** O(V + E + R) for graph adjacency and room interval tracking.
- **Edge Cases Handled:** Empty inputs, 2-node cycles, deep 4-node cycles, self-dependencies, impossible room capacity, room window boundary constraints, and deterministic tie-breaking.

---

## 🚀 Challenge 03 — Practical Project Breakdown

### Overview & Problem Solved
GDG SVEC EventHub (Track A) eliminates physical check-in queues and provides instant digital registration passes with QR codes, rapid organizer check-in verification with atomic duplicate scan protection, an interactive HTML5 Canvas social badge studio for instant PNG downloads, and a live telemetry dashboard displaying turnout rates, department participation grids, and CSV roster exports.

### Architecture & System Design
Next.js App Router full-stack architecture with React, Tailwind CSS, HTML5 Canvas, SQLite database with ACID transaction locks, and modular controller/service boundaries.

### Key Features Delivered
1. **Student Registration & QR Pass Generator (`/register`, `/ticket/:id`):** Validates attendee details, prevents duplicate registrations, and renders digital entry pass with secure QR payload.
2. **Rapid Organizer Check-In Desk (`/check-in`):** Camera stream and manual ticket verification with atomic concurrency locks returning VALID_TICKET, ALREADY_CHECKED_IN, or INVALID_TICKET.
3. **Dynamic Social Badge Studio (`/badge/:id`):** Real-time client-side HTML5 Canvas rendering (600x800 high-res) with customizable developer identities, gradient themes, and PNG export.
4. **Organizer Telemetry & Analytics Dashboard (`/admin`):** Real-time KPI summaries, turnout percentages, department participation breakdown, attendee search, and CSV manifest export.

### Setup & Local Execution Guide
```bash
# 1. Clone repository
git clone https://github.com/Devendra1306/gdgoc-organiser-recruitment.git
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

- **AI Tools:** Google Gemini 2.0 / Gemini 3.7 & GitHub Copilot
- **Activity:** Architectural scaffolding, test-case synthesis, canvas coordinate calculations, and edge-case boundary brainstorming.
- **Validation & Refactoring:** Every generated algorithm and database query was validated with dedicated unit tests, manual edge-case verification, concurrency simulation, and strict adherence to the assessment rubric.
- *(Refer to `AI_DISCLOSURE.md` for full detailed prompts and workflow logs).*

---

## 💡 Engineering Insights & Reflections

### Major Technical Decisions:
1. **Relational SQLite with Explicit Transaction Locks for Check-In:** Eliminates race conditions during simultaneous QR scans at multiple check-in desks by utilizing SQLite ACID transactions and unique constraint traps.
2. **Client-Side HTML5 Canvas for Social Badge Generation:** Eliminates backend image rendering overhead and network egress latency, enabling instant 60fps personalization in the browser.
3. **Dual TypeScript and Python Architecture Support:** Provides maximum flexibility and guarantees 100% interoperability with both Node.js runtimes and Python autograders.

### Known Limitations:
- Browser-based camera permissions require HTTPS in production or localhost during development.
- In-memory / file SQLite is optimal for single-node event desks (<5,000 attendees); distributed multi-server deployments would transition to PostgreSQL.

### What I Would Improve:
- Redis Outbox Webhook Queue for asynchronous background messaging with dead-letter queue (DLQ) handling.
- Dynamic Live WebSockets Telemetry to push real-time check-in updates to the organizer dashboard without client polling.
- Automated WhatsApp & Email Pass Delivery to dispatch QR passes and calendar invites to students upon registration.

---

## 📝 Candidate Self-Certification

- [x] I certify that all work presented is my own original solution (with AI tools responsibly disclosed).
- [x] I have not committed any private keys, real credentials, or secrets in this repository.
- [x] I am prepared to present, explain, and defend all architectural decisions and code during the technical interview.

**Signature / Name:** Ibba Devendra sagar  
**Date:** September 7, 2026
