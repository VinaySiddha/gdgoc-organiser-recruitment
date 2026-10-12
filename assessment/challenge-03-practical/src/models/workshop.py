from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class Registration:
    attendee_name: str
    email: str
    status: str = "registered"
    waitlisted_at: Optional[str] = None


@dataclass
class Workshop:
    workshop_id: str
    name: str
    capacity: int = 20
    registrations: Dict[str, Registration] = field(default_factory=dict)
    waitlist: List[str] = field(default_factory=list)

    def register(self, attendee_name: str, email: str) -> str:
        if email in self.registrations or email in self.waitlist:
            return "already-registered"
        if len(self.registrations) < self.capacity:
            self.registrations[email] = Registration(attendee_name=attendee_name, email=email)
            return "registered"
        self.waitlist.append(email)
        return "waitlisted"

    def cancel_registration(self, email: str) -> bool:
        if email not in self.registrations:
            return False
        del self.registrations[email]
        if self.waitlist:
            promoted_email = self.waitlist.pop(0)
            self.registrations[promoted_email] = Registration(
                attendee_name="Waitlisted attendee",
                email=promoted_email,
            )
        return True

    def status(self) -> Dict[str, object]:
        return {
            "registered": list(self.registrations.keys()),
            "waitlist": self.waitlist[:],
            "capacity": self.capacity,
            "filled": len(self.registrations),
        }
