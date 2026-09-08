# 📋 GDG on Campus SVEC 4.0 — Candidate Submission Dossier

> **Instructions:** Complete all sections below. This document serves as the primary technical brief reviewed by the GDG on Campus SVEC evaluation panel.

---

## 👤 Candidate Information

- **Candidate Name:** Jitendra Sri Talabattula
- **GitHub Username:** JitendraSri
- **Year:** 4th Year (B.Tech) — CSE AI, SVEC
- **Department:** Computer Science Engineering (Artificial Intelligence) — SVEC
- **College Email / Contact:** 23a81a4361@sves.org.in

---

## 📌 Executive Summary

### Challenges Completed

- [x] Challenge 01 — Debugging & Root-Cause Analysis
- [x] Challenge 02 — Coding & Problem Solving
- [x] Challenge 03 — Practical GDG Community Solution

### Technology Stack

- **Language:** TypeScript
- **ECMAScript Target:** ES2022
- **Module System:** NodeNext
- **Runtime:** Node.js v20/v22
- **Backend:** Express
- **Testing:** Node Test Runner, Supertest
- **Frontend:** HTML5, Modern Vanilla CSS, JavaScript
- **Graphics:** SVG-based badge rendering
- **Architecture:** Modular layered architecture

### Repository

**GitHub Repository:**  
https://github.com/JitendraSri/gdgoc-organiser-recruitment

**Submission Branch:**  
`submission/jitendra`

### Live Demo

The application is not publicly deployed.

It can be executed locally at:

`http://localhost:3000`

---

# 🛠️ Challenge 01 — Debugging & Root-Cause Analysis

## Root Cause Identified

The original `EventDispatcher` contained five critical flaws:

1. **Shared mutable request state**
   - The `activeContext` instance property caused request-specific state to be shared between concurrent requests.
   - This resulted in cross-talk and race-condition behavior.

2. **Timezone-naive date parsing**
   - Date handling did not correctly preserve explicit ISO-8601 timezone offsets such as `+05:30`.

3. **Fire-and-forget asynchronous execution**
   - Webhook execution was not properly tracked, creating the possibility of unhandled promise rejections and incomplete request lifecycles.

4. **Immediate retry loop**
   - Failed operations were retried without appropriate exponential backoff, potentially increasing load during service failures.

5. **Silent failure handling**
   - Certain failures were swallowed instead of being surfaced clearly to the caller or error-handling path.

## Fix Implemented

The `EventDispatcher` was refactored in:

`assessment/challenge-01-debugging/src/dispatcher.ts`

The implementation uses:

- Isolated request-local state
- Defensive cloning where appropriate
- ISO-8601 validation
- Explicit timezone/offset handling
- Injectable sender and sleep abstractions
- Bounded exponential backoff
- Proper promise lifecycle tracking
- Explicit failure propagation

The retry strategy uses bounded exponential backoff based on the retry attempt.

## Regression Testing Strategy

Comprehensive regression tests were implemented in:

`assessment/challenge-01-debugging/tests/dispatcher.test.ts`

The tests cover:

- Concurrent registrations
- Prevention of cross-request data contamination
- Reproduction of the original race condition
- Transient `503` failures and retry behavior
- Timeout enforcement
- Permanent failures
- ISO-8601 timezone offset handling
- Duplicate ID prevention
- Asynchronous failure handling

### Result

**Challenge 01 — PASS**

Detailed analysis is available in:

`assessment/challenge-01-debugging/DEBUG_REPORT.md`

---

# ⚙️ Challenge 02 — Coding & Problem Solving

## Language & Runtime

- **Language:** TypeScript
- **Runtime:** Node.js
- **Target:** ES2022
- **Module System:** NodeNext

## Algorithms & Data Structures

The implementation uses:

- **Kahn's Algorithm** for topological sorting
- **Three-color cycle detection** for dependency validation
- **Greedy interval scheduling**
- Dynamic candidate start-time evaluation
- Deterministic multi-attribute sorting
- `Map` and `Set` based indexing
- Room timeline tracking
- Speaker allocation tracking

## Time Complexity

The scheduler operates at approximately:

`O(N log N + N × R × W × S)`

where:

- `N` = number of sessions
- `R` = number of rooms
- `W` = number of scheduling windows
- `S` = existing scheduled slots

A benchmark involving approximately 120 sessions across 10 rooms completed in approximately 23 ms, remaining well below the 1000 ms performance threshold.

## Space Complexity

The implementation requires approximately:

`O(N + R + K)`

where the additional space is used for:

- Dependency graphs
- Room timelines
- Speaker allocations
- Scheduling metadata

## Edge Cases Handled

