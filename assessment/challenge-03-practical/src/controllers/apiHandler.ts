// apiHandler.ts - Controller for Next.js API Routes & Server Actions
import { RegistrationService } from '../services/registrationService';
import { CheckInService } from '../services/checkInService';
import { DashboardService } from '../services/dashboardService';
import { globalRepository } from '../lib/db';
import { RegistrationInput } from '../models/types';

export class EventHubController {
  private regService = new RegistrationService(globalRepository);
  private checkInService = new CheckInService(globalRepository);
  private dashboardService = new DashboardService(globalRepository);

  public register(input: RegistrationInput) {
    return this.regService.register(input);
  }

  public getTicket(ticketId: string) {
    return globalRepository.getTicket(ticketId);
  }

  public checkIn(ticketOrQR: string, scannedBy?: string, deviceInfo?: string) {
    return this.checkInService.checkIn(ticketOrQR, scannedBy, deviceInfo);
  }

  public getDashboardMetrics() {
    return this.dashboardService.getMetrics();
  }
}

export const eventHubController = new EventHubController();
