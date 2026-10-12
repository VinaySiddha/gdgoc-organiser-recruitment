from __future__ import annotations

from typing import Dict

from src.models.workshop import Workshop


class WorkshopStore:
    def __init__(self) -> None:
        self.workshops: Dict[str, Workshop] = {}

    def get_or_create_workshop(self, workshop_id: str, name: str, capacity: int = 20) -> Workshop:
        if workshop_id not in self.workshops:
            self.workshops[workshop_id] = Workshop(workshop_id=workshop_id, name=name, capacity=capacity)
        return self.workshops[workshop_id]

    def get_status(self, workshop_id: str) -> Dict[str, object]:
        workshop = self.workshops.get(workshop_id)
        if workshop is None:
            return {"registered": [], "waitlist": [], "capacity": 0, "filled": 0}
        return workshop.status()
