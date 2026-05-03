export type Page = 'home' | 'luxury' | 'corporate' | 'crm' | 'corporatePortal';
export type PrestigePage = Extract<Page, 'luxury' | 'corporate'>;
export type InquiryKind = 'classic' | 'luxury' | 'corporate';
export type LeadStatus = 'new' | 'contacted' | 'planning' | 'proposal' | 'won' | 'execution' | 'completed' | 'lost';
export type LeadLifecycleStage =
  | 'new_request'
  | 'pending_information'
  | 'validated'
  | 'quote_in_progress'
  | 'quote_sent'
  | 'awaiting_approval'
  | 'approved'
  | 'awaiting_payment_finance'
  | 'booking_in_progress'
  | 'confirmed'
  | 'travel_pack_sent'
  | 'in_travel'
  | 'completed'
  | 'closed';
export type LeadEmailStatus = 'pending' | 'sent' | 'failed';
export type LeadPriority = 'low' | 'normal' | 'high' | 'urgent';
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'revision_requested' | 'rejected' | 'expired';
export type QuoteLineCategory = 'flight' | 'hotel' | 'transfer' | 'visa' | 'activity' | 'insurance' | 'service_fee' | 'other';
export type QuoteLineStatus = 'research' | 'quoted' | 'held' | 'confirmed' | 'unavailable';
export type QuoteApprovalDecision = 'pending' | 'approved' | 'changes_requested' | 'rejected';
export type ItineraryStatus = 'draft' | 'proposed' | 'confirmed' | 'in_travel' | 'completed';
export type ItineraryStopPurpose = 'leisure' | 'business' | 'transit' | 'event' | 'extension';
export type AccommodationType = 'hotel' | 'resort' | 'lodge' | 'villa' | 'apartment' | 'camp' | 'cruise' | 'other';
export type ItineraryBookingStatus = 'draft' | 'quoted' | 'held' | 'confirmed' | 'cancelled';
export type TransportMode = 'flight' | 'train' | 'car' | 'ferry' | 'transfer' | 'other';
export type CrmRole = 'admin' | 'manager' | 'agent' | 'client' | 'viewer' | 'none';

export type CrmUser = {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_staff?: boolean;
  role: CrmRole;
  canAccessCrm: boolean;
  canManageClients: boolean;
  canManageUsers: boolean;
};

export type CrmSession = {
  token: string;
  user: CrmUser;
};

export type CrmManagedUser = CrmUser & {
  isActive: boolean;
  groups: string[];
  displayName: string;
  date_joined?: string;
  last_login?: string | null;
};

export type CrmClient = {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  clientType: 'private' | 'corporate';
  companyName: string;
  email: string;
  phone: string;
  preferredContact: string;
  serviceLevel: InquiryKind;
  owner: string;
  notes: string;
  lastRequestAt: string;
  activeRequestCount: number;
};

export type CrmLead = {
  id: string;
  createdAt: string;
  updatedAt: string;
  service: string;
  serviceKey: InquiryKind;
  name: string;
  contact: string;
  email: string;
  whatsapp: string;
  preferredContact: string;
  requestedServices: string;
  tripType: string;
  departureCity: string;
  destination: string;
  dates: string;
  travelers: string;
  budget: string;
  urgency: string;
  priority: LeadPriority;
  notes: string;
  status: LeadStatus;
  lifecycleStage?: LeadLifecycleStage;
  emailStatus: LeadEmailStatus;
  internalNotes: string;
  clientId?: string | null;
  clientName?: string;
};

export type CrmQuoteLine = {
  id: string;
  createdAt: string;
  updatedAt: string;
  quoteId: string;
  category: QuoteLineCategory;
  supplier: string;
  description: string;
  quantity: string;
  unitCost: string;
  unitSell: string;
  totalCost: string;
  totalSell: string;
  margin: string;
  status: QuoteLineStatus;
  confirmationReference: string;
  supplierDeadline?: string | null;
  bookingOwner: string;
  bookingNotes: string;
  confirmedAt?: string | null;
  notes: string;
};

