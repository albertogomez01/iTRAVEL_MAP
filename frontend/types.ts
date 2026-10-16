export interface POI {
  name: string;
  category: 'Monument' | 'Restaurant' | 'Nature' | 'Museum' | 'Other';
  description: string;
  tips: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
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
  rating?: number;
  pricePerNight?: number;
  totalPrice?: number;
  bookingUrl?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface MapTarget {
  id?: string;
  lat: number;
  lng: number;
  label?: string;
  zoom?: number;
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
  originCoordinates?: {
    lat: number;
    lng: number;
  };
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
  destinationLocation?: string;
  preferNightTrains: boolean;
  budgetLevel: 'Budget' | 'Standard' | 'Luxury';
  pace: 'Relaxed' | 'Moderate' | 'Fast';
  startDate?: string;
  endDate?: string;
  isFlexibleDates?: boolean;
  flexibleRangeStart?: string;
  flexibleRangeEnd?: string;
  flexibleDurationDays?: number;
  maxBudget: number;
  tripType?: 'RoundTrip' | 'OneWay';
  passengers?: number;
}

export interface FlightDeal {
  id: string;
  origin: string;
  originIata: string;
  destination: string;
  destinationIata: string;
  departureDate: string;
  returnDate: string;
  departureTime: string;
  arrivalTime: string;
  returnDepartureTime: string;
  returnArrivalTime: string;
  airline: string;
  flightNumberOut?: string;
  flightNumberReturn?: string;
  pricePerPerson: number;
  totalPrice: number;
  durationHours: string;
  isDirect: boolean;
  bookingUrl: string;
}

export interface HotelDeal {
  id: string;
  name: string;
  city: string;
  rating: number; // e.g. 7.0 - 10.0 (strictly >= 7.0)
  reviewScoreWord?: string; // e.g. "Excelente", "Muy bueno"
  stars?: number;
  pricePerNight: number;
  totalPrice: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  bookingUrl: string;
  amenities?: string[];
  imageUrl?: string;
}

export interface FlexibleDealSearchResult {
  origin: string;
  destination: string;
  durationDays: number;
  dateRangeStart: string;
  dateRangeEnd: string;
  winningFlight: FlightDeal;
  evaluatedFlights: FlightDeal[];
  winningHotels: HotelDeal[];
  summary: string;
}

