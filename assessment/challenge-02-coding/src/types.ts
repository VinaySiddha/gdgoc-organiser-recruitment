export interface Session {
  id: string;
  title: string;
  speakerId: string;
  durationMinutes: number;
  expectedAttendees: number;
  prerequisites?: string[];
  popularityScore: number;
  tags?: string[];
}

export interface TimeWindow {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  availableWindows: TimeWindow[];
}

export interface SchedulerConfig {
  bufferMinutes?: number;
}

export interface ScheduledSession {
  sessionId: string;
  roomId: string;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
}

export type UnscheduledReason =
  | 'SPEAKER_CONFLICT'
  | 'INSUFFICIENT_CAPACITY'
  | 'INSUFFICIENT_TIME'
  | 'CIRCULAR_PREREQUISITE'
  | 'INVALID_DATA';

export interface UnscheduledSession {
  sessionId: string;
  reason: UnscheduledReason;
  details?: string;
}

export interface ScheduleMetrics {
  totalSessions: number;
  scheduledCount: number;
  unscheduledCount: number;
  totalSpeakerCount: number;
  roomUtilizationPercentage: number;
}

export interface ScheduleOutput {
  scheduled: ScheduledSession[];
  unscheduled: UnscheduledSession[];
  metrics: ScheduleMetrics;
}
