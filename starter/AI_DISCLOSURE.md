# 🤖 AI Assistance & Tooling Disclosure Log

> **Context:** At GDG on Campus SVEC, we embrace modern developer workflows. AI tools (e.g., Google Gemini, ChatGPT, Claude, GitHub Copilot, Cursor) are allowed. However, as an organizer candidate, you must demonstrate **technical ownership, transparency, and deep understanding** of everything you ship.

---

## 🧑‍💻 Candidate Details

- **Candidate Name:** Mahalsa Kota
- **GitHub Username:** mahalsakota006
- **Date:** March 7, 2026

---

## 🛠️ Summary of AI Tools Utilized

Check all that apply:
- [x] Google Gemini / Antigravity AI Assistant
- [ ] OpenAI ChatGPT
- [ ] Anthropic Claude
- [ ] GitHub Copilot / Copilot Chat
- [ ] Cursor / Windsurf / Supermaven
- [ ] Other: *(Specify here)*
- [ ] No AI tools were used for this assessment

---

## 📝 Activity Breakdown

| Activity Category | AI Used? (Yes/No) | Specific Tool | Brief Description of Usage |
| :--- | :---: | :--- | :--- |
| **Brainstorming / Architecture** | Yes | Antigravity AI | System design for Track A event check-in hub & scheduling engine structure |
| **Challenge 01: Debugging & RCA** | Yes | Antigravity AI | Root cause analysis of async race conditions and timezone parsing in dispatcher |
| **Challenge 02: Algorithmic Logic** | Yes | Antigravity AI | Topological sort implementation for prerequisite session ordering |
| **Challenge 03: UI / Frontend** | Yes | Antigravity AI | Single-page HTML/CSS glassmorphism dashboard & badge generator UI |
| **Challenge 03: Backend / API** | Yes | Antigravity AI | FastAPI setup, SQLite connection management, and SVG badge generation |
| **Generating Mock Data / Tests** | Yes | Antigravity AI | Pytest test suites across all 3 challenges (50 total unit tests) |
| **Documentation / Markdown** | Yes | Antigravity AI | Formatting DEBUG_REPORT.md, SUBMISSION.md, and AI_DISCLOSURE.md |

---

## 🔍 Detailed Usage Log (Prompts & Iterations)

### 1. Challenge 01 — Debugging
- **Intent / Prompt:**
  ```text
  "Analyze dispatcher.py for concurrency bugs, shared mutable state, unhandled exceptions, and unawaited async calls."
  ```
- **AI Output Evaluation:** Accurate identification of shared instance state `self.payload` causing race conditions and unhandled fire-and-forget webhook coroutines.
- **Your Adjustments / Verification:** Refactored payload handling to create shallow local copies (`local_payload = dict(payload)`), added exponential backoff retry with random jitter, and built 19 regression unit tests to verify fix under high concurrency.

---

### 2. Challenge 02 — Coding / Algorithms
- **Intent / Prompt:**
  ```text
  "Design a session scheduler in Python that resolves session dependencies, checks room capacity, avoids speaker double-booking, and fits into room operating windows."
  ```
- **AI Output Evaluation:** Suggested topological sort via Kahn's algorithm for dependency ordering combined with greedy slot placement.
- **Your Adjustments / Verification:** Added cycle detection handling when circular dependencies exist, implemented speaker schedule tracking across rooms, and validated with 24 unit tests.

---

### 3. Challenge 03 — Practical Engineering Project
- **Intent / Prompt:**
  ```text
  "Create a complete FastAPI backend and Glassmorphism frontend for GDG event check-in with QR code generation, check-in validation, live stats dashboard, and SVG social badge generator."
  ```
- **AI Output Evaluation:** Generated single-file FastAPI server with SQLite and responsive CSS layout.
- **Your Adjustments / Verification:** Added database WAL mode for fast concurrent SQLite operations, customized SVG badge styling presets (`gradient-blue`, `gradient-green`, `gradient-purple`, `dark-mode`), fixed FastAPI parameter deprecations, and wrote 7 integration tests.

---

## 💡 Candidate Reflection & Code Comprehension

1. **How did using AI affect your development velocity and code quality?**
   > Using AI accelerated boilerplate creation and allowed me to focus on edge case handling, algorithm correctness, and comprehensive test coverage.

2. **Did an AI tool ever give you an incorrect, insecure, or hallucinated suggestion? How did you catch and fix it?**
   > Yes, an initial check-in validation logic used `not local_payload.get(f)` which treated empty timestamp strings `""` as missing required fields rather than invalid date formats. Running `pytest` caught the test expectation mismatch, allowing me to refine the string validation logic.

3. **Can you explain and modify every component of your submission without AI assistance during an interview?**
   - [x] **Yes, absolutely.** I fully understand every line of code submitted.
