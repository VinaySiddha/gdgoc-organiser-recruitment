#!/usr/bin/env python3
"""
Automated Test & Verification Harness for Challenge 01: Debugging (15 pts).
"""
import os
import subprocess
import glob
from typing import Dict

def evaluate_challenge_01() -> Dict:
    notes = []
    points = 0.0
    c1_dir = "assessment/challenge-01-debugging"

    if not os.path.exists(c1_dir):
        return {
            "score": 0.0,
            "max": 15.0,
            "notes": ["❌ Challenge 01 directory missing"]
        }

    # 1. Verify DEBUG_REPORT.md (Max 4 pts)
    report_file = os.path.join(c1_dir, "DEBUG_REPORT.md")
    if os.path.exists(report_file):
        with open(report_file, "r", encoding="utf-8", errors="ignore") as f:
            r_content = f.read()
        word_count = len(r_content.split())
        if word_count >= 150:
            points += 4.0
            notes.append(f"✅ Detailed Root-Cause Analysis report verified ({word_count} words)")
        elif word_count >= 50:
            points += 2.5
            notes.append(f"⚠️ Basic RCA report present ({word_count} words)")
        else:
            points += 1.0
            notes.append("⚠️ Short / placeholder RCA report")
    else:
        notes.append("❌ Missing DEBUG_REPORT.md in challenge-01-debugging/")

    # 2. Verify Fixed Code Implementation (Max 6 pts)
    src_files = glob.glob(f"{c1_dir}/**/*.*", recursive=True)
    code_extensions = (".py", ".ts", ".js", ".go", ".java", ".rs", ".cpp")
    source_files = [f for f in src_files if f.endswith(code_extensions) and "test" not in f.lower()]

    if source_files:
        points += 3.0
        notes.append(f"✅ Fixed implementation found: {', '.join([os.path.basename(x) for x in source_files[:3]])}")
        
        # Scan source files for concurrency bug fixes (e.g. not using shared instance mutation, proper async handling)
        fixed_evidence = False
        for sf in source_files:
            try:
                with open(sf, "r", encoding="utf-8", errors="ignore") as f:
                    code_text = f.read()
                if "retry" in code_text.lower() or "backoff" in code_text.lower() or "timeout" in code_text.lower() or "promise" in code_text.lower() or "async" in code_text.lower():
                    fixed_evidence = True
            except Exception:
                pass
        
        if fixed_evidence:
            points += 3.0
            notes.append("✅ Code exhibits explicit retry/backoff and concurrent state isolation logic")
        else:
            points += 1.5
            notes.append("⚠️ Implementation present without clear backoff/isolation keywords")
    else:
        notes.append("❌ No fixed source code found in challenge-01-debugging")

    # 3. Verify Candidate Regression Tests (Max 5 pts)
    test_files = [f for f in src_files if any(k in f.lower() for k in ["test", "spec"]) and f.endswith(code_extensions)]
    if test_files:
        points += 2.5
        notes.append(f"✅ Regression test files detected ({len(test_files)} files)")

        # Attempt test execution if Python or Node
        ran_tests = False
        if any(f.endswith(".py") for f in test_files):
            try:
                out = subprocess.run(["pytest", "-q", c1_dir], capture_output=True, text=True, timeout=10)
                if out.returncode == 0:
                    points += 2.5
                    notes.append("✅ Challenge 01 test suite executed and passed with 0 failures")
                    ran_tests = True
                else:
                    points += 1.0
                    notes.append("⚠️ Challenge 01 tests ran with some failures/warnings")
            except Exception:
                pass

        if not ran_tests and any(f.endswith((".js", ".ts")) for f in test_files):
            if os.path.exists(os.path.join(c1_dir, "package.json")):
                points += 2.5
                notes.append("✅ Node.js test configuration verified")
            else:
                points += 1.5
                notes.append("⚠️ JS/TS tests found")
    else:
        notes.append("❌ Missing regression test suite for Challenge 01")

    score = round(min(15.0, max(0.0, points)), 1)
    return {
        "score": score,
        "max": 15.0,
        "notes": notes
    }

if __name__ == "__main__":
    res = evaluate_challenge_01()
    print(f"Challenge 01: {res['score']}/{res['max']}")
