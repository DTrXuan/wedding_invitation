export interface RSVPSubmission {
  id: string;
  name: string;
  phone: string;
  attendance: 'yes' | 'no' | 'maybe';
  guestCount: number;
  side: 'bride' | 'groom' | 'both';
  wishes: string;
  dietaryNotes: string;
  createdAt: any; // Timestamp or ISO string
  respondedAt?: string; // Pretty display string
}

export interface WeddingCoupleInfo {
  name: string;
  shortName: string;
  avatar: string;
  father: string;
  mother: string;
  description: string;
  birthdate: string;
  bankName: string;
  bankAccount: string;
  bankBranch: string;
  qrCodeUrl: string;
}

export interface WeddingEventDetails {
  title: string; // Lễ Vu Quy / Lễ Thành Hôn
  side: 'bride' | 'groom';
  time: string; // "11:30 - Thứ Bảy, 31/10/2026"
  dateTimestamp: number; // For countdown
  address: string;
  venueName: string;
  mapEmbedUrl: string;
  mapDirectionsUrl: string;
}

export interface SongTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  fallbackUrl?: string;
}

export interface ScheduleItem {
  id: string;
  time: string; // e.g. "08:30"
  title: string;
  desc: string;
  location?: string;
  icon?: string; // lucide icon name
  status: 'upcoming' | 'ongoing' | 'completed';
  eventType?: 'ceremony' | 'reception';
}

export interface WishSubmission {
  id: string;
  name: string;
  wishes: string;
  createdAt: any; // Timestamp or ISO string
}

export interface ViewSubmission {
  id: string;
  guestName: string;
  userAgent: string;
  clickedAt: any; // Timestamp or ISO string
}


