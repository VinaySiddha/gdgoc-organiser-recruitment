// registrationService.ts - Registration & Ticket Issuance Service
import { RegistrationInput, AttendeeRecord, TicketRecord } from '../models/types';
import { globalRepository, EventHubRepository } from '../lib/db';

export class RegistrationService {
  constructor(private repo: EventHubRepository = globalRepository) {}

  public validateInput(input: RegistrationInput): { valid: boolean; error?: string } {
    if (!input) return { valid: false, error: 'Empty payload' };
    if (!input.fullName || input.fullName.trim().length < 2) {
      return { valid: false, error: 'Full name must be at least 2 characters' };
    }
    if (!input.email || !input.email.includes('@') || !input.email.includes('.')) {
      return { valid: false, error: 'Valid email address is required' };
    }
    if (!input.rollNumber || input.rollNumber.trim().length < 4) {
      return { valid: false, error: 'Roll number is required' };
    }
    if (!input.department || input.department.trim() === '') {
      return { valid: false, error: 'Department is required' };
    }
    if (!input.year || input.year.trim() === '') {
      return { valid: false, error: 'Year of study is required' };
    }
    return { valid: true };
  }

  public register(input: RegistrationInput): {
    success: boolean;
    ticketId?: string;
    qrPayload?: string;
    attendee?: AttendeeRecord;
    error?: string;
  } {
    const validation = this.validateInput(input);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const attendeeId = `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const randomCode = Math.random().toString(36).substr(2, 6).toUpperCase();
    const ticketId = `TICK-GDG-${randomCode}`;
    const qrPayload = `GDG-PASS:${ticketId}`;

    const attendee: AttendeeRecord = {
      id: attendeeId,
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      rollNumber: input.rollNumber.trim().toUpperCase(),
      department: input.department.trim(),
      year: input.year.trim(),
      phone: input.phone ? input.phone.trim() : undefined,
      registeredAt: new Date().toISOString(),
    };

    const ticket: TicketRecord = {
      id: ticketId,
      attendeeId,
      qrPayload,
      status: 'ISSUED',
      issuedAt: new Date().toISOString(),
    };

    const result = this.repo.register(attendee, ticket);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      ticketId,
      qrPayload,
      attendee,
    };
  }
}
