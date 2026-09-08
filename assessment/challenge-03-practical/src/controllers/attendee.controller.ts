import { Request, Response } from 'express';
import { defaultStore } from '../services/store.service.js';
import { BadgeService } from '../services/badge.service.js';
import { RegisterRequest } from '../models/types.js';

export class AttendeeController {
  public static register(req: Request, res: Response): void {
    const payload: RegisterRequest = req.body;
    const result = defaultStore.register(payload);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(201).json({
      message: 'Registration successful!',
      attendee: result.attendee
    });
  }

  public static list(req: Request, res: Response): void {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const department = typeof req.query.department === 'string' ? req.query.department : undefined;

    const attendees = defaultStore.getAllAttendees(search, department);
    res.json({
      total: attendees.length,
      attendees
    });
  }

  public static getByTicket(req: Request, res: Response): void {
    const ticketId = req.params.ticketId;
    const attendee = defaultStore.getAttendeeByTicketId(ticketId);

    if (!attendee) {
      res.status(404).json({ error: `Ticket ${ticketId} not found` });
      return;
    }

    res.json({ attendee });
  }

  public static getBadgeSvg(req: Request, res: Response): void {
    const ticketId = req.params.ticketId;
    const theme = (req.query.theme as any) || 'google';
    const role = (req.query.role as any) || undefined;

    const attendee = defaultStore.getAttendeeByTicketId(ticketId);
    if (!attendee) {
      res.status(404).json({ error: `Ticket ${ticketId} not found` });
      return;
    }

    const svg = BadgeService.generateSvgBadge(attendee, { theme, role });
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Content-Disposition', `inline; filename="GDG_Badge_${attendee.ticketId}.svg"`);
    res.send(svg);
  }
}
