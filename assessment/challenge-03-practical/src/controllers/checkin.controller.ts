import { Request, Response } from 'express';
import { defaultStore } from '../services/store.service.js';
import { CheckInRequest } from '../models/types.js';

export class CheckInController {
  public static checkIn(req: Request, res: Response): void {
    const { ticketId }: CheckInRequest = req.body;
    if (!ticketId) {
      res.status(400).json({ error: 'ticketId field is required' });
      return;
    }

    const result = defaultStore.checkIn(ticketId);

    if (result.alreadyCheckedIn) {
      res.status(409).json({
        error: 'Duplicate Check-In',
        message: result.message,
        alreadyCheckedIn: true,
        attendee: result.attendee
      });
      return;
    }

    if (!result.success) {
      res.status(404).json({
        error: 'Invalid Ticket',
        message: result.message
      });
      return;
    }

    res.status(200).json({
      message: result.message,
      attendee: result.attendee
    });
  }

  public static getMetrics(_req: Request, res: Response): void {
    const metrics = defaultStore.getMetrics();
    res.json({ metrics });
  }
}
