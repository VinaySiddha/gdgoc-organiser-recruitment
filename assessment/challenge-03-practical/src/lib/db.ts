// db.ts - Database Client & In-Memory / SQLite Repository Adapter for EventHub
import { AttendeeRecord, TicketRecord, CheckInRecord, DashboardMetrics } from '../models/types';

export class EventHubRepository {
  private attendees = new Map<string, AttendeeRecord>();
  private tickets = new Map<string, TicketRecord>();
  private checkIns = new Map<string, CheckInRecord>();
  private emailToAttendeeId = new Map<string, string>();
  private rollToAttendeeId = new Map<string, string>();

  public register(
    attendee: AttendeeRecord,
    ticket: TicketRecord
  ): { success: boolean; error?: string } {
    const cleanEmail = attendee.email.trim().toLowerCase();
    const cleanRoll = attendee.rollNumber.trim().toUpperCase();

    if (this.emailToAttendeeId.has(cleanEmail) || this.rollToAttendeeId.has(cleanRoll)) {
      return {
        success: false,
        error: 'Duplicate registration: Email or Roll Number already registered',
      };
    }

    this.attendees.set(attendee.id, { ...attendee, email: cleanEmail, rollNumber: cleanRoll });
    this.tickets.set(ticket.id, ticket);
    this.emailToAttendeeId.set(cleanEmail, attendee.id);
    this.rollToAttendeeId.set(cleanRoll, attendee.id);

    return { success: true };
  }

  public getTicket(ticketId: string): (TicketRecord & { attendee?: AttendeeRecord }) | undefined {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) return undefined;
    const attendee = this.attendees.get(ticket.attendeeId);
    return { ...ticket, attendee };
  }

  public getTicketByRollOrEmail(identifier: string): (TicketRecord & { attendee?: AttendeeRecord }) | undefined {
    const cleanId = identifier.trim().toLowerCase();
    const attendeeId = this.emailToAttendeeId.get(cleanId) || this.rollToAttendeeId.get(identifier.trim().toUpperCase());
    if (!attendeeId) return undefined;
    
    for (const ticket of this.tickets.values()) {
      if (ticket.attendeeId === attendeeId) {
        return { ...ticket, attendee: this.attendees.get(attendeeId) };
      }
    }
    return undefined;
  }

  public performCheckIn(
    ticketId: string,
    scannedBy: string = 'ORGANIZER_DESK',
    deviceInfo?: string
  ): {
    status: 'VALID_TICKET' | 'ALREADY_CHECKED_IN' | 'INVALID_TICKET';
    ticket?: TicketRecord;
    attendee?: AttendeeRecord;
    scannedAt?: string;
  } {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      return { status: 'INVALID_TICKET' };
    }

    if (ticket.status === 'CHECKED_IN' || this.checkIns.has(ticketId)) {
      const attendee = this.attendees.get(ticket.attendeeId);
      return { status: 'ALREADY_CHECKED_IN', ticket, attendee };
    }

    const now = new Date().toISOString();
    ticket.status = 'CHECKED_IN';
    const checkInRecord: CheckInRecord = {
      id: `chk-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      ticketId,
      scannedAt: now,
      scannedBy,
      deviceInfo,
    };
    this.checkIns.set(ticketId, checkInRecord);

    const attendee = this.attendees.get(ticket.attendeeId);
    return { status: 'VALID_TICKET', ticket, attendee, scannedAt: now };
  }

  public getMetrics(): DashboardMetrics {
    const totalRegistrations = this.attendees.size;
    const totalCheckIns = this.checkIns.size;
    const attendancePercentage =
      totalRegistrations > 0
        ? Math.round((totalCheckIns / totalRegistrations) * 10000) / 100
        : 0;

    const departmentBreakdown: Record<string, { registered: number; checkedIn: number }> = {};
    for (const att of this.attendees.values()) {
      const dept = att.department || 'Other';
      if (!departmentBreakdown[dept]) {
        departmentBreakdown[dept] = { registered: 0, checkedIn: 0 };
      }
      departmentBreakdown[dept].registered++;
    }

    for (const chk of this.checkIns.values()) {
      const t = this.tickets.get(chk.ticketId);
      if (t) {
        const att = this.attendees.get(t.attendeeId);
        if (att) {
          const dept = att.department || 'Other';
          if (departmentBreakdown[dept]) {
            departmentBreakdown[dept].checkedIn++;
          }
        }
      }
    }

    const recentCheckIns = Array.from(this.checkIns.values())
      .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())
      .slice(0, 10)
      .map((chk) => {
        const t = this.tickets.get(chk.ticketId);
        const a = t ? this.attendees.get(t.attendeeId) : undefined;
        return {
          ticketId: chk.ticketId,
          attendeeName: a ? a.fullName : 'Unknown',
          department: a ? a.department : 'General',
          scannedAt: chk.scannedAt,
        };
      });

    return {
      totalRegistrations,
      totalCheckIns,
      attendancePercentage,
      departmentBreakdown,
      recentCheckIns,
      hourlyVelocity: {},
    };
  }

  public clear(): void {
    this.attendees.clear();
    this.tickets.clear();
    this.checkIns.clear();
    this.emailToAttendeeId.clear();
    this.rollToAttendeeId.clear();
  }
}

export const globalRepository = new EventHubRepository();
