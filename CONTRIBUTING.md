# Contributing & Candidate Conduct Guidelines

Thank you for participating in the **GDG on Campus SVEC 4.0 Organizer Selection**. This document outlines expectations, contribution workflows, code of conduct, and reporting guidelines for this assessment repository.

---

## 🎯 Purpose of This Repository

This repository serves as the official assessment environment for prospective organizers of GDG on Campus SVEC 4.0. It is maintained by the outgoing GDG on Campus SVEC 3.0 Core Team.

- **For Candidates:** This repository is your template / test harness. You will fork or clone this repository, complete your assessment within the 24-hour window, and submit your work per the instructions in [docs/CANDIDATE_GUIDE.md](docs/CANDIDATE_GUIDE.md).
- **For Evaluators & Organizers:** This repository defines standard evaluation rubrics, automated verification workflows, and operational instructions.

---

## 📜 Code of Conduct

As a future leader and representative of Google Developer Groups on Campus (GDG on Campus SVEC), you are expected to uphold the highest standards of integrity, respect, and professionalism:

1. **Be Respectful and Inclusive:** Value diverse perspectives, treat fellow candidates and organizers with dignity, and foster an environment where everyone feels welcome.
2. **Academic & Technical Integrity:**
   - All code submitted must be your own work (or clearly cited and disclosed in `AI_DISCLOSURE.md`).
   - Collaboration with other candidates during the active 24-hour assessment window is strictly prohibited.
   - Do not share challenge details, solutions, or repository links with peers who have not yet undertaken the assessment.
3. **Security First:** Never commit API keys, personal data, access tokens, or private secrets to git history.
4. **Community Spirit:** GDG organizers build for the community. Approach this assessment not just as a test, but as a demonstration of the care and excellence you bring to your projects.

---

## 🛠️ Candidate Git Workflow

1. **Clone Your Repository:**
   ```bash
   git clone <repository-url>
   cd gdgoc-organiser-recruitment
   ```
2. **Create Your Dedicated Branch:**
   ```bash
   git checkout -b submission/<your-roll-no-or-username>
   ```
3. **Commit Regularly with Meaningful Messages:**
   - Commit logically separated changes:
     - `feat(challenge-01): resolve race condition in webhook dispatcher`
     - `test(challenge-01): add unit tests for concurrent requests`
     - `feat(challenge-02): implement priority session allocation algorithm`
     - `docs(submission): update SUBMISSION.md with architecture details`
4. **Test Locally:**
   - Run the local autograder: `python3 evaluation/autograder/evaluator.py`
   - Verify that `.env` files with private secrets are not tracked by Git.
5. **Push Your Branch (No Pull Request / Merge Needed):**
   - Push your branch directly:
     ```bash
     git push -u origin submission/<your-roll-no-or-username>
     ```
   - Automated GitHub Actions workflows will evaluate your branch instantly upon push.

---

## 🐛 Reporting Ambiguities or Bugs

If you discover a typo, ambiguous phrasing, or broken starter test in the assessment:
1. Check the [Issues](https://github.com/gdgoc-svec/gdgoc-organiser-recruitment/issues) tab to see if the issue has already been reported.
2. If not, open a new issue using our [Bug Report Template](.github/ISSUE_TEMPLATE/bug-report.md).
3. Clearly specify the affected challenge, what behavior was observed, and what behavior was expected.
4. The organizing team will respond promptly.

---

## ⚖️ License & Intellectual Property

By submitting your work to this repository or submitting a fork, you retain ownership of your original contributions while granting GDG on Campus SVEC organizers permission to review, evaluate, and benchmark your code for selection purposes.
