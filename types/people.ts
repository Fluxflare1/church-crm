// types/people.ts

export type PersonCategory = 'guest' | 'member';

export type GuestType = 'first-time' | 'returning' | 'regular';

export type MemberRating = 'regular' | 'adherent' | 'returning' | 'visiting';

export type Sex = 'male' | 'female' | 'other' | 'unspecified';

export type AgeCategory =
  | 'child'
  | 'teen'
  | 'youth'
  | 'adult'
  | 'senior'
  | 'unspecified';

export type ReferralSource =
  | 'walk-in'
  | 'invited'
  | 'facebook'
  | 'youtube'
  | 'referral'
  | 'flyer'
  | 'whatsapp-status'
  | 'other';

export interface GuestInterests {
  makeChurchHome: boolean;
  joinWorkforce: boolean;
  baptismalClass: boolean;
}

export interface PersonalData {
  firstName: string;
  lastName: string;
  phone: string;
  sex: Sex;
  ageCategory: AgeCategory;
  email?: string;
  dateOfBirth?: string;         // ISO; used for birthday
  address?: string;
  city?: string;
  country?: string;
}

export interface GuestData {
  referralSource: ReferralSource;
  referralName?: string;
  firstVisitDate: string;       // ISO
  interests: GuestInterests;
}

export type MembershipStatus = 'active' | 'inactive' | 'transferred' | 'suspended';

export interface MemberData {
  membershipDate: string;       // ISO
  membershipStatus: MembershipStatus;
  membershipNumber?: string;
}

export interface RatingHistoryEntry {
  date: string;                 // ISO
  rating: MemberRating;
  attendancePercentage: number;
}

export interface AttendanceHistoryEntry {
  programId: string;
  date: string;                 // ISO
  status: 'present' | 'absent';
}

export interface PersonEvolution {
  guestType?: GuestType;        // only applies if category = 'guest'
  visitCount: number;
  totalVisits: number;
  firstVisitDate?: string;      // ISO
  lastVisitDate?: string;       // ISO
  currentStreak: number;
  longestStreak: number;
  memberRating?: MemberRating;  // applies when category = 'member'
  ratingHistory: RatingHistoryEntry[];
  attendanceHistory: AttendanceHistoryEntry[];
  readyForPromotion: boolean;   // guest eligible to become member
}

export interface PersonAssignment {
  primaryRmUserId?: string;
  secondaryRmUserIds?: string[];
  groupId?: string;             // small group / cell id
}

export interface EngagementFlags {
  isWorker: boolean;
  receivesBroadcasts: boolean;
  doNotContact: boolean;
}

export interface Person {
  id: string;
  category: PersonCategory;
  personalData: PersonalData;
  guestData?: GuestData;
  memberData?: MemberData;
  evolution: PersonEvolution;
  assignment: PersonAssignment;
  engagement: EngagementFlags;
  tags: string[];
  createdAt: string;            // ISO
  updatedAt: string;            // ISO
}
