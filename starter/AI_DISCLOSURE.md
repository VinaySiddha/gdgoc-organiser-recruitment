# 🤖 AI Assistance & Tooling Disclosure Log

> **Context:** At GDG on Campus SVEC, we embrace modern developer workflows. AI tools (e.g., Google Gemini, ChatGPT, Claude, GitHub Copilot, Cursor) are allowed. However, as an organizer candidate, you must demonstrate **technical ownership, transparency, and deep understanding** of everything you ship.
>
> Please complete this log honestly. Evaluators will discuss these entries with you during the interview round.

AI Tools: GitHub Copilot Chat was used for code, tests, debugging, and documentation in this workspace. Candidate should review this AI-drafted disclosure for completeness.
Activity: AI assistance was used in the categories marked Yes below; implementation and validation are summarized in the detailed log.
Prompts: The following entries summarize prompts and iterations from this workspace session.
Comprehension: This section is AI-drafted from visible workspace activity, not a personal statement; candidate should review and personalize it before submission.

---

## 🧑‍💻 Candidate Details

- **Candidate Name:** Not provided in the workspace.
- **GitHub Username:** Not provided in the workspace.
- **Date:** 2026-10-12

---

## 🛠️ Summary of AI Tools Utilized

Check all that apply:
- [ ] Google Gemini (1.5 / 2.0 / Flash / Pro)
- [ ] OpenAI ChatGPT (GPT-4o / GPT-4 / o1)
- [ ] Anthropic Claude (3.5 Sonnet / 3.7 Sonnet / Opus)
- [x] GitHub Copilot / Copilot Chat
- [ ] Cursor / Windsurf / Supermaven
- [ ] Other: *(Specify here)*
- [ ] No AI tools were used for this assessment

---

## 📝 Activity Breakdown

| Activity Category | AI Used? (Yes/No) | Specific Tool | Brief Description of Usage |
| :--- | :---: | :--- | :--- |
| **Brainstorming / Architecture** | Yes | GitHub Copilot Chat | Reviewed requirements and mapped evaluator deductions to project materials. |
| **Challenge 01: Debugging & RCA** | Yes | GitHub Copilot Chat | Implemented request isolation, timezone normalization, bounded retries, and regression tests. |
| **Challenge 02: Algorithmic Logic** | Yes | GitHub Copilot Chat | Implemented a priority-based scheduler and constraint tests. |
| **Challenge 03: UI / Frontend** | No | None | Backend-only Flask implementation. |
| **Challenge 03: Backend / API** | Yes | GitHub Copilot Chat | Implemented RSVP, cancellation, health, and status routes. |
| **Generating Mock Data / Tests** | Yes | GitHub Copilot Chat | Drafted focused regression tests and corrected issues revealed by test runs. |
| **Documentation / Markdown** | Yes | GitHub Copilot Chat | Drafted RCA, setup, submission, and AI-disclosure documentation. |

---

## 🔍 Prompts

### 1. Challenge 01 — Debugging
- **Intent / Prompt:** Analyze and implement the assessment repository's three challenge requirements, including fixes and regression tests.
  ```text
  Identify the EventDispatcher failure causes, fix concurrency/timezone/retry behavior, and add regression coverage.
  ```
- **AI Output Evaluation:** Initial code required follow-up after tests exposed import issues and response/API mismatches.
- **Your Adjustments / Verification:** Added concurrency, malformed timestamp, and transient retry tests; ran the Challenge 01 pytest suite.

---

### 2. Challenge 02 — Coding / Algorithms
- **Intent / Prompt:** Implement the scheduling engine against the documented capacity, speaker, prerequisite, window, and cycle requirements.
  ```text
  Build a deterministic schedule with priority ranking, constraints, cycle detection, and edge-case tests.
  ```
- **AI Output Evaluation:** Test runs exposed response-shape and edge-case issues that required correction.
- **Your Adjustments / Verification:** Added tests for basic placement, cycles, capacity/speaker constraints, and empty input; ran challenge tests and the autograder.

---

### 3. Challenge 03 — Practical Engineering Project
- **Intent / Prompt:** Implement a practical Track B RSVP/waitlist project with API, setup guide, and tests.
  ```text
  Create an RSVP API with capacity gating, FIFO waitlist promotion, and health/status endpoints.
  ```
- **AI Output Evaluation:** The API has service/model/store separation; timed claims, batch administration, and external notifications remain limitations.
- **Your Adjustments / Verification:** Added API tests for health and registration/status behavior; ran the focused suite and official evaluator.

---

## 💡 Comprehension

1. **How did using AI affect your development velocity and code quality?**
  > AI assistance accelerated scaffolding and iteration; test feedback was needed to catch interface and import errors. Candidate to personalize this reflection.

2. **Did an AI tool ever give you an incorrect, insecure, or hallucinated suggestion? How did you catch and fix it?**
  > Test failures identified incorrect assumptions about Flask's JSON API and scheduler response shape. The code was updated and tests rerun. Candidate to confirm this account.

3. **Can you explain and modify every component of your submission without AI assistance during an interview?**
  - [ ] Candidate to check only after independently reviewing and understanding the full submission.
