# dashboard_service.py - Real-Time Attendance Metrics & Analytics

import csv
import io
from typing import Dict, Any, List
from lib.database import EventHubDatabase

def _sanitize_csv(val: Any) -> str:
    s = str(val if val is not None else "")
    if s.startswith(('=', '+', '-', '@', '\t', '\r')):
        return f"'{s}"
    return s

class DashboardService:
    def __init__(self, db: EventHubDatabase):
        self.db = db

    def get_summary_metrics(self) -> Dict[str, Any]:
        return self.db.get_dashboard_metrics()

    def search_attendee_records(self, query: str = "") -> List[Dict[str, Any]]:
        return self.db.search_attendees(query)

    def export_csv_manifest(self) -> str:
        """Generates real CSV manifest of all attendees and check-in statuses with injection protection."""
        records = self.search_attendee_records("")
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow([
            "Attendee ID",
            "Full Name",
            "Email",
            "Roll Number",
            "Department",
            "Year",
            "Ticket ID",
            "Check-In Status",
            "Scanned At (UTC)"
        ])

        for r in records:
            writer.writerow([
                _sanitize_csv(r["id"]),
                _sanitize_csv(r["full_name"]),
                _sanitize_csv(r["email"]),
                _sanitize_csv(r["roll_number"]),
                _sanitize_csv(r["department"]),
                _sanitize_csv(r["year"]),
                _sanitize_csv(r["ticket_id"]),
                _sanitize_csv(r["status"]),
                _sanitize_csv(r.get("scanned_at") or "N/A")
            ])

        return output.getvalue()
