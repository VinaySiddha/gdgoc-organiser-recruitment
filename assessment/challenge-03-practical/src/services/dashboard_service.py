# dashboard_service.py - Real-Time Attendance Metrics & Analytics

import csv
import io
from typing import Dict, Any, List
from lib.database import EventHubDatabase

class DashboardService:
    def __init__(self, db: EventHubDatabase):
        self.db = db

    def get_summary_metrics(self) -> Dict[str, Any]:
        return self.db.get_dashboard_metrics()

    def search_attendee_records(self, query: str = "") -> List[Dict[str, Any]]:
        return self.db.search_attendees(query)

    def export_csv_manifest(self) -> str:
        """Generates real CSV manifest of all attendees and check-in statuses."""
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
                r["id"],
                r["full_name"],
                r["email"],
                r["roll_number"],
                r["department"],
                r["year"],
                r["ticket_id"],
                r["status"],
                r.get("scanned_at") or "N/A"
            ])

        return output.getvalue()
