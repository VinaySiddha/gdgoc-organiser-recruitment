# models.py - Domain Models for EventHub (Python Service Layer)

from dataclasses import dataclass, field
from typing import Optional, Dict, List, Literal

@dataclass
class AttendeeRecord:
    id: str
    fullName: str
    email: str
    rollNumber: str
    department: str
    year: str
    phone: Optional[str] = None
    registeredAt: str = ""

@dataclass
class TicketRecord:
    id: str
    attendeeId: str
    qrPayload: str
    status: Literal['ISSUED', 'CHECKED_IN', 'CANCELLED'] = 'ISSUED'
    issuedAt: str = ""
    attendee: Optional[AttendeeRecord] = None

@dataclass
class CheckInRecord:
    id: str
    ticketId: str
    scannedAt: str
    scannedBy: str = "ORGANIZER_DESK"
    deviceInfo: Optional[str] = None

@dataclass
class RegistrationInput:
    fullName: str
    email: str
    rollNumber: str
    department: str
    year: str
    phone: Optional[str] = None

@dataclass
class CheckInResult:
    success: bool = False
    status: Literal['VALID_TICKET', 'ALREADY_CHECKED_IN', 'INVALID_TICKET', 'ERROR'] = 'INVALID_TICKET'
    message: str = ""
    ticketId: Optional[str] = None
    attendee: Optional[Dict[str, str]] = None
    checkInTime: Optional[str] = None
