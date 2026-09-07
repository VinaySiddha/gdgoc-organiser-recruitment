# 📋 GDG on Campus SVEC 4.0 — Candidate Submission Dossier

---

## 👤 Candidate Information

- **Candidate Name:** Mahalsa Kota
- **GitHub Username:** mahalsakota006
- **Year:** 3rd Year
- **Department:** CSE (Computer Science & Engineering)
- **College Email / Contact:** mahalsakota006@gmail.com

---

## 📌 Executive Summary

- **Challenge Completed:**
  - [x] Challenge 01 — Debugging & Root-Cause Analysis
  - [x] Challenge 02 — Coding & Problem Solving
  - [x] Challenge 03 — Practical GDG Community Solution (Track A: Event Check-In & Dynamic Badge Hub)
- **Tech Stack Used:** Python 3.14, FastAPI, SQLite, HTML5, CSS3 (Glassmorphism), Vanilla JavaScript, QRCode/Pillow, Pytest, Asyncio
- **Repository URL:** https://github.com/VinaySiddha/gdgoc-organiser-recruitment
- **Live Demo URL:** Local FastAPI server (`uvicorn app:app --port 8000`)

---

## 🛠️ Challenge 01 — Debugging & Root-Cause Analysis Summary

- **Root Cause Identified:** 5 critical concurrency & asynchronous bugs in `dispatcher.py`:
  1. *Shared Mutable State:* `self.payload` as instance variable mutated across concurrent coroutines.
  2. *Fire-and-Forget Webhooks:* Unawaited task creation without error handling or lifetime tracking.
  3. *Naive Timezone Parsing:* Standard `datetime.fromisoformat` failing on string trailing `'Z'` or offset variations.
  4. *Lack of Backoff:* Fixed delay retries causing thundering herd during HTTP 429 rate-limiting.
  5. *Silent Error Swallowing:* Generic `except Exception:` returning `False` without logging stack traces.
- **Fix Implemented:** Isolated request state via `local_payload = dict(payload)`, explicit ISO-8601 parsing with UTC normalization, exponential backoff with jitter (`backoff_factor * 2**attempt + jitter`), tracked background tasks array, and explicit error logging.
- **Regression Testing Strategy:** Built 19 automated pytest cases covering concurrent isolation, invalid ISO timestamps, backoff retry limits, empty field validations, and task tracking.
- *(Full details in `assessment/challenge-01-debugging/DEBUG_REPORT.md`)*

---

## ⚙️ Challenge 02 — Coding & Problem Solving Summary

