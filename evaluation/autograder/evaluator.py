#!/usr/bin/env python3
"""
Master Autograder Engine for GDG on Campus SVEC 4.0 Organizer Assessment.
Aggregates all 8 rubric dimensions to compute an objective 100-Point Score.
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
from datetime import datetime

from doc_checker import evaluate_documentation
from git_analyzer import evaluate_git
from code_quality_checker import evaluate_code_quality
from test_challenge_01 import evaluate_challenge_01
from test_challenge_02 import evaluate_challenge_02
from test_challenge_03 import evaluate_challenge_03

def run_evaluation():
    print("=" * 70)
    print("🤖 GDG on Campus SVEC 4.0 — Automated Assessment Evaluation")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print("=" * 70)

    # 1. Run sub-evaluators
    doc_res = evaluate_documentation()
    git_res = evaluate_git()
    quality_res = evaluate_code_quality()
    c1_res = evaluate_challenge_01()
    c2_res = evaluate_challenge_02()
    c3_res = evaluate_challenge_03()

    # 2. Extract scores matching RUBRIC.md (100 Points Total)
    scores = {
        "challenge_01": {
            "name": "Challenge 01 (Debugging & RCA)",
            "score": c1_res["score"],
            "max": c1_res["max"],
            "notes": c1_res["notes"]
        },
        "challenge_02": {
            "name": "Challenge 02 (Coding & Algorithms)",
            "score": c2_res["score"],
            "max": c2_res["max"],
            "notes": c2_res["notes"]
        },
        "challenge_03": {
            "name": "Challenge 03 (Practical GDG Project)",
            "score": c3_res["score"],
            "max": c3_res["max"],
            "notes": c3_res["notes"]
        },
        "code_quality": {
            "name": "Code Quality & Modularity",
            "score": quality_res["quality_score"],
            "max": quality_res["quality_max"],
            "notes": quality_res["quality_notes"]
        },
        "git_practices": {
            "name": "Git & GitHub Practices",
            "score": git_res["git_score"],
            "max": git_res["git_max"],
            "notes": git_res["git_notes"]
        },
        "documentation": {
            "name": "Documentation & Setup Clarity",
            "score": doc_res["doc_score"],
            "max": doc_res["doc_max"],
            "notes": doc_res["doc_notes"]
        },
        "testing_coverage": {
            "name": "Automated Testing Coverage",
            "score": c3_res["testing_score"],
            "max": c3_res["testing_max"],
            "notes": c3_res["testing_notes"]
        },
        "ai_mastery": {
            "name": "Technical Explanation & AI Mastery",
            "score": doc_res["ai_score"],
            "max": doc_res["ai_max"],
            "notes": doc_res["ai_notes"]
        }
    }

    total_score = sum(item["score"] for item in scores.values())
    total_score = round(total_score, 1)
    total_max = sum(item["max"] for item in scores.values())

    # Determine Verdict & Tier
    if total_score >= 85:
        verdict = "🌟 STRONGLY RECOMMENDED FOR CORE TEAM LEAD"
        tier = "Top Tier (85–100)"
        status_color = "🟢"
    elif total_score >= 70:
        verdict = "🟢 RECOMMENDED FOR CORE TEAM ORGANIZER"
        tier = "Qualified Tier (70–84)"
        status_color = "🟢"
    elif total_score >= 50:
        verdict = "🟡 CONSIDER FOR EXTENDED / ASSOCIATE TEAM"
        tier = "Developmental Tier (50–69)"
        status_color = "🟡"
    else:
        verdict = "🔴 BELOW QUALIFICATION THRESHOLD"
        tier = "Needs Improvement (<50)"
        status_color = "🔴"

    # Extract Candidate Metadata
    candidate_name = "Candidate"
    sub_path = "SUBMISSION.md" if os.path.exists("SUBMISSION.md") else "starter/SUBMISSION.md"
    if os.path.exists(sub_path):
        with open(sub_path, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                if "Candidate Name:" in line:
                    name_val = line.split(":", 1)[1].strip()
                    if name_val and not any(p in name_val.lower() for p in ["[", "todo"]):
                        candidate_name = name_val
                        break

    report_data = {
        "candidate_name": candidate_name,
        "evaluated_at": datetime.now().isoformat(),
        "total_score": total_score,
        "total_max": total_max,
        "verdict": verdict,
        "tier": tier,
        "categories": scores
    }

    # Save evaluation_report.json
    with open("evaluation_report.json", "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2)

    # Generate Markdown Report
    md_report = f"""# 📊 GDG on Campus SVEC 4.0 — Automated Evaluation Report

**Candidate:** {candidate_name}  
**Evaluated At:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S IST')}  
**Overall Score:** **`{total_score} / {int(total_max)} Points`**  
**Assessment Tier:** {tier}  
**Verdict:** **{verdict}**

---

### 📋 100-Point Scorecard Breakdown

| Evaluation Dimension | Weight | Awarded | Percentage |
| :--- | :---: | :---: | :---: |
"""

    for k, v in scores.items():
        pct = int((v["score"] / v["max"]) * 100) if v["max"] > 0 else 0
        md_report += f"| **{v['name']}** | {int(v['max'])} pts | **{v['score']} pts** | {pct}% |\n"

    md_report += f"| **Total Aggregate Score** | **{int(total_max)} pts** | **`{total_score} pts`** | **{int((total_score/total_max)*100)}%** |\n\n"

    md_report += "### 🔍 Category Details & Audit Findings\n\n"
    for k, v in scores.items():
        md_report += f"#### {v['name']} (`{v['score']} / {int(v['max'])} pts`)\n"
        for note in v["notes"]:
            md_report += f"- {note}\n"
        md_report += "\n"

    md_report += """---
> *Generated automatically by GDG on Campus SVEC Autograder Engine.*
"""

    with open("EVALUATION_REPORT.md", "w", encoding="utf-8") as f:
        f.write(md_report)

    # Output to GitHub Step Summary if running in GitHub Actions
    gh_step_summary = os.getenv("GITHUB_STEP_SUMMARY")
    if gh_step_summary:
        with open(gh_step_summary, "a", encoding="utf-8") as f:
            f.write(md_report)

    # Print to console
    print(f"\n🎯 Total Score: {total_score} / {int(total_max)} ({int((total_score/total_max)*100)}%)")
    print(f"📌 Tier: {tier}")
    print(f"🏆 Verdict: {verdict}")
    print(f"📄 Report written to EVALUATION_REPORT.md and evaluation_report.json\n")

    return total_score

if __name__ == "__main__":
    run_evaluation()
