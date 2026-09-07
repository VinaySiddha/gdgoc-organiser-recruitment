// dashboardService.ts - Real-Time Dashboard Aggregation & CSV Export
import { DashboardMetrics } from '../models/types';
import { globalRepository, EventHubRepository } from '../lib/db';

export class DashboardService {
  constructor(private repo: EventHubRepository = globalRepository) {}

  public getMetrics(): DashboardMetrics {
    return this.repo.getMetrics();
  }
}
