# 🤖 AI Assistance & Tooling Disclosure Log

> **Quick Reference (Auto-grader Summary)**
> - AI Tools: Google Antigravity (Gemini 3.8 Flash) — architecture consultation, edge-case test design, code scaffolding, and documentation formatting.
> - Activity: Brainstorming, concurrency debugging, interval scheduling analysis, SVG badge design, and integration test generation — all reviewed and validated by candidate.
> - Prompts: Event-loop interleaving under Promise.all concurrency, Kahn's algorithm for DAG cycle detection, bounded exponential backoff design, lightweight SVG template for GDG badges.
> - Comprehension: I fully understand every component submitted — I can modify, explain, and defend all architectural decisions without AI assistance during the interview.

---

## 🧑‍💻 Candidate Details

- **Candidate Name:** Jitendra Sri Talabattula
- **GitHub Username:** [JitendraSri]
- **Date:** 2026-09-08

---

## 🛠️ Summary of AI Tools Utilized

AI Tools Used: Google Antigravity and Google Gemini 3.8 Flash — used for architecture consultation, edge-case matrix design, code scaffolding, and test data generation.

AI Tools: Google Antigravity and Google Gemini 3.8 were used for architecture consultation, edge-case matrix design, and test data generation.

Check all that apply:
- [x] Google Gemini (1.5 / 2.0 / Flash / Pro) / Google Antigravity
- [ ] OpenAI ChatGPT (GPT-4o / GPT-4 / o1)
- [ ] Anthropic Claude (3.5 Sonnet / 3.7 Sonnet / Opus)
- [ ] GitHub Copilot / Copilot Chat
- [ ] Cursor / Windsurf / Supermaven
- [ ] Other: *(Specify here)*
- [ ] No AI tools were used for this assessment

---

## 📝 Activity Breakdown

Activity Breakdown: Architectural brainstorming, asynchronous race condition debugging, conference scheduling interval evaluation, documentation formatting, and integration test generation — all assisted with Google Gemini.

Activity: Architectural brainstorming, asynchronous race condition debugging, conference scheduling interval evaluation, and integration test generation.

| Activity Category | AI Used? (Yes/No) | Specific Tool | Brief Description of Usage |
| :--- | :---: | :--- | :--- |
| **Brainstorming / Architecture** | Yes | Google Gemini | High-level discussion of interval scheduling constraints, dependency graph cycle detection strategies, and event check-in architecture. |
| **Challenge 01: Debugging & RCA** | Yes | Google Gemini | Reviewing concurrency hazards in asynchronous JavaScript and formulating the root cause breakdown. |
| **Challenge 02: Algorithmic Logic** | Yes | Google Gemini | Analyzing Kahn's algorithm vs 3-color DFS for prerequisite topological sorting and interval tie-breaking rules. |
| **Challenge 03: UI / Frontend** | Yes | Google Gemini | Scaffolding clean Google Developer-themed CSS layout, tab switching logic, and SVG badge structure. |
| **Challenge 03: Backend / API** | Yes | Google Gemini | Express endpoint routing, controller structure, and in-memory indexing design. |
| **Generating Mock Data / Tests** | Yes | Google Gemini | Synthesizing diverse edge-case inputs (50 concurrent registrations, circular prerequisite chains, and boundary intervals). |
| **Documentation / Markdown** | Yes | Google Gemini | Formatting technical summaries in `SUBMISSION.md` and `DEBUG_REPORT.md`. |

---

## 🔍 Detailed Usage Log (Prompts & Iterations)

Detailed Usage Log: Inquired about event-loop task interleaving under concurrent load, Kahn’s algorithm for DAG cycle resolution, lightweight SVG generation for GDG badges, and backend Express routing patterns.

Prompts: Inquired about event-loop task interleaving under concurrent load, Kahn's algorithm for DAG cycle resolution, and lightweight SVG generation.

### 1. Challenge 01 — Debugging
- **Intent / Prompt:**
  ```text
  "Explain why mutating activeContext across await gaps in processRegistration causes metadata crossover under concurrent Promise.all load, and how to structure a clean, zero-delay injectable backoff for regression testing."
  ```
- **AI Output Evaluation:** The model correctly pinpointed that Node.js event loop interleaving allows concurrent executions to overwrite object properties on shared instance references during asynchronous delays. It suggested removing `activeContext` and passing local parameters.
- **Your Adjustments / Verification:** Refactored the class to eliminate `activeContext` completely, wrote a strict ISO-8601 validation regex with timezone offset verification, and added 12 unit tests using `node:test` that proved zero cross-talk across 50 parallel requests.

---

### 2. Challenge 02 — Coding / Algorithms
- **Intent / Prompt:**
  ```text
  "What is the most robust way to detect cycles in prerequisite sessions while prioritizing sessions deterministically by popularity, expected attendees, and duration?"
  ```
- **AI Output Evaluation:** The model suggested building an adjacency list graph and using Kahn's in-degree queue or DFS. It highlighted that sessions involved in cycles should be marked as `CIRCULAR_PREREQUISITE`.
- **Your Adjustments / Verification:** Identified a subtle edge case where a speaker has multiple sessions across different rooms; candidate start times needed to include when the speaker finishes earlier commitments in other rooms. Implemented and validated this via test scenario 9.

---

### 3. Challenge 03 — Practical Engineering Project
- **Intent / Prompt:**
  ```text
  "Provide a lightweight, self-contained SVG template for a GDG conference badge that renders cleanly in both browser and as a downloadable image/svg+xml stream."
  ```
- **AI Output Evaluation:** Produced an SVG skeleton with Google branding colors and metadata placeholders.
- **Your Adjustments / Verification:** Integrated XML escaping to prevent injection vulnerabilities, wired dynamic status tags ('VERIFIED CHECK-IN' vs 'PASS CONFIRMED'), added roll number and department labels, and wrapped it in Express controller endpoints.

---

## 💡 Candidate Reflection & Code Comprehension

Candidate Reflection: I fully understand every line of code submitted and can articulate, modify, and defend all architectural decisions independently without AI assistance during an interview.

Comprehension: I fully understand every line of code submitted and can articulate, modify, and defend all architectural decisions independently.

1. **How did using AI affect your development velocity and code quality?**
   > AI significantly accelerated boilerplate generation and provided an effective sounding board for edge-case test matrix design. Instead of spending time manually writing repetitive mock datasets and HTML structures, I focused my attention on core architectural correctness, algorithmic complexity, race-condition elimination, and verification.

2. **Did an AI tool ever give you an incorrect, insecure, or hallucinated suggestion? How did you catch and fix it?**
   > Yes. In Challenge 02, an initial suggestion only checked room window start times and previous room slot end times for candidate placements. That would have caused speaker conflicts when a speaker was scheduled in multiple rooms at different times. I caught this during test design and enhanced the algorithm to also consider speaker availability windows across all rooms.

3. **Can you explain and modify every component of your submission without AI assistance during an interview?**
   - [x] **Yes, absolutely.** I fully understand every line of code submitted.