The scheduler handles:

- Empty input
- Missing prerequisite IDs
- Direct prerequisite cycles
- Deep multi-hop dependency cycles
- Duplicate session IDs
- Room capacity mismatches
- Speaker conflicts across rooms
- Consecutive room turnover requirements
- Operating-window overflow
- Scheduling constraints
- Deterministic ordering

A **10-minute room turnover buffer** is enforced where required.

### Result

**Challenge 02 — PASS**

---

# 🚀 Challenge 03 — Practical GDG Community Solution

## Project

### Event Check-In & Dynamic Social Badge Hub

**Track:** Track A

The project addresses common operational problems during large campus developer events, including:

- Manual registration bottlenecks
- Duplicate ticket usage
- Slow event check-in
- Lack of real-time attendance visibility
- Lack of personalized attendee identity/badge generation

The solution provides a lightweight event-management workflow suitable for a GDG on Campus community event.

---

## 🏗️ Architecture & System Design

The application follows a modular layered architecture.

### 1. Models

Location:

`assessment/challenge-03-practical/src/models/types.ts`

The model layer defines strict TypeScript interfaces for:

- Attendees
- Registration data
- Check-in payloads
- Analytics data
- Application state

This provides compile-time type safety across the application.

### 2. Service Layer

Location:

`assessment/challenge-03-practical/src/services/`

#### StoreService

`StoreService` provides centralized in-memory storage with composite indexing for:

- Ticket ID
- Roll Number
- Email

It also supports attendance and registration-related tracking required by the application.

The in-memory design was chosen to keep the assessment easy to run without requiring an external database.

#### BadgeService

`BadgeService` generates personalized vector SVG badges containing attendee information and role-related visual elements.

SVG was chosen because it provides:

- Resolution-independent rendering
- Lightweight output
- Browser compatibility
- Easy customization
- Downloadable vector assets

### 3. Controller Layer

Location:

`assessment/challenge-03-practical/src/controllers/`

#### AttendeeController

Responsible for:

- Attendee registration
- Input validation
- Ticket generation
- Duplicate registration prevention
- Attendee retrieval

#### CheckInController

Responsible for:

- Ticket verification
- Check-in processing
- Duplicate check-in prevention
- Attendance metrics

Duplicate check-in attempts are returned using:

`HTTP 409 Conflict`

### 4. Routes

Location:

`assessment/challenge-03-practical/src/routes/api.routes.ts`

The routing layer exposes the application's API endpoints and connects incoming requests to the appropriate controllers.

### 5. Presentation Layer

Location:

`assessment/challenge-03-practical/src/public/index.html`

The frontend is implemented as a lightweight single-page interface using:

- HTML5
- Vanilla JavaScript
- Modern CSS
- SVG rendering

The interface includes:

- Registration workflow
- Check-in interface
- Attendance dashboard
- Analytics visualization
- Badge generation interface

---

# ✨ Key Features Delivered

## 1. Attendee Registration & QR Pass

The application:

- Registers attendees
- Generates unique ticket IDs
- Uses the `GDG-2026-XXXX` ticket format
- Generates a QR-related ticket payload
- Prevents duplicate registration based on available attendee identifiers

Duplicate Roll Number and Email registrations are handled through indexed lookups.

## 2. Rapid Check-In & Duplicate Prevention

The check-in system:

- Validates submitted tickets
- Confirms attendee identity
- Records successful check-ins
- Prevents reuse of already-used tickets
- Returns clear conflict responses for duplicate check-ins

Duplicate check-in attempts return:

`HTTP 409 Conflict`

## 3. Live Attendance Analytics Dashboard

The dashboard provides event-level visibility including:

- Registration count
- Check-in count
- Turnout rate
- Registration velocity
- Department breakdown
- Attendance-related metrics

## 4. Dynamic SVG Social Badge Studio

The badge studio generates personalized SVG badges containing:

- Attendee information
- Role information
- Event identity
- Visual accent elements

The resulting SVG can be downloaded and shared digitally.

---

# 📂 Project Structure

The primary assessment implementation is organized as follows:

```text
assessment/
├── challenge-01-debugging/
│   ├── src/
│   ├── tests/
│   ├── package.json
│   ├── tsconfig.json
│   └── DEBUG_REPORT.md
│
├── challenge-02-coding/
│   ├── src/
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
│
└── challenge-03-practical/
    ├── src/
    │   ├── controllers/
    │   ├── models/
    │   ├── routes/
    │   ├── services/
    │   ├── public/
    │   ├── app.ts
    │   └── server.ts
    ├── tests/
    ├── package.json
    ├── tsconfig.json
    ├── .env.example
    └── README.md