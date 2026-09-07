// types.ts - Data Models & Domain Interfaces for EventHub

export interface AttendeeRecord {
  id: string;
  fullName: string;
  email: string;
  rollNumber: string;
  department: string;
  year: string;
  phone?: string;
  registeredAt: string; // ISO 8601
}

export interface TicketRecord {
  id: string;
  attendeeId: string;
  qrPayload: string;
  status: 'ISSUED' | 'CHECKED_IN' | 'CANCELLED';
  issuedAt: string;
  attendee?: AttendeeRecord;
}

export interface CheckInRecord {
  id: string;
  ticketId: string;
  scannedAt: string;
  scannedBy: string;
  deviceInfo?: string;
}

export interface RegistrationInput {
  fullName: string;
  email: string;
  rollNumber: string;
  department: string;
  year: string;
  phone?: string;
}

export interface CheckInResult {
  success: boolean;
  status: 'VALID_TICKET' | 'ALREADY_CHECKED_IN' | 'INVALID_TICKET' | 'ERROR';
  message: string;
  ticketId?: string;
  attendee?: {
    fullName: string;
    email: string;
    rollNumber: string;
    department: string;
    year: string;
  };
  checkInTime?: string;
}

export interface DashboardMetrics {
  totalRegistrations: number;
  totalCheckIns: number;
  attendancePercentage: number;
  departmentBreakdown: Record<string, { registered: number; checkedIn: number }>;
  recentCheckIns: Array<{
    ticketId: string;
    attendeeName: string;
    department: string;
    scannedAt: string;
  }>;
  hourlyVelocity: Record<string, number>;
}
