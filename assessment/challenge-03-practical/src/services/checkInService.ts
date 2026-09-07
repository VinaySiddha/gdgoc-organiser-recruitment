// checkInService.ts - Check-In Service with Duplicate Prevention
import { CheckInResult } from '../models/types';
import { globalRepository, EventHubRepository } from '../lib/db';

export class CheckInService {
  constructor(private repo: EventHubRepository = globalRepository) {}

  public parseTicketId(rawInput: any): string {
    if (rawInput === undefined || rawInput === null) return '';
    const clean = String(rawInput).trim();
    if (clean.startsWith('GDG-PASS:')) {
      return clean.replace('GDG-PASS:', '').trim();
    }
    return clean;
  }

  public checkIn(
    rawInput: any,
    scannedBy: string = 'ORGANIZER_DESK',
    deviceInfo?: string
  ): CheckInResult {
    const ticketId = this.parseTicketId(rawInput);
    if (!ticketId) {
      return {
        success: false,
        status: 'INVALID_TICKET',
        message: 'Missing or empty ticket ID',
      };
    }

    const res = this.repo.performCheckIn(ticketId, scannedBy, deviceInfo);

    if (res.status === 'VALID_TICKET' && res.attendee) {
      return {
        success: true,
        status: 'VALID_TICKET',
        message: `Welcome ${res.attendee.fullName}! Check-in verified.`,
        ticketId: res.ticket ? res.ticket.id : ticketId,
        attendee: {
          fullName: res.attendee.fullName,
          email: res.attendee.email,
          rollNumber: res.attendee.rollNumber,
          department: res.attendee.department,
          year: res.attendee.year,
        },
        checkInTime: res.scannedAt,
      };
    } else if (res.status === 'ALREADY_CHECKED_IN') {
      return {
        success: false,
        status: 'ALREADY_CHECKED_IN',
        message: 'Security Alert: Ticket has ALREADY BEEN CHECKED IN',
        ticketId: res.ticket ? res.ticket.id : ticketId,
        attendee: res.attendee
          ? {
              fullName: res.attendee.fullName,
              email: res.attendee.email,
              rollNumber: res.attendee.rollNumber,
              department: res.attendee.department,
              year: res.attendee.year,
            }
          : undefined,
      };
    } else {
      return {
        success: false,
        status: 'INVALID_TICKET',
        message: `Ticket '${ticketId}' was not found in database`,
        ticketId,
      };
    }
  }
}
