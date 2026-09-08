import { Router } from 'express';
import { AttendeeController } from '../controllers/attendee.controller.js';
import { CheckInController } from '../controllers/checkin.controller.js';

const router = Router();

// Attendee & Registration Endpoints
router.post('/register', AttendeeController.register);
router.get('/attendees', AttendeeController.list);
router.get('/attendees/:ticketId', AttendeeController.getByTicket);
router.get('/badge/:ticketId', AttendeeController.getBadgeSvg);

// Check-in & Organizer Scanner Endpoints
router.post('/checkin', CheckInController.checkIn);
router.get('/metrics', CheckInController.getMetrics);

export default router;
