export type CorporatePortalRole = 'employee' | 'travel_coordinator' | 'manager';
export type CorporatePortalTheme = 'dark' | 'light';
export type CorporateRequestFilter = 'all' | 'active' | 'booked' | 'documents';
export type CorporateApprovalFilter = 'all' | 'travelNeed' | 'finalCost';

export type CorporateServiceType = 'Flight' | 'Hotel' | 'Transfer' | 'Visa support';
export type CorporateInvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'paid' | 'void' | 'overdue';
export type CorporatePaymentStatus = 'pending' | 'received' | 'reconciled' | 'failed' | 'refunded';
export type CorporatePaymentMethod = 'bank_transfer' | 'card' | 'cash' | 'other';
export type CorporateQuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
export type CorporateBookingStatus = 'pending' | 'confirmed' | 'ticketed' | 'cancelled' | 'completed';
export type CorporateTaskStatus = 'open' | 'in_progress' | 'done' | 'blocked';
export type CorporateTaskPriority = 'low' | 'medium' | 'high';
export type CorporateVisibility = 'shared' | 'internal_only';
export type CorporateDocumentType = 'passport' | 'visa' | 'itinerary' | 'approval' | 'invoice' | 'other';
export type CorporateDocumentStatus = 'missing' | 'requested' | 'received' | 'verified' | 'issued';
export type CorporateMessageSenderType = 'dpm' | 'company' | 'system';

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
  canApprove?: boolean;
  blocker?: string;
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
  quote?: CorporateTripQuote | null;
  booking?: CorporateTripBooking | null;
  invoice?: CorporateTripInvoice | null;
  payments: CorporateTripPayment[];
  tasks?: CorporateTripTask[];
  documents?: CorporateTripDocument[];
  messages?: CorporateTripMessage[];
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
  accountCode: string;
  descriptor: string;
};

export type CorporateCompanyAccountStatus = 'active' | 'inactive' | 'prospect';
export type CorporateCompanyServiceLevel = 'classic' | 'corporate' | 'prestige_corporate';

export type CorporateCompanyAccount = {
  id: string;
  name: string;
  accountCode: string;
  legalName: string;
  industry: string;
  country: string;
  billingEmail: string;
  defaultCurrency: string;
  serviceLevel: CorporateCompanyServiceLevel;
  status: CorporateCompanyAccountStatus;
  notes: string;
  userCount: number;
  requestCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CorporateCompanyAccountInput = {
  name: string;
  accountCode: string;
  legalName: string;
  industry: string;
  country: string;
  billingEmail: string;
  defaultCurrency: string;
  serviceLevel: CorporateCompanyServiceLevel;
  status: CorporateCompanyAccountStatus;
  notes: string;
};

export type CorporatePortalUser = {
  id: string;
  name: string;
  role: CorporatePortalRole;
  companyId: string;
};

export type CorporateCompanyUserRole = 'employee' | 'travel_coordinator' | 'manager' | 'finance_approver' | 'company_admin';

export type CorporateCompanyUserAccount = {
  id: string;
  companyId: string;
  companyName: string;
  companyCode: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: CorporateCompanyUserRole;
  accessRoles: CorporateCompanyUserRole[];
  department: string;
  jobTitle: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
};

export type CorporateCompanyUserInput = {
  companyId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: CorporateCompanyUserRole;
  accessRoles: CorporateCompanyUserRole[];
  department: string;
  jobTitle: string;
  phone: string;
  isActive: boolean;
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

export type CorporateTripQuoteInput = {
  amount: string;
  currency: string;
  validUntil?: string | null;
  notes: string;
  status: CorporateQuoteStatus;
};

export type CorporateTripBookingInput = {
  bookingReference: string;
  supplierSummary: string;
  totalCost?: string | null;
  currency: string;
  status: CorporateBookingStatus;
  bookedAt?: string | null;
};

export type CorporateTripInvoiceInput = {
  amount: string;
  currency: string;
  status: CorporateInvoiceStatus;
  issuedAt?: string | null;
  dueDate?: string | null;
  notes: string;
};

export type CorporateTripPaymentInput = {
  amount: string;
  currency: string;
  paymentMethod: CorporatePaymentMethod;
  status: CorporatePaymentStatus;
  reference: string;
  receivedAt?: string | null;
  notes: string;
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

export type CorporateTripQuote = {
  id: string;
  tripRequestId: string;
  amount: number;
  currency: string;
  validUntil: string;
  notes: string;
  status: CorporateQuoteStatus;
  preparedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type CorporateTripBooking = {
  id: string;
  tripRequestId: string;
  bookingReference: string;
  supplierSummary: string;
  totalCost: number | null;
  currency: string;
  status: CorporateBookingStatus;
  bookedAt: string | null;
  bookedBy: string;
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

export type CorporateTripTask = {
  id: string;
  title: string;
  description: string;
  status: CorporateTaskStatus;
  priority: CorporateTaskPriority;
  visibility: CorporateVisibility;
  dueDate: string;
  owner: string;
  updatedAt: string;
};

export type CorporateTripDocument = {
  id: string;
  title: string;
  documentType: CorporateDocumentType;
  status: CorporateDocumentStatus;
  visibility: CorporateVisibility;
  fileUrl: string;
  notes: string;
  traveler: { id: string; name: string } | null;
  updatedAt: string;
};

export type CorporateTripDocumentInput = {
  title: string;
  documentType: CorporateDocumentType;
  status: CorporateDocumentStatus;
  visibility: CorporateVisibility;
  fileUrl: string;
  notes: string;
  travelerId?: string | null;
};

export type CorporateTripMessage = {
  id: string;
  senderType: CorporateMessageSenderType;
  visibility: CorporateVisibility;
  body: string;
  sender: string;
  createdAt: string;
};

export type CorporateTripMessageInput = {
  body: string;
  visibility: CorporateVisibility;
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
