"""
app.py — GDG DevFest Event Check-In & Dynamic Badge Hub

A FastAPI application providing:
  1. Attendee registration with unique ticket/QR code generation
  2. Organizer check-in scanner API for ticket validation
  3. Dynamic social badge generator (personalized SVG/PNG)
  4. Real-time attendance dashboard with stats

Architecture
────────────
• Backend:  FastAPI (Python) with in-memory SQLite persistence
• Frontend: Served as static HTML/CSS/JS from /static
• QR Codes: Generated server-side with `qrcode` + Pillow
• Badges:   SVG templates rendered server-side, convertible to PNG
"""

import io
import json
import os
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import qrcode
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field

# ── App setup ────────────────────────────────────────────────────────────

APP_DIR = Path(__file__).parent
DB_PATH = APP_DIR / "data" / "checkin.db"

app = FastAPI(
    title="GDG DevFest Check-In Hub",
    description="Event Check-In & Dynamic Social Badge Generator for GDG on Campus SVEC",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static frontend
STATIC_DIR = APP_DIR / "static"
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# ── Database ─────────────────────────────────────────────────────────────

def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS attendees (
            id TEXT PRIMARY KEY,
            ticket_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            department TEXT DEFAULT '',
            year TEXT DEFAULT '',
            event_name TEXT DEFAULT 'GDG DevFest SVEC 2025',
            registered_at TEXT NOT NULL,
            checked_in INTEGER DEFAULT 0,
            checked_in_at TEXT DEFAULT NULL,
            badge_style TEXT DEFAULT 'gradient-blue'
        )
    """)
    conn.commit()
    conn.close()


@contextmanager
def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


init_db()

# ── Models ───────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: str = Field(..., min_length=3, max_length=200)
    department: str = Field(default="", max_length=100)
    year: str = Field(default="", max_length=20)
    event_name: str = Field(default="GDG DevFest SVEC 2025")


class RegisterResponse(BaseModel):
    id: str
    ticket_id: str
    name: str
    email: str
    qr_url: str
    message: str


class CheckInRequest(BaseModel):
    ticket_id: str


class CheckInResponse(BaseModel):
    success: bool
    message: str
    attendee_name: Optional[str] = None
    checked_in_at: Optional[str] = None


class DashboardStats(BaseModel):
    total_registered: int
    total_checked_in: int
    check_in_rate: float
    department_breakdown: dict
    recent_checkins: list


# ── API Endpoints ────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the main frontend."""
    index_path = STATIC_DIR / "index.html"
    if index_path.exists():
        return HTMLResponse(content=index_path.read_text(encoding="utf-8"))
    return HTMLResponse("<h1>GDG DevFest Check-In Hub</h1><p>Static files not found. Place index.html in static/</p>")


# ── 1. Registration ─────────────────────────────────────────────────────

@app.post("/api/register", response_model=RegisterResponse)
async def register_attendee(req: RegisterRequest):
    """Register a new attendee and generate their unique ticket + QR code."""
    attendee_id = str(uuid.uuid4())
    ticket_id = f"GDG-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc).isoformat()

    with get_db() as conn:
        # Check duplicate email for same event
        existing = conn.execute(
            "SELECT id FROM attendees WHERE email = ? AND event_name = ?",
            (req.email, req.event_name),
        ).fetchone()
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Email {req.email} is already registered for {req.event_name}",
            )

        conn.execute(
            """INSERT INTO attendees (id, ticket_id, name, email, department, year, event_name, registered_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (attendee_id, ticket_id, req.name, req.email, req.department, req.year, req.event_name, now),
        )
        conn.commit()

    return RegisterResponse(
        id=attendee_id,
        ticket_id=ticket_id,
        name=req.name,
        email=req.email,
        qr_url=f"/api/qr/{ticket_id}",
        message=f"Successfully registered! Your ticket ID is {ticket_id}",
    )


# ── 2. QR Code Generation ───────────────────────────────────────────────

@app.get("/api/qr/{ticket_id}")
async def get_qr_code(ticket_id: str):
    """Generate and return a QR code image for a ticket ID."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT id FROM attendees WHERE ticket_id = ?", (ticket_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Ticket not found")

    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(ticket_id)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#4285F4", back_color="white")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")


# ── 3. Check-In ─────────────────────────────────────────────────────────

@app.post("/api/checkin", response_model=CheckInResponse)
async def check_in_attendee(req: CheckInRequest):
    """Validate a ticket and mark the attendee as checked in."""
    now = datetime.now(timezone.utc).isoformat()

    with get_db() as conn:
        row = conn.execute(
            "SELECT id, name, checked_in FROM attendees WHERE ticket_id = ?",
            (req.ticket_id,),
        ).fetchone()

        if not row:
            return CheckInResponse(
                success=False,
                message=f"Invalid ticket: {req.ticket_id}",
            )

        if row["checked_in"]:
            return CheckInResponse(
                success=False,
                message=f"{row['name']} has already checked in",
                attendee_name=row["name"],
            )

        conn.execute(
            "UPDATE attendees SET checked_in = 1, checked_in_at = ? WHERE ticket_id = ?",
            (now, req.ticket_id),
        )
        conn.commit()

    return CheckInResponse(
        success=True,
        message=f"Welcome, {row['name']}! Check-in successful.",
        attendee_name=row["name"],
        checked_in_at=now,
    )


# ── 4. Dashboard Stats ──────────────────────────────────────────────────

@app.get("/api/dashboard", response_model=DashboardStats)
async def get_dashboard():
    """Return real-time attendance statistics."""
    with get_db() as conn:
        total = conn.execute("SELECT COUNT(*) as c FROM attendees").fetchone()["c"]
        checked = conn.execute("SELECT COUNT(*) as c FROM attendees WHERE checked_in = 1").fetchone()["c"]

        departments = conn.execute(
            "SELECT department, COUNT(*) as count FROM attendees GROUP BY department ORDER BY count DESC"
        ).fetchall()
        dept_breakdown = {r["department"] or "Unknown": r["count"] for r in departments}

        recent = conn.execute(
            "SELECT name, department, checked_in_at FROM attendees WHERE checked_in = 1 ORDER BY checked_in_at DESC LIMIT 10"
        ).fetchall()
        recent_list = [
            {"name": r["name"], "department": r["department"], "time": r["checked_in_at"]}
            for r in recent
        ]

    return DashboardStats(
        total_registered=total,
        total_checked_in=checked,
        check_in_rate=round((checked / total * 100) if total > 0 else 0, 1),
        department_breakdown=dept_breakdown,
        recent_checkins=recent_list,
    )


# ── 5. Badge Generator ──────────────────────────────────────────────────

@app.get("/api/badge/{ticket_id}")
async def get_badge(
    ticket_id: str,
    style: str = Query(default="gradient-blue", pattern="^(gradient-blue|gradient-green|gradient-purple|dark-mode)$"),
):
    """Generate a personalized social badge as SVG."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT name, department, year, event_name, checked_in FROM attendees WHERE ticket_id = ?",
            (ticket_id,),
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Ticket not found")

        if not row["checked_in"]:
            raise HTTPException(status_code=403, detail="Attendee has not checked in yet")

    # Style presets
    styles = {
        "gradient-blue": {"bg1": "#4285F4", "bg2": "#1a73e8", "text": "#FFFFFF", "accent": "#FBBC04"},
        "gradient-green": {"bg1": "#34A853", "bg2": "#1e8e3e", "text": "#FFFFFF", "accent": "#FBBC04"},
        "gradient-purple": {"bg1": "#7B1FA2", "bg2": "#4A148C", "text": "#FFFFFF", "accent": "#EA4335"},
        "dark-mode": {"bg1": "#1E1E2E", "bg2": "#0D0D1A", "text": "#E0E0E0", "accent": "#4285F4"},
    }
    s = styles.get(style, styles["gradient-blue"])

    name = row["name"]
    dept = row["department"] or "Student"
    year = row["year"] or ""
    event = row["event_name"]

    svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:{s['bg1']};stop-opacity:1" />
      <stop offset="100%" style="stop-color:{s['bg2']};stop-opacity:1" />
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Card Background -->
  <rect width="600" height="340" rx="20" fill="url(#bg)" filter="url(#shadow)"/>

  <!-- Decorative circles -->
  <circle cx="520" cy="60" r="80" fill="{s['accent']}" opacity="0.1"/>
  <circle cx="80" cy="280" r="60" fill="{s['accent']}" opacity="0.08"/>

  <!-- Google Colors Bar -->
  <rect x="40" y="30" width="60" height="4" rx="2" fill="#4285F4"/>
  <rect x="100" y="30" width="60" height="4" rx="2" fill="#EA4335"/>
  <rect x="160" y="30" width="60" height="4" rx="2" fill="#FBBC04"/>
  <rect x="220" y="30" width="60" height="4" rx="2" fill="#34A853"/>

  <!-- Event Title -->
  <text x="40" y="70" font-family="Google Sans, Inter, Arial, sans-serif" font-size="14"
        fill="{s['accent']}" font-weight="600" letter-spacing="2">{event.upper()}</text>

  <!-- Verified Badge -->
  <text x="40" y="100" font-family="Google Sans, Inter, Arial, sans-serif" font-size="12"
        fill="{s['text']}" opacity="0.7">✓ VERIFIED ATTENDEE</text>

  <!-- Name -->
  <text x="40" y="160" font-family="Google Sans, Inter, Arial, sans-serif" font-size="36"
        fill="{s['text']}" font-weight="700">{name[:25]}</text>

  <!-- Department & Year -->
  <text x="40" y="195" font-family="Google Sans, Inter, Arial, sans-serif" font-size="18"
        fill="{s['text']}" opacity="0.8">{dept} {('• ' + year) if year else ''}</text>

  <!-- Ticket ID -->
  <rect x="40" y="230" width="200" height="32" rx="16" fill="{s['text']}" opacity="0.15"/>
  <text x="60" y="252" font-family="monospace" font-size="14"
        fill="{s['text']}" font-weight="600">🎫 {ticket_id}</text>

  <!-- GDG Logo Text -->
  <text x="40" y="310" font-family="Google Sans, Inter, Arial, sans-serif" font-size="13"
        fill="{s['text']}" opacity="0.5">Google Developer Groups on Campus — SVEC</text>

  <!-- Share prompt -->
  <text x="400" y="310" font-family="Google Sans, Inter, Arial, sans-serif" font-size="11"
        fill="{s['accent']}" text-anchor="start">#GDGDevFest #GDGonCampus</text>
</svg>"""

    return Response(content=svg, media_type="image/svg+xml")


# ── 6. List attendees (admin) ────────────────────────────────────────────

@app.get("/api/attendees")
async def list_attendees(
    checked_in: Optional[bool] = None,
    department: Optional[str] = None,
):
    """List all attendees with optional filters."""
    with get_db() as conn:
        query = "SELECT * FROM attendees WHERE 1=1"
        params = []

        if checked_in is not None:
            query += " AND checked_in = ?"
            params.append(1 if checked_in else 0)

        if department:
            query += " AND department = ?"
            params.append(department)

        query += " ORDER BY registered_at DESC"
        rows = conn.execute(query, params).fetchall()

    return [dict(r) for r in rows]


# ── Entry point ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
