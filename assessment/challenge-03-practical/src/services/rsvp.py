from __future__ import annotations

from dataclasses import dataclass
from typing import Dict

from src.store import WorkshopStore


@dataclass
class RSVPService:
    workshop_store: WorkshopStore

    def register_attendee(self, workshop_id: str, attendee_name: str, email: str) -> Dict[str, object]:
        if not attendee_name or not email:
            return {"status": "invalid", "message": "attendeeName and email are required"}
        workshop = self.workshop_store.get_or_create_workshop(workshop_id, "GDG Workshop")
        outcome = workshop.register(attendee_name, email)
        return {"status": outcome, "workshopId": workshop_id, "email": email}

    def cancel_attendee(self, workshop_id: str, email: str) -> Dict[str, object]:
        workshop = self.workshop_store.get_or_create_workshop(workshop_id, "GDG Workshop")
        removed = workshop.cancel_registration(email)
        if not removed:
            return {"status": "not-found", "workshopId": workshop_id, "email": email}
        return {"status": "cancelled", "workshopId": workshop_id, "email": email}

    def workshop_status(self, workshop_id: str) -> Dict[str, object]:
        return self.workshop_store.get_status(workshop_id)
