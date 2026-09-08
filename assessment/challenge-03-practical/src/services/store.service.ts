import { Attendee, RegisterRequest, CheckInResponse, EventMetrics } from '../models/types.js';

export class StoreService {
  private attendees: Map<string, Attendee> = new Map(); // id -> Attendee
  private ticketIndex: Map<string, string> = new Map(); // ticketId -> id
  private emailIndex: Map<string, string> = new Map(); // email (lowercase) -> id
  private rollNumberIndex: Map<string, string> = new Map(); // rollNumber (uppercase) -> id
  private checkInTimestamps: number[] = []; // epoch ms of recent checkins for velocity

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData(): void {
    // Seed 3 sample attendees for immediate out-of-the-box demonstration
    const samples: RegisterRequest[] = [
      { name: 'Alex Johnson', email: 'alex@sves.org.in', rollNumber: '22A81A0501', department: 'Computer Science' },
      { name: 'Priya Sharma', email: 'priya@sves.org.in', rollNumber: '22A81A1204', department: 'Information Technology' },
      { name: 'Rahul Varma', email: 'rahul@sves.org.in', rollNumber: '22A81A4302', department: 'AI & Data Science' }
    ];
    for (const s of samples) {
      this.register(s);
    }
  }

  public register(req: RegisterRequest): { success: boolean; attendee?: Attendee; error?: string } {
    if (!req.name || !req.name.trim()) return { success: false, error: 'Name is required' };
    if (!req.email || !req.email.includes('@')) return { success: false, error: 'Valid email is required' };
    if (!req.rollNumber || !req.rollNumber.trim()) return { success: false, error: 'Roll number is required' };
    if (!req.department || !req.department.trim()) return { success: false, error: 'Department is required' };

    const normEmail = req.email.trim().toLowerCase();
    const normRoll = req.rollNumber.trim().toUpperCase();

    if (this.emailIndex.has(normEmail)) {
      return { success: false, error: `Attendee with email ${req.email} is already registered` };
    }
    if (this.rollNumberIndex.has(normRoll)) {
      return { success: false, error: `Attendee with roll number ${req.rollNumber} is already registered` };
    }

    const id = `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const ticketId = `GDG-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const registeredAt = new Date().toISOString();

    const qrData = JSON.stringify({
      ticketId,
      name: req.name.trim(),
      rollNumber: normRoll,
      eventId: 'GDG-DEVFEST-SVEC-2026'
    });

    const attendee: Attendee = {
      id,
      ticketId,
      name: req.name.trim(),
      email: normEmail,
      rollNumber: normRoll,
      department: req.department.trim(),
      registeredAt,
      checkedIn: false,
      qrData
    };

    this.attendees.set(id, attendee);
    this.ticketIndex.set(ticketId, id);
    this.emailIndex.set(normEmail, id);
    this.rollNumberIndex.set(normRoll, id);

    return { success: true, attendee };
  }

  public checkIn(ticketId: string): CheckInResponse {
    if (!ticketId || typeof ticketId !== 'string') {
      return { success: false, message: 'Valid Ticket ID required' };
    }

    const trimmed = ticketId.trim().toUpperCase();
    const id = this.ticketIndex.get(trimmed);
    if (!id) {
      return { success: false, message: `Ticket ${ticketId} not found in registration database` };
    }

    const attendee = this.attendees.get(id);
    if (!attendee) {
      return { success: false, message: 'Attendee record not found' };
    }

    if (attendee.checkedIn) {
      return {
        success: false,
        alreadyCheckedIn: true,
        attendee,
        message: `Duplicate Check-in Alert: Attendee ${attendee.name} was already checked in at ${attendee.checkedInAt}`
      };
    }

    const now = new Date();
    attendee.checkedIn = true;
    attendee.checkedInAt = now.toISOString();
    this.checkInTimestamps.push(now.getTime());

    return {
      success: true,
      attendee,
      message: `Check-in Verified: Welcome ${attendee.name} (${attendee.department})!`
    };
  }

  public getAttendeeByTicketId(ticketId: string): Attendee | undefined {
    const id = this.ticketIndex.get(ticketId.trim().toUpperCase());
    return id ? this.attendees.get(id) : undefined;
  }

  public getAttendeeById(id: string): Attendee | undefined {
    return this.attendees.get(id);
  }

  public getAllAttendees(search?: string, department?: string): Attendee[] {
    let list = Array.from(this.attendees.values());
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          a.rollNumber.toLowerCase().includes(q) ||
          a.ticketId.toLowerCase().includes(q)
      );
    }
    if (department && department !== 'ALL') {
      list = list.filter((a) => a.department.toLowerCase() === department.toLowerCase());
    }
    return list.sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());
  }

  public getMetrics(): EventMetrics {
    const all = Array.from(this.attendees.values());
    const checkedInList = all.filter((a) => a.checkedIn);

    const deptCounts: Record<string, number> = {};
    for (const a of all) {
      deptCounts[a.department] = (deptCounts[a.department] || 0) + 1;
    }

    // Velocity: check-ins in the last 5 minutes
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const recentVelocityCount = this.checkInTimestamps.filter((t) => t >= fiveMinutesAgo).length;
    const velocityPerMinute = Math.round((recentVelocityCount / 5) * 10) / 10;

    const recentCheckIns = checkedInList
      .sort((a, b) => (b.checkedInAt || '').localeCompare(a.checkedInAt || ''))
      .slice(0, 10)
      .map((a) => ({
        ticketId: a.ticketId,
        name: a.name,
        department: a.department,
        checkedInAt: a.checkedInAt || ''
      }));

    const totalRegistered = all.length;
    const totalCheckedIn = checkedInList.length;
    const checkInPercentage =
      totalRegistered > 0 ? Math.round((totalCheckedIn / totalRegistered) * 1000) / 10 : 0;

    return {
      totalRegistered,
      totalCheckedIn,
      checkInPercentage,
      departmentBreakdown: deptCounts,
      checkInVelocityPerMinute: velocityPerMinute,
      recentCheckIns
    };
  }

  public reset(): void {
    this.attendees.clear();
    this.ticketIndex.clear();
    this.emailIndex.clear();
    this.rollNumberIndex.clear();
    this.checkInTimestamps = [];
  }
}

export const defaultStore = new StoreService();
