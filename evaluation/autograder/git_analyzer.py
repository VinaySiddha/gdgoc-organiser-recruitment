#!/usr/bin/env python3
"""
Automated Git & GitHub Practices Analyzer.
Evaluates Git & GitHub Practices (5 pts).
"""
import os
import subprocess
import re
from typing import Dict

def evaluate_git() -> Dict:
    notes = []
    points = 0.0

    # 1. Check if git repo exists
    try:
        commit_log = subprocess.check_output(
            ["git", "log", "--oneline", "-n", "50"],
            stderr=subprocess.DEVNULL,
            text=True
        ).strip().splitlines()
    except Exception:
        commit_log = []

    # Check commit count
    commit_count = len(commit_log)
    if commit_count >= 5:
        points += 2.0
        notes.append(f"✅ Strong commit cadence ({commit_count} commits detected)")
    elif commit_count >= 2:
        points += 1.0
        notes.append(f"⚠️ Moderate commit history ({commit_count} commits detected)")
    elif commit_count == 1:
        points += 0.5
        notes.append("⚠️ Only a single initial commit found")
    else:
        notes.append("❌ No git history found")

    # Check commit message conventions
    conventional_patterns = re.compile(r"^(feat|fix|docs|style|refactor|test|chore|perf|ci)(\(.+\))?:", re.IGNORECASE)
    conventional_matches = [c for c in commit_log if conventional_patterns.search(c)]
    if len(conventional_matches) >= 3:
        points += 1.5
        notes.append(f"✅ Conventional commit messages used ({len(conventional_matches)} matches)")
    elif len(conventional_matches) >= 1:
        points += 0.75
        notes.append("⚠️ Some conventional commit messages used")
    else:
        notes.append("⚠️ Standard or generic commit messages")

    # Check branch naming
    try:
        current_branch = subprocess.check_output(
            ["git", "branch", "--show-current"],
            stderr=subprocess.DEVNULL,
            text=True
        ).strip()
    except Exception:
        current_branch = ""

    if current_branch.startswith("submission/") or "candidate" in current_branch:
        points += 1.0
        notes.append(f"✅ Proper candidate branch naming: '{current_branch}'")
    else:
        points += 0.5
        notes.append(f"ℹ️ Active branch: '{current_branch or 'main'}'")

    # Check for secret leak penalty
    secret_leaks = []
    for root, _, files in os.walk("."):
        if ".git" in root:
            continue
        for f in files:
            if f.startswith(".env") and not f.endswith(".example"):
                secret_leaks.append(os.path.join(root, f))
            if f in ["credentials.json", "serviceAccountKey.json"] or f.endswith((".pem", ".key")):
                secret_leaks.append(os.path.join(root, f))

    if secret_leaks:
        points -= 2.0
        notes.append(f"❌ Security violation: Leaked sensitive files found ({len(secret_leaks)})")
    else:
        points += 0.5
        notes.append("✅ Clean security scan (no tracked secrets or credentials)")

    git_score = round(min(5.0, max(0.0, points)), 1)
    return {
        "git_score": git_score,
        "git_max": 5.0,
        "git_notes": notes
    }

if __name__ == "__main__":
    res = evaluate_git()
    print(f"Git Score: {res['git_score']}/{res['git_max']}")
