export type CorporatePortalRole = 'employee' | 'travel_coordinator' | 'manager';
export type CorporatePortalTheme = 'dark' | 'light';
export type CorporateRequestFilter = 'all' | 'active' | 'booked' | 'documents';
export type CorporateApprovalFilter = 'all' | 'travelNeed' | 'finalCost';

export type CorporateServiceType = 'Flight' | 'Hotel' | 'Transfer' | 'Visa support';
export type CorporateInvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'paid' | 'void' | 'overdue';
export type CorporatePaymentStatus = 'pending' | 'received' | 'reconciled' | 'failed' | 'refunded';
export type CorporatePaymentMethod = 'bank_transfer' | 'card' | 'cash' | 'other';

export type CorporateTripStatus =
  | 'Pending approval'
  | 'Approved'
  | 'Quote ready'
  | 'Final approval'
  | 'Booked'
  | 'Rejected'
  | 'Needs documents'
  | 'Completed';

export type CorporateTimelineType = 'done' | 'pending' | 'alert';

export type CorporateTravelerReadiness = {
  passport: 'OK' | 'Missing';
  visa: 'OK' | 'Required' | 'N/A';
};

export type CorporateTraveler = {
  id: string;
  name: string;
  department: string;
  email: string;
  phone: string;
  readiness: CorporateTravelerReadiness;
};

export type CorporateTravelerProfile = {
  id: string | number;
  name: string;
  department: string;
  email: string;
  phone: string;
  nationality: string;
  passportNumber?: string;
  passportExpiry?: string | null;
  passportStatus: 'OK' | 'Missing' | 'Expired';
  visaStatus: 'OK' | 'Required' | 'N/A' | 'Pending';
  notes?: string;
  isActive: boolean;
  tripCount: number;
  nextTripId?: string;
  nextTripLabel?: string;
  nextTripDate?: string;
  readiness: CorporateTravelerReadiness;
};

export type CorporateTravelerProfileInput = {
  name: string;
  department: string;
  email: string;
  phone: string;
  nationality: string;
  passportNumber?: string;
  passportExpiry?: string | null;
  passportStatus: 'OK' | 'Missing' | 'Expired';
  visaStatus: 'OK' | 'Required' | 'N/A' | 'Pending';
  notes?: string;
  isActive: boolean;
};

export type CorporateCostBand = {
  key: 'lt1k' | '1k_5k' | 'gt5k';
  label: string;
  approval: string;
  estimate: number;
};

export type CorporateApprovalState = {
  stage: 'Travel need' | 'Final cost';
  approver: string;
  status: 'Pending' | 'Approved' | 'Rejected';
};

export type CorporateApprovalStage = CorporateApprovalState['stage'];

export type CorporateTimelineEvent = {
  id: string;
  title: string;
  meta: string;
  time: string;
  type: CorporateTimelineType;
};

export type CorporateTripRequest = {
  id: string;
  requestedBy: string;
  requesterRole: CorporatePortalRole;
  department: string;
  route: string;
  origin: string;
  destination: string;
  travelDate: string;
  travelers: CorporateTraveler[];
  status: CorporateTripStatus;
  services: CorporateServiceType[];
  purpose: string;
  budgetBand: CorporateCostBand['key'];
  quotedCost?: number;
  finalCost?: number;
  invoice?: CorporateTripInvoice | null;
  payments: CorporateTripPayment[];
  approvals: CorporateApprovalState[];
  timeline: CorporateTimelineEvent[];
  internalSummary: string;
};

export type CorporatePortalStat = {
  id: 'spend' | 'travelers' | 'pendingApprovals' | 'documentAlerts';
  label: string;
  value: string;
  hint: string;
  tone: 'gold' | 'emerald' | 'sky' | 'amber';
};

export type CorporatePortalCompany = {
  id: string;
  name: string;
  descriptor: string;
};

export type CorporatePortalUser = {
  id: string;
  name: string;
  role: CorporatePortalRole;
  companyId: string;
};

export type CorporatePortalSession = {
  token: string;
  company: CorporatePortalCompany;
  user: CorporatePortalUser;
};

export type CorporateTripCreateInput = {
  department: string;
  origin: string;
  destination: string;
  departureDate: string;
  purpose: string;
  budgetBand: CorporateCostBand['key'];
  services: CorporateServiceType[];
  travelers: Array<{
    name: string;
    email: string;
    department: string;
  }>;
};

export type CorporateTripInvoice = {
  id: string;
  tripRequestId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: CorporateInvoiceStatus;
  issuedAt: string | null;
  dueDate: string;
  paidAt: string | null;
  notes: string;
  issuedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type CorporateTripPayment = {
  id: string;
  invoiceId: string;
  amount: number;
  currency: string;
  paymentMethod: CorporatePaymentMethod;
  status: CorporatePaymentStatus;
  reference: string;
  receivedAt: string | null;
  notes: string;
  recordedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type CorporateBillingSummary = {
  companyId: string;
  companyName: string;
  invoiceCount: number;
  sentCount: number;
  overdueCount: number;
  partiallyPaidCount: number;
  paidCount: number;
  totalInvoiced: number;
  totalCollected: number;
  outstandingBalance: number;
  currency: string;
};
