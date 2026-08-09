export interface POI {
  name: string;
  category: 'Monument' | 'Restaurant' | 'Nature' | 'Museum' | 'Other';
  description: string;
  tips: string;
}

export interface Transport {
  mode: 'Train' | 'Bus' | 'Flight' | 'Ferry' | 'Walk';
  provider?: string;
  from: string;
  to: string;
  duration?: string;
  requiresReservation: boolean;
  notes?: string;
}

export interface Accommodation {
  type: 'Hotel' | 'Hostel' | 'Night Train' | 'Night Bus';
  name: string;
  location: string;
  notes?: string;
}

export interface DayPlan {
  dayNumber: number;
  location: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  theme?: string;
  transport: Transport[];
  accommodation?: Accommodation;
  pois: POI[];
}

export interface BookingLink {
  name: string;
  url: string;
  type: 'Transport' | 'Accommodation' | 'Activity' | 'Other';
}

export interface ItineraryOption {
  id: string;
  title: string;
  summary: string;
  totalDuration: string;
  estimatedBudget: string;
  bookingLinks: BookingLink[];
  days: DayPlan[];
}

export interface TripPlan {
  origin: string;
  options: ItineraryOption[];
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  groundingChunks?: GroundingChunk[];
  isError?: boolean;
}

export interface UserPreferences {
  originLocation?: string;
  preferNightTrains: boolean;
  budgetLevel: 'Budget' | 'Standard' | 'Luxury';
  pace: 'Relaxed' | 'Moderate' | 'Fast';
  startDate?: string;
  endDate?: string;
  maxBudget: number;
}
