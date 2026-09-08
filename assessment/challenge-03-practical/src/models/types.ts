export interface Attendee {
  id: string;
  ticketId: string;
  name: string;
  email: string;
  rollNumber: string;
  department: string;
  registeredAt: string; // ISO 8601
  checkedIn: boolean;
  checkedInAt?: string; // ISO 8601
  qrData: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  rollNumber: string;
  department: string;
}

export interface CheckInRequest {
  ticketId: string;
}

export interface CheckInResponse {
  success: boolean;
  message: string;
  attendee?: Attendee;
  alreadyCheckedIn?: boolean;
}

export interface EventMetrics {
  totalRegistered: number;
  totalCheckedIn: number;
  checkInPercentage: number;
  departmentBreakdown: Record<string, number>;
  checkInVelocityPerMinute: number;
  recentCheckIns: Array<{
    ticketId: string;
    name: string;
    department: string;
    checkedInAt: string;
  }>;
}

export interface BadgeOptions {
  theme?: 'google' | 'dark' | 'gradient';
  role?: 'Attendee' | 'Speaker' | 'Organizer' | 'Volunteer';
  customTitle?: string;
}
