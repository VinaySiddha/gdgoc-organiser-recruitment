# database.py - SQLite Database Storage & Transaction Manager for EventHub

import sqlite3
import threading
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timezone

class EventHubDatabase:
    def __init__(self, db_path: str = ":memory:"):
        self.db_path = db_path
        self._lock = threading.Lock()
        self._conn = sqlite3.connect(
            self.db_path,
            check_same_thread=False,
            isolation_level=None  # autocommit mode managed manually with BEGIN/COMMIT
        )
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA foreign_keys = ON;")
        self._init_db()

    def _init_db(self):
        with self._lock:
            self._conn.executescript("""
            CREATE TABLE IF NOT EXISTS attendees (
                id TEXT PRIMARY KEY,
                full_name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                roll_number TEXT NOT NULL UNIQUE,
                department TEXT NOT NULL,
                year TEXT NOT NULL,
                phone TEXT,
                registered_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS tickets (
                id TEXT PRIMARY KEY,
                attendee_id TEXT NOT NULL UNIQUE,
                qr_payload TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'ISSUED',
                issued_at TEXT NOT NULL,
                FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS check_ins (
                id TEXT PRIMARY KEY,
                ticket_id TEXT NOT NULL UNIQUE,
                scanned_at TEXT NOT NULL,
                scanned_by TEXT NOT NULL DEFAULT 'ORGANIZER_DESK',
                device_info TEXT,
                FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_attendees_dept ON attendees(department);
            CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
            CREATE INDEX IF NOT EXISTS idx_checkins_time ON check_ins(scanned_at);
            """)

    def register_attendee(
        self,
        attendee_id: str,
        full_name: str,
        email: str,
        roll_number: str,
        department: str,
        year: str,
        phone: Optional[str],
        ticket_id: str,
        qr_payload: str
    ) -> Tuple[bool, Optional[str]]:
        """Atomically registers an attendee and issues a ticket with duplicate protection."""
        now = datetime.now(timezone.utc).isoformat()
        with self._lock:
            try:
                self._conn.execute("BEGIN TRANSACTION;")
                cur = self._conn.cursor()
                cur.execute(
                    "SELECT id FROM attendees WHERE email = ? OR roll_number = ?",
                    (email, roll_number)
                )
                if cur.fetchone():
                    self._conn.execute("ROLLBACK;")
                    return False, "Duplicate registration: email or roll number already registered"

                self._conn.execute(
                    """
                    INSERT INTO attendees (id, full_name, email, roll_number, department, year, phone, registered_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (attendee_id, full_name, email, roll_number, department, year, phone, now)
                )

                self._conn.execute(
                    """
                    INSERT INTO tickets (id, attendee_id, qr_payload, status, issued_at)
                    VALUES (?, ?, ?, 'ISSUED', ?)
                    """,
                    (ticket_id, attendee_id, qr_payload, now)
                )
                self._conn.execute("COMMIT;")
                return True, None
            except sqlite3.IntegrityError as e:
                self._conn.execute("ROLLBACK;")
                return False, f"Database integrity violation: {str(e)}"
            except Exception as e:
                self._conn.execute("ROLLBACK;")
                return False, str(e)

    def get_ticket_with_attendee(self, ticket_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            cur = self._conn.cursor()
            cur.execute(
                """
                SELECT t.id as ticket_id, t.status, t.issued_at, t.qr_payload,
                       a.id as attendee_id, a.full_name, a.email, a.roll_number, a.department, a.year, a.phone,
                       c.scanned_at, c.scanned_by
                FROM tickets t
                JOIN attendees a ON t.attendee_id = a.id
                LEFT JOIN check_ins c ON t.id = c.ticket_id
                WHERE t.id = ?
                """,
                (ticket_id,)
            )
            row = cur.fetchone()
            if not row:
                return None
            return dict(row)

    def check_in_ticket(
        self,
        checkin_id: str,
        ticket_id: str,
        scanned_by: str = "ORGANIZER_DESK",
        device_info: Optional[str] = None
    ) -> Tuple[str, Optional[Dict[str, Any]], Optional[str]]:
        """
        Atomic Check-In with concurrent duplicate check-in protection.
        Supports ticket ID, roll number, or email lookup.
        Returns (status, ticket_data, error_message).
        status: 'VALID_TICKET' | 'ALREADY_CHECKED_IN' | 'INVALID_TICKET'
        """
        now = datetime.now(timezone.utc).isoformat()
        clean_input = str(ticket_id).strip() if ticket_id is not None else ""
        if not clean_input:
            return "INVALID_TICKET", None, "Missing ticket identifier"

        with self._lock:
            try:
                self._conn.execute("BEGIN TRANSACTION;")
                cur = self._conn.cursor()
                cur.execute(
                    """
                    SELECT t.id, t.status, a.full_name, a.email, a.roll_number, a.department, a.year
                    FROM tickets t
                    JOIN attendees a ON t.attendee_id = a.id
                    WHERE t.id = ? OR UPPER(a.roll_number) = UPPER(?) OR LOWER(a.email) = LOWER(?)
                    """,
                    (clean_input, clean_input, clean_input)
                )
                row = cur.fetchone()
                if not row:
                    self._conn.execute("ROLLBACK;")
                    return "INVALID_TICKET", None, f"Ticket or attendee identifier '{clean_input}' not found"

                real_ticket_id = row["id"]
                if row["status"] == "CHECKED_IN":
                    self._conn.execute("ROLLBACK;")
                    return "ALREADY_CHECKED_IN", dict(row), "Ticket has already been checked in"

                # Record checkin atomically
                self._conn.execute(
                    """
                    INSERT INTO check_ins (id, ticket_id, scanned_at, scanned_by, device_info)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (checkin_id, real_ticket_id, now, scanned_by, device_info)
                )

                self._conn.execute(
                    "UPDATE tickets SET status = 'CHECKED_IN' WHERE id = ?",
                    (real_ticket_id,)
                )

                self._conn.execute("COMMIT;")
                updated_row = dict(row)
                updated_row["status"] = "CHECKED_IN"
                updated_row["scanned_at"] = now
                return "VALID_TICKET", updated_row, None
            except sqlite3.IntegrityError:
                self._conn.execute("ROLLBACK;")
                return "ALREADY_CHECKED_IN", None, "Concurrent check-in collision detected"
            except Exception as e:
                self._conn.execute("ROLLBACK;")
                return "ERROR", None, str(e)

    def get_dashboard_metrics(self) -> Dict[str, Any]:
        with self._lock:
            cur = self._conn.cursor()
            
            # Total registrations
            cur.execute("SELECT COUNT(*) as cnt FROM attendees")
            total_reg = cur.fetchone()["cnt"]

            # Total check-ins
            cur.execute("SELECT COUNT(*) as cnt FROM check_ins")
            total_checkins = cur.fetchone()["cnt"]

            # Attendance percentage
            pct = round((total_checkins / total_reg) * 100, 2) if total_reg > 0 else 0.0

            # Department breakdown
            cur.execute(
                """
                SELECT a.department,
                       COUNT(a.id) as registered,
                       COUNT(c.id) as checked_in
                FROM attendees a
                JOIN tickets t ON a.id = t.attendee_id
                LEFT JOIN check_ins c ON t.id = c.ticket_id
                GROUP BY a.department
                """
            )
            dept_breakdown = {}
            for r in cur.fetchall():
                dept_breakdown[r["department"]] = {
                    "registered": r["registered"],
                    "checkedIn": r["checked_in"]
                }

            # Recent checkins
            cur.execute(
                """
                SELECT c.ticket_id, a.full_name, a.department, c.scanned_at
                FROM check_ins c
                JOIN tickets t ON c.ticket_id = t.id
                JOIN attendees a ON t.attendee_id = a.id
                ORDER BY c.scanned_at DESC
                LIMIT 10
                """
            )
            recent = [
                {
                    "ticketId": r["ticket_id"],
                    "attendeeName": r["full_name"],
                    "department": r["department"],
                    "scannedAt": r["scanned_at"]
                }
                for r in cur.fetchall()
            ]

            return {
                "totalRegistrations": total_reg,
                "totalCheckIns": total_checkins,
                "attendancePercentage": pct,
                "departmentBreakdown": dept_breakdown,
                "recentCheckIns": recent
            }

    def search_attendees(self, query: str = "") -> List[Dict[str, Any]]:
        with self._lock:
            cur = self._conn.cursor()
            q = f"%{query.strip()}%"
            cur.execute(
                """
                SELECT a.id, a.full_name, a.email, a.roll_number, a.department, a.year,
                       t.id as ticket_id, t.status, c.scanned_at
                FROM attendees a
                JOIN tickets t ON a.id = t.attendee_id
                LEFT JOIN check_ins c ON t.id = c.ticket_id
                WHERE a.full_name LIKE ? OR a.email LIKE ? OR a.roll_number LIKE ? OR t.id LIKE ?
                ORDER BY a.registered_at DESC
                """,
                (q, q, q, q)
            )
            return [dict(r) for r in cur.fetchall()]

    def close(self):
        with self._lock:
            self._conn.close()
