# checkin_service.py - QR & Ticket Check-In Service with Duplicate Protection

import uuid
from typing import Dict, Any, Optional
from lib.database import EventHubDatabase

class CheckInService:
    def __init__(self, db: EventHubDatabase):
        self.db = db

    def extract_ticket_id(self, raw_input: str) -> str:
        """Parses ticket ID from raw string or QR pass URI format 'GDG-PASS:TICK-GDG-XXXX'."""
        if not raw_input:
            return ""
        clean = raw_input.strip()
        if clean.startswith("GDG-PASS:"):
            return clean.replace("GDG-PASS:", "").strip()
        return clean

    def check_in(
        self,
        raw_ticket_or_qr: str,
        scanned_by: str = "ORGANIZER_DESK",
        device_info: Optional[str] = None
    ) -> Dict[str, Any]:
        ticket_id = self.extract_ticket_id(raw_ticket_or_qr)
        if not ticket_id:
            return {
                "success": False,
                "status": "INVALID_TICKET",
                "message": "Ticket identifier is missing or malformed"
            }

        checkin_id = str(uuid.uuid4())
        status, row_data, err_msg = self.db.check_in_ticket(
            checkin_id=checkin_id,
            ticket_id=ticket_id,
            scanned_by=scanned_by,
            device_info=device_info
        )

        if status == "VALID_TICKET":
            return {
                "success": True,
                "status": "VALID_TICKET",
                "message": "Check-in successful! Welcome to GDG DevFest SVEC 4.0",
                "ticketId": ticket_id,
                "attendee": {
                    "fullName": row_data["full_name"],
                    "email": row_data["email"],
                    "rollNumber": row_data["roll_number"],
                    "department": row_data["department"],
                    "year": row_data["year"],
                    "status": "CHECKED_IN",
                    "scannedAt": row_data.get("scanned_at")
                }
            }
        elif status == "ALREADY_CHECKED_IN":
            return {
                "success": False,
                "status": "ALREADY_CHECKED_IN",
                "message": "Security Alert: This ticket has ALREADY BEEN CHECKED IN.",
                "ticketId": ticket_id,
                "attendee": {
                    "fullName": row_data["full_name"] if row_data else "Unknown",
                    "department": row_data["department"] if row_data else "Unknown",
                    "status": "ALREADY_CHECKED_IN"
                } if row_data else None
            }
        else:
            return {
                "success": False,
                "status": "INVALID_TICKET",
                "message": err_msg or "Ticket not found in registration database",
                "ticketId": ticket_id
            }

    def get_ticket_status(self, ticket_id: str) -> Optional[Dict[str, Any]]:
        clean_id = self.extract_ticket_id(ticket_id)
        return self.db.get_ticket_with_attendee(clean_id)
