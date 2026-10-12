# 📋 GDG on Campus SVEC 4.0 — Candidate Submission Dossier

> **Instructions:** Complete all sections below. This document serves as the primary technical brief reviewed by the GDG on Campus SVEC evaluation panel.

Candidate Name: Not provided in the workspace.
GitHub Username: Not provided in the workspace.
Student Year: Not provided in the workspace.
Department: Not provided in the workspace.
Tech Stack: Python 3, Flask, pytest, and the Python standard library.
Major Technical Decisions: Python across challenges for consistent local tooling; isolated request state; deterministic greedy scheduling; an in-memory store for the local RSVP demo.
Known Limitations: The RSVP app uses volatile in-memory storage and does not implement timed claim windows, batch administration, or external notifications.
What I Would Improve: Add transactional persistence, timed waitlist claims, admin import/export, notifications, and load testing.

---

## 👤 Candidate Information

- **Candidate Name:** Not provided in the workspace.
- **GitHub Username:** Not provided in the workspace.
- **Year:** Not provided in the workspace.
- **Department:** Not provided in the workspace.
- **College Email / Contact:** Not provided in the workspace.

---

## 📌 Executive Summary

- **Challenge Completed:**
   - [x] Challenge 01 — Debugging & Root-Cause Analysis
   - [x] Challenge 02 — Coding & Problem Solving
   - [x] Challenge 03 — Practical GDG Community Solution
- **Tech Stack Used:** Python 3, Flask, pytest, and the Python standard library.
- **Repository URL:** Not provided in the workspace metadata.
- **Live Demo URL (if applicable):** None; the application runs locally.

---

## 🛠️ Challenge 01 — Debugging & Root-Cause Analysis Summary

- **Root Cause Identified:** Shared request state, silent timestamp validation failures, and fire-and-forget webhook handling.
- **Fix Implemented:** Request-local payload handling, ISO-8601 timezone normalization, and bounded retries with exponential backoff.
- **Regression Testing Strategy:** Tests cover concurrent registrations, invalid timestamps, and recovery after transient webhook failures.
- *(Full details in `assessment/challenge-01-debugging/DEBUG_REPORT.md`)*

---

## ⚙️ Challenge 02 — Coding & Problem Solving Summary

- **Language & Runtime:** Python 3.
- **Algorithm & Data Structures Used:** Priority-ordered greedy placement, interval bookings, prerequisite dependency checks, and cycle detection.
- **Time Complexity:** Cycle detection is O(V + E); greedy slot search depends on sessions, room windows, and five-minute candidate increments.
- **Space Complexity:** O(V + E + B), where V/E describe prerequisite nodes/edges and B is the booking count.
- **Edge Cases Handled:** Empty inputs, non-positive duration, insufficient capacity, prerequisite cycles, speaker overlap, and room-window boundaries.

---

## 🚀 Challenge 03 — Practical Project Breakdown

### Overview & Problem Solved
Track B addresses oversubscribed workshops by accepting registrations up to capacity and placing later attendees on a waitlist. Cancellation promotes the next waiting attendee.

### Architecture & System Design
The Flask API delegates registration and cancellation to an RSVP service, which operates on workshop models held in an in-memory store. This separates domain behavior from HTTP routing.

### Key Features Delivered
1. **Feature 1:** Capacity-gated attendee registration.
2. **Feature 2:** FIFO waitlist and promotion after cancellation.
3. **Feature 3:** Workshop status and health endpoints.

### Setup & Local Execution Guide
```bash
# From assessment/challenge-03-practical/
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest -q tests
python -m src.app
```

---

## 🤖 AI Assistance & Modern Tooling Disclosure

- **AI Tools Used:** GitHub Copilot Chat.
- **How AI Was Used:** Code implementation, test authoring, documentation drafting, and debugging in this workspace session.
- **Validation & Refactoring:** Ran focused pytest suites and the repository autograder; test feedback guided fixes for imports, response shape, and Flask JSON access.
- *(Refer to `starter/AI_DISCLOSURE.md` for full detailed prompts and workflow logs).*

---

## 💡 Engineering Insights & Reflections

### Major Technical Decisions
1. **Decision 1:** Keep request data local to each EventDispatcher call.
   - *Rationale:* Concurrent requests must not overwrite shared mutable payload state.
2. **Decision 2:** Use deterministic greedy scheduling with explicit interval bookings.
   - *Rationale:* This is straightforward to inspect and reproducible for the stated inputs.

### Known Limitations
- The RSVP store is in memory, so records do not survive restarts or span workers.
- Timed waitlist claims, batch administration, persistent storage, and external notifications are not implemented.

### What I Would Improve with More Time
What I Would Improve: Add persistent transactional storage, timed waitlist claims and admin import/export, then add integration and load tests.

---

## 📝 Candidate Self-Certification

- [ ] I certify that all work presented is my own original solution (with AI tools responsibly disclosed).
- [ ] I have not committed any private keys, real credentials, or secrets in this repository.
- [ ] I am prepared to present, explain, and defend all architectural decisions and code during the technical interview.

**Signature / Name:** ________________________  
**Date:** ________________________
