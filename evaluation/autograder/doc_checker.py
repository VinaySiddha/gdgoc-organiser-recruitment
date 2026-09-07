#!/usr/bin/env python3
"""
Automated Documentation, Submission, and AI Disclosure Auditor.
Evaluates Documentation (5 pts) and AI Disclosure & Reflection (5 pts).
"""
import os
import re
from typing import Dict, Tuple

def check_file_filled(file_path: str, required_sections: list) -> Tuple[float, list]:
    if not os.path.exists(file_path):
        return 0.0, [f"Missing file: {file_path}"]
    
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    notes = []
    points_awarded = 0.0
    sec_weight = 1.0 / max(len(required_sections), 1)

    for sec in required_sections:
        if isinstance(sec, tuple):
            pattern, label = sec
        else:
            pattern, label = sec, sec
            
        if re.search(pattern, content, re.IGNORECASE):
            # Check if it has content beyond placeholder
            match = re.search(f"{pattern}\\s*[:\\n]\\s*([^\\n#]+)", content, re.IGNORECASE)
            val = (match.group(1) or "").strip() if match else ""
            if val and not any(placeholder in val.lower() for placeholder in ["your name", "your-username", "your repo", "[your", "todo", "___"]):
                points_awarded += sec_weight
                notes.append(f"✅ Verified '{label}'")
            else:
                points_awarded += sec_weight * 0.5
                notes.append(f"⚠️ Placeholder or short response in '{label}'")
        else:
            notes.append(f"❌ Missing section '{label}'")

    return min(1.0, points_awarded), notes

def evaluate_documentation() -> Dict:
    """Evaluates Documentation (Max 5 pts) and AI Mastery (Max 5 pts)."""
    # 1. Locate SUBMISSION.md
    sub_path = "SUBMISSION.md" if os.path.exists("SUBMISSION.md") else "starter/SUBMISSION.md"
    sub_sections = [
        (r"Candidate Name", "Candidate Name"),
        (r"GitHub Username", "GitHub Username"),
        (r"Year", "Student Year"),
        (r"Department", "Department"),
        (r"Tech Stack", "Tech Stack Used"),
        (r"Major Technical Decisions", "Technical Decisions"),
        (r"Known Limitations", "Known Limitations"),
        (r"What I Would Improve", "Future Improvements"),
    ]
    sub_ratio, sub_notes = check_file_filled(sub_path, sub_sections)

    # 2. Locate Challenge 01 DEBUG_REPORT.md
    debug_path = "assessment/challenge-01-debugging/DEBUG_REPORT.md"
    debug_sections = [
        (r"Root Cause Analysis|Root Cause", "Root Cause Analysis"),
        (r"Reproduction Steps|Reproduction", "Reproduction Steps"),
        (r"Implemented Fix|Code Changes", "Fix Summary"),
        (r"Prevention|Recommendations", "Prevention Strategy")
    ]
    debug_ratio, debug_notes = check_file_filled(debug_path, debug_sections)

    # 3. Locate Practical Project Readme
    proj_path = "assessment/challenge-03-practical/README.md"
    proj_ratio, proj_notes = 0.0, []
    if os.path.exists(proj_path):
        with open(proj_path, "r", encoding="utf-8", errors="ignore") as f:
            p_content = f.read()
        if len(p_content.split()) > 100:
            proj_ratio = 1.0
            proj_notes.append("✅ Project documentation contains comprehensive setup guide")
        else:
            proj_ratio = 0.5
            proj_notes.append("⚠️ Project README is brief or placeholder")
    else:
        proj_notes.append("❌ Missing assessment/challenge-03-practical/README.md")

    # Documentation Score (out of 5)
    doc_score = round((sub_ratio * 2.0) + (debug_ratio * 1.5) + (proj_ratio * 1.5), 1)
    doc_score = min(5.0, max(0.0, doc_score))

    # 4. Locate AI_DISCLOSURE.md
    ai_path = "AI_DISCLOSURE.md" if os.path.exists("AI_DISCLOSURE.md") else "starter/AI_DISCLOSURE.md"
    ai_sections = [
        (r"Summary of AI Tools|AI Tools", "AI Tools Used"),
        (r"Activity Breakdown|Activity", "Activity Breakdown"),
        (r"Detailed Usage Log|Prompts", "Prompt Log"),
        (r"Candidate Reflection|Comprehension", "Candidate Reflection"),
    ]
    ai_ratio, ai_notes = check_file_filled(ai_path, ai_sections)
    ai_score = round(ai_ratio * 5.0, 1)
    ai_score = min(5.0, max(0.0, ai_score))

    return {
        "doc_score": doc_score,
        "doc_max": 5.0,
        "doc_notes": sub_notes + debug_notes + proj_notes,
        "ai_score": ai_score,
        "ai_max": 5.0,
        "ai_notes": ai_notes
    }

if __name__ == "__main__":
    res = evaluate_documentation()
    print(f"Documentation: {res['doc_score']}/{res['doc_max']}")
    print(f"AI Disclosure: {res['ai_score']}/{res['ai_max']}")
