# api_handler.py - HTTP Controller & Request Routing Layer for EventHub

from typing import Dict, Any
from lib.database import EventHubDatabase
from services.registration_service import RegistrationService
from services.checkin_service import CheckInService
from services.dashboard_service import DashboardService

class EventHubAPIController:
    def __init__(self, db_path: str = ":memory:"):
        self.db = EventHubDatabase(db_path)
        self.reg_service = RegistrationService(self.db)
        self.checkin_service = CheckInService(self.db)
        self.dashboard_service = DashboardService(self.db)

    def handle_post_registration(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """POST /api/register"""
        return self.reg_service.register_attendee(payload)

    def handle_get_ticket(self, ticket_id: str) -> Dict[str, Any]:
        """GET /api/ticket/{ticketId}"""
        ticket = self.checkin_service.get_ticket_status(ticket_id)
        if not ticket:
            return {"success": False, "error": "Ticket not found"}
        return {"success": True, "ticket": ticket}

    def handle_post_checkin(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """POST /api/check-in"""
        raw_ticket = payload.get("ticketId") or payload.get("qrPayload") or ""
        scanned_by = payload.get("scannedBy", "ORGANIZER_DESK")
        device_info = payload.get("deviceInfo")
        return self.checkin_service.check_in(raw_ticket, scanned_by, device_info)

    def handle_get_dashboard(self) -> Dict[str, Any]:
        """GET /api/dashboard"""
        metrics = self.dashboard_service.get_summary_metrics()
        return {"success": True, "data": metrics}

    def handle_get_attendees(self, query: str = "") -> Dict[str, Any]:
        """GET /api/attendees?q=..."""
        records = self.dashboard_service.search_attendee_records(query)
        return {"success": True, "attendees": records}

    def handle_get_export_csv(self) -> str:
        """GET /api/export/csv"""
        return self.dashboard_service.export_csv_manifest()