export type CrmPaymentRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  leadId: string;
  leadName: string;
  quoteId?: string | null;
  quoteNumber?: string;
  paymentType: 'deposit' | 'balance' | 'full' | 'refund';
  status: 'pending' | 'partial' | 'paid' | 'failed' | 'refunded' | 'cancelled';
  currency: string;
  amountExpected: string;
  amountReceived: string;
  dueDate?: string | null;
  receivedAt?: string | null;
  proofReceived: boolean;
  proofReference: string;
  notes: string;
};

export type CrmCommunicationRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  leadId: string;
  leadName: string;
  quoteId?: string | null;
  quoteNumber?: string;
  kind: 'proposal' | 'payment' | 'travel_pack' | 'follow_up';
  channel: 'email' | 'whatsapp' | 'phone';
  status: 'draft' | 'ready' | 'sent' | 'failed' | 'cancelled';
  subject: string;
  message: string;
  sentBy?: number | null;
  sentByName: string;
  sentAt?: string | null;
  followUpDue?: string | null;
  responseStatus: 'none' | 'awaiting' | 'responded' | 'action_required';
  notes: string;
};

export type CrmQuoteApproval = {
  id: string;
  createdAt: string;
  updatedAt: string;
  quoteId: string;
  approverName: string;
  approverEmail: string;
  decision: QuoteApprovalDecision;
  decisionAt?: string | null;
  notes: string;
};

export type CrmQuote = {
  id: string;
  createdAt: string;
  updatedAt: string;
  leadId: string;
  leadName: string;
  quoteNumber: string;
  version: number;
  status: QuoteStatus;
  currency: string;
  subtotalCost: string;
  subtotalSell: string;
  margin: string;
  validUntil?: string | null;
  notes: string;
  sentAt?: string | null;
  acceptedAt?: string | null;
  lines: CrmQuoteLine[];
  approvals: CrmQuoteApproval[];
};

export type CrmAccommodationBlock = {
  id: string;
  createdAt: string;
  updatedAt: string;
  stopId: string;
  name: string;
  accommodationType: AccommodationType;
  roomType: string;
  boardBasis: string;
  checkIn?: string | null;
  checkOut?: string | null;
  rooms: number;
  supplier: string;
  bookingStatus: ItineraryBookingStatus;
  confirmationReference: string;
  notes: string;
};

export type CrmExperienceBlock = {
  id: string;
  createdAt: string;
  updatedAt: string;
  stopId: string;
  title: string;
  category: string;
  startAt?: string | null;
  supplier: string;
  status: ItineraryBookingStatus;
  notes: string;
};

export type CrmItineraryStop = {
  id: string;
  createdAt: string;
  updatedAt: string;
  itineraryId: string;
  sequenceNumber: number;
  city: string;
  country: string;
  arrivalDate?: string | null;
  departureDate?: string | null;
  nights: number;
  purpose: ItineraryStopPurpose;
  notes: string;
  accommodations: CrmAccommodationBlock[];
  experiences: CrmExperienceBlock[];
};

export type CrmTransportSegment = {
  id: string;
  createdAt: string;
  updatedAt: string;
  itineraryId: string;
  sequenceNumber: number;
  mode: TransportMode;
  fromCity: string;
  toCity: string;
  departureAt?: string | null;
  arrivalAt?: string | null;
  supplier: string;
  bookingStatus: ItineraryBookingStatus;
  reference: string;
  notes: string;
};

export type CrmTripItinerary = {
  id: string;
  createdAt: string;
  updatedAt: string;
  leadId: string;
  leadName: string;
  title: string;
  status: ItineraryStatus;
  startDate?: string | null;
  endDate?: string | null;
  notes: string;
  stops: CrmItineraryStop[];
  transports: CrmTransportSegment[];
};
