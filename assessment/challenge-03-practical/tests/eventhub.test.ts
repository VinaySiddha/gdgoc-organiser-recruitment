// eventhub.test.ts - Integration Test Suite for EventHub
import { EventHubController } from '../src/controllers/apiHandler';
import { globalRepository } from '../src/lib/db';

describe('Challenge 03: GDG SVEC EventHub End-to-End Workflow', () => {
  let controller: EventHubController;

  beforeEach(() => {
    globalRepository.clear();
    controller = new EventHubController();
  });

  test('should register attendee, issue ticket pass, and prevent duplicate registration', () => {
    const res = controller.register({
      fullName: 'Arjun Sharma',
      email: 'arjun@svec.edu.in',
      rollNumber: '23A81A4397',
      department: 'CSE',
      year: '2nd Year',
    });

    expect(res.success).toBe(true);
    expect(res.ticketId).toBeDefined();
    expect(res.qrPayload).toContain(res.ticketId!);

    // Duplicate email registration attempt
    const dupRes = controller.register({
      fullName: 'Arjun Duplicate',
      email: 'arjun@svec.edu.in',
      rollNumber: '23A81A4398',
      department: 'CSE',
      year: '2nd Year',
    });
    expect(dupRes.success).toBe(false);
    expect(dupRes.error).toContain('Duplicate');
  });

  test('should perform valid check-in and reject duplicate check-in attempts', () => {
    const reg = controller.register({
      fullName: 'Priya Reddy',
      email: 'priya@svec.edu.in',
      rollNumber: '23A81A4320',
      department: 'IT',
      year: '3rd Year',
    });

    const ticketId = reg.ticketId!;

    // 1st Check-In
    const chk1 = controller.checkIn(ticketId, 'GATE_1');
    expect(chk1.success).toBe(true);
    expect(chk1.status).toBe('VALID_TICKET');
    expect(chk1.attendee?.fullName).toBe('Priya Reddy');

    // 2nd Check-In (Duplicate)
    const chk2 = controller.checkIn(ticketId, 'GATE_2');
    expect(chk2.success).toBe(false);
    expect(chk2.status).toBe('ALREADY_CHECKED_IN');
  });

  test('should calculate accurate dashboard metrics', () => {
    const reg1 = controller.register({
      fullName: 'Student 1',
      email: 's1@svec.edu.in',
      rollNumber: '23A81A4301',
      department: 'CSE',
      year: '1st Year',
    });
    const reg2 = controller.register({
      fullName: 'Student 2',
      email: 's2@svec.edu.in',
      rollNumber: '23A81A4302',
      department: 'ECE',
      year: '2nd Year',
    });

    controller.checkIn(reg1.ticketId!);

    const metrics = controller.getDashboardMetrics();
    expect(metrics.totalRegistrations).toBe(2);
    expect(metrics.totalCheckIns).toBe(1);
    expect(metrics.attendancePercentage).toBe(50);
    expect(metrics.departmentBreakdown['CSE'].checkedIn).toBe(1);
    expect(metrics.departmentBreakdown['ECE'].checkedIn).toBe(0);
  });
});
