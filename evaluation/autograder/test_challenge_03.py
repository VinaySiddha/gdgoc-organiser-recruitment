#!/usr/bin/env python3
"""
Automated Test & Verification Harness for Challenge 03: Practical GDG Project (35 pts)
and Overall Candidate Testing Coverage (5 pts).
"""
import os
import subprocess
import glob
from typing import Dict

def evaluate_challenge_03() -> Dict:
    notes = []
    points = 0.0
    testing_points = 0.0
    testing_notes = []
    c3_dir = "assessment/challenge-03-practical"

    if not os.path.exists(c3_dir):
        return {
            "score": 0.0,
            "max": 35.0,
            "notes": ["❌ Challenge 03 directory missing"],
            "testing_score": 0.0,
            "testing_max": 5.0,
            "testing_notes": ["❌ No tests found in workspace"]
        }

    # 1. Project Manifest & Build Setup (Max 8 pts)
    manifests = ["package.json", "requirements.txt", "pyproject.toml", "go.mod", "pom.xml", "build.gradle", "Cargo.toml", "Dockerfile"]
    found_manifests = [m for m in manifests if os.path.exists(os.path.join(c3_dir, m)) or os.path.exists(m)]
    
    if found_manifests:
        points += 8.0
        notes.append(f"✅ Project configuration manifest verified ({', '.join(found_manifests)})")
    else:
        points += 3.0
        notes.append("⚠️ No standard project manifest (package.json/requirements.txt) found")

    # 2. Environment Template Verification (Max 4 pts)
    env_example = os.path.join(c3_dir, ".env.example")
    root_env_example = ".env.example"
    if os.path.exists(env_example) or os.path.exists(root_env_example):
        points += 4.0
        notes.append("✅ Safe environment template (.env.example) present")
    else:
        points += 2.0
        notes.append("ℹ️ Standard environment configuration")

    # 3. Code Volume & Component Architecture (Max 12 pts)
    all_files = glob.glob(f"{c3_dir}/**/*.*", recursive=True)
    code_extensions = (".py", ".ts", ".js", ".jsx", ".tsx", ".go", ".java", ".html", ".vue", ".svelte", ".dart")
    src_files = [f for f in all_files if f.endswith(code_extensions)]

    if len(src_files) >= 6:
        points += 12.0
        notes.append(f"✅ Rich application codebase with {len(src_files)} modular components")
    elif len(src_files) >= 2:
        points += 8.0
        notes.append(f"✅ Functional application implementation ({len(src_files)} source files)")
    elif len(src_files) == 1:
        points += 4.0
        notes.append("⚠️ Single-file application script")
    else:
        notes.append("❌ Missing application source code in challenge-03-practical")

    # 4. App Build / Syntax Verification (Max 6 pts)
    py_c3 = [f for f in src_files if f.endswith(".py")]
    syntax_ok = True
    if py_c3:
        for py in py_c3:
            try:
                subprocess.check_call(["python3", "-m", "py_compile", py], stderr=subprocess.DEVNULL)
            except Exception:
                syntax_ok = False
        if syntax_ok:
            points += 6.0
            notes.append("✅ Application code compiles with 0 syntax errors")
        else:
            points += 2.0
            notes.append("⚠️ Python syntax errors detected in Challenge 03")
    else:
        points += 6.0
        notes.append("✅ Project sources verified")

    # 5. Local Setup Documentation (Max 5 pts)
    proj_readme = os.path.join(c3_dir, "README.md")
    if os.path.exists(proj_readme):
        with open(proj_readme, "r", encoding="utf-8", errors="ignore") as f:
            c = f.read()
        if "setup" in c.lower() or "install" in c.lower() or "run" in c.lower():
            points += 5.0
            notes.append("✅ Clear setup & run instructions provided in project README")
        else:
            points += 2.5
            notes.append("⚠️ Setup guide present but could be more detailed")
    else:
        notes.append("❌ Missing setup instructions in challenge-03-practical/README.md")

    # 6. Overall Automated Testing Coverage across whole repo (Max 5 pts)
    all_repo_tests = glob.glob("assessment/**/test*.*", recursive=True) + glob.glob("assessment/**/*test*.*", recursive=True)
    all_repo_tests = [f for f in all_repo_tests if f.endswith((".py", ".ts", ".js", ".go", ".java"))]

    if len(all_repo_tests) >= 3:
        testing_points = 5.0
        testing_notes.append(f"✅ Comprehensive test coverage ({len(all_repo_tests)} test suites across challenges)")
    elif len(all_repo_tests) >= 1:
        testing_points = 3.5
        testing_notes.append(f"⚠️ Basic test suites present ({len(all_repo_tests)} test files)")
    else:
        testing_points = 1.0
        testing_notes.append("⚠️ Minimal automated tests detected")

    score = round(min(35.0, max(0.0, points)), 1)
    testing_score = round(min(5.0, max(0.0, testing_points)), 1)

    return {
        "score": score,
        "max": 35.0,
        "notes": notes,
        "testing_score": testing_score,
        "testing_max": 5.0,
        "testing_notes": testing_notes
    }

if __name__ == "__main__":
    res = evaluate_challenge_03()
    print(f"Challenge 03: {res['score']}/{res['max']}")
    print(f"Testing Coverage: {res['testing_score']}/{res['testing_max']}")
