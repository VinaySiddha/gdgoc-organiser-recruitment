import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { defaultStore } from '../src/services/store.service.js';

describe('Challenge 03 — Practical Project Integration Test Suite', () => {
  const app = createApp();

  beforeEach(() => {
    defaultStore.reset();
  });

  it('TEST 1 — Attendee Registration (Happy Path)', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({
        name: 'Jane Doe',
        email: 'jane@sves.org.in',
        rollNumber: '22A81A0599',
        department: 'Computer Science'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.attendee.name, 'Jane Doe');
    assert.ok(res.body.attendee.ticketId.startsWith('GDG-2026-'));
    assert.equal(res.body.attendee.checkedIn, false);
    assert.ok(res.body.attendee.qrData.includes('GDG-2026-'));
  });

  it('TEST 2 — Registration Validation Failure (Missing Fields & Invalid Email)', async () => {
    const missingName = await request(app)
      .post('/api/register')
      .send({ email: 'test@sves.org.in', rollNumber: '22A81A0599', department: 'CSE' });
    assert.equal(missingName.status, 400);

    const badEmail = await request(app)
      .post('/api/register')
      .send({ name: 'Test', email: 'not-an-email', rollNumber: '22A81A0599', department: 'CSE' });
    assert.equal(badEmail.status, 400);
  });

  it('TEST 3 — Duplicate Email and Roll Number Rejection', async () => {
    const reg1 = await request(app)
      .post('/api/register')
      .send({
        name: 'First User',
        email: 'duplicate@sves.org.in',
        rollNumber: '22A81A0101',
        department: 'ECE'
      });
    assert.equal(reg1.status, 201);

    // Same email
    const reg2 = await request(app)
      .post('/api/register')
      .send({
        name: 'Second User',
        email: 'duplicate@sves.org.in',
        rollNumber: '22A81A0102',
        department: 'ECE'
      });
    assert.equal(reg2.status, 400);
    assert.ok(reg2.body.error.includes('already registered'));

    // Same roll number
    const reg3 = await request(app)
      .post('/api/register')
      .send({
        name: 'Third User',
        email: 'other@sves.org.in',
        rollNumber: '22A81A0101',
        department: 'ECE'
      });
    assert.equal(reg3.status, 400);
    assert.ok(reg3.body.error.includes('already registered'));
  });

  it('TEST 4 — Organizer Check-In (Valid Ticket)', async () => {
    const reg = await request(app)
      .post('/api/register')
      .send({
        name: 'Checkin Candidate',
        email: 'checkin@sves.org.in',
        rollNumber: '22A81A0202',
        department: 'EEE'
      });

    const ticketId = reg.body.attendee.ticketId;

    const checkinRes = await request(app)
      .post('/api/checkin')
      .send({ ticketId });

    assert.equal(checkinRes.status, 200);
    assert.equal(checkinRes.body.attendee.checkedIn, true);
    assert.ok(checkinRes.body.attendee.checkedInAt);
  });

  it('TEST 5 — Duplicate Check-In Prevention (409 Conflict)', async () => {
    const reg = await request(app)
      .post('/api/register')
      .send({
        name: 'Double Checkin',
        email: 'double@sves.org.in',
        rollNumber: '22A81A0303',
        department: 'IT'
      });

    const ticketId = reg.body.attendee.ticketId;

    // First check-in: Success
    const firstCheckin = await request(app).post('/api/checkin').send({ ticketId });
    assert.equal(firstCheckin.status, 200);

    // Second check-in: Conflict
    const secondCheckin = await request(app).post('/api/checkin').send({ ticketId });
    assert.equal(secondCheckin.status, 409);
    assert.equal(secondCheckin.body.alreadyCheckedIn, true);
    assert.ok(secondCheckin.body.message.includes('Duplicate Check-in Alert'));
  });

  it('TEST 6 — Invalid Ticket Check-In (404 Not Found)', async () => {
    const res = await request(app)
      .post('/api/checkin')
      .send({ ticketId: 'NON-EXISTENT-TICKET-9999' });

    assert.equal(res.status, 404);
    assert.ok(res.body.message.includes('not found'));
  });

  it('TEST 7 — Live Attendance Metrics Verification', async () => {
    // Register 2 attendees
    const reg1 = await request(app).post('/api/register').send({
      name: 'User One',
      email: 'u1@sves.org.in',
      rollNumber: '22A81A0401',
      department: 'CSE'
    });
    const reg2 = await request(app).post('/api/register').send({
      name: 'User Two',
      email: 'u2@sves.org.in',
      rollNumber: '22A81A0402',
      department: 'ECE'
    });

    // Check in 1 of them
    await request(app).post('/api/checkin').send({ ticketId: reg1.body.attendee.ticketId });

    const metricsRes = await request(app).get('/api/metrics');
    assert.equal(metricsRes.status, 200);

    const m = metricsRes.body.metrics;
    assert.equal(m.totalRegistered, 2);
    assert.equal(m.totalCheckedIn, 1);
    assert.equal(m.checkInPercentage, 50);
    assert.equal(m.departmentBreakdown['CSE'], 1);
    assert.equal(m.departmentBreakdown['ECE'], 1);
    assert.equal(m.recentCheckIns.length, 1);
  });

  it('TEST 8 — Dynamic Personalized SVG Social Badge Generation', async () => {
    const reg = await request(app).post('/api/register').send({
      name: 'Badge User',
      email: 'badge@sves.org.in',
      rollNumber: '22A81A0505',
      department: 'AI & Data Science'
    });
    const ticketId = reg.body.attendee.ticketId;

    const badgeRes = await request(app).get(`/api/badge/${ticketId}?theme=dark&role=Speaker`);
    assert.equal(badgeRes.status, 200);
    assert.equal(badgeRes.headers['content-type'], 'image/svg+xml; charset=utf-8');

    const svgContent = badgeRes.text || (badgeRes.body ? badgeRes.body.toString('utf-8') : '');
    assert.ok(svgContent.includes('<svg'));
    assert.ok(svgContent.includes('Badge User'));
    assert.ok(svgContent.includes('AI &amp; Data Science') || svgContent.includes('AI & Data Science'));
    assert.ok(svgContent.includes(ticketId));
    assert.ok(svgContent.includes('Speaker'));
  });
});
