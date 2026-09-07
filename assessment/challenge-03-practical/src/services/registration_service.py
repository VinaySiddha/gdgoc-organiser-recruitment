# registration_service.py - Student Registration & Ticket Generation Service

import uuid
import re
from typing import Dict, Any, Tuple
from lib.database import EventHubDatabase

class RegistrationService:
    def __init__(self, db: EventHubDatabase):
        self.db = db

    def validate_input(self, data: Dict[str, Any]) -> Tuple[bool, str]:
        if not data or not isinstance(data, dict):
            return False, "Invalid registration payload"
        
        full_name = str(data.get("fullName", "")).strip()
        email = str(data.get("email", "")).strip()
        roll_number = str(data.get("rollNumber", "")).strip()
        department = str(data.get("department", "")).strip()
        year = str(data.get("year", "")).strip()

        if not full_name or len(full_name) < 2:
            return False, "Full Name is required and must be at least 2 characters"

        email_pattern = r"^[\w\.-]+@[\w\.-]+\.\w+$"
        if not email or not re.match(email_pattern, email):
            return False, "A valid email address is required"

        if not roll_number or len(roll_number) < 4:
            return False, "Roll Number is required (e.g. 23A81A4397)"

        if not department:
            return False, "Department is required (e.g. CSE, IT, ADS, ECE)"

        if not year:
            return False, "Year of study is required (e.g. 2nd Year, 3rd Year)"

        return True, ""

    def register_attendee(self, data: Dict[str, Any]) -> Dict[str, Any]:
        is_valid, err_msg = self.validate_input(data)
        if not is_valid:
            return {"success": False, "error": err_msg}

        attendee_id = str(uuid.uuid4())
        short_id = uuid.uuid4().hex[:6].upper()
        ticket_id = f"TICK-GDG-{short_id}"
        qr_payload = f"GDG-PASS:{ticket_id}"

        success, err = self.db.register_attendee(
            attendee_id=attendee_id,
            full_name=data["fullName"].strip(),
            email=data["email"].strip().lower(),
            roll_number=data["rollNumber"].strip().upper(),
            department=data["department"].strip(),
            year=data["year"].strip(),
            phone=str(data.get("phone", "")).strip() or None,
            ticket_id=ticket_id,
            qr_payload=qr_payload
        )

        if not success:
            return {"success": False, "error": err}

        return {
            "success": True,
            "attendeeId": attendee_id,
            "ticketId": ticket_id,
            "qrPayload": qr_payload,
            "attendee": {
                "fullName": data["fullName"].strip(),
                "email": data["email"].strip().lower(),
                "rollNumber": data["rollNumber"].strip().upper(),
                "department": data["department"].strip(),
                "year": data["year"].strip()
            }
        }
