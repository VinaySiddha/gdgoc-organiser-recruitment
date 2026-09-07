# 🤖 AI Assistance & Tooling Disclosure Log

> **Context:** At GDG on Campus SVEC, we embrace modern developer workflows. AI tools (Google Gemini, GitHub Copilot) were utilized strategically for code scaffolding, edge case brainstorming, and documentation formatting. This log transparently records all AI-assisted interactions, validation steps, and candidate comprehension.

---

## 🧑‍💻 Candidate Details

- **Candidate Name:** Ibba Devendra sagar
- **GitHub Username:** Devendra1306
- **Date:** September 7, 2026

---

## AI Tools:
Google Gemini (2.0 Flash / 3.7 Flash) and GitHub Copilot were utilized for scaffolding, test-case synthesis, and architectural review.

Check all that apply:
- [x] Google Gemini (2.0 Flash / 3.7 Flash)
- [ ] OpenAI ChatGPT (GPT-4o / o1)
- [ ] Anthropic Claude (3.5 Sonnet / 3.7 Sonnet)
- [x] GitHub Copilot / Copilot Chat
- [ ] Cursor / Windsurf
- [ ] Other: *(Specify here)*
- [ ] No AI tools were used for this assessment

---

## Activity:
AI assistance was utilized across architectural design, debugging, testing, and UI styling:

| Activity Category | AI Used? (Yes/No) | Specific Tool | Brief Description of Usage |
| :--- | :---: | :--- | :--- |
| **Brainstorming / Architecture** | Yes | Google Gemini | System design trade-offs between client-side Canvas and server-side PNG generation for event badges. |
| **Challenge 01: Debugging & RCA** | Yes | Google Gemini | Diagnosing asynchronous race conditions in shared object state and calculating backoff intervals. |
| **Challenge 02: Algorithmic Logic** | Yes | Google Gemini | Three-color DFS cycle detection logic and topological depth rank sorting with multi-track constraints. |
| **Challenge 03: UI / Frontend** | Yes | GitHub Copilot | Generating Tailwind CSS color palettes, responsive cards, and Canvas rendering geometry. |
| **Challenge 03: Backend / API** | Yes | Google Gemini | SQLite transaction isolation syntax and duplicate check-in exception handling. |
| **Generating Mock Data / Tests** | Yes | Google Gemini | Synthesizing 50+ concurrent registration payloads and 120-session scheduling stress benchmarks. |
| **Documentation / Markdown** | Yes | Google Gemini | Formatting RCA report diff blocks, Mermaid architecture diagrams, and submission templates. |

---

## Prompts:
Detailed record of candidate prompts, AI suggestions, and manual validations across all three challenges:

### 1. Challenge 01 — Debugging & Root-Cause Analysis
- **Intent / Prompt:**
  ```text
  "In an asynchronous Node.js or Python event dispatcher, why does mutating `this.activeContext = payload` cause cross-talk between concurrent requests when `await` yields the thread?"
  ```
- **AI Output Evaluation:**
  The AI correctly pointed out that although JavaScript/Python run single-threaded event loops, an `await` yields control back to the event loop. If another concurrent request enters `processRegistration`, it mutates `this.activeContext`, leaving the resumed task with corrupted state.
- **Your Adjustments / Verification:**
  Eliminated `activeContext` entirely and scoped all data locally as immutable function arguments. Wrote a dedicated 50-request concurrent test suite using `asyncio.gather` and `Promise.all` to prove zero state collisions.

---

### 2. Challenge 02 — Coding & Algorithmic Problem Solving
- **Intent / Prompt:**
  ```text
  "What is the most robust algorithm to detect cycles in a prerequisite dependency graph (including multi-node deep cycles) and compute topological depth levels for constraint scheduling?"
  ```
- **AI Output Evaluation:**
  The AI suggested Tarjan's Strongly Connected Components and Three-State DFS (Unvisited = 0, Visiting = 1, Visited = 2).
- **Your Adjustments / Verification:**
  Implemented Three-Color DFS with circular path propagation so that any session that indirectly depends on a cycle is also marked `CIRCULAR_PREREQUISITE`. Designed unit tests covering 2-node cycles, deep 4-node cycles, self-dependencies, and verified deterministic tie-breaking.

---

### 3. Challenge 03 — Practical Engineering Project (GDG SVEC EventHub)
- **Intent / Prompt:**
  ```text
  "How can we prevent concurrent duplicate check-ins at multiple registration desks in SQLite without race conditions?"
  ```
- **AI Output Evaluation:**
  The AI suggested using SQLite unique index constraints on `ticket_id` inside explicit `BEGIN TRANSACTION ... COMMIT` blocks and trapping `sqlite3.IntegrityError`.
- **Your Adjustments / Verification:**
  Implemented atomic transactions in `database.py` using thread-safe SQLite locks (`BEGIN TRANSACTION ... COMMIT`), and implemented duplicate validation with in-memory Maps in `db.ts`. Verified with a multithreaded test (`test_concurrent_duplicate_check_in`) spawning 10 parallel threads on the exact same ticket, confirming exactly 1 valid check-in and 9 duplicate rejections.

---

## Comprehension:
The candidate maintains 100% technical ownership and understanding of all submitted code.

1. **How did using AI affect your development velocity and code quality?**
   > AI significantly accelerated boilerplate generation, comprehensive test synthesis, and UI styling. However, deep engineering oversight was required to ensure correct transaction handling in SQLite, verify graph cycle propagation, and guarantee strict determinism across edge cases.

2. **Did an AI tool ever give you an incorrect, insecure, or hallucinated suggestion? How did you catch and fix it?**
   > Yes. During Challenge 03 database design, the AI initially suggested opening and closing a new `:memory:` SQLite connection on each query. In SQLite, every new `:memory:` connection creates a blank, disconnected database. I caught this during automated testing when tables disappeared between queries, and refactored the database class to maintain a persistent thread-safe connection.

3. **Can you explain and modify every component of your submission without AI assistance during an interview?**
   - [x] **Yes, absolutely.** I fully understand every architectural decision, data structure, concurrency boundary, and line of code submitted.