- **Language & Runtime:** Python 3.14
- **Algorithm & Data Structures Used:** Greedy Session Scheduling Engine with Kahn's Topological Sort algorithm for dependency resolution, Interval Free-Slot Management, and Room Capacity / Speaker Availability Constraint Solvers.
- **Time Complexity:** $O(|V| + |E| + N \log N + N \times M)$ where $V$ is sessions, $E$ is dependencies, $N$ is total sessions, $M$ is total time slots across rooms.
- **Space Complexity:** $O(|V| + |E| + M)$ for dependency graphs, in-degree arrays, and room slot availability lists.
- **Edge Cases Handled:** 
  1. Circular dependencies (cycle detection via Kahn's algorithm returning unscheduled list with detailed warning).
  2. Overlapping speaker schedules across different rooms.
  3. Session duration exceeding available room operating hours.
  4. Capacity constraints ensuring room capacity $\ge$ expected session attendance.

---

## 🚀 Challenge 03 — Practical Project Breakdown (Track A: Event Check-In Hub)

### Overview & Problem Solved
At GDG DevFest and community events, check-in queues slow down attendee entry, manual ticket verification creates bottlenecks, and attendees lack quick, shareable proof of attendance for social media. 

This solution delivers an end-to-end, high-performance **Event Check-In & Dynamic Social Badge Generator** featuring:
1. Instant attendee registration with automatic unique ticket ID and server-side QR code generation.
2. Lightning-fast QR check-in verification preventing double-scanning.
3. Automated SVG dynamic social badge rendering tailored with customizable color palettes.
4. Live attendance dashboard with real-time statistics and department distribution charts.

### Architecture & System Design
```
┌─────────────────────────────────────────────────────────┐
│              Single Page Web Application                │
│    (HTML5 + Vanilla JS + Modern Glassmorphism CSS)     │
└────────────────────────────┬────────────────────────────┘
                             │ REST APIs (JSON / Streaming)
┌────────────────────────────▼────────────────────────────┐
│                    FastAPI Backend                      │
│  • Registration Endpoint   • QR Code Streamer (Pillow)  │
│  • Check-In Endpoint       • SVG Badge Renderer         │
│  • Live Dashboard Stats    • SQLite Connection Manager  │
└────────────────────────────┬────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────┐
│                   SQLite Database                       │
│           (WAL Mode for fast concurrency)              │
└─────────────────────────────────────────────────────────┘
```

### Key Features Delivered
1. **Attendee Registration & QR Ticket Pass:** Generates unique `GDG-XXXXXXXX` tickets and instant downloadable QR codes via Pillow backend.
2. **Venue Check-In Scanner:** Validates ticket IDs instantly in $<10\text{ms}$ with double-entry protection.
3. **Dynamic Social Badge Generator:** Server-renders high-res SVG badges with customizable color themes (`gradient-blue`, `gradient-green`, `gradient-purple`, `dark-mode`) ready for LinkedIn/Twitter sharing.
4. **Live Attendance Dashboard:** Displays real-time check-in rates, department breakdowns (CSE, IT, ECE, EEE, ADS, etc.), and live activity feeds.

### Setup & Local Execution Guide
```bash
# 1. Navigate to Challenge 03 directory
cd assessment/challenge-03-practical

# 2. Install dependencies
python -m pip install -r requirements.txt

# 3. Copy environment configuration
cp .env.example .env

# 4. Run automated test suite (7 passed)
python -m pytest

# 5. Start application server
python -m uvicorn src.backend.app:app --host 0.0.0.0 --port 8000 --reload
# Open http://localhost:8000 in browser
```

---

## 🤖 AI Assistance & Modern Tooling Disclosure

- **AI Tools Used:** Google Antigravity AI Pair Programmer
- **How AI Was Used:** Code structure refactoring, prompt-driven UI generation, comprehensive test synthesis, edge case validation.
- **Validation & Refactoring:** Every generated algorithm and API endpoint was validated using `pytest` test suites and verified locally under Python 3.14.
- *(Refer to `starter/AI_DISCLOSURE.md` for full detailed prompts and workflow logs).*

---

## 💡 Engineering Insights & Reflections

### Major Technical Decisions
1. **Decision 1: Isolated Local Dictionary Copies in Event Dispatcher**
   - *Rationale:* Prevents race conditions where concurrent async requests mutate shared class-level dictionary references.
2. **Decision 2: Kahn's Topological Sort with Fallback for Session Scheduling**
   - *Rationale:* Ensures prerequisite sessions are strictly scheduled before dependent sessions, gracefully detecting circular dependencies.
3. **Decision 3: Server-side SVG rendering for Badges**
   - *Rationale:* SVG rendering eliminates client canvas dependencies, guarantees scalable high DPI quality, and allows quick download.

### Known Limitations
- In-memory SQLite DB path defaults to local disk; for multi-node production deployment, PostgreSQL with Redis caching is recommended.
- Camera hardware QR scanning requires browser media permissions HTTPS context in production.

### What I Would Improve with More Time
- Add WebSockets for instant live-updating dashboard counters across multiple organizer devices.
- Implement JWT-based multi-role admin authentication for event organizers.
- Add automated email notifications sending QR passes directly to registered attendees.

---

## 📝 Candidate Self-Certification

- [x] I certify that all work presented is my own original solution (with AI tools responsibly disclosed).
- [x] I have not committed any private keys, real credentials, or secrets in this repository.
- [x] I am prepared to present, explain, and defend all architectural decisions and code during the technical interview.

**Signature / Name:** Mahalsa Kota  
**Date:** March 7, 2026
