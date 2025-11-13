// types/analytics.ts

export interface TimeSeriesPoint {
  date: string;            // ISO date
  value: number;
}

export interface AttendanceTrend {
  programType?: string;
  points: TimeSeriesPoint[];
}

export interface GuestConversionStats {
  totalFirstTimeGuests: number;
  returningGuests: number;
  regularGuests: number;
  promotedToMembers: number;
}

export interface EngagementBreakdown {
  memberRatingCounts: Record<string, number>;  // key: MemberRating
  guestTypeCounts: Record<string, number>;     // key: GuestType
}

export interface AnalyticsSnapshot {
  generatedAt: string;     // ISO
  attendanceTrends: AttendanceTrend[];
  guestConversion: GuestConversionStats;
  engagement: EngagementBreakdown;
}
