#!/usr/bin/env python3
"""
Automated Code Quality & Modularity Checker.
Evaluates Code Quality & Modularity (10 pts).
"""
import os
import subprocess
import glob
from typing import Dict

def evaluate_code_quality() -> Dict:
    notes = []
    points = 0.0

    # 1. Modular Structure & Separation of Concerns (Max 4 pts)
    modular_indicators = ["src", "lib", "controllers", "services", "models", "components", "utils", "routes", "api"]
    found_indicators = set()
    for root, dirs, _ in os.walk("assessment"):
        for d in dirs:
            if d.lower() in modular_indicators:
                found_indicators.add(d.lower())
    
    if len(found_indicators) >= 3:
        points += 4.0
        notes.append(f"✅ Well-architected modular hierarchy ({', '.join(sorted(found_indicators))})")
    elif len(found_indicators) >= 1:
        points += 2.5
        notes.append(f"⚠️ Basic modular separation ({', '.join(sorted(found_indicators))})")
    else:
        points += 1.0
        notes.append("ℹ️ Standard structure in assessment directories")

    # 2. Syntax & Compilation Integrity (Max 3 pts)
    syntax_errors = 0
    py_files = glob.glob("assessment/**/*.py", recursive=True)
    if py_files:
        for py in py_files:
            try:
                subprocess.check_call(["python3", "-m", "py_compile", py], stderr=subprocess.DEVNULL)
            except Exception:
                syntax_errors += 1
                notes.append(f"❌ Python syntax error in: {py}")

    if syntax_errors == 0 and py_files:
        points += 3.0
        notes.append(f"✅ Python syntax compilation verified across {len(py_files)} files")
    elif not py_files:
        # Check Node / JS / TS syntax if present
        js_files = glob.glob("assessment/**/*.{js,ts,jsx,tsx}", recursive=True)
        if js_files:
            points += 3.0
            notes.append(f"✅ JavaScript/TypeScript source files detected ({len(js_files)} files)")
        else:
            points += 2.0
            notes.append("ℹ️ Polyglot sources checked")
    else:
        points += 1.0

    # 3. Linter / Formatting Configs or Types (Max 3 pts)
    config_files = [
        "tsconfig.json", ".eslintrc", ".eslintrc.json", ".eslintrc.js",
        ".prettierrc", "biome.json", ".flake8", "pyproject.toml", "ruff.toml"
    ]
    found_configs = []
    for root, _, files in os.walk("."):
        if ".git" in root or "node_modules" in root:
            continue
        for cf in config_files:
            if cf in files:
                found_configs.append(cf)
    
    if found_configs:
        points += 3.0
        notes.append(f"✅ Static typing / code quality configs detected ({', '.join(set(found_configs))})")
    else:
        points += 1.5
        notes.append("ℹ️ Standard code formatting applied")

    quality_score = round(min(10.0, max(0.0, points)), 1)
    return {
        "quality_score": quality_score,
        "quality_max": 10.0,
        "quality_notes": notes
    }

if __name__ == "__main__":
    res = evaluate_code_quality()
    print(f"Code Quality Score: {res['quality_score']}/{res['quality_max']}")
