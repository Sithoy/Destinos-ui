import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Briefcase,
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Inbox,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  Moon,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Settings,
  Shield,
  Sparkles,
  Sun,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  canManageClients,
  canManageUsers,
  CRM_EVENT,
  CRM_AUTH_EVENT,
  CRM_CLIENT_EVENT,
  advanceCrmWorkflow,
  cancelCrmWorkflowReminder,
  completeCrmWorkflowReminder,
  createCrmAccommodationBlockRecord,
  createCrmCommunicationRecord,
  createCrmExperienceBlockRecord,
  createCrmItineraryStopRecord,
  createCrmLeadRecord,
  createCrmPaymentRecord,
  createCrmQuoteRecord,
  createCrmQuoteLineRecord,
  createCrmClientRecord,
  createCrmTransportSegmentRecord,
  createCrmTripItineraryRecord,
  createCrmUserRecord,
  emptyClientRegistration,
  fetchCrmCurrentUser,
  fetchCrmCommunicationRecords,
  fetchCrmLeads,
  fetchCrmClients,
  fetchCrmPaymentRecords,
  fetchCrmQuotes,
  fetchCrmTripItineraries,
  fetchCrmUsers,
  fetchCrmWorkflowReminders,
  fetchCrmWorkflowState,
  generateCrmWorkflowReminders,
  hasCrmApi,
  loginCrm,
  logoutCrm,
  makeClientFromLead,
  readCrmLeads,
  readCrmSession,
  saveCrmSession,
  updateCrmLeadRecord,
  updateCrmPaymentRecord,
  updateCrmQuoteLineRecord,
  updateCrmClientRecord,
  updateCrmUserRecord,
} from '../data/crm';
import {
  createCtmTripBooking,
  createCtmTripInvoice,
  createCtmTripPayment,
  createCtmTripQuote,
  fetchCtmTripRequests,
  updateCtmTripBooking,
  updateCtmTripInvoice,
  updateCtmTripQuote,
} from '../data/ctm';
import { classicLogo } from '../data/travel';
import { BrandLockup } from '../components/ui';
import { BriefingGate, appendBriefingDecisionNote, briefingChecklistItems, briefingReadiness, type BriefingDecision } from '../modules/crm/briefing';
import type { CrmClient, CrmCommunicationRecord, CrmLead, CrmManagedUser, CrmPaymentRecord, CrmQuote, CrmQuoteLine, CrmRole, CrmSession, CrmTripItinerary, CrmWorkflowReminder, CrmWorkflowState, InquiryKind, LeadLifecycleStage, LeadPriority, LeadStatus, QuoteLineCategory, QuoteLineStatus } from '../types';
import type { CorporateBookingStatus, CorporateInvoiceStatus, CorporatePaymentMethod, CorporatePaymentStatus, CorporateQuoteStatus, CorporateTripRequest } from '../types/corporatePortal';

type LeadTypeFilter = 'all' | InquiryKind;
type StatusFilter = 'all' | LeadStatus | 'confirmedGroup' | 'workflowGroup';
type PriorityFilter = 'all' | LeadPriority | 'attention';
type CrmTheme = 'dark' | 'light';
type DetailTab =
  | 'overview'
  | 'proposal'
  | 'payments'
  | 'travelPack'
  | 'notes'
  | 'history'
  | 'travelers'
  | 'approvals'
  | 'finance'
  | 'documents'
  | 'itinerary'
  | 'brief'
  | 'research'
  | 'costing'
  | 'package'
  | 'clientReview'
  | 'payment';
type DeskView = 'all' | 'leisure' | 'corporate';
type CommandLens = 'all' | 'corporate' | 'leisure' | 'attention' | 'blocked' | 'ready';
type CrmNavId = 'command' | 'leisureStudio' | 'corporateDesk' | 'tasks' | 'calendar' | 'clients' | 'reports' | 'settings';
type ProcessTaskTone = 'urgent' | 'normal' | 'upcoming';
type CommunicationKind = 'proposal' | 'payment' | 'travel_pack' | 'follow_up';
type CommunicationChannel = 'email' | 'whatsapp' | 'phone';
type CorporateDeskSignalTone = 'success' | 'warning' | 'danger' | 'info';
type CorporateDeskSignal = {
  label: string;
  value: string;
  meta: string;
  tone: CorporateDeskSignalTone;
};
type UserFormState = {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Extract<CrmRole, 'admin' | 'manager' | 'agent' | 'viewer'>;
  isActive: boolean;
  password: string;
};

type QuoteLineDraft = {
  category: QuoteLineCategory;
  supplier: string;
  description: string;
  quantity: string;
  unitCost: string;
  unitSell: string;
  status: QuoteLineStatus;
  notes: string;
};

type CorporateOutputDraft = {
  quoteAmount: string;
  quoteCurrency: string;
  quoteValidUntil: string;
  quoteStatus: CorporateQuoteStatus;
  quoteNotes: string;
  bookingReference: string;
  bookingSupplierSummary: string;
  bookingTotalCost: string;
  bookingCurrency: string;
  bookingStatus: CorporateBookingStatus;
  invoiceAmount: string;
  invoiceCurrency: string;
  invoiceStatus: CorporateInvoiceStatus;
  invoiceDueDate: string;
  invoiceNotes: string;
  paymentAmount: string;
  paymentCurrency: string;
  paymentMethod: CorporatePaymentMethod;
  paymentStatus: CorporatePaymentStatus;
  paymentReference: string;
  paymentNotes: string;
};

type TripDesignDrafts = {
  stop: {
    city: string;
    country: string;
    nights: string;
    purpose: 'leisure' | 'business' | 'transit' | 'event' | 'extension';
    arrivalDate: string;
    departureDate: string;
    notes: string;
  };
  stay: {
    stopId: string;
    name: string;
    roomType: string;
    checkIn: string;
    checkOut: string;
    rooms: string;
    supplier: string;
    bookingStatus: 'draft' | 'quoted' | 'held' | 'confirmed' | 'cancelled';
  };
  movement: {
    mode: 'flight' | 'train' | 'car' | 'ferry' | 'transfer' | 'other';
    fromCity: string;
    toCity: string;
    departureAt: string;
    arrivalAt: string;
    supplier: string;
    bookingStatus: 'draft' | 'quoted' | 'held' | 'confirmed' | 'cancelled';
  };
  experience: {
    stopId: string;
    title: string;
    category: string;
    supplier: string;
    status: 'draft' | 'quoted' | 'held' | 'confirmed' | 'cancelled';
  };
};
type TripDesignEditor = 'stop' | 'stay' | 'movement' | 'experience' | 'notes';

type CommunicationDraft = {
  kind: CommunicationKind;
  channel: CommunicationChannel;
  message: string;
  followUpDue: string;
};

type ProcessTask = {
  title: string;
  due: string;
  tone: ProcessTaskTone;
};

type FlowProcessMap = Record<
  LeadStatus,
  {
    primaryAction: string;
    nextAction: string;
    nextStatus: LeadStatus | null;
    stageGate: string;
    taskTitles: [string, string, string];
  }
>;

type ProcessHistoryItem = {
  label: string;
  meta: string;
  tone: 'done' | 'current' | 'upcoming' | 'closed';
};

type InfoCard = {
  label: string;
  value: string;
  meta?: string;
};

type MockWorkflowItem = {
  title: string;
  value: string;
  meta: string;
};

type MockBookingRecord = {
  service: string;
  supplier: string;
  status: string;
  reference: string;
  note: string;
};

type ItineraryStop = {
  city: string;
  nights: string;
  stay: string;
  room: string;
  focus: string;
  note: string;
  dates?: string;
  status?: string;
};

type ItineraryExperience = {
  title: string;
  category: string;
  timing: string;
  note: string;
  status?: string;
};

type LeisureWorkbenchRow = {
  service: string;
  supplier: string;
  status: string;
  cost: number;
  sell: number;
};

type LeisurePackageOption = {
  name: string;
  price: number;
  fit: string;
  recommendation: string;
};

type MetricCard = {
  label: string;
  value: number;
  meta: string;
  Icon: LucideIcon;
  filter?: StatusFilter;
};

const PAGE_SIZE = 10;
const CRM_THEME_STORAGE_KEY = 'dpm.crm.theme';

const statusLabels: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Qualification',
  planning: 'Trip Design',
  proposal: 'Proposal Sent',
  won: 'Confirmed',
  execution: 'Execution',
  completed: 'Completed',
  lost: 'Cancelled',
};

const lifecycleStageLabels: Record<LeadLifecycleStage, string> = {
  new_request: 'New Request',
  pending_information: 'Pending Information',
  validated: 'Validated',
  quote_in_progress: 'Quote in Progress',
  quote_sent: 'Quote Sent',
  awaiting_approval: 'Awaiting Approval',
  approved: 'Approved',
  awaiting_payment_finance: 'Awaiting Payment / Finance',
  booking_in_progress: 'Booking in Progress',
  confirmed: 'Confirmed',
  travel_pack_sent: 'Travel Pack Sent',
  in_travel: 'In Travel',
  completed: 'Completed',
  closed: 'Closed',
};

const lifecycleStageOrder: LeadLifecycleStage[] = [
  'new_request',
  'pending_information',
  'validated',
  'quote_in_progress',
  'quote_sent',
  'awaiting_approval',
  'approved',
  'awaiting_payment_finance',
  'booking_in_progress',
  'confirmed',
  'travel_pack_sent',
  'in_travel',
  'completed',
];

const lifecycleWorkflowSteps = lifecycleStageOrder.map((stage) => [stage, lifecycleStageLabels[stage]] as const);

const statusToLifecycleStage: Record<LeadStatus, LeadLifecycleStage> = {
  new: 'new_request',
  contacted: 'pending_information',
  planning: 'quote_in_progress',
  proposal: 'quote_sent',
  won: 'awaiting_payment_finance',
  execution: 'booking_in_progress',
  completed: 'completed',
  lost: 'closed',
};

const lifecycleStageToStatus: Record<LeadLifecycleStage, LeadStatus> = {
  new_request: 'new',
  pending_information: 'contacted',
  validated: 'planning',
  quote_in_progress: 'planning',
  quote_sent: 'proposal',
  awaiting_approval: 'proposal',
  approved: 'won',
  awaiting_payment_finance: 'won',
  booking_in_progress: 'execution',
  confirmed: 'execution',
  travel_pack_sent: 'execution',
  in_travel: 'execution',
  completed: 'completed',
  closed: 'lost',
};

const priorityLabels: Record<LeadPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

const quoteStatusLabels: Record<CrmQuote['status'], string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  revision_requested: 'Revision Requested',
  rejected: 'Rejected',
  expired: 'Expired',
};

const corporateQuoteStatusLabels: Record<CorporateQuoteStatus, string> = {
  draft: 'Draft',
  sent: 'Shared with CTM',
  approved: 'Approved',
  rejected: 'Rejected',
  expired: 'Expired',
};

const corporateBookingStatusLabels: Record<CorporateBookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  ticketed: 'Ticketed',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

const corporateInvoiceStatusLabels: Record<CorporateInvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  partially_paid: 'Partially paid',
  paid: 'Paid',
  void: 'Void',
  overdue: 'Overdue',
};

const corporatePaymentStatusLabels: Record<CorporatePaymentStatus, string> = {
  pending: 'Pending',
  received: 'Received',
  reconciled: 'Reconciled',
  failed: 'Failed',
  refunded: 'Refunded',
};

const corporatePaymentMethodLabels: Record<CorporatePaymentMethod, string> = {
  bank_transfer: 'Bank transfer',
  card: 'Card',
  cash: 'Cash',
  other: 'Other',
};

const quoteApprovalLabels: Record<CrmQuote['approvals'][number]['decision'], string> = {
  pending: 'Pending',
  approved: 'Approved',
  changes_requested: 'Changes Requested',
  rejected: 'Rejected',
};

const quoteLineCategoryLabels: Record<QuoteLineCategory, string> = {
  flight: 'Flight',
  hotel: 'Hotel',
  transfer: 'Transfer',
  visa: 'Visa',
  activity: 'Activity',
  insurance: 'Insurance',
  service_fee: 'Service Fee',
  other: 'Other',
};

const quoteLineStatusLabels: Record<QuoteLineStatus, string> = {
  research: 'Research',
  quoted: 'Quoted',
  held: 'Held',
  confirmed: 'Confirmed',
  unavailable: 'Unavailable',
};

const itineraryStatusLabels: Record<CrmTripItinerary['status'], string> = {
  draft: 'Draft',
  proposed: 'Proposed',
  confirmed: 'Confirmed',
  in_travel: 'In Travel',
  completed: 'Completed',
};

const itineraryBookingStatusLabels = {
  draft: 'Draft',
  quoted: 'Quoted',
  held: 'Held',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
} as const;

const quoteLineCategories = Object.keys(quoteLineCategoryLabels) as QuoteLineCategory[];
const quoteLineStatuses = Object.keys(quoteLineStatusLabels) as QuoteLineStatus[];
const corporateQuoteStatuses = Object.keys(corporateQuoteStatusLabels) as CorporateQuoteStatus[];
const corporateBookingStatuses = Object.keys(corporateBookingStatusLabels) as CorporateBookingStatus[];
const corporateInvoiceStatuses = Object.keys(corporateInvoiceStatusLabels) as CorporateInvoiceStatus[];
const corporatePaymentStatuses = Object.keys(corporatePaymentStatusLabels) as CorporatePaymentStatus[];
const corporatePaymentMethods = Object.keys(corporatePaymentMethodLabels) as CorporatePaymentMethod[];
const communicationKindLabels: Record<CommunicationKind, string> = {
  proposal: 'Proposal',
  payment: 'Payment request',
  travel_pack: 'Travel pack',
  follow_up: 'Follow-up',
};
const communicationChannelLabels: Record<CommunicationChannel, string> = {
  email: 'Email',
  whatsapp: 'WhatsApp',
  phone: 'Phone',
};
const communicationKinds = Object.keys(communicationKindLabels) as CommunicationKind[];
const communicationChannels = Object.keys(communicationChannelLabels) as CommunicationChannel[];

const typeLabels: Record<LeadTypeFilter, string> = {
  all: 'All',
  classic: 'Classic',
  luxury: 'Luxury',
  corporate: 'Corporate',
};

const statusOrder: LeadStatus[] = ['new', 'contacted', 'planning', 'proposal', 'won', 'execution', 'completed', 'lost'];
const typeFilters = ['all', 'luxury', 'corporate', 'classic'] as LeadTypeFilter[];

const traditionalWorkflowSteps = [
  ['new', 'New'],
  ['contacted', 'Discovery'],
  ['planning', 'Trip Design'],
  ['proposal', 'Proposal'],
  ['won', 'Confirmed'],
  ['execution', 'Delivery'],
  ['completed', 'Completed'],
] as const;

const corporateWorkflowSteps = [
  ['new', 'New'],
  ['contacted', 'Qualification'],
  ['planning', 'Travel Plan'],
  ['proposal', 'Proposal'],
  ['won', 'Approval Secured'],
  ['execution', 'Fulfilment'],
  ['completed', 'Completed'],
] as const;

const ownerByService: Record<InquiryKind, string> = {
  classic: 'Marta Lopes',
  luxury: 'Nadia Cossa',
  corporate: 'Carlos Mavie',
};

const serviceProcessFocus: Record<InquiryKind, string> = {
  classic: 'simple package clarity, budget fit, and practical travel options',
  luxury: 'concierge preferences, premium availability, and discreet service details',
  corporate: 'traveler list, approval flow, policy fit, and invoice structure',
};

const traditionalStatusProcess: FlowProcessMap = {
  new: {
    primaryAction: 'Qualify request',
    nextAction: 'Confirm client intent, dates, budget, and service expectations.',
    nextStatus: 'contacted',
    stageGate: 'Move to Qualification when the request is real enough to invest planning time.',
    taskTitles: ['Call or WhatsApp client', 'Validate dates and destination', 'Confirm budget range'],
  },
  contacted: {
    primaryAction: 'Start trip design',
    nextAction: 'Turn the qualified request into a small set of viable travel options.',
    nextStatus: 'planning',
    stageGate: 'Move to Trip Design when constraints and decision makers are clear.',
    taskTitles: ['Capture missing requirements', 'Check travel constraints', 'Assign supplier research'],
  },
  planning: {
    primaryAction: 'Prepare proposal',
    nextAction: 'Build the itinerary, pricing logic, supplier holds, and recommendation notes.',
    nextStatus: 'proposal',
    stageGate: 'Move to Proposal Sent only when the offer is complete enough for client approval.',
    taskTitles: ['Compare supplier options', 'Draft itinerary and quote', 'Check service inclusions'],
  },
  proposal: {
    primaryAction: 'Follow up approval',
    nextAction: 'Track client approval, payment conditions, and expiring fare or room holds.',
    nextStatus: 'won',
    stageGate: 'Move to Confirmed after client approval and payment conditions are satisfied.',
    taskTitles: ['Follow up proposal', 'Extend critical holds', 'Clarify approval blockers'],
  },
  won: {
    primaryAction: 'Launch execution',
    nextAction: 'Convert approval into bookings, documents, and operational ownership.',
    nextStatus: 'execution',
    stageGate: 'Move to Execution when core bookings and payment conditions are controlled.',
    taskTitles: ['Confirm bookings', 'Prepare invoice or payment record', 'Create service checklist'],
  },
  execution: {
    primaryAction: 'Complete trip',
    nextAction: 'Deliver documents, concierge notes, reminders, and active travel support.',
    nextStatus: 'completed',
    stageGate: 'Move to Completed when the trip is delivered and follow-up is ready.',
    taskTitles: ['Send final travel pack', 'Confirm special requests', 'Schedule travel-day support'],
  },
  completed: {
    primaryAction: 'Review relationship',
    nextAction: 'Capture feedback, repeat preferences, and future opportunity signals.',
    nextStatus: null,
    stageGate: 'Keep completed trips as relationship intelligence for future sales.',
    taskTitles: ['Request feedback', 'Log preferences', 'Create future follow-up cue'],
  },
  lost: {
    primaryAction: 'Reopen request',
    nextAction: 'Record cancellation reason and decide whether this lead should be nurtured later.',
    nextStatus: 'new',
    stageGate: 'Closed requests should explain why the opportunity stopped.',
    taskTitles: ['Record loss reason', 'Tag future interest', 'Schedule nurture follow-up'],
  },
};

const corporateStatusProcess: FlowProcessMap = {
  new: {
    primaryAction: 'Qualify account need',
    nextAction: 'Confirm traveler count, route, timing, and whether policy or invoice constraints already exist.',
    nextStatus: 'contacted',
    stageGate: 'Move to Qualification when the company need is real and the coordinating contact is confirmed.',
    taskTitles: ['Confirm company requester', 'Capture traveler scope', 'Check policy or billing requirements'],
  },
  contacted: {
    primaryAction: 'Build travel brief',
    nextAction: 'Capture traveler list shape, approval owner, flexibility, and the operational constraints that affect quoting.',
    nextStatus: 'planning',
    stageGate: 'Move to Travel Plan when DPM can prepare options against a stable company brief.',
    taskTitles: ['Confirm traveler matrix', 'Validate approval owner', 'Clarify fare and hotel policy'],
  },
  planning: {
    primaryAction: 'Prepare proposal',
    nextAction: 'Turn the movement brief into pricing, routing logic, service scope, and approval-ready commercial notes.',
    nextStatus: 'proposal',
    stageGate: 'Move to Proposal when pricing, policy fit, and operational assumptions are clear enough for company review.',
    taskTitles: ['Build traveler option set', 'Draft approval-ready proposal', 'Check invoicing structure'],
  },
  proposal: {
    primaryAction: 'Follow up approval',
    nextAction: 'Track company approval, traveler changes, expiring fares, and internal finance dependencies before locking travel.',
    nextStatus: 'won',
    stageGate: 'Move to Approval Secured when the company signs off the proposal and commercial conditions are controlled.',
    taskTitles: ['Follow up approver', 'Track traveler changes', 'Protect time-sensitive holds'],
  },
  won: {
    primaryAction: 'Launch fulfilment',
    nextAction: 'Convert approval into bookings, traveler documentation, invoicing, and coordinated operational ownership.',
    nextStatus: 'execution',
    stageGate: 'Move to Fulfilment when travel is approved and the operating team can execute confidently.',
    taskTitles: ['Confirm booking path', 'Prepare invoice record', 'Lock traveler support checklist'],
  },
  execution: {
    primaryAction: 'Close operating loop',
    nextAction: 'Deliver travel packs, support active movement, and keep the company informed across traveler changes.',
    nextStatus: 'completed',
    stageGate: 'Move to Completed when the movement is delivered and the account notes are updated for future travel.',
    taskTitles: ['Deliver final movement pack', 'Support active travelers', 'Capture post-trip account notes'],
  },
  completed: {
    primaryAction: 'Review account delivery',
    nextAction: 'Capture service feedback, repeat routes, and policy learnings for the next corporate movement.',
    nextStatus: null,
    stageGate: 'Keep completed corporate trips as account intelligence for future requests.',
    taskTitles: ['Request account feedback', 'Log repeat route patterns', 'Prepare next-travel follow-up'],
  },
  lost: {
    primaryAction: 'Reopen request',
    nextAction: 'Record why the company movement stopped and whether the account should be nurtured later.',
    nextStatus: 'new',
    stageGate: 'Closed corporate requests should explain whether budget, timing, policy, or traveler readiness stopped the work.',
    taskTitles: ['Record loss reason', 'Tag account risk', 'Schedule follow-up if relevant'],
  },
};

const navItems: Array<{ id: CrmNavId; label: string; Icon: LucideIcon }> = [
  { id: 'command', label: 'Command Center', Icon: LayoutDashboard },
  { id: 'leisureStudio', label: 'Leisure Studio', Icon: Sparkles },
  { id: 'corporateDesk', label: 'Corporate Desk', Icon: Briefcase },
  { id: 'tasks', label: 'Tasks', Icon: CheckSquare },
  { id: 'calendar', label: 'Calendar', Icon: CalendarDays },
  { id: 'clients', label: 'Clients', Icon: Users },
  { id: 'reports', label: 'Reports', Icon: FileText },
  { id: 'settings', label: 'Settings', Icon: Settings },
];

const leisureWorkbenchTabs: Array<{ id: DetailTab; label: string; Icon: LucideIcon }> = [
  { id: 'brief', label: 'Brief', Icon: ClipboardCheck },
  { id: 'itinerary', label: 'Trip Design', Icon: CalendarDays },
  { id: 'research', label: 'Research', Icon: Search },
  { id: 'costing', label: 'Costing', Icon: FileText },
  { id: 'package', label: 'Package', Icon: Sparkles },
  { id: 'clientReview', label: 'Client Review', Icon: Mail },
  { id: 'payment', label: 'Payment', Icon: Phone },
  { id: 'travelPack', label: 'Travel Pack', Icon: Download },
];

const corporateWorkbenchTabs: Array<{ id: DetailTab; label: string; Icon: LucideIcon }> = [
  { id: 'brief', label: 'Brief', Icon: ClipboardCheck },
  { id: 'travelers', label: 'Travelers', Icon: Users },
  { id: 'approvals', label: 'Approvals', Icon: Shield },
  { id: 'finance', label: 'Finance', Icon: FileText },
  { id: 'documents', label: 'Documents', Icon: ClipboardCheck },
  { id: 'itinerary', label: 'Itinerary', Icon: Briefcase },
  { id: 'history', label: 'Fulfilment', Icon: CheckSquare },
];

const crmRoleLabels: Record<Extract<CrmRole, 'admin' | 'manager' | 'agent' | 'viewer'>, string> = {
  admin: 'Admin',
  manager: 'Manager',
  agent: 'Agent',
  viewer: 'Viewer',
};

const crmRoleDescriptions: Record<Extract<CrmRole, 'admin' | 'manager' | 'agent' | 'viewer'>, string> = {
  admin: 'Full CRM access, user management, and operational control.',
  manager: 'Team oversight, client management, and access administration.',
  agent: 'Request handling, client registration, and workflow execution.',
  viewer: 'Read-only visibility across CRM queues and records.',
};

const themeStyles = {
  dark: {
    shell: 'bg-[#07111d] text-white',
    sidebar: 'border-white/10 bg-[#07111d]',
    header: 'border-white/10 bg-[#081321]',
    panel: 'border-white/10 bg-[#0d1828]',
    panelSoft: 'border-white/10 bg-[#111c2c]',
    row: 'border-white/10 bg-[#0b1624] hover:bg-[#101d30]',
    rowActive: 'border-white/10 bg-[#182331]',
    input: 'border-white/10 bg-white/8 text-white placeholder:text-white/35 focus:border-[#d4af37]/70',
    select: 'border-[#d4af37]/45 bg-white text-slate-950 shadow-sm focus:border-[#d4af37]',
    muted: 'text-white/58',
    soft: 'text-white/76',
    tableHead: 'border-white/10 text-white/42',
    buttonGhost: 'bg-white/8 text-white/75 hover:bg-white/12 hover:text-white',
    buttonActive: 'bg-[#12305a] text-white',
    brandText: 'text-white',
    rightPane: 'border-white/10 bg-[#0b1624]',
    etios: 'bg-[#2b323a] text-white ring-white/10 hover:bg-[#252c33]',
    type: {
      classic: 'bg-emerald-400/12 text-emerald-200 ring-emerald-300/20',
      luxury: 'bg-[#d4af37]/14 text-[#f3d985] ring-[#d4af37]/20',
      corporate: 'bg-sky-400/12 text-sky-200 ring-sky-300/20',
    },
    priority: {
      low: 'bg-slate-500/14 text-slate-300 ring-slate-300/20',
      normal: 'bg-sky-400/14 text-sky-200 ring-sky-300/25',
      high: 'bg-red-500/16 text-red-200 ring-red-300/30',
      urgent: 'bg-red-500/16 text-red-200 ring-red-300/30',
    },
    attention: {
      new: 'bg-emerald-400',
      urgent: 'bg-red-400',
      active: 'bg-amber-300',
      settled: 'bg-sky-300',
      quiet: 'bg-white/25',
    },
  },
  light: {
    shell: 'bg-[#f4f6f8] text-slate-950',
    sidebar: 'border-slate-200 bg-white',
    header: 'border-slate-200 bg-white',
    panel: 'border-slate-200 bg-white',
    panelSoft: 'border-slate-200 bg-slate-50',
    row: 'border-slate-200 bg-white hover:bg-slate-50',
    rowActive: 'border-slate-300 bg-[#fff9e9]',
    input: 'border-slate-300 bg-white text-slate-950 placeholder:text-slate-500 focus:border-[#9b6f05]',
    select: 'border-slate-700 bg-slate-950 text-white shadow-sm focus:border-[#9b6f05]',
    muted: 'text-slate-600',
    soft: 'text-slate-800',
    tableHead: 'border-slate-200 text-slate-600',
    buttonGhost: 'bg-slate-100 text-slate-800 hover:bg-slate-200 hover:text-slate-950',
    buttonActive: 'bg-slate-950 text-white',
    brandText: 'text-slate-950',
    rightPane: 'border-slate-200 bg-white',
    etios: 'bg-[#2b323a] text-white ring-slate-950/10 hover:bg-[#252c33]',
    type: {
      classic: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
      luxury: 'bg-[#fff3c9] text-[#7a5a08] ring-[#d4af37]/45',
      corporate: 'bg-sky-50 text-sky-800 ring-sky-200',
    },
    priority: {
      low: 'bg-slate-100 text-slate-700 ring-slate-300',
      normal: 'bg-sky-50 text-sky-800 ring-sky-200',
      high: 'bg-red-50 text-red-800 ring-red-200',
      urgent: 'bg-red-50 text-red-800 ring-red-200',
    },
    attention: {
      new: 'bg-emerald-600',
      urgent: 'bg-red-600',
      active: 'bg-amber-500',
      settled: 'bg-sky-600',
      quiet: 'bg-slate-300',
    },
  },
} as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDateOnly(value?: string | null) {
  if (!value) return 'Date pending';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start && !end) return 'Dates pending';
  if (!end) return formatDateOnly(start);
  return `${formatDateOnly(start)} - ${formatDateOnly(end)}`;
}

function dateTimeValue(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseStoredTravelDates(value?: string | null) {
  if (!value) return { startDate: null, endDate: null };
  const matches = value.match(/\d{4}-\d{2}-\d{2}/g) ?? [];
  return {
    startDate: matches[0] ?? null,
    endDate: matches[1] ?? null,
  };
}

function currentDateInput() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function maxDateInput(...values: Array<string | null | undefined>) {
  const cleanValues = values.filter(Boolean) as string[];
  return cleanValues.length > 0 ? cleanValues.sort().at(-1) : undefined;
}

function localDateTimeToIso(value?: string | null) {
  const date = dateTimeValue(value);
  return date ? date.toISOString() : null;
}

function dateRangeError(start: string | null | undefined, end: string | null | undefined, label: string) {
  const startDate = dateTimeValue(start);
  const endDate = dateTimeValue(end);
  if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
    return `${label} end date cannot be before start date.`;
  }
  return '';
}

function pastDateError(value: string | null | undefined, label: string) {
  const today = currentDateInput();
  if (value && value.slice(0, 10) < today) return `${label} cannot be before the current date.`;
  return '';
}

function dateContainmentError(value: string | null | undefined, min: string | null | undefined, max: string | null | undefined, label: string, parentLabel: string) {
  const date = dateTimeValue(value);
  const minDate = dateTimeValue(min);
  const maxDate = dateTimeValue(max);
  if (date && minDate && date.getTime() < minDate.getTime()) return `${label} must be inside ${parentLabel}.`;
  if (date && maxDate && date.getTime() > maxDate.getTime()) return `${label} must be inside ${parentLabel}.`;
  return '';
}

function isDueBy(value: string | null | undefined, limit: Date) {
  const date = dateTimeValue(value);
  return Boolean(date && date.getTime() <= limit.getTime());
}

function workflowReminderGenerationAvailability(
  lead: CrmLead | null,
  workflowState: CrmWorkflowState | null,
  pendingReminders: CrmWorkflowReminder[],
  paymentRecords: CrmPaymentRecord[],
  communicationRecords: CrmCommunicationRecord[],
  leadQuotes: CrmQuote[],
) {
  if (!lead) return { available: false, reason: 'Select a request before generating reminders.' };
  if (!workflowState) return { available: false, reason: 'Workflow state is still loading.' };

  if (lead.status === 'completed' || lead.status === 'lost' || workflowState.currentStage === 'completed' || workflowState.currentStage === 'closed') {
    return { available: false, reason: 'No reminders are needed for completed or closed requests.' };
  }

  if (pendingReminders.length > 0) {
    return { available: false, reason: 'Pending reminders already exist for this request.' };
  }

  const now = new Date();
  const twoDayLimit = new Date(now);
  twoDayLimit.setDate(twoDayLimit.getDate() + 2);
  const hasWorkflowBlocker = workflowState.blockers.length > 0;
  const hasOverdueFollowUp = communicationRecords.some((record) => (
    record.followUpDue
    && isDueBy(record.followUpDue, now)
    && record.status !== 'cancelled'
    && record.status !== 'failed'
  ));
  const hasDuePayment = paymentRecords.some((record) => (
    record.dueDate
    && isDueBy(record.dueDate, twoDayLimit)
    && !['paid', 'cancelled', 'refunded'].includes(record.status)
  ));
  const hasSupplierDeadline = leadQuotes.some((quote) => quote.lines.some((line) => (
    line.supplierDeadline
    && isDueBy(line.supplierDeadline, twoDayLimit)
    && line.status !== 'confirmed'
  )));
  const hasTravelPack = communicationRecords.some((record) => (
    record.kind === 'travel_pack' && (record.status === 'ready' || record.status === 'sent')
  ));
  const needsTravelPack = workflowState.currentStage === 'confirmed' && !hasTravelPack;

  if (hasWorkflowBlocker) return { available: true, reason: 'Generate reminders for current workflow blockers.' };
  if (hasOverdueFollowUp) return { available: true, reason: 'Generate reminders for overdue client follow-ups.' };
  if (hasDuePayment) return { available: true, reason: 'Generate reminders for payment deadlines.' };
  if (hasSupplierDeadline) return { available: true, reason: 'Generate reminders for supplier deadlines.' };
  if (needsTravelPack) return { available: true, reason: 'Generate a reminder to prepare the travel pack.' };

  return { available: false, reason: 'No reminder rule is active for this stage.' };
}

function moneyValue(value: string | number | null | undefined, currency = 'USD') {
  const numeric = Number(value ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

function latestByDate<T>(items: T[] | undefined, getDate: (item: T) => string | null | undefined): T | null {
  return (items ?? [])
    .slice()
    .sort((a, b) => new Date(getDate(b) ?? 0).getTime() - new Date(getDate(a) ?? 0).getTime())[0] ?? null;
}

function approvalValue(trip: CorporateTripRequest, stage: 'Travel need' | 'Final cost') {
  return trip.approvals.find((approval) => approval.stage === stage)?.status ?? 'Pending';
}

function hasCtmDocumentBlocker(trip: CorporateTripRequest) {
  return trip.travelers.some((traveler) => traveler.readiness.passport === 'Missing' || traveler.readiness.visa === 'Required')
    || (trip.documents ?? []).some((document) => document.status === 'missing' || document.status === 'requested');
}

function ctmSignalToneClass(tone: CorporateDeskSignalTone) {
  if (tone === 'success') return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200';
  if (tone === 'danger') return 'border-rose-400/25 bg-rose-500/10 text-rose-100';
  if (tone === 'warning') return 'border-amber-400/25 bg-amber-500/10 text-amber-100';
  return 'border-sky-400/25 bg-sky-500/10 text-sky-200';
}

function buildCorporateDeskSignals(trip: CorporateTripRequest): CorporateDeskSignal[] {
  const travelNeed = approvalValue(trip, 'Travel need');
  const finalCost = approvalValue(trip, 'Final cost');
  const latestDocument = latestByDate(trip.documents, (document) => document.updatedAt);
  const latestMessage = latestByDate(trip.messages, (message) => message.createdAt);
  const latestPayment = latestByDate(trip.payments, (payment) => payment.updatedAt || payment.createdAt);
  const documentBlocker = hasCtmDocumentBlocker(trip);

  return [
    {
      label: 'Company approval',
      value: travelNeed === 'Rejected' || finalCost === 'Rejected' ? 'Rejected' : finalCost === 'Approved' ? 'Final cost approved' : travelNeed === 'Approved' ? 'Need approved' : 'Waiting',
      meta: `Travel need: ${travelNeed} - Final cost: ${finalCost}`,
      tone: travelNeed === 'Rejected' || finalCost === 'Rejected' ? 'danger' : finalCost === 'Approved' ? 'success' : travelNeed === 'Approved' ? 'info' : 'warning',
    },
    {
      label: 'Documents',
      value: documentBlocker ? 'Action needed' : 'Ready',
      meta: latestDocument ? `${latestDocument.title} - ${latestDocument.status}` : 'No shared document updates',
      tone: documentBlocker ? 'danger' : 'success',
    },
    {
      label: 'Client message',
      value: latestMessage ? latestMessage.sender : 'No message',
      meta: latestMessage ? latestMessage.body : 'No CTM message posted yet',
      tone: latestMessage?.senderType === 'company' ? 'warning' : 'info',
    },
    {
      label: 'Commercial state',
      value: trip.invoice ? corporateInvoiceStatusLabels[trip.invoice.status] : trip.quote ? corporateQuoteStatusLabels[trip.quote.status] : 'Quote pending',
      meta: trip.invoice ? moneyValue(trip.invoice.amount, trip.invoice.currency) : trip.quote ? moneyValue(trip.quote.amount, trip.quote.currency) : 'Prepare quote in CRM',
      tone: trip.invoice?.status === 'overdue' ? 'danger' : trip.quote || trip.invoice ? 'info' : 'warning',
    },
    {
      label: 'Booking',
      value: trip.booking ? corporateBookingStatusLabels[trip.booking.status] : 'Not released',
      meta: trip.booking?.bookingReference || 'Release after final approval',
      tone: trip.booking?.status === 'cancelled' ? 'danger' : trip.booking ? 'success' : 'warning',
    },
    {
      label: 'Payment',
      value: latestPayment ? corporatePaymentStatusLabels[latestPayment.status] : 'No payment',
      meta: latestPayment ? moneyValue(latestPayment.amount, latestPayment.currency) : 'Payment not recorded',
      tone: latestPayment?.status === 'failed' ? 'danger' : latestPayment?.status === 'received' || latestPayment?.status === 'reconciled' ? 'success' : 'warning',
    },
  ];
}

function getCorporateDeskNextAction(trip: CorporateTripRequest) {
  const travelNeed = approvalValue(trip, 'Travel need');
  const finalCost = approvalValue(trip, 'Final cost');
  const latestCompanyMessage = latestByDate((trip.messages ?? []).filter((message) => message.senderType === 'company'), (message) => message.createdAt);

  if (travelNeed === 'Rejected' || finalCost === 'Rejected') return 'Hold movement and contact the company decision-maker before changing commercial output.';
  if (travelNeed === 'Pending') return 'Wait for travel-need approval or follow up with the company manager from CTM.';
  if (!trip.quote) return 'Prepare and share the corporate quote from CRM.';
  if (trip.quote.status === 'sent' && finalCost === 'Pending') return 'Monitor final-cost approval and respond to any CTM questions.';
  if (finalCost === 'Approved' && !trip.booking) return 'Proceed with supplier booking and update CTM booking status.';
  if (hasCtmDocumentBlocker(trip)) return 'Request or verify traveler documents before final travel pack release.';
  if (trip.invoice && !['paid', 'void'].includes(trip.invoice.status)) return 'Follow up with finance until invoice/payment is cleared.';
  if (latestCompanyMessage) return 'Reply to the latest company message in CTM.';
  if (trip.booking) return 'Prepare execution notes and final travel pack.';
  return 'Keep monitoring CTM signals.';
}

function csvEscape(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function fallbackPriority(lead: CrmLead): LeadPriority {
  if (lead.priority) return lead.priority;
  const urgency = (lead.urgency ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (urgency.includes('semana') || urgency.includes('week')) return 'urgent';
  if (urgency.includes('mes') || urgency.includes('mês') || urgency.includes('month')) return 'high';
  if (urgency.includes('pesquisar') || urgency.includes('research')) return 'low';
  return 'normal';
}

function attentionLevel(lead: CrmLead) {
  const priority = fallbackPriority(lead);
  if (priority === 'urgent' || priority === 'high') return 'urgent';
  if (lead.status === 'new') return 'new';
  if (lead.status === 'contacted' || lead.status === 'planning' || lead.status === 'proposal' || lead.status === 'execution') return 'active';
  if (lead.status === 'won' || lead.status === 'completed') return 'settled';
  return 'quiet';
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? 'D'}${parts[1]?.[0] ?? ''}`.toUpperCase();
}

function readCrmTheme(): CrmTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.localStorage.getItem(CRM_THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
}

function leadSegment(lead: CrmLead) {
  if (lead.serviceKey === 'corporate') return 'Corporate';
  if (lead.serviceKey === 'luxury') return 'Private Client';
  return 'Private Client';
}

function isCorporateLead(lead: CrmLead) {
  return lead.serviceKey === 'corporate';
}

function isLeisureLead(lead: CrmLead) {
  return lead.serviceKey === 'classic' || lead.serviceKey === 'luxury';
}

function workflowStepsForLead(lead: CrmLead) {
  return isCorporateLead(lead) ? corporateWorkflowSteps : traditionalWorkflowSteps;
}

function leadLifecycleStage(lead: CrmLead): LeadLifecycleStage {
  return lead.lifecycleStage ?? statusToLifecycleStage[lead.status];
}

function leadLifecycleLabel(lead: CrmLead) {
  return lifecycleStageLabels[leadLifecycleStage(lead)];
}

function nextLifecycleStage(lead: CrmLead): LeadLifecycleStage | null {
  const currentStage = leadLifecycleStage(lead);
  if (currentStage === 'closed') return 'new_request';
  const currentIndex = lifecycleStageOrder.indexOf(currentStage);
  return currentIndex >= 0 ? lifecycleStageOrder[currentIndex + 1] ?? null : null;
}

function lifecycleStageActionLabel(nextStage: LeadLifecycleStage | null) {
  return nextStage ? `Move to ${lifecycleStageLabels[nextStage]}` : 'Lifecycle complete';
}

function leadFlowTitle(lead: CrmLead) {
  return isCorporateLead(lead) ? 'Corporate travel operations flow' : 'Traditional trip design flow';
}

function leadFlowDescription(lead: CrmLead) {
  return isCorporateLead(lead)
    ? 'Company travel follows approvals, traveler readiness, policy fit, and invoice-aware fulfilment.'
    : 'Classic and luxury trips move through discovery, trip design, proposal, confirmation, and delivery.';
}

function detailTabsForLead(lead: CrmLead): DetailTab[] {
  return isCorporateLead(lead)
    ? ['overview', 'brief', 'travelers', 'approvals', 'finance', 'documents', 'itinerary', 'history']
    : ['overview', 'brief', 'proposal', 'payments', 'travelPack', 'itinerary', 'notes', 'history'];
}

function detailTabLabel(tab: DetailTab) {
  switch (tab) {
    case 'brief':
      return 'Brief';
    case 'research':
      return 'Research';
    case 'costing':
      return 'Costing';
    case 'package':
      return 'Package';
    case 'clientReview':
      return 'Client Review';
    case 'payment':
      return 'Payment';
    case 'itinerary':
      return 'Itinerary';
    case 'travelPack':
      return 'Travel Pack';
    default:
      return tab.charAt(0).toUpperCase() + tab.slice(1);
  }
}

function travelerCountValue(lead: CrmLead) {
  const match = lead.travelers.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function leisureProposalCards(lead: CrmLead): InfoCard[] {
  return [
    {
      label: 'Offer shape',
      value: lead.serviceKey === 'luxury' ? 'Premium curated proposal' : 'Balanced package proposal',
      meta: lead.serviceKey === 'luxury' ? 'High-touch itinerary with elevated service framing' : 'Practical options with clear inclusions and budget fit',
    },
    {
      label: 'Supplier posture',
      value: lead.status === 'proposal' ? 'Quote already with client' : 'Option set still being refined',
      meta: lead.serviceKey === 'luxury' ? 'Protect premium room and experience availability' : 'Compare rate/value before final send',
    },
    {
      label: 'Decision pressure',
      value: fallbackPriority(lead) === 'urgent' || fallbackPriority(lead) === 'high' ? 'Follow up within 24h' : 'Gentle follow-up cadence',
      meta: `Preferred contact: ${lead.preferredContact || 'Not captured yet'}`,
    },
  ];
}

function leisurePaymentCards(lead: CrmLead): InfoCard[] {
  return [
    {
      label: 'Payment model',
      value: lead.serviceKey === 'luxury' ? 'Deposit before premium holds' : 'Payment before booking release',
      meta: 'Keep expectations clear before supplier confirmation.',
    },
    {
      label: 'Commercial status',
      value: lead.status === 'won' || lead.status === 'execution' || lead.status === 'completed' ? 'Approved to progress' : 'Awaiting client decision',
      meta: `Budget: ${lead.budget || 'Budget pending'}`,
    },
    {
      label: 'Risk note',
      value: lead.serviceKey === 'luxury' ? 'Premium inventory can move quickly' : 'Fare and hotel changes may affect package fit',
      meta: 'Use this to steer the next conversation.',
    },
  ];
}

function leisureTravelPackCards(lead: CrmLead): InfoCard[] {
  return [
    {
      label: 'Pack focus',
      value: lead.serviceKey === 'luxury' ? 'Concierge-ready itinerary pack' : 'Clear and practical travel pack',
      meta: 'Final communication should match the client experience level.',
    },
    {
      label: 'Support posture',
      value: lead.serviceKey === 'luxury' ? 'High-touch support and special-request awareness' : 'Simple support with crisp movement instructions',
      meta: `Travel window: ${lead.dates || 'Dates pending'}`,
    },
    {
      label: 'Final handoff',
      value: lead.status === 'execution' || lead.status === 'completed' ? 'In delivery / post-delivery' : 'Prepare once payment and bookings are locked',
      meta: `Destination: ${lead.destination || 'Pending destination'}`,
    },
  ];
}

function corporateTravelerCards(lead: CrmLead): InfoCard[] {
  const count = travelerCountValue(lead);
  return [
    {
      label: 'Traveler scope',
      value: lead.travelers || 'Traveler list pending',
      meta: count > 1 ? 'Group movement requires traveler coordination.' : 'Single-traveler movement, still keep readiness visible.',
    },
    {
      label: 'Ownership',
      value: lead.tripType || 'Business movement',
      meta: `Departure: ${lead.departureCity || 'Pending'} · Destination: ${lead.destination || 'Pending'}`,
    },
    {
      label: 'Readiness posture',
      value: lead.requestedServices.toLowerCase().includes('visa') ? 'Visa-sensitive movement' : 'Document check still required',
      meta: 'Traveler names and document status should be aligned before fulfilment.',
    },
  ];
}

function corporateApprovalCards(lead: CrmLead): InfoCard[] {
  return [
    {
      label: 'Current approval lane',
      value: lead.status === 'won' ? 'Approval secured' : lead.status === 'proposal' ? 'Client approval pending' : 'Internal qualification / planning',
      meta: 'Corporate travel should not progress without clear owner sign-off.',
    },
    {
      label: 'Decision owner',
      value: leadOwner(lead),
      meta: 'Use the account owner to chase blockers and keep the company side aligned.',
    },
    {
      label: 'Commercial pressure',
      value: fallbackPriority(lead) === 'urgent' ? 'Approvals need immediate follow-up' : 'Approvals can move on standard cadence',
      meta: `Urgency signal: ${lead.urgency || 'Not captured'}`,
    },
  ];
}

function corporateFinanceCards(lead: CrmLead): InfoCard[] {
  return [
    {
      label: 'Finance model',
      value: 'PO / invoice / account clearance',
      meta: 'Corporate work should make finance clearance explicit before booking release.',
    },
    {
      label: 'Commercial shape',
      value: lead.budget || 'Policy-based / budget pending',
      meta: lead.requestedServices || 'Service scope pending',
    },
    {
      label: 'Release condition',
      value: lead.status === 'won' || lead.status === 'execution' || lead.status === 'completed' ? 'Commercially cleared to fulfil' : 'Keep booking blocked until commercial sign-off',
      meta: 'Use this lane to coordinate invoice-sensitive work.',
    },
  ];
}

function corporateDocumentCards(lead: CrmLead): InfoCard[] {
  return [
    {
      label: 'Document posture',
      value: lead.requestedServices.toLowerCase().includes('visa') ? 'Visa support in scope' : 'Standard traveler document check',
      meta: 'Keep passport, visa, and traveler data visible before fulfilment.',
    },
    {
      label: 'Operational risk',
      value: travelerCountValue(lead) > 3 ? 'Multi-traveler coordination risk' : 'Low traveler-count coordination risk',
      meta: `Traveler count: ${lead.travelers || 'Pending'}`,
    },
    {
      label: 'Next control point',
      value: lead.status === 'execution' ? 'Final travel documents and active support' : 'Readiness check before booking release',
      meta: `Stage: ${leadLifecycleLabel(lead)}`,
    },
  ];
}

function mockWorkflowItems(lead: CrmLead, tab: DetailTab): MockWorkflowItem[] {
  if (lead.serviceKey === 'corporate') {
    if (tab === 'travelers') {
      return [
        { title: 'Traveler file owner', value: 'Company coordinator', meta: 'Keeps traveler names, changes, and department ownership aligned before booking.' },
        { title: 'Upcoming traveler risk', value: lead.requestedServices.toLowerCase().includes('visa') ? 'Visa-sensitive traveler mix' : 'Traveler list still needs readiness check', meta: `${lead.travelers || 'Traveler list pending'} · route ${lead.departureCity || 'Origin pending'} -> ${lead.destination || 'Destination pending'}` },
        { title: 'Reusable account pattern', value: 'Repeat corporate movement expected', meta: 'Use saved traveler records and account preferences to speed up the next request.' },
      ];
    }
    if (tab === 'approvals') {
      return [
        { title: 'Internal approval owner', value: 'Coordinator / Manager', meta: 'Travel need should clear before quote lock and supplier commitment.' },
        { title: 'Quote sign-off lane', value: lead.status === 'proposal' ? 'Client approval in progress' : lead.status === 'won' ? 'Approval secured' : 'Still preparing internal decision support', meta: 'Keep approval owner and DPM account owner aligned.' },
        { title: 'Mock blocker', value: fallbackPriority(lead) === 'urgent' ? 'Traveler list changing under short lead time' : 'Commercial sign-off still pending', meta: 'This is the kind of friction the approvals tab should make obvious.' },
      ];
    }
    if (tab === 'finance') {
      return [
        { title: 'Finance path', value: 'PO / invoice / account clearance', meta: 'Corporate movement should not release to booking without commercial clearance.' },
        { title: 'Mock invoice note', value: 'Split billing by department', meta: 'Useful for accounts that need cost allocation or multiple approvers.' },
        { title: 'Release condition', value: lead.status === 'won' || lead.status === 'execution' ? 'Ready for controlled fulfilment' : 'Booking should remain blocked', meta: 'Finance posture now reads differently from leisure payment collection.' },
      ];
    }
    if (tab === 'documents') {
      return [
        { title: 'Passport control', value: 'Collect traveler document set before fulfilment', meta: 'Especially important when traveler count is changing.' },
        { title: 'Visa control', value: lead.requestedServices.toLowerCase().includes('visa') ? 'Visa support in scope' : 'No dedicated visa scope yet', meta: 'Use this lane for real readiness tracking later.' },
        { title: 'Mock document blocker', value: 'One traveler still missing complete profile', meta: 'This should be visible before quote turns into booking.' },
      ];
    }
  } else {
    if (tab === 'proposal') {
      return [
        { title: 'Option set', value: lead.serviceKey === 'luxury' ? 'Premium curation with elevated experiences' : 'Clear package options with practical inclusions', meta: 'Proposal tone should match the traveler profile and budget confidence.' },
        { title: 'Supplier hold posture', value: lead.status === 'proposal' ? 'Best options should be protected now' : 'Shortlist still being shaped', meta: 'Especially visible for luxury inventory and seasonal hotel pressure.' },
        { title: 'Mock next move', value: 'Follow up client decision within 24h', meta: 'This is the kind of sales pressure the leisure workflow should surface.' },
      ];
    }
    if (tab === 'payments') {
      return [
        { title: 'Deposit expectation', value: lead.serviceKey === 'luxury' ? 'Deposit before premium confirmations' : 'Payment before package release', meta: 'Leisure should keep payment logic simple and client-facing.' },
        { title: 'Mock payment checkpoint', value: lead.status === 'won' || lead.status === 'execution' ? 'Approved to collect and confirm' : 'Still pre-payment / pre-confirmation', meta: `Budget anchor: ${lead.budget || 'Budget pending'}` },
        { title: 'Commercial sensitivity', value: 'Fare / hotel movement risk', meta: 'Use this to explain why payment timing matters to the traveler.' },
      ];
    }
    if (tab === 'travelPack') {
      return [
        { title: 'Itinerary polish', value: lead.serviceKey === 'luxury' ? 'Concierge-ready handoff' : 'Simple trip pack handoff', meta: 'This is where final service confidence becomes client trust.' },
        { title: 'Support posture', value: lead.serviceKey === 'luxury' ? 'High-touch support expectation' : 'Practical and responsive support', meta: 'Visible difference between classic and luxury but same leisure lane.' },
        { title: 'Mock final check', value: 'All confirmations and notes ready to send', meta: 'This gives the leisure workflow a real delivery endpoint.' },
      ];
    }
  }

  return [];
}

function mockBookingRecords(lead: CrmLead): MockBookingRecord[] {
  if (lead.serviceKey === 'corporate') {
    return [
      {
        service: 'Flight movement',
        supplier: 'Corporate fare desk',
        status: lead.status === 'execution' || lead.status === 'completed' ? 'Ticketed' : lead.status === 'won' ? 'Ready for release' : 'Pending clearance',
        reference: `CORP-FLT-${lead.id.slice(-4).toUpperCase()}`,
        note: 'Route and traveler list should remain aligned before final ticket issue.',
      },
      {
        service: 'Hotel block',
        supplier: 'Preferred corporate hotel partner',
        status: lead.status === 'execution' || lead.status === 'completed' ? 'Confirmed' : 'Option held',
        reference: `CORP-HTL-${lead.id.slice(-4).toUpperCase()}`,
        note: 'Useful when departments share one movement but need rooming control.',
      },
      {
        service: lead.requestedServices.toLowerCase().includes('visa') ? 'Visa support' : 'Ground support',
        supplier: lead.requestedServices.toLowerCase().includes('visa') ? 'Immigration support partner' : 'Airport transfer partner',
        status: lead.requestedServices.toLowerCase().includes('visa') ? 'Document check open' : 'Awaiting final travel release',
        reference: `CORP-SVC-${lead.id.slice(-4).toUpperCase()}`,
        note: 'Corporate fulfilment often depends on one non-flight blocker staying visible.',
      },
    ];
  }

  return [
    {
      service: 'Flight',
      supplier: lead.serviceKey === 'luxury' ? 'Business class / premium fare hold' : 'Best-fit carrier option',
      status: lead.status === 'execution' || lead.status === 'completed' ? 'Confirmed' : lead.status === 'won' ? 'Ready to issue' : 'Quoted / held',
      reference: `LEI-FLT-${lead.id.slice(-4).toUpperCase()}`,
      note: 'Use this to show the client what is already protected versus still being priced.',
    },
    {
      service: 'Hotel',
      supplier: lead.serviceKey === 'luxury' ? 'Preferred luxury property' : 'Selected package hotel',
      status: lead.status === 'execution' || lead.status === 'completed' ? 'Confirmed' : 'Option shortlisted',
      reference: `LEI-HTL-${lead.id.slice(-4).toUpperCase()}`,
      note: lead.serviceKey === 'luxury' ? 'Suite / villa inventory may move quickly.' : 'Hotel choice should stay tied to budget and location fit.',
    },
    {
      service: lead.requestedServices.toLowerCase().includes('transfer') ? 'Transfers' : 'Experience / support',
      supplier: lead.requestedServices.toLowerCase().includes('transfer') ? 'Ground transport partner' : 'Destination services partner',
      status: lead.status === 'execution' || lead.status === 'completed' ? 'Arranged' : 'Prepare after payment',
      reference: `LEI-SVC-${lead.id.slice(-4).toUpperCase()}`,
      note: 'This helps the travel-pack stage feel like real fulfillment rather than just notes.',
    },
  ];
}

function leadPrimaryBlocker(lead: CrmLead) {
  const lifecycleStage = leadLifecycleStage(lead);
  if (lifecycleStage === 'pending_information') return 'Missing information before validation';
  if (lifecycleStage === 'awaiting_approval') return isCorporateLead(lead) ? 'Company approval still pending' : 'Client approval still pending';
  if (lifecycleStage === 'awaiting_payment_finance') return isCorporateLead(lead) ? 'Finance clearance before booking release' : 'Payment confirmation before booking release';
  if (lifecycleStage === 'booking_in_progress') return 'Supplier confirmations still in progress';
  if (lifecycleStage === 'travel_pack_sent') return 'Travel pack sent, monitor readiness';
  if (lifecycleStage === 'in_travel') return 'Active travel support in progress';
  if (lifecycleStage === 'closed') return 'Request closed';

  if (lead.serviceKey === 'corporate') {
    if (lead.status === 'proposal') return 'Client approval still pending';
    if (lead.status === 'won') return 'Finance clearance before booking release';
    if (lead.requestedServices.toLowerCase().includes('visa')) return 'Traveler visa readiness still open';
    return 'Traveler coordination still needs control';
  }

  if (lead.status === 'proposal') return 'Client decision still pending';
  if (lead.status === 'won') return 'Payment confirmation before release';
  if (lead.serviceKey === 'luxury') return 'Premium inventory timing still sensitive';
  return 'Trip details still need final confirmation';
}

function extractManagerBoardMeta(notes: string | undefined) {
  const match = (notes || '').match(/\[Manager board\] Owner: (.+?) \| Task: (.+?)(?:\r?\n|$)/);
  if (!match) return null;
  return { owner: match[1], task: match[2] };
}

function leftRailStatusCards(lead: CrmLead): InfoCard[] {
  return [
    {
      label: 'Current stage',
      value: leadLifecycleLabel(lead),
      meta: leadFlowTitle(lead),
    },
    {
      label: 'Primary blocker',
      value: leadPrimaryBlocker(lead),
      meta: processForLead(lead).stageGate,
    },
    {
      label: 'Next owner',
      value: leadOwner(lead),
      meta: processForLead(lead).primaryAction,
    },
  ];
}

function itinerarySummaryCards(lead: CrmLead, itinerary?: CrmTripItinerary | null): InfoCard[] {
  const travelerCount = travelerCountValue(lead) || 2;
  if (itinerary) {
    const hotelCount = itinerary.stops.reduce((count, stop) => count + stop.accommodations.length, 0);
    const experienceCount = itinerary.stops.reduce((count, stop) => count + stop.experiences.length, 0);
    return [
      { label: 'Journey shape', value: itinerary.title, meta: `${itinerary.stops.length} stops from ${formatDateRange(itinerary.startDate, itinerary.endDate)}.` },
      { label: 'Stay plan', value: `${hotelCount} accommodation blocks`, meta: `${itinerary.transports.length} transport segments controlled in one itinerary.` },
      { label: 'Room posture', value: itinerary.stops.flatMap((stop) => stop.accommodations).find(Boolean)?.roomType || 'Room setup pending', meta: `${travelerCount} travelers. Status: ${itineraryStatusLabels[itinerary.status]}.` },
      { label: 'Experience layer', value: `${experienceCount} planned activities`, meta: itinerary.notes || 'Experience and operating notes are linked to each city stop.' },
    ];
  }

  return isCorporateLead(lead)
    ? [
        { label: 'Movement shape', value: 'Multi-stop corporate movement', meta: `${travelerCount} travelers across one controlled operating brief.` },
        { label: 'Stay plan', value: travelerCount > 4 ? 'Two hotels with rooming list control' : 'One primary hotel plus overflow support', meta: 'Corporate stays should keep billing and room ownership visible.' },
        { label: 'Room posture', value: 'Executive rooms + flexible twin allocation', meta: 'Use room blocks that can absorb late traveler changes.' },
        { label: 'Experience layer', value: 'Meetings, transfers, and controlled downtime', meta: 'Activities should support the trip objective, not compete with it.' },
      ]
    : [
        { label: 'Journey shape', value: lead.serviceKey === 'luxury' ? 'Curated multi-stop leisure journey' : 'Balanced leisure itinerary with clear flow', meta: `${travelerCount} travelers with room for paced experiences.` },
        { label: 'Stay plan', value: lead.serviceKey === 'luxury' ? 'Premium lodge + signature city stay' : 'Comfort hotel circuit with practical movement', meta: 'Show hotel count clearly before final quotation.' },
        { label: 'Room posture', value: lead.serviceKey === 'luxury' ? 'Suite / villa preference' : 'Double or twin rooms with clear child policy', meta: 'Room choice should stay explicit in the itinerary.' },
        { label: 'Experience layer', value: lead.serviceKey === 'luxury' ? 'High-touch experiences and private moments' : 'Anchored sightseeing and easy activities', meta: 'This is where the trip becomes tangible for the client.' },
      ];
}

function itineraryStops(lead: CrmLead): ItineraryStop[] {
  const origin = lead.departureCity || 'Maputo';
  const destination = lead.destination || (lead.serviceKey === 'corporate' ? 'Johannesburg' : 'Cape Town');

  if (isCorporateLead(lead)) {
    return [
      {
        city: origin,
        nights: '1 night',
        stay: 'Pre-departure holding hotel',
        room: 'Executive double + late arrival buffer',
        focus: 'Arrival control and traveler alignment',
        note: 'Use this stop to absorb staggered arrivals and final traveler list adjustments.',
      },
      {
        city: destination,
        nights: '2 nights',
        stay: 'Primary corporate hotel block',
        room: 'Executive rooms with twin fallback',
        focus: 'Meetings, approvals, and core travel objective',
        note: 'This is the main operational hub where rooming, billing, and transfer timing must stay tight.',
      },
      {
        city: `${destination} Extension`,
        nights: '1 night',
        stay: 'Overflow / recovery stay',
        room: 'Short-stay business rooms',
        focus: 'Post-meeting buffer and return control',
        note: 'Useful for split departures, late meetings, or controlled downtime before return.',
      },
    ];
  }

  return [
    {
      city: origin,
      nights: '1 night',
      stay: 'Arrival city staging',
      room: lead.serviceKey === 'luxury' ? 'Premium suite arrival stay' : 'Comfort room close to airport',
      focus: 'Smooth arrival and first-night reset',
      note: 'This leg helps the itinerary feel paced rather than rushed.',
    },
    {
      city: destination,
      nights: lead.serviceKey === 'luxury' ? '3 nights' : '2 nights',
      stay: lead.serviceKey === 'luxury' ? 'Signature property' : 'Main trip hotel',
      room: lead.serviceKey === 'luxury' ? 'Suite / villa request' : 'Double room with breakfast',
      focus: 'Core destination stay',
      note: 'This is where the main hotel decision, room type, and service posture should be locked.',
    },
    {
      city: `${destination} Experience Stay`,
      nights: '2 nights',
      stay: lead.serviceKey === 'luxury' ? 'Experience lodge or beach retreat' : 'Extension hotel or resort',
      room: lead.serviceKey === 'luxury' ? 'View-facing suite' : 'Resort double or family room',
      focus: 'Activities, pacing, and final memory layer',
      note: 'Use the last stop to bundle experiences and create a clear close to the trip.',
    },
  ];
}

function itineraryExperiences(lead: CrmLead): ItineraryExperience[] {
  return isCorporateLead(lead)
    ? [
        { title: 'Airport meet-and-greet', category: 'Ground support', timing: 'Arrival day', note: 'Keep traveler movement controlled from touchdown through hotel check-in.' },
        { title: 'Meeting transfers', category: 'Operational service', timing: 'Working days', note: 'Dedicated transport windows reduce disruption to the company schedule.' },
        { title: 'Hosted dinner or client event', category: 'Experience layer', timing: 'Evening window', note: 'Useful when the movement includes relationship-building or executive hosting.' },
      ]
    : [
        { title: lead.serviceKey === 'luxury' ? 'Private guided signature experience' : 'Half-day city or destination tour', category: 'Activity', timing: 'Main stay', note: 'This should be one of the emotional anchors of the trip.' },
        { title: lead.serviceKey === 'luxury' ? 'Wellness / sunset / curated dining moment' : 'Easy leisure excursion', category: 'Experience', timing: 'Second day', note: 'Use this block to make the proposal feel lived-in, not generic.' },
        { title: 'Departure-day support', category: 'Service', timing: 'Final day', note: 'Transfers, check-out timing, and baggage flow should be visible in the itinerary.' },
      ];
}

function itineraryStopsFromBackend(itinerary: CrmTripItinerary): ItineraryStop[] {
  return [...itinerary.stops]
    .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
    .map((stop) => {
      const accommodation = stop.accommodations[0];
      return {
        city: [stop.city, stop.country].filter(Boolean).join(', '),
        nights: `${stop.nights} ${stop.nights === 1 ? 'night' : 'nights'}`,
        stay: accommodation?.name || 'Accommodation pending',
        room: accommodation?.roomType || 'Room setup pending',
        focus: stop.purpose.charAt(0).toUpperCase() + stop.purpose.slice(1),
        note: stop.notes || accommodation?.notes || 'No operating note yet.',
        dates: formatDateRange(stop.arrivalDate, stop.departureDate),
        status: accommodation ? itineraryBookingStatusLabels[accommodation.bookingStatus] : 'Pending',
      };
    });
}

function itineraryExperiencesFromBackend(itinerary: CrmTripItinerary): ItineraryExperience[] {
  return itinerary.stops
    .flatMap((stop) =>
      stop.experiences.map((experience) => ({
        title: experience.title,
        category: [stop.city, experience.category].filter(Boolean).join(' - '),
        timing: experience.startAt ? formatDateOnly(experience.startAt) : 'Timing pending',
        note: experience.notes || 'No experience note yet.',
        status: itineraryBookingStatusLabels[experience.status],
      })),
    )
    .sort((a, b) => a.timing.localeCompare(b.timing));
}

function tripDesignReadiness(lead: CrmLead, itinerary: CrmTripItinerary | null, stops: ItineraryStop[], experiences: ItineraryExperience[]) {
  const hotelCount = itinerary?.stops.reduce((count, stop) => count + stop.accommodations.length, 0) ?? stops.length;
  const hasRoute = stops.length > 0;
  const hasDates = Boolean(itinerary?.startDate && itinerary?.endDate) || Boolean(lead.dates);
  const hasRooms = stops.some((stop) => stop.room && stop.room !== 'Room setup pending');
  const hasExperiences = experiences.length > 0;
  const hasBudget = Boolean(lead.budget);

  return [
    { label: 'Route', ready: hasRoute, meta: hasRoute ? `${stops.length} stops mapped` : 'Add destination stops' },
    { label: 'Dates', ready: hasDates, meta: hasDates ? itinerary ? formatDateRange(itinerary.startDate, itinerary.endDate) : lead.dates : 'Dates pending' },
    { label: 'Stays', ready: hotelCount > 0, meta: hotelCount > 0 ? `${hotelCount} stay blocks` : 'Add hotels or accommodation' },
    { label: 'Rooms', ready: hasRooms, meta: hasRooms ? 'Room intent visible' : 'Room types pending' },
    { label: 'Experiences', ready: hasExperiences, meta: hasExperiences ? `${experiences.length} planned` : 'Add activity layer' },
    { label: 'Budget', ready: hasBudget, meta: hasBudget ? lead.budget : 'Budget pending' },
  ];
}

function costingGateItems(quote: CrmQuote | null, itinerary: CrmTripItinerary | null, stops: ItineraryStop[]) {
  const quoteLineCount = quote?.lines.length ?? 0;
  const movementCount = itinerary?.transports.length ?? 0;
  const stayCount = itinerary?.stops.reduce((count, stop) => count + stop.accommodations.length, 0) ?? 0;
  const hasHotelQuote = Boolean(quote?.lines.some((line) => line.category === 'hotel'));
  const hasMovementQuote = Boolean(quote?.lines.some((line) => line.category === 'flight' || line.category === 'transfer'));

  return [
    { label: 'Route mapped', ready: stops.length > 0, meta: stops.length > 0 ? `${stops.length} stops` : 'Add at least one city stop' },
    { label: 'Stay planned', ready: stayCount > 0, meta: stayCount > 0 ? `${stayCount} stays` : 'Add a hotel or accommodation' },
    { label: 'Movement visible', ready: movementCount > 0 || hasMovementQuote, meta: movementCount > 0 ? `${movementCount} movement segments` : hasMovementQuote ? 'Movement linked to quote' : 'Add flight or transfer plan' },
    { label: 'Quote exists', ready: Boolean(quote), meta: quote ? quote.quoteNumber : 'Create or link quote lines' },
    { label: 'Quote lines linked', ready: quoteLineCount > 0, meta: quoteLineCount > 0 ? `${quoteLineCount} quote lines` : 'Link itinerary items to quote' },
    { label: 'Hotel in quote', ready: hasHotelQuote, meta: hasHotelQuote ? 'Hotel line present' : 'Link at least one stay' },
  ];
}

function packageGateItems(quote: CrmQuote | null) {
  const lines = quote?.lines ?? [];
  const unpricedLines = lines.filter((line) => Number(line.unitSell) <= 0 || Number(line.unitCost) < 0);
  const missingSupplierLines = lines.filter((line) => !line.supplier.trim());
  const unavailableLines = lines.filter((line) => line.status === 'unavailable');
  const sellTotal = Number(quote?.subtotalSell ?? 0);

  return [
    { label: 'Quote line pricing', ready: lines.length > 0 && unpricedLines.length === 0, meta: lines.length === 0 ? 'No quote lines yet' : unpricedLines.length === 0 ? 'All lines priced' : `${unpricedLines.length} unpriced lines` },
    { label: 'Supplier names', ready: lines.length > 0 && missingSupplierLines.length === 0, meta: lines.length === 0 ? 'No suppliers yet' : missingSupplierLines.length === 0 ? 'Suppliers visible' : `${missingSupplierLines.length} missing suppliers` },
    { label: 'Availability status', ready: unavailableLines.length === 0, meta: unavailableLines.length === 0 ? 'No unavailable lines' : `${unavailableLines.length} unavailable lines` },
    { label: 'Client sell total', ready: sellTotal > 0, meta: sellTotal > 0 ? moneyValue(sellTotal, quote?.currency ?? 'USD') : 'Total sell is zero' },
  ];
}

function clientProposalSections(quote: CrmQuote | null) {
  const lines = quote?.lines ?? [];
  const movementCategories: QuoteLineCategory[] = ['flight', 'transfer', 'visa', 'insurance'];
  const activityCategories: QuoteLineCategory[] = ['activity', 'service_fee'];

  return [
    {
      title: 'Journey and movement',
      subtitle: 'Flights, transfers, documents, and protection',
      lines: lines.filter((line) => movementCategories.includes(line.category)),
    },
    {
      title: 'Stays',
      subtitle: 'Hotels, room setup, and accommodation blocks',
      lines: lines.filter((line) => line.category === 'hotel'),
    },
    {
      title: 'Experiences and service',
      subtitle: 'Activities, destination services, and DPM care',
      lines: lines.filter((line) => activityCategories.includes(line.category)),
    },
    {
      title: 'Other inclusions',
      subtitle: 'Additional items included in the proposal',
      lines: lines.filter((line) => line.category === 'other'),
    },
  ].filter((section) => section.lines.length > 0);
}

function paymentWorkflowSummary(lead: CrmLead, quote: CrmQuote | null, records: CrmPaymentRecord[] = []) {
  const quoteTotal = Number(quote?.subtotalSell ?? 0);
  const expectedFromRecords = records.reduce((sum, record) => sum + Number(record.amountExpected || 0), 0);
  const receivedFromRecords = records.reduce((sum, record) => sum + Number(record.amountReceived || 0), 0);
  const total = expectedFromRecords > 0 ? expectedFromRecords : quoteTotal;
  const deposit = total > 0 ? Math.ceil(total * 0.3) : 0;
  const hasPaidRecord = records.some((record) => record.status === 'paid' || record.proofReceived);
  const paid = total > 0 ? receivedFromRecords >= total || hasPaidRecord : hasPaidRecord;
  const approved = paid || lead.status === 'won' || lead.status === 'execution' || lead.status === 'completed' || quote?.status === 'accepted';
  const nextDueDate = records
    .filter((record) => record.status !== 'paid' && record.dueDate)
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))[0]?.dueDate;
  const dueDate = nextDueDate || quote?.validUntil || 'Set payment due date';

  return {
    approved,
    paid,
    total,
    deposit,
    received: receivedFromRecords,
    balance: Math.max(total - receivedFromRecords, 0),
    dueDate,
    recordCount: records.length,
    status: paid ? 'Paid / cleared' : approved ? 'Approved, awaiting payment' : 'Awaiting client approval',
    nextAction: paid ? 'Release supplier confirmations and prepare the travel pack.' : approved ? 'Collect payment proof before supplier confirmation.' : 'Do not book suppliers until the client approves the package.',
  };
}

function bookingConfirmationSummary(quote: CrmQuote | null) {
  const lines = quote?.lines ?? [];
  const actionableLines = lines.filter((line) => line.category !== 'service_fee');
  const heldOrConfirmed = actionableLines.filter((line) => line.status === 'held' || line.status === 'confirmed');
  const confirmed = actionableLines.filter((line) => line.status === 'confirmed');
  const blocked = actionableLines.filter((line) => line.status === 'research' || line.status === 'quoted' || line.status === 'unavailable');

  return {
    total: actionableLines.length,
    heldOrConfirmed: heldOrConfirmed.length,
    confirmed: confirmed.length,
    blocked: blocked.length,
    ready: actionableLines.length > 0 && heldOrConfirmed.length === actionableLines.length,
  };
}

function travelPackReadinessItems(lead: CrmLead, quote: CrmQuote | null, itinerary: CrmTripItinerary | null, stops: ItineraryStop[], transports: CrmTripItinerary['transports'], experiences: ItineraryExperience[], paymentReady: boolean, bookingReady: boolean) {
  const lines = quote?.lines ?? [];
  const confirmedOrHeldLines = lines.filter((line) => line.status === 'confirmed' || line.status === 'held');
  const stayReady = stops.some((stop) => stop.stay !== 'Accommodation pending') || lines.some((line) => line.category === 'hotel' && line.status !== 'research');
  const movementReady = transports.length > 0 || lines.some((line) => (line.category === 'flight' || line.category === 'transfer') && line.status !== 'research');
  const needsVisa = lead.requestedServices.toLowerCase().includes('visa');
  const docsReady = !needsVisa || lines.some((line) => line.category === 'visa' && line.status !== 'research');

  return [
    { label: 'Final route', ready: stops.length > 0, meta: stops.length > 0 ? `${stops.length} stops` : 'Trip Design route pending' },
    { label: 'Stay confirmations', ready: stayReady, meta: stayReady ? 'Stay details visible' : 'Hotel/accommodation pending' },
    { label: 'Movement instructions', ready: movementReady, meta: movementReady ? 'Transport visible' : 'Flights/transfers pending' },
    { label: 'Experience plan', ready: experiences.length > 0, meta: experiences.length > 0 ? `${experiences.length} highlights` : 'Experience layer pending' },
    { label: 'Documents', ready: docsReady, meta: docsReady ? 'Document needs covered' : 'Visa/document line pending' },
    { label: 'Confirmed items', ready: confirmedOrHeldLines.length > 0 || itinerary?.status === 'confirmed', meta: confirmedOrHeldLines.length > 0 ? `${confirmedOrHeldLines.length} held/confirmed` : 'Confirm or hold quote lines' },
    { label: 'Payment clearance', ready: paymentReady, meta: paymentReady ? 'Payment cleared' : 'Payment not cleared' },
    { label: 'Booking release', ready: bookingReady, meta: bookingReady ? 'All booking items held/confirmed' : 'Booking checklist still open' },
  ];
}

function communicationTemplate(kind: CommunicationKind, lead: CrmLead, quote: CrmQuote | null, paymentSummary: ReturnType<typeof paymentWorkflowSummary> | null, isTravelPackReady: boolean) {
  if (kind === 'payment') {
    return `Hello ${lead.name},\n\nThank you for approving your ${lead.destination || 'trip'} direction.\n\nTo release supplier bookings, please proceed with the payment step. The expected package total is ${quote ? moneyValue(quote.subtotalSell, quote.currency) : lead.budget || 'being finalized'}, with payment due by ${paymentSummary?.dueDate || 'the agreed date'}.\n\nOnce payment proof is received, we will move the bookings into confirmation and prepare the final travel pack.\n\nWarm regards,\nDestinos pelo Mundo`;
  }

  if (kind === 'travel_pack') {
    return `Hello ${lead.name},\n\nYour travel pack for ${lead.destination || 'your upcoming trip'} ${isTravelPackReady ? 'is ready for review' : 'is being finalized'}.\n\nInside you will find the final itinerary, movement instructions, accommodation details, experiences, confirmations, and DPM support notes.\n\nPlease keep this pack accessible during travel and contact us if anything needs attention.\n\nWarm regards,\nDestinos pelo Mundo`;
  }

  if (kind === 'follow_up') {
    return `Hello ${lead.name},\n\nJust checking in on your ${lead.destination || 'travel request'}.\n\nThe next step from our side is: ${leadPrimaryBlocker(lead)}.\n\nLet us know how you would like to proceed, and we will keep the trip moving carefully.\n\nWarm regards,\nDestinos pelo Mundo`;
  }

  return `Hello ${lead.name},\n\nWe prepared your ${lead.destination || 'upcoming'} travel proposal with the route, stays, movement plan, and experience highlights ready for review.\n\nThe proposal total is ${quote ? moneyValue(quote.subtotalSell, quote.currency) : lead.budget || 'being finalized'}.\n\nPlease review the proposal and tell us if you approve this direction so we can move to payment and final confirmations.\n\nWarm regards,\nDestinos pelo Mundo`;
}

function communicationReadinessItems(kind: CommunicationKind, hasProposalPreview: boolean, isPackageReady: boolean, paymentSummary: ReturnType<typeof paymentWorkflowSummary> | null, bookingSummary: ReturnType<typeof bookingConfirmationSummary>, isTravelPackReady: boolean) {
  if (kind === 'payment') {
    return [
      { label: 'Client approval', ready: Boolean(paymentSummary?.approved), meta: paymentSummary?.approved ? 'Approved' : 'Approval pending' },
      { label: 'Payment amount', ready: Boolean(paymentSummary && paymentSummary.total > 0), meta: paymentSummary && paymentSummary.total > 0 ? moneyValue(paymentSummary.total) : 'Quote total pending' },
      { label: 'Booking hold status', ready: bookingSummary.total > 0, meta: bookingSummary.total > 0 ? `${bookingSummary.total} booking items` : 'No booking items yet' },
    ];
  }

  if (kind === 'travel_pack') {
    return [
      { label: 'Payment cleared', ready: Boolean(paymentSummary?.paid), meta: paymentSummary?.paid ? 'Cleared' : 'Not cleared' },
      { label: 'Bookings released', ready: bookingSummary.ready, meta: bookingSummary.ready ? 'Held or confirmed' : `${bookingSummary.blocked} open` },
      { label: 'Pack ready', ready: isTravelPackReady, meta: isTravelPackReady ? 'Ready to send' : 'Checklist open' },
    ];
  }

  if (kind === 'follow_up') {
    return [
      { label: 'Next action', ready: true, meta: 'Follow-up can be sent anytime' },
      { label: 'Owner context', ready: true, meta: 'CRM owner visible' },
      { label: 'Client channel', ready: true, meta: 'Use preferred channel' },
    ];
  }

  return [
    { label: 'Proposal preview', ready: hasProposalPreview, meta: hasProposalPreview ? 'Preview ready' : 'Proposal preview pending' },
    { label: 'Package gate', ready: isPackageReady, meta: isPackageReady ? 'Package ready' : 'Package not ready' },
    { label: 'Client total', ready: Boolean(paymentSummary && paymentSummary.total > 0), meta: paymentSummary && paymentSummary.total > 0 ? moneyValue(paymentSummary.total) : 'Quote total pending' },
  ];
}

function communicationLogItems(lead: CrmLead, quote: CrmQuote | null, isTravelPackReady: boolean, records: CrmCommunicationRecord[] = []) {
  if (records.length > 0) {
    return records.map((record) => ({
      type: communicationKindLabels[record.kind],
      channel: communicationChannelLabels[record.channel],
      owner: record.sentByName || crmOwnerFallback(lead),
      status: record.status === 'sent' ? 'Sent' : record.status === 'ready' ? 'Ready' : record.status === 'failed' ? 'Failed' : record.status,
      meta: record.sentAt ? formatDate(record.sentAt) : record.followUpDue ? `Follow-up ${formatDate(record.followUpDue)}` : formatDate(record.updatedAt),
    }));
  }

  const items = [
    {
      type: 'Intake confirmation',
      channel: lead.preferredContact || 'Website',
      owner: leadOwner(lead),
      status: 'Logged',
      meta: formatDate(lead.createdAt),
    },
  ];

  if (quote?.sentAt || lead.status === 'proposal' || lead.status === 'won' || lead.status === 'execution' || lead.status === 'completed') {
    items.push({
      type: 'Proposal sent',
      channel: 'Email',
      owner: leadOwner(lead),
      status: quote?.status === 'accepted' ? 'Accepted' : 'Awaiting response',
      meta: quote?.sentAt ? formatDate(quote.sentAt) : 'Ready to send',
    });
  }

  if (lead.status === 'won' || lead.status === 'execution' || lead.status === 'completed') {
    items.push({
      type: 'Payment request',
      channel: lead.preferredContact || 'Email',
      owner: crmOwnerFallback(lead),
      status: lead.status === 'execution' || lead.status === 'completed' ? 'Cleared' : 'Sent / pending proof',
      meta: quote?.validUntil || 'Due date pending',
    });
  }

  if (isTravelPackReady || lead.status === 'execution' || lead.status === 'completed') {
    items.push({
      type: 'Travel pack',
      channel: 'Email + WhatsApp',
      owner: leadOwner(lead),
      status: isTravelPackReady ? 'Ready to send' : 'Drafting',
      meta: lead.dates || 'Travel dates pending',
    });
  }

  return items;
}

function crmOwnerFallback(lead: CrmLead) {
  return leadOwner(lead);
}

function leisureWorkbenchRows(lead: CrmLead): LeisureWorkbenchRow[] {
  if (lead.serviceKey === 'luxury') {
    return [
      { service: 'Flights', supplier: 'Premium long-haul partners', status: lead.status === 'proposal' ? 'Held' : 'Researching', cost: 5400, sell: 6100 },
      { service: 'Hotel', supplier: 'Preferred luxury property', status: lead.status === 'won' || lead.status === 'execution' ? 'Selected' : 'Shortlisted', cost: 11600, sell: 13850 },
      { service: 'Transfers', supplier: 'Private ground desk', status: 'Draft', cost: 780, sell: 1200 },
      { service: 'Experiences', supplier: 'Concierge partners', status: 'Curating', cost: 980, sell: 1680 },
    ];
  }

  return [
    { service: 'Flights', supplier: 'Regional fare partners', status: lead.status === 'proposal' ? 'Quoted' : 'Researching', cost: 1450, sell: 1760 },
    { service: 'Hotel', supplier: 'Selected leisure hotel mix', status: lead.status === 'won' || lead.status === 'execution' ? 'Selected' : 'Shortlisted', cost: 2150, sell: 2670 },
    { service: 'Transfers', supplier: 'Ground transport partner', status: 'Draft', cost: 240, sell: 420 },
    { service: 'Activities', supplier: 'Destination operators', status: 'Curating', cost: 320, sell: 620 },
  ];
}

function leisurePackageOptions(lead: CrmLead): LeisurePackageOption[] {
  if (lead.serviceKey === 'luxury') {
    return [
      { name: 'Signature Escape', price: 19850, fit: 'High privacy + premium pacing', recommendation: 'Best fit for emotional impact and service level.' },
      { name: 'Prestige Journey', price: 22800, fit: 'VIP handling + stronger experience layer', recommendation: 'Good when the client wants a more elevated service frame.' },
      { name: 'Ultra Private', price: 26400, fit: 'Maximum exclusivity + concierge handling', recommendation: 'Use only if budget flexibility is confirmed.' },
    ];
  }

  return [
    { name: 'Comfort Explorer', price: 4380, fit: 'Balanced comfort and practical routing', recommendation: 'Good base option for value-sensitive travelers.' },
    { name: 'Signature Balance', price: 5240, fit: 'Stronger hotel fit + smoother logistics', recommendation: 'Recommended package for best value and experience fit.' },
    { name: 'Premium Leisure', price: 6180, fit: 'Elevated stay + extra experiences', recommendation: 'Offer as an upsell when the traveler is flexible.' },
  ];
}

function leadOwner(lead: CrmLead) {
  return ownerByService[lead.serviceKey];
}

function clientLabel(client: CrmClient) {
  return client.clientType === 'corporate' ? (client.companyName || client.name) : client.name;
}

function clientSegment(client: CrmClient) {
  return client.clientType === 'corporate' ? 'Corporate Account' : client.serviceLevel === 'luxury' ? 'Private Prestige Client' : 'Private Client';
}

function normalizeLookupValue(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhoneLookup(value: string) {
  return value.replace(/\D/g, '');
}

function findMatchingClientRecord(clients: CrmClient[], input: ReturnType<typeof emptyClientRegistration>) {
  const email = normalizeLookupValue(input.email);
  const phone = normalizePhoneLookup(input.phone);
  const companyName = normalizeLookupValue(input.companyName);

  return (
    clients.find((client) => {
      if (email && normalizeLookupValue(client.email) === email) return true;
      if (phone && normalizePhoneLookup(client.phone) === phone) return true;
      if (input.clientType === 'corporate' && companyName && normalizeLookupValue(client.companyName) === companyName) return true;
      return false;
    }) ?? null
  );
}

function canEditManagedUser(actor: CrmSession['user'] | null | undefined, target: CrmManagedUser) {
  if (!actor || !canManageUsers(actor)) return false;
  if (actor.role === 'admin') return true;
  if (actor.role === 'manager') return target.role === 'agent' || target.role === 'viewer' || target.role === 'client' || target.role === 'none';
  return false;
}

function processForLead(lead: CrmLead) {
  const process = (isCorporateLead(lead) ? corporateStatusProcess : traditionalStatusProcess)[lead.status];
  return {
    ...process,
    nextAction: `${process.nextAction} Focus on ${serviceProcessFocus[lead.serviceKey]}.`,
  };
}

function leadTasks(lead: CrmLead): ProcessTask[] {
  const process = processForLead(lead);
  const priority = fallbackPriority(lead);
  const due = priority === 'urgent' ? 'Due now' : priority === 'high' ? 'Today' : priority === 'normal' ? '24h' : 'This week';
  return process.taskTitles.map((title, index) => ({
    title,
    due: index === 0 ? due : index === 1 ? 'Next step' : 'Before stage move',
    tone: index === 0 && (priority === 'urgent' || priority === 'high') ? 'urgent' : index === 2 ? 'upcoming' : 'normal',
  }));
}

function workflowHistory(lead: CrmLead): ProcessHistoryItem[] {
  const currentStage = leadLifecycleStage(lead);
  const activeIndex = lifecycleWorkflowSteps.findIndex(([stage]) => stage === currentStage);
  const visibleSteps =
    currentStage === 'closed'
      ? lifecycleWorkflowSteps.slice(0, 3)
      : lifecycleWorkflowSteps.slice(0, Math.max(1, activeIndex + 1));

  const history: ProcessHistoryItem[] = [
    {
      label: 'Website request received',
      meta: formatDate(lead.createdAt),
      tone: 'done',
    },
    {
      label: `Assigned to ${leadOwner(lead)}`,
      meta: `${typeLabels[lead.serviceKey]} · ${leadFlowTitle(lead)}`,
      tone: 'done',
    },
    ...visibleSteps.slice(1).map(([stage], index) => ({
      label: lifecycleStageLabels[stage],
      meta: currentStage !== 'closed' && index === visibleSteps.length - 2 ? 'Current value-chain stage' : 'Completed value-chain gate',
      tone: currentStage !== 'closed' && index === visibleSteps.length - 2 ? ('current' as const) : ('done' as const),
    })),
  ];

  if (currentStage === 'closed') {
    history.push({
      label: 'Request cancelled or closed',
      meta: 'Record reason and nurture if relevant',
      tone: 'closed',
    });
  }

  return history;
}

function exportCsv(leads: CrmLead[]) {
  const headers = [
    'Created',
    'Type',
    'Service',
    'Status',
    'Lifecycle stage',
    'Priority',
    'Name',
    'Email',
    'WhatsApp',
    'Preferred contact',
    'Requested services',
    'Trip type',
    'Departure city',
    'Destination',
    'Dates',
    'Travelers',
    'Budget',
    'Urgency',
    'Notes',
    'Internal notes',
  ];
  const rows = leads.map((lead) => [
    lead.createdAt,
    typeLabels[lead.serviceKey] ?? lead.serviceKey,
    lead.service,
    statusLabels[lead.status],
    leadLifecycleLabel(lead),
    priorityLabels[fallbackPriority(lead)],
    lead.name,
    lead.email,
    lead.whatsapp,
    lead.preferredContact,
    lead.requestedServices,
    lead.tripType,
    lead.departureCity,
    lead.destination,
    lead.dates,
    lead.travelers,
    lead.budget,
    lead.urgency,
    lead.notes,
    lead.internalNotes,
  ]);
  const csv = [headers, ...rows].map((row) => row.map((cell) => csvEscape(cell)).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dpm-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportClientsCsv(clients: CrmClient[]) {
  const headers = ['Created', 'Name', 'Type', 'Company', 'Email', 'Phone', 'Preferred contact', 'Service level', 'Owner', 'Open requests', 'Notes'];
  const rows = clients.map((client) => [
    client.createdAt,
    client.name,
    client.clientType,
    client.companyName,
    client.email,
    client.phone,
    client.preferredContact,
    client.serviceLevel,
    client.owner,
    client.activeRequestCount,
    client.notes,
  ]);
  const csv = [headers, ...rows].map((row) => row.map((cell) => csvEscape(cell)).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dpm-clients-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function CrmBrandMark({ theme }: { theme: CrmTheme }) {
  return (
    <div className="max-w-[208px]">
      <BrandLockup
        src={classicLogo}
        alt="Destinos pelo Mundo"
        theme={theme === 'light' ? 'dark' : 'light'}
        compact
        align="left"
        gapClass="gap-2.5"
        logoSize="h-10"
        logoArtScale="scale-[1.06]"
        logoArtOffset="translate-x-0"
        wordmarkWidthClass="w-[10.75rem] max-w-[calc(100vw-9rem)]"
      />
    </div>
  );
}

function emptyManualRequest(): Record<string, string> {
  return {
    serviceKey: 'classic',
    name: '',
    phone: '',
    email: '',
    destination: '',
    departureCity: '',
    startDate: '',
    endDate: '',
    travelers: '',
    budget: '',
    notes: '',
  };
}

function emptyUserForm(): UserFormState {
  return {
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'viewer',
    isActive: true,
    password: '',
  };
}

function emptyQuoteLineDraft(): QuoteLineDraft {
  return {
    category: 'flight',
    supplier: '',
    description: '',
    quantity: '1',
    unitCost: '0.00',
    unitSell: '0.00',
    status: 'research',
    notes: '',
  };
}

function emptyCorporateOutputDraft(): CorporateOutputDraft {
  return {
    quoteAmount: '',
    quoteCurrency: 'USD',
    quoteValidUntil: '',
    quoteStatus: 'draft',
    quoteNotes: '',
    bookingReference: '',
    bookingSupplierSummary: '',
    bookingTotalCost: '',
    bookingCurrency: 'USD',
    bookingStatus: 'pending',
    invoiceAmount: '',
    invoiceCurrency: 'USD',
    invoiceStatus: 'draft',
    invoiceDueDate: '',
    invoiceNotes: '',
    paymentAmount: '',
    paymentCurrency: 'USD',
    paymentMethod: 'bank_transfer',
    paymentStatus: 'pending',
    paymentReference: '',
    paymentNotes: '',
  };
}

function corporateOutputDraftFromTrip(trip: CorporateTripRequest | null): CorporateOutputDraft {
  const fallbackAmount = trip?.finalCost ?? trip?.quotedCost ?? '';
  const fallbackCurrency = trip?.invoice?.currency || trip?.booking?.currency || trip?.quote?.currency || 'USD';

  return {
    quoteAmount: trip?.quote?.amount ? String(trip.quote.amount) : fallbackAmount ? String(fallbackAmount) : '',
    quoteCurrency: trip?.quote?.currency || fallbackCurrency,
    quoteValidUntil: trip?.quote?.validUntil || '',
    quoteStatus: trip?.quote?.status || 'draft',
    quoteNotes: trip?.quote?.notes || '',
    bookingReference: trip?.booking?.bookingReference || '',
    bookingSupplierSummary: trip?.booking?.supplierSummary || '',
    bookingTotalCost: trip?.booking?.totalCost ? String(trip.booking.totalCost) : fallbackAmount ? String(fallbackAmount) : '',
    bookingCurrency: trip?.booking?.currency || fallbackCurrency,
    bookingStatus: trip?.booking?.status || 'pending',
    invoiceAmount: trip?.invoice?.amount ? String(trip.invoice.amount) : fallbackAmount ? String(fallbackAmount) : '',
    invoiceCurrency: trip?.invoice?.currency || fallbackCurrency,
    invoiceStatus: trip?.invoice?.status || 'draft',
    invoiceDueDate: trip?.invoice?.dueDate || '',
    invoiceNotes: trip?.invoice?.notes || '',
    paymentAmount: '',
    paymentCurrency: fallbackCurrency,
    paymentMethod: 'bank_transfer',
    paymentStatus: 'pending',
    paymentReference: '',
    paymentNotes: '',
  };
}

function emptyTripDesignDrafts(): TripDesignDrafts {
  return {
    stop: {
      city: '',
      country: '',
      nights: '2',
      purpose: 'leisure',
      arrivalDate: '',
      departureDate: '',
      notes: '',
    },
    stay: {
      stopId: '',
      name: '',
      roomType: '',
      checkIn: '',
      checkOut: '',
      rooms: '1',
      supplier: '',
      bookingStatus: 'quoted',
    },
    movement: {
      mode: 'flight',
      fromCity: '',
      toCity: '',
      departureAt: '',
      arrivalAt: '',
      supplier: '',
      bookingStatus: 'quoted',
    },
    experience: {
      stopId: '',
      title: '',
      category: 'Experience',
      supplier: '',
      status: 'quoted',
    },
  };
}

function emptyCommunicationDraft(): CommunicationDraft {
  return {
    kind: 'proposal',
    channel: 'email',
    message: '',
    followUpDue: '24h',
  };
}

export function CrmPage() {
  const apiEnabled = hasCrmApi();
  const [crmSession, setCrmSession] = useState<CrmSession | null>(() => readCrmSession());
  const [leads, setLeads] = useState<CrmLead[]>(() => (apiEnabled ? [] : readCrmLeads()));
  const [clients, setClients] = useState<CrmClient[]>([]);
  const [quotes, setQuotes] = useState<CrmQuote[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<CrmPaymentRecord[]>([]);
  const [communicationRecords, setCommunicationRecords] = useState<CrmCommunicationRecord[]>([]);
  const [workflowStates, setWorkflowStates] = useState<Record<string, CrmWorkflowState>>({});
  const [workflowReminders, setWorkflowReminders] = useState<CrmWorkflowReminder[]>([]);
  const [tripItineraries, setTripItineraries] = useState<CrmTripItinerary[]>([]);
  const [ctmTripRequests, setCtmTripRequests] = useState<CorporateTripRequest[]>([]);
  const [crmUsers, setCrmUsers] = useState<CrmManagedUser[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [crmError, setCrmError] = useState('');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [query, setQuery] = useState('');
  const [deskView, setDeskView] = useState<DeskView>('all');
  const [commandLens, setCommandLens] = useState<CommandLens>('all');
  const [typeFilter, setTypeFilter] = useState<LeadTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [page, setPage] = useState(1);
  const [theme, setTheme] = useState<CrmTheme>(() => readCrmTheme());
  const [activeNav, setActiveNav] = useState<CrmNavId>('command');
  const [showFilters, setShowFilters] = useState(false);
  const [showManualRequest, setShowManualRequest] = useState(false);
  const [manualRequest, setManualRequest] = useState<Record<string, string>>(() => emptyManualRequest());
  const [showClientRegistration, setShowClientRegistration] = useState(false);
  const [clientForm, setClientForm] = useState(() => emptyClientRegistration());
  const [showUserManagementModal, setShowUserManagementModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [userForm, setUserForm] = useState<UserFormState>(() => emptyUserForm());
  const [quoteLineDraft, setQuoteLineDraft] = useState<QuoteLineDraft>(() => emptyQuoteLineDraft());
  const [selectedCtmReferencesByLead, setSelectedCtmReferencesByLead] = useState<Record<string, string>>({});
  const [corporateOutputDraft, setCorporateOutputDraft] = useState<CorporateOutputDraft>(() => emptyCorporateOutputDraft());
  const [isSavingCorporateOutput, setIsSavingCorporateOutput] = useState(false);
  const [tripDesignDrafts, setTripDesignDrafts] = useState<TripDesignDrafts>(() => emptyTripDesignDrafts());
  const [activeTripDesignEditor, setActiveTripDesignEditor] = useState<TripDesignEditor>('stop');
  const [communicationDraft, setCommunicationDraft] = useState<CommunicationDraft>(() => emptyCommunicationDraft());
  const styles = themeStyles[theme];

  useEffect(() => {
    const session = readCrmSession();
    if (!apiEnabled || !session?.token) return;

    fetchCrmCurrentUser(session)
      .then((user) => {
        if (!user?.canAccessCrm) {
          setCrmSession(null);
          return;
        }
        const nextSession = { ...session, user };
        setCrmSession(nextSession);
        saveCrmSession(nextSession);
      })
      .catch(() => {
        setCrmSession(null);
      });
  }, [apiEnabled, crmSession?.token]);

  useEffect(() => {
    const refresh = () => {
      setIsLoadingLeads(true);
      Promise.all([
        fetchCrmLeads(crmSession),
        fetchCrmClients(crmSession),
        fetchCrmQuotes(crmSession),
        fetchCrmPaymentRecords(crmSession),
        fetchCrmCommunicationRecords(crmSession),
        fetchCrmWorkflowReminders(crmSession, 'pending'),
        fetchCrmTripItineraries(crmSession),
        fetchCtmTripRequests(crmSession),
        canManageUsers(crmSession?.user) ? fetchCrmUsers(crmSession) : Promise.resolve([]),
      ])
        .then(([nextLeads, nextClients, nextQuotes, nextPaymentRecords, nextCommunicationRecords, nextWorkflowReminders, nextItineraries, nextCtmTripRequests, nextUsers]) => {
          setLeads(nextLeads);
          setClients(nextClients);
          setQuotes(nextQuotes);
          setPaymentRecords(nextPaymentRecords);
          setCommunicationRecords(nextCommunicationRecords);
          setWorkflowReminders(nextWorkflowReminders);
          setTripItineraries(nextItineraries);
          setCtmTripRequests(nextCtmTripRequests);
          setCrmUsers(nextUsers);
          setCrmError('');
        })
        .catch((error: Error) => {
          setCrmError(error.message);
        })
        .finally(() => setIsLoadingLeads(false));
    };

    refresh();
    window.addEventListener(CRM_EVENT, refresh);
    window.addEventListener(CRM_AUTH_EVENT, refresh);
    window.addEventListener(CRM_CLIENT_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(CRM_EVENT, refresh);
      window.removeEventListener(CRM_AUTH_EVENT, refresh);
      window.removeEventListener(CRM_CLIENT_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [crmSession, apiEnabled]);

  const filteredLeads = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return leads.filter((lead) => {
      const matchesDesk = deskView === 'all' || (deskView === 'corporate' ? isCorporateLead(lead) : isLeisureLead(lead));
      const matchesWorkspace =
        activeNav === 'leisureStudio'
          ? isLeisureLead(lead)
          : activeNav === 'corporateDesk'
            ? isCorporateLead(lead)
            : true;
      const matchesType = typeFilter === 'all' || lead.serviceKey === typeFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'confirmedGroup'
          ? lead.status === 'won' || lead.status === 'execution' || lead.status === 'completed'
          : statusFilter === 'workflowGroup'
            ? lead.status === 'contacted' || lead.status === 'planning' || lead.status === 'proposal' || lead.status === 'execution'
            : lead.status === statusFilter);
      const priority = fallbackPriority(lead);
      const matchesPriority = priorityFilter === 'all' || (priorityFilter === 'attention' ? priority === 'high' || priority === 'urgent' : priority === priorityFilter);
      const matchesNav = activeNav !== 'calendar' || Boolean(lead.dates);
      const matchesQuery =
        !needle ||
        [
          lead.name,
          lead.contact,
          lead.email,
          lead.whatsapp,
          lead.destination,
          lead.departureCity,
          lead.service,
          lead.requestedServices,
          lead.tripType,
          lead.dates,
          lead.urgency,
          statusLabels[lead.status],
          leadLifecycleLabel(lead),
          processForLead(lead).nextAction,
          lead.notes,
          lead.internalNotes,
        ]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      return matchesDesk && matchesWorkspace && matchesType && matchesStatus && matchesPriority && matchesNav && matchesQuery;
    });
  }, [activeNav, deskView, leads, priorityFilter, query, statusFilter, typeFilter]);

  const filteredClients = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return clients.filter((client) => {
      const matchesDesk = deskView === 'all' || (deskView === 'corporate' ? client.clientType === 'corporate' : client.clientType === 'private');
      const matchesType = typeFilter === 'all' || client.serviceLevel === typeFilter;
      const matchesPriority = priorityFilter === 'all';
      const matchesQuery =
        !needle ||
        [
          client.name,
          client.companyName,
          client.email,
          client.phone,
          client.owner,
          client.notes,
          clientSegment(client),
        ]
          .join(' ')
          .toLowerCase()
          .includes(needle);

      return matchesDesk && matchesType && matchesPriority && matchesQuery;
    });
  }, [clients, deskView, priorityFilter, query, typeFilter]);

  const filteredUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return crmUsers.filter((user) => {
      return (
        !needle ||
        [
          user.displayName,
          user.username,
          user.email,
          crmRoleLabels[user.role as keyof typeof crmRoleLabels] ?? user.role,
          user.groups.join(' '),
        ]
          .join(' ')
          .toLowerCase()
          .includes(needle)
      );
    });
  }, [crmUsers, query]);

  const visibleTypeFilters = deskView === 'corporate' ? (['all', 'corporate'] as LeadTypeFilter[]) : deskView === 'leisure' ? (['all', 'luxury', 'classic'] as LeadTypeFilter[]) : typeFilters;

  const typeCounts = useMemo(() => {
    const clientSource = clients.filter((client) => (deskView === 'all' ? true : deskView === 'corporate' ? client.clientType === 'corporate' : client.clientType === 'private'));
    const leadSource = leads.filter((lead) => (deskView === 'all' ? true : deskView === 'corporate' ? isCorporateLead(lead) : isLeisureLead(lead)));
    return typeFilters.reduce(
      (counts, filter) => ({
        ...counts,
        [filter]:
          filter === 'all'
            ? activeNav === 'clients'
              ? clientSource.length
              : leadSource.length
            : activeNav === 'clients'
              ? clientSource.filter((client) => client.serviceLevel === filter).length
              : leadSource.filter((lead) => lead.serviceKey === filter).length,
      }),
      {} as Record<LeadTypeFilter, number>,
    );
  }, [activeNav, clients, deskView, leads]);

  const commandLeads = useMemo(() => {
    const ranked = [...filteredLeads].filter((lead) => lead.status !== 'completed' && lead.status !== 'lost');
    const lensFiltered = ranked.filter((lead) => {
      if (commandLens === 'corporate') return isCorporateLead(lead);
      if (commandLens === 'leisure') return isLeisureLead(lead);
      if (commandLens === 'attention') return fallbackPriority(lead) === 'high' || fallbackPriority(lead) === 'urgent';
      if (commandLens === 'blocked') return lead.status === 'proposal' || lead.status === 'won';
      if (commandLens === 'ready') return lead.status === 'execution';
      return true;
    });

    return lensFiltered.sort((a, b) => {
      const priorityScore = { urgent: 4, high: 3, normal: 2, low: 1 } as const;
      const delta = priorityScore[fallbackPriority(b)] - priorityScore[fallbackPriority(a)];
      if (delta !== 0) return delta;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [commandLens, filteredLeads]);
  const leadSource = activeNav === 'command' ? commandLeads : filteredLeads;
  const activeItems = activeNav === 'clients' ? filteredClients : activeNav === 'settings' ? filteredUsers : leadSource;
  const totalPages = Math.max(1, Math.ceil(activeItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageLeads = leadSource.slice(pageStart, pageStart + PAGE_SIZE);
  const pageClients = filteredClients.slice(pageStart, pageStart + PAGE_SIZE);
  const pageUsers = filteredUsers.slice(pageStart, pageStart + PAGE_SIZE);
  const selectedLead = leadSource.find((lead) => lead.id === selectedLeadId) ?? pageLeads[0] ?? leadSource[0] ?? null;
  const selectedClient = filteredClients.find((client) => client.id === selectedClientId) ?? pageClients[0] ?? filteredClients[0] ?? null;
  const selectedCtmReference = selectedLead
    ? selectedCtmReferencesByLead[selectedLead.id] ?? selectedLead.ctmRequestId ?? ctmTripRequests[0]?.id ?? null
    : ctmTripRequests[0]?.id ?? null;
  const selectedCtmTrip = ctmTripRequests.find((trip) => trip.id === selectedCtmReference) ?? ctmTripRequests[0] ?? null;
  const selectedCtmSignals = selectedCtmTrip ? buildCorporateDeskSignals(selectedCtmTrip) : [];
  const selectedCtmNextAction = selectedCtmTrip ? getCorporateDeskNextAction(selectedCtmTrip) : 'Link a CTM request before processing corporate workflow actions.';
  const selectedCtmOutputSignature = selectedCtmTrip
    ? [
        selectedCtmTrip.id,
        selectedCtmTrip.quote?.updatedAt ?? '',
        selectedCtmTrip.booking?.updatedAt ?? '',
        selectedCtmTrip.invoice?.updatedAt ?? '',
        selectedCtmTrip.payments[0]?.updatedAt ?? '',
      ].join('|')
    : '';
  const selectedQuotes = selectedLead ? quotes.filter((quote) => quote.leadId === selectedLead.id).sort((a, b) => b.version - a.version) : [];
  const selectedQuote = selectedQuotes[0] ?? null;
  const selectedWorkflowState = selectedLead ? workflowStates[selectedLead.id] ?? null : null;
  const selectedWorkflowReminders = selectedLead ? workflowReminders.filter((reminder) => String(reminder.leadId) === String(selectedLead.id)) : [];
  const selectedPaymentRecords = selectedLead ? paymentRecords.filter((record) => record.leadId === selectedLead.id) : [];
  const selectedCommunicationRecords = selectedLead ? communicationRecords.filter((record) => record.leadId === selectedLead.id) : [];
  const selectedItineraries = selectedLead ? tripItineraries.filter((itinerary) => itinerary.leadId === selectedLead.id).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()) : [];
  const selectedItinerary = selectedItineraries[0] ?? null;
  const selectedProcess = selectedLead ? processForLead(selectedLead) : null;
  const selectedPrimaryBlocker = selectedWorkflowState?.blockers[0]?.detail || (selectedLead ? leadPrimaryBlocker(selectedLead) : '');
  const selectedNextAction = selectedWorkflowState
    ? selectedWorkflowState.canAdvance
      ? `Ready to advance to ${selectedWorkflowState.nextStageLabel || 'next stage'}.`
      : selectedWorkflowState.blockers[0]?.detail || 'Resolve workflow blockers before advancing.'
    : selectedProcess?.nextAction || '';
  const selectedDetailTabs = useMemo(() => {
    if (!selectedLead) return [];
    if (activeNav === 'leisureStudio') return leisureWorkbenchTabs.map((tab) => tab.id);
    if (activeNav === 'corporateDesk') return corporateWorkbenchTabs.map((tab) => tab.id);
    return detailTabsForLead(selectedLead);
  }, [activeNav, selectedLead]);
  const selectedTasks = selectedLead ? leadTasks(selectedLead) : [];
  const selectedBriefing = selectedLead ? briefingReadiness(selectedLead) : null;
  const selectedHistory = selectedLead ? workflowHistory(selectedLead) : [];
  const selectedStatusCards = selectedLead ? leftRailStatusCards(selectedLead) : [];
  const selectedItinerarySummary = selectedLead ? itinerarySummaryCards(selectedLead, selectedItinerary) : [];
  const selectedItineraryStops = selectedItinerary ? itineraryStopsFromBackend(selectedItinerary) : selectedLead ? itineraryStops(selectedLead) : [];
  const selectedItineraryExperiences = selectedItinerary ? itineraryExperiencesFromBackend(selectedItinerary) : selectedLead ? itineraryExperiences(selectedLead) : [];
  const selectedTransportSegments = selectedItinerary ? [...selectedItinerary.transports].sort((a, b) => a.sequenceNumber - b.sequenceNumber) : [];
  const selectedTripDesignReadiness = selectedLead ? tripDesignReadiness(selectedLead, selectedItinerary, selectedItineraryStops, selectedItineraryExperiences) : [];
  const selectedCostingGateItems = costingGateItems(selectedQuote, selectedItinerary, selectedItineraryStops);
  const selectedPackageGateItems = packageGateItems(selectedQuote);
  const isCostingReady = selectedCostingGateItems.every((item) => item.ready);
  const isPackageReady = selectedPackageGateItems.every((item) => item.ready);
  const selectedClientProposalSections = clientProposalSections(selectedQuote);
  const selectedPaymentSummary = selectedLead ? paymentWorkflowSummary(selectedLead, selectedQuote, selectedPaymentRecords) : null;
  const selectedBookingSummary = bookingConfirmationSummary(selectedQuote);
  const selectedTravelPackReadinessItems = selectedLead && selectedPaymentSummary ? travelPackReadinessItems(selectedLead, selectedQuote, selectedItinerary, selectedItineraryStops, selectedTransportSegments, selectedItineraryExperiences, selectedPaymentSummary.paid, selectedBookingSummary.ready) : [];
  const isTravelPackReady = selectedTravelPackReadinessItems.every((item) => item.ready);
  const selectedCommunicationReadinessItems = selectedLead ? communicationReadinessItems(communicationDraft.kind, selectedClientProposalSections.length > 0, isPackageReady, selectedPaymentSummary, selectedBookingSummary, isTravelPackReady) : [];
  const isCommunicationReady = selectedCommunicationReadinessItems.every((item) => item.ready);
  const selectedCommunicationMessage = selectedLead ? communicationDraft.message || communicationTemplate(communicationDraft.kind, selectedLead, selectedQuote, selectedPaymentSummary, isTravelPackReady) : '';
  const selectedCommunicationLog = selectedLead ? communicationLogItems(selectedLead, selectedQuote, isTravelPackReady, selectedCommunicationRecords) : [];
  const selectedStoredTravelDates = selectedLead ? parseStoredTravelDates(selectedLead.dates) : { startDate: null, endDate: null };
  const selectedTripDateRange = {
    startDate: selectedItinerary?.startDate ?? selectedStoredTravelDates.startDate,
    endDate: selectedItinerary?.endDate ?? selectedStoredTravelDates.endDate,
  };
  const selectedReminderGeneration = workflowReminderGenerationAvailability(
    selectedLead,
    selectedWorkflowState,
    selectedWorkflowReminders,
    selectedPaymentRecords,
    selectedCommunicationRecords,
    selectedQuotes,
  );
  const selectedStayStopId = tripDesignDrafts.stay.stopId || selectedItinerary?.stops[0]?.id || '';
  const selectedStayStop = selectedItinerary?.stops.find((stop) => stop.id === selectedStayStopId) ?? null;
  const selectedLeisureRows = selectedLead ? leisureWorkbenchRows(selectedLead) : [];
  const selectedLeisurePackages = selectedLead ? leisurePackageOptions(selectedLead) : [];
  const managerMeta = selectedLead ? extractManagerBoardMeta(selectedLead.internalNotes) : null;
  const traditionalPageLeads = pageLeads.filter((lead) => !isCorporateLead(lead));
  const corporatePageLeads = pageLeads.filter((lead) => isCorporateLead(lead));
  const leadSections =
    activeNav === 'leisureStudio'
      ? [
          {
            key: 'leisure-studio',
            title: 'Leisure Studio Queue',
            subtitle: 'Classic and luxury requests moving through discovery, trip design, proposal, payment, and delivery.',
            leads: traditionalPageLeads,
          },
        ].filter((section) => section.leads.length > 0)
      : activeNav === 'corporateDesk'
        ? [
            {
              key: 'corporate-desk',
              title: 'Corporate Desk Queue',
              subtitle: 'Company travel work driven by traveler readiness, approvals, policy fit, finance, and fulfilment.',
              leads: corporatePageLeads,
            },
          ].filter((section) => section.leads.length > 0)
        : [
            {
              key: 'traditional',
              title: 'Traditional trips',
              subtitle: 'Classic and luxury requests moving through discovery, trip design, proposal, and delivery.',
              leads: traditionalPageLeads,
            },
            {
              key: 'corporate',
              title: 'Corporate accounts',
              subtitle: 'Company travel work driven by traveler readiness, approvals, policy fit, and invoice-aware fulfilment.',
              leads: corporatePageLeads,
            },
          ].filter((section) => section.leads.length > 0);
  const selectedClientLeads = selectedClient ? leads.filter((lead) => lead.clientId === selectedClient.id) : [];
  useEffect(() => {
    setCorporateOutputDraft(corporateOutputDraftFromTrip(selectedCtmTrip));
  }, [selectedCtmOutputSignature, selectedCtmTrip]);

  useEffect(() => {
    if (!selectedLead || !apiEnabled || !crmSession?.token) return;
    let isMounted = true;
    fetchCrmWorkflowState(selectedLead.id, crmSession)
      .then((state) => {
        if (!isMounted || !state) return;
        setWorkflowStates((current) => ({ ...current, [selectedLead.id]: state }));
      })
      .catch((error: Error) => {
        if (isMounted) setCrmError(error.message);
      });
    return () => {
      isMounted = false;
    };
  }, [apiEnabled, crmSession, selectedLead]);

  useEffect(() => {
    if (selectedLead && !selectedDetailTabs.includes(detailTab)) {
      setDetailTab(selectedDetailTabs[0] ?? 'overview');
    }
  }, [detailTab, selectedDetailTabs, selectedLead]);

  const potentialClientMatch = useMemo(() => findMatchingClientRecord(clients, clientForm), [clients, clientForm]);
  const manageableRoleOptions = useMemo<Array<keyof typeof crmRoleLabels>>(() => {
    if (crmSession?.user.role === 'admin') return ['admin', 'manager', 'agent', 'viewer'];
    if (crmSession?.user.role === 'manager') return ['agent', 'viewer'];
    return [];
  }, [crmSession?.user.role]);

  const newCount = leads.filter((lead) => lead.status === 'new').length;
  const qualificationCount = leads.filter((lead) => lead.status === 'contacted').length;
  const proposalsCount = leads.filter((lead) => lead.status === 'proposal').length;
  const confirmedCount = leads.filter((lead) => lead.status === 'won' || lead.status === 'execution' || lead.status === 'completed').length;
  const leisureLeads = leads.filter(isLeisureLead);
  const corporateLeads = leads.filter(isCorporateLead);
  const leisureNewCount = leisureLeads.filter((lead) => lead.status === 'new').length;
  const leisureProposalCount = leisureLeads.filter((lead) => lead.status === 'proposal').length;
  const leisurePaymentCount = leisureLeads.filter((lead) => lead.status === 'won').length;
  const leisureTravelPackCount = leisureLeads.filter((lead) => lead.status === 'execution' || lead.status === 'completed').length;
  const corporateIntakeCount = corporateLeads.filter((lead) => lead.status === 'new' || lead.status === 'contacted').length;
  const corporatePlanningCount = corporateLeads.filter((lead) => lead.status === 'planning' || lead.status === 'proposal').length;
  const corporateFinanceCount = corporateLeads.filter((lead) => lead.status === 'won').length;
  const corporateFulfilmentCount = corporateLeads.filter((lead) => lead.status === 'execution' || lead.status === 'completed').length;
  const urgentNewCount = leads.filter((lead) => lead.status === 'new' && (fallbackPriority(lead) === 'urgent' || fallbackPriority(lead) === 'high')).length;
  const taskCount = workflowReminders.length || leads.filter((lead) => fallbackPriority(lead) === 'urgent' || fallbackPriority(lead) === 'high').length;
  const calendarCount = leads.filter((lead) => Boolean(lead.dates) && lead.status !== 'lost' && lead.status !== 'completed').length;
  const clientCount = clients.length;
  const activeUserCount = crmUsers.filter((user) => user.isActive).length;
  const managerAdminCount = crmUsers.filter((user) => user.role === 'admin' || user.role === 'manager').length;
  const activeAgentCount = crmUsers.filter((user) => user.role === 'agent' && user.isActive).length;
  const inactiveUserCount = crmUsers.filter((user) => !user.isActive).length;
  const navCounts: Partial<Record<CrmNavId, number>> = {
    command: newCount,
    leisureStudio: leisureLeads.filter((lead) => lead.status !== 'lost').length,
    corporateDesk: corporateLeads.filter((lead) => lead.status !== 'lost').length,
    tasks: taskCount,
    calendar: calendarCount,
    clients: clientCount,
    reports: filteredLeads.length,
    settings: crmUsers.length,
  };
  const navCopy: Record<CrmNavId, { title: string; subtitle: string }> = {
    command: { title: 'Command Center', subtitle: 'Incoming requests from website forms and phone intake' },
    leisureStudio: { title: 'Leisure Studio', subtitle: 'Classic and luxury trip workspaces for proposal, payment, itinerary, and travel-pack delivery' },
    corporateDesk: { title: 'Corporate Desk', subtitle: 'Corporate request workspace for travelers, approvals, finance, documents, and fulfilment' },
    tasks: { title: 'Priority Tasks', subtitle: 'Backend workflow reminders and high-attention requests that need action from the team' },
    calendar: { title: 'Travel Calendar', subtitle: 'Requests with travel dates, useful for upcoming movement planning' },
    clients: { title: 'Clients', subtitle: 'Client and company requests captured in the CRM pipeline' },
    reports: { title: 'Reports', subtitle: 'Filtered CRM data ready for export and review' },
    settings: { title: 'Settings', subtitle: 'CRM access, user roles, and operating preferences' },
  };
  const requestCentricNav = activeNav !== 'clients' && activeNav !== 'settings' && activeNav !== 'command';
  const commandMetricCards: MetricCard[] = [
    {
      label: 'At Risk',
      value: leads.filter((lead) => fallbackPriority(lead) === 'high' || fallbackPriority(lead) === 'urgent').length,
      meta: 'Highest manager attention',
      Icon: Inbox,
      filter: 'all',
    },
    {
      label: 'Blocked',
      value: leads.filter((lead) => lead.status === 'proposal' || lead.status === 'won').length,
      meta: 'Waiting on decision, payment, or finance',
      Icon: Briefcase,
      filter: 'proposal',
    },
    {
      label: 'Ready to Advance',
      value: leads.filter((lead) => lead.status === 'execution').length,
      meta: 'Operationally aligned to move',
      Icon: Bell,
      filter: 'confirmedGroup',
    },
    {
      label: 'Reminders',
      value: workflowReminders.length,
      meta: 'Generated by workflow engine',
      Icon: CheckSquare,
      filter: 'all',
    },
    {
      label: 'Leisure',
      value: leads.filter((lead) => isLeisureLead(lead)).length,
      meta: 'Classic and luxury requests',
      Icon: CheckSquare,
      filter: 'all',
    },
    {
      label: 'Corporate',
      value: leads.filter((lead) => isCorporateLead(lead)).length,
      meta: 'Approval and finance flow',
      Icon: Briefcase,
      filter: 'all',
    },
  ];
  const metricCards: MetricCard[] =
    activeNav === 'command'
      ? commandMetricCards
      : deskView === 'leisure'
      ? [
          { label: 'New Leisure Requests', value: leisureNewCount, meta: `${leisureLeads.filter((lead) => fallbackPriority(lead) === 'high' || fallbackPriority(lead) === 'urgent').length} priority`, Icon: Inbox, filter: 'new' },
          { label: 'Trip Design', value: leisureLeads.filter((lead) => lead.status === 'contacted' || lead.status === 'planning').length, meta: 'Clarification and design work', Icon: Sparkles, filter: 'workflowGroup' },
          { label: 'Client Decision', value: leisureProposalCount, meta: 'Quotes awaiting answer', Icon: FileText, filter: 'proposal' },
          { label: 'Payment / Travel Pack', value: leisurePaymentCount + leisureTravelPackCount, meta: 'Confirmed and delivering', Icon: CheckSquare, filter: 'confirmedGroup' },
        ]
      : deskView === 'corporate'
        ? [
            { label: 'Corporate Intake', value: corporateIntakeCount, meta: 'Qualification and account setup', Icon: Inbox, filter: 'new' },
            { label: 'Planning + Quote', value: corporatePlanningCount, meta: 'Travel brief and proposal work', Icon: Briefcase, filter: 'workflowGroup' },
            { label: 'Finance Clearance', value: corporateFinanceCount, meta: 'Approved movement before booking', Icon: FileText, filter: 'won' },
            { label: 'Fulfilment', value: corporateFulfilmentCount, meta: 'Booked and executing', Icon: CheckSquare, filter: 'confirmedGroup' },
          ]
        : [
            { label: 'New Requests', value: newCount, meta: `${urgentNewCount} priority`, Icon: Inbox, filter: 'new' },
            { label: 'In Qualification', value: qualificationCount, meta: 'View all', Icon: Mail, filter: 'contacted' },
            { label: 'Proposals Sent', value: proposalsCount, meta: 'View all', Icon: FileText, filter: 'proposal' },
            { label: 'Confirmed Trips', value: confirmedCount, meta: 'View all', Icon: CheckSquare, filter: 'confirmedGroup' },
          ];
  const settingsMetricCards: MetricCard[] = [
    { label: 'CRM Users', value: crmUsers.length, meta: `${activeUserCount} active`, Icon: Users },
    { label: 'Managers + Admins', value: managerAdminCount, meta: 'Access control roles', Icon: Shield },
    { label: 'Active Agents', value: activeAgentCount, meta: 'Operational users', Icon: Briefcase },
    { label: 'Inactive Accounts', value: inactiveUserCount, meta: 'Review before reactivation', Icon: Lock },
  ];

  async function reloadLeads() {
    const nextLeads = await fetchCrmLeads(crmSession);
    setLeads(nextLeads);
    return nextLeads;
  }

  async function reloadClients() {
    const nextClients = await fetchCrmClients(crmSession);
    setClients(nextClients);
    return nextClients;
  }

  async function reloadUsers() {
    if (!canManageUsers(crmSession?.user)) {
      setCrmUsers([]);
      return [];
    }
    const nextUsers = await fetchCrmUsers(crmSession);
    setCrmUsers(nextUsers);
    return nextUsers;
  }

  async function reloadQuotes() {
    const nextQuotes = await fetchCrmQuotes(crmSession);
    setQuotes(nextQuotes);
    return nextQuotes;
  }

  async function reloadPaymentRecords() {
    const nextPaymentRecords = await fetchCrmPaymentRecords(crmSession);
    setPaymentRecords(nextPaymentRecords);
    return nextPaymentRecords;
  }

  async function reloadCommunicationRecords() {
    const nextCommunicationRecords = await fetchCrmCommunicationRecords(crmSession);
    setCommunicationRecords(nextCommunicationRecords);
    return nextCommunicationRecords;
  }

  async function reloadWorkflowState(leadId: string) {
    const nextWorkflowState = await fetchCrmWorkflowState(leadId, crmSession);
    if (nextWorkflowState) {
      setWorkflowStates((current) => ({ ...current, [leadId]: nextWorkflowState }));
    }
    return nextWorkflowState;
  }

  async function reloadWorkflowReminders() {
    const nextWorkflowReminders = await fetchCrmWorkflowReminders(crmSession, 'pending');
    setWorkflowReminders(nextWorkflowReminders);
    return nextWorkflowReminders;
  }

  async function reloadCtmTripRequests() {
    const nextTripRequests = await fetchCtmTripRequests(crmSession);
    setCtmTripRequests(nextTripRequests);
    return nextTripRequests;
  }

  async function reloadItineraries() {
    const nextItineraries = await fetchCrmTripItineraries(crmSession);
    setTripItineraries(nextItineraries);
    return nextItineraries;
  }

  function updateTripDesignDraft<S extends keyof TripDesignDrafts, K extends keyof TripDesignDrafts[S]>(
    section: S,
    field: K,
    value: TripDesignDrafts[S][K],
  ) {
    setTripDesignDrafts((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }));
  }

  async function ensureTripItineraryForLead(lead: CrmLead) {
    if (selectedItinerary) return selectedItinerary;
    const storedDates = parseStoredTravelDates(lead.dates);

    const itinerary = await createCrmTripItineraryRecord(
      {
        leadId: lead.id,
        title: `${lead.destination || lead.name} trip design`,
        status: 'draft',
        startDate: storedDates.startDate,
        endDate: storedDates.endDate,
        notes: 'Created from the CRM Trip Design workspace.',
      },
      crmSession,
    );
    await reloadItineraries();
    return itinerary;
  }

  function quoteHasLine(description: string) {
    return Boolean(selectedQuote?.lines.some((line) => line.description.trim().toLowerCase() === description.trim().toLowerCase()));
  }

  async function linkTripDesignItemToQuote(input: {
    category: QuoteLineCategory;
    description: string;
    supplier?: string;
    notes?: string;
  }) {
    if (!selectedLead) return;
    const description = input.description.trim();
    if (!description) {
      setCrmError('Quote line description is required.');
      return;
    }
    if (quoteHasLine(description)) {
      setCrmError('This item is already linked to the active quote.');
      return;
    }

    try {
      const quote = selectedQuote ?? (await createDraftQuoteForLead(selectedLead));
      if (!quote) return;
      await createCrmQuoteLineRecord(
        {
          quoteId: quote.id,
          category: input.category,
          supplier: input.supplier || '',
          description,
          quantity: '1',
          unitCost: '0.00',
          unitSell: '0.00',
          status: 'research',
          confirmationReference: '',
          supplierDeadline: null,
          bookingOwner: '',
          bookingNotes: '',
          confirmedAt: null,
          notes: input.notes || 'Linked from Trip Design. Add supplier cost and client sell in Costing.',
        },
        crmSession,
      );
      await reloadQuotes();
      setCrmError('');
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : 'Could not link item to quote.');
    }
  }

  function openCostingWithGate() {
    if (!isCostingReady) {
      const missing = selectedCostingGateItems.filter((item) => !item.ready).map((item) => item.label).join(', ');
      setCrmError(`Costing is not ready yet: ${missing}.`);
      return;
    }
    setCrmError('');
    setDetailTab('costing');
  }

  function openPackageWithGate() {
    if (!isPackageReady) {
      const missing = selectedPackageGateItems.filter((item) => !item.ready).map((item) => item.label).join(', ');
      setCrmError(`Package is not ready yet: ${missing}.`);
      return;
    }
    setCrmError('');
    setDetailTab('package');
  }

  function prepareCommunication(kind: CommunicationKind) {
    if (!selectedLead) return;
    setCommunicationDraft((current) => ({
      ...current,
      kind,
      message: communicationTemplate(kind, selectedLead, selectedQuote, selectedPaymentSummary, isTravelPackReady),
    }));
    setDetailTab('clientReview');
  }

  function updateCommunicationKind(kind: CommunicationKind) {
    if (!selectedLead) return;
    setCommunicationDraft((current) => ({
      ...current,
      kind,
      message: communicationTemplate(kind, selectedLead, selectedQuote, selectedPaymentSummary, isTravelPackReady),
    }));
  }

  async function saveCommunicationRecord(status: CrmCommunicationRecord['status']) {
    if (!selectedLead) return;
    try {
      await createCrmCommunicationRecord(
        {
          leadId: selectedLead.id,
          quoteId: selectedQuote?.id ?? null,
          kind: communicationDraft.kind,
          channel: communicationDraft.channel,
          status,
          subject: communicationKindLabels[communicationDraft.kind],
          message: selectedCommunicationMessage,
          sentBy: crmSession?.user.id ?? null,
          sentAt: status === 'sent' ? new Date().toISOString() : null,
          followUpDue: null,
          responseStatus: status === 'sent' ? 'awaiting' : 'none',
          notes: communicationDraft.followUpDue ? `Follow-up: ${communicationDraft.followUpDue}` : '',
        },
        crmSession,
      );
      await reloadCommunicationRecords();
      setCrmError('');
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : 'Could not save communication record.');
    }
  }

  async function createPaymentCheckpoint() {
    if (!selectedLead) return;
    const quoteCurrency = selectedQuote?.currency ?? 'USD';
    const expectedAmount = selectedPaymentSummary && selectedPaymentSummary.deposit > 0 ? selectedPaymentSummary.deposit : Number(selectedQuote?.subtotalSell ?? 0);

    try {
      await createCrmPaymentRecord(
        {
          leadId: selectedLead.id,
          quoteId: selectedQuote?.id ?? null,
          paymentType: 'deposit',
          status: 'pending',
          currency: quoteCurrency,
          amountExpected: expectedAmount.toFixed(2),
          amountReceived: '0.00',
          dueDate: selectedQuote?.validUntil ?? null,
          receivedAt: null,
          proofReceived: false,
          proofReference: '',
          notes: 'Created from CRM payment workflow.',
        },
        crmSession,
      );
      await reloadPaymentRecords();
      setCrmError('');
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : 'Could not create payment record.');
    }
  }

  async function markPaymentRecordPaid(record: CrmPaymentRecord) {
    try {
      await updateCrmPaymentRecord(
        record.id,
        {
          status: 'paid',
          amountReceived: record.amountExpected,
          receivedAt: new Date().toISOString(),
          proofReceived: true,
          proofReference: record.proofReference || 'CRM payment workflow',
        },
        crmSession,
      );
      await reloadPaymentRecords();
      setCrmError('');
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : 'Could not update payment record.');
    }
  }

  async function generateWorkflowReminders() {
    if (!selectedReminderGeneration.available) {
      setCrmError(selectedReminderGeneration.reason);
      return;
    }

    try {
      const result = await generateCrmWorkflowReminders(crmSession, selectedLead?.id);
      if (result.reminders.length > 0) {
        setWorkflowReminders((current) => {
          const nextById = new Map(current.map((reminder) => [reminder.id, reminder]));
          result.reminders.forEach((reminder) => nextById.set(reminder.id, reminder));
          return Array.from(nextById.values());
        });
      }
      await reloadWorkflowReminders();
      if (selectedLead) await reloadWorkflowState(selectedLead.id);
      if (result.created === 0 && result.reminders.length === 0) {
        setCrmError('No new reminders were generated for this request. Existing pending reminders may already cover the current blockers.');
        return;
      }
      setCrmError('');
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : 'Could not generate workflow reminders.');
    }
  }

  async function completeWorkflowReminder(reminder: CrmWorkflowReminder) {
    try {
      await completeCrmWorkflowReminder(reminder.id, crmSession);
      await reloadWorkflowReminders();
      if (selectedLead) await reloadWorkflowState(selectedLead.id);
      setCrmError('');
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : 'Could not complete reminder.');
    }
  }

  async function cancelWorkflowReminder(reminder: CrmWorkflowReminder) {
    try {
      await cancelCrmWorkflowReminder(reminder.id, crmSession);
      await reloadWorkflowReminders();
      setCrmError('');
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : 'Could not cancel reminder.');
    }
  }

  async function refreshLead(id: string, patch: Partial<Pick<CrmLead, 'status' | 'lifecycleStage' | 'priority' | 'internalNotes' | 'ctmRequestId'>>) {
    try {
      const updatedLead = await updateCrmLeadRecord(id, patch, crmSession);
      if (updatedLead) {
        setLeads((currentLeads) => currentLeads.map((lead) => (lead.id === id ? updatedLead : lead)));
      } else {
        await reloadLeads();
      }
      setCrmError('');
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : 'Could not update CRM lead.');
    }
  }

  async function linkCtmRequestToLead(reference: string) {
    if (!selectedLead) return;
    setSelectedCtmReferencesByLead((current) => ({ ...current, [selectedLead.id]: reference }));
    if (selectedLead.ctmRequestId === reference) return;
    await refreshLead(selectedLead.id, { ctmRequestId: reference });
  }

  async function advanceLeadLifecycle(lead: CrmLead) {
    if (apiEnabled && crmSession?.token) {
      try {
        const nextWorkflowState = await advanceCrmWorkflow(lead.id, crmSession);
        setWorkflowStates((current) => ({ ...current, [lead.id]: nextWorkflowState }));
        if (!nextWorkflowState.canAdvance && nextWorkflowState.currentStage === lead.lifecycleStage) {
          const blockerText = nextWorkflowState.blockers.map((blocker) => blocker.detail).join(' ');
          setCrmError(blockerText || 'Workflow is blocked by backend gates.');
          return;
        }
        await Promise.all([reloadLeads(), reloadWorkflowReminders()]);
        setCrmError('');
        return;
      } catch (error) {
        setCrmError(error instanceof Error ? error.message : 'Could not advance workflow.');
        return;
      }
    }

    const nextStage = nextLifecycleStage(lead);
    if (!nextStage) return;
    await refreshLead(lead.id, {
      lifecycleStage: nextStage,
      status: lifecycleStageToStatus[nextStage],
    });
  }

  async function saveBriefingValidationSummary(lead: CrmLead, summary: string) {
    await refreshLead(lead.id, {
      internalNotes: [lead.internalNotes?.trim(), `[Client validation brief]\n${summary}`].filter(Boolean).join('\n\n'),
    });
  }

  async function applyBriefingDecision(lead: CrmLead, decision: BriefingDecision, decisionDetail = '') {
    const missingItems = briefingChecklistItems(lead)
      .filter((item) => !item.ready)
      .map((item) => item.label.toLowerCase());
    const detail = decision === 'cancelled'
      ? decisionDetail
      : decision === 'moreInfo'
        ? missingItems.length > 0
          ? `Missing ${missingItems.join(', ')}`
          : 'Clarification needed before design work'
        : `${briefingReadiness(lead).readyCount}/6 brief fields ready`;
    const patch: Partial<Pick<CrmLead, 'status' | 'lifecycleStage' | 'priority' | 'internalNotes'>> =
      decision === 'approved'
        ? { status: 'planning', lifecycleStage: 'validated' }
        : decision === 'moreInfo'
          ? { status: 'contacted', lifecycleStage: 'pending_information' }
          : { status: 'lost', lifecycleStage: 'closed' };

    await refreshLead(lead.id, {
      ...patch,
      internalNotes: appendBriefingDecisionNote(lead, decision, detail),
    });
    if (apiEnabled && crmSession?.token) {
      await reloadWorkflowState(lead.id);
    }
  }

  async function createDraftQuoteForLead(lead: CrmLead) {
    try {
      const quote = await createCrmQuoteRecord(
        {
          leadId: lead.id,
          quoteNumber: `DPM-Q-${lead.id.slice(0, 8).toUpperCase()}`,
          version: Math.max(1, quotes.filter((item) => item.leadId === lead.id).length + 1),
          status: 'draft',
          currency: 'USD',
          validUntil: null,
          notes: `Draft quote for ${lead.destination || lead.service}.`,
          sentAt: null,
          acceptedAt: null,
        },
        crmSession,
      );
      await reloadQuotes();
      setCrmError('');
      return quote;
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : 'Could not create quote.');
      return null;
    }
  }

  async function refreshClient(id: string, patch: Partial<Pick<CrmClient, 'notes' | 'owner' | 'preferredContact'>>) {
    try {
      const updatedClient = await updateCrmClientRecord(id, patch, crmSession);
      if (updatedClient) {
        setClients((currentClients) => currentClients.map((client) => (client.id === id ? updatedClient : client)));
      } else {
        await reloadClients();
      }
      setCrmError('');
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : 'Could not update CRM client.');
    }
  }

  function toggleTheme() {
    setTheme((currentTheme) => {
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      window.localStorage.setItem(CRM_THEME_STORAGE_KEY, nextTheme);
      return nextTheme;
    });
  }

  function changeTypeFilter(nextFilter: LeadTypeFilter) {
    setTypeFilter(nextFilter);
    setPage(1);
  }

  function changeDeskView(nextDesk: DeskView) {
    setDeskView(nextDesk);
    setTypeFilter(nextDesk === 'corporate' ? 'corporate' : 'all');
    setPage(1);
    setDetailTab('overview');
  }

  function changeStatusFilter(nextFilter: StatusFilter) {
    setStatusFilter(nextFilter);
    setPage(1);
  }

  function changeQuery(nextQuery: string) {
    setQuery(nextQuery);
    setPage(1);
  }

  function clearFilters() {
    setQuery('');
    setTypeFilter('all');
    setStatusFilter('all');
    setPriorityFilter('all');
    setPage(1);
  }

  function activateNav(nextNav: CrmNavId) {
    setActiveNav(nextNav);
    setPage(1);
    setDetailTab('overview');
    if (nextNav === 'command') setCommandLens('all');

    if (nextNav === 'command') {
      setDeskView('all');
      clearFilters();
      setShowFilters(false);
      return;
    }

    setTypeFilter('all');
    setPriorityFilter('all');
    setQuery('');

    if (nextNav === 'leisureStudio') {
      setDeskView('leisure');
      setTypeFilter('all');
      setStatusFilter('all');
      setDetailTab('brief');
      setShowFilters(true);
      return;
    }

    if (nextNav === 'corporateDesk') {
      setDeskView('corporate');
      setTypeFilter('corporate');
      setStatusFilter('all');
      setDetailTab('travelers');
      setShowFilters(true);
      return;
    }

    if (nextNav === 'tasks') {
      setDeskView('all');
      setStatusFilter('all');
      setPriorityFilter('attention');
      setShowFilters(true);
      return;
    }

    if (nextNav === 'calendar') {
      setDeskView('all');
      setStatusFilter('all');
      setShowFilters(false);
      return;
    }

    if (nextNav === 'reports' || nextNav === 'settings') {
      setDeskView('all');
      setStatusFilter('all');
      setShowFilters(true);
      return;
    }

    setDeskView('all');
    setStatusFilter('all');
    setShowFilters(false);
  }

  function showPriorityQueue() {
    setActiveNav('tasks');
    setStatusFilter('new');
    setPriorityFilter('attention');
    setPage(1);
    setShowFilters(true);
  }

  function updateManualField(field: string, value: string) {
    setManualRequest((current) => ({ ...current, [field]: value }));
  }

  function openUserModal(user?: CrmManagedUser) {
    if (user && !canEditManagedUser(crmSession?.user, user)) {
      setCrmError('Managers can only manage agent and viewer accounts.');
      return;
    }

    if (user) {
      setEditingUserId(user.id);
      setUserForm({
        username: user.username,
        email: user.email,
        first_name: user.first_name ?? '',
        last_name: user.last_name ?? '',
        role: user.role === 'admin' || user.role === 'manager' || user.role === 'agent' || user.role === 'viewer' ? user.role : 'viewer',
        isActive: user.isActive,
        password: '',
      });
    } else {
      setEditingUserId(null);
      const emptyForm = emptyUserForm();
      setUserForm({
        ...emptyForm,
        role: manageableRoleOptions[0] ?? emptyForm.role,
      });
    }
    setShowUserManagementModal(true);
  }

  function updateUserField<K extends keyof UserFormState>(field: K, value: UserFormState[K]) {
    setUserForm((current) => ({ ...current, [field]: value }));
  }

  function updateQuoteLineDraft<K extends keyof QuoteLineDraft>(field: K, value: QuoteLineDraft[K]) {
    setQuoteLineDraft((current) => ({ ...current, [field]: value }));
  }

  function updateCorporateOutputDraft<K extends keyof CorporateOutputDraft>(field: K, value: CorporateOutputDraft[K]) {
    setCorporateOutputDraft((current) => ({ ...current, [field]: value }));
  }

  async function saveCorporateQuoteOutput() {
    if (!selectedCtmTrip) return;
    if (!corporateOutputDraft.quoteAmount.trim()) {
      setCrmError('Quote amount is required before sharing CTM commercial output.');
      return;
    }

    setIsSavingCorporateOutput(true);
    try {
      const payload = {
        amount: corporateOutputDraft.quoteAmount,
        currency: corporateOutputDraft.quoteCurrency || 'USD',
        validUntil: corporateOutputDraft.quoteValidUntil || null,
        notes: corporateOutputDraft.quoteNotes,
        status: corporateOutputDraft.quoteStatus,
      };
      if (selectedCtmTrip.quote) {
        await updateCtmTripQuote(selectedCtmTrip.id, payload, crmSession);
      } else {
        await createCtmTripQuote(selectedCtmTrip.id, payload, crmSession);
      }
      await reloadCtmTripRequests();
      setCrmError('');
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : 'Could not save CTM quote output.');
    } finally {
      setIsSavingCorporateOutput(false);
    }
  }

  async function saveCorporateBookingOutput() {
    if (!selectedCtmTrip) return;
    setIsSavingCorporateOutput(true);
    try {
      const payload = {
        bookingReference: corporateOutputDraft.bookingReference,
        supplierSummary: corporateOutputDraft.bookingSupplierSummary,
        totalCost: corporateOutputDraft.bookingTotalCost || null,
        currency: corporateOutputDraft.bookingCurrency || 'USD',
        status: corporateOutputDraft.bookingStatus,
        bookedAt: null,
      };
      if (selectedCtmTrip.booking) {
        await updateCtmTripBooking(selectedCtmTrip.id, payload, crmSession);
      } else {
        await createCtmTripBooking(selectedCtmTrip.id, payload, crmSession);
      }
      await reloadCtmTripRequests();
      setCrmError('');
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : 'Could not save CTM booking output.');
    } finally {
      setIsSavingCorporateOutput(false);
    }
  }

  async function saveCorporateInvoiceOutput() {
    if (!selectedCtmTrip) return;
    if (!corporateOutputDraft.invoiceAmount.trim()) {
      setCrmError('Invoice amount is required before sharing CTM billing output.');
      return;
    }

    setIsSavingCorporateOutput(true);
    try {
      const payload = {
        amount: corporateOutputDraft.invoiceAmount,
        currency: corporateOutputDraft.invoiceCurrency || 'USD',
        status: corporateOutputDraft.invoiceStatus,
        issuedAt: null,
        dueDate: corporateOutputDraft.invoiceDueDate || null,
        notes: corporateOutputDraft.invoiceNotes,
      };
      if (selectedCtmTrip.invoice) {
        await updateCtmTripInvoice(selectedCtmTrip.id, payload, crmSession);
      } else {
        await createCtmTripInvoice(selectedCtmTrip.id, payload, crmSession);
      }
      await reloadCtmTripRequests();
      setCrmError('');
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : 'Could not save CTM invoice output.');
    } finally {
      setIsSavingCorporateOutput(false);
    }
  }

  async function recordCorporatePaymentOutput() {
    if (!selectedCtmTrip) return;
    if (!selectedCtmTrip.invoice) {
      setCrmError('Create an invoice before recording CTM payment output.');
      return;
    }
    if (!corporateOutputDraft.paymentAmount.trim()) {
      setCrmError('Payment amount is required.');
      return;
    }

    setIsSavingCorporateOutput(true);
    try {
      await createCtmTripPayment(
        selectedCtmTrip.id,
        {
          amount: corporateOutputDraft.paymentAmount,
          currency: corporateOutputDraft.paymentCurrency || selectedCtmTrip.invoice.currency || 'USD',
          paymentMethod: corporateOutputDraft.paymentMethod,
          status: corporateOutputDraft.paymentStatus,
          reference: corporateOutputDraft.paymentReference,
          receivedAt: null,
          notes: corporateOutputDraft.paymentNotes,
        },
        crmSession,
      );
      await reloadCtmTripRequests();
      setCorporateOutputDraft((current) => ({
        ...current,
        paymentAmount: '',
        paymentReference: '',
        paymentNotes: '',
      }));
      setCrmError('');
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : 'Could not record CTM payment output.');
    } finally {
      setIsSavingCorporateOutput(false);
    }
  }

  async function saveQuoteLine(line: CrmQuoteLine, patch: Partial<Pick<CrmQuoteLine, 'category' | 'supplier' | 'description' | 'quantity' | 'unitCost' | 'unitSell' | 'status' | 'confirmationReference' | 'supplierDeadline' | 'bookingOwner' | 'bookingNotes' | 'confirmedAt' | 'notes'>>) {
    try {
      await updateCrmQuoteLineRecord(line.id, patch, crmSession);
      await reloadQuotes();
      setCrmError('');
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : 'Could not update quote line.');
    }
  }

  async function submitQuoteLine(quote: CrmQuote) {
    if (!quoteLineDraft.description.trim()) {
      setCrmError('Quote line description is required.');
      return;
    }

    try {
      await createCrmQuoteLineRecord(
        {
          quoteId: quote.id,
          category: quoteLineDraft.category,
          supplier: quoteLineDraft.supplier,
          description: quoteLineDraft.description,
          quantity: quoteLineDraft.quantity || '1',
          unitCost: quoteLineDraft.unitCost || '0.00',
          unitSell: quoteLineDraft.unitSell || '0.00',
          status: quoteLineDraft.status,
          confirmationReference: '',
          supplierDeadline: null,
          bookingOwner: '',
          bookingNotes: '',
          confirmedAt: null,
          notes: quoteLineDraft.notes,
        },
        crmSession,
      );
      setQuoteLineDraft(emptyQuoteLineDraft());
      await reloadQuotes();
      setCrmError('');
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : 'Could not add quote line.');
    }
  }

  async function submitTripDesignStop() {
    if (!selectedLead) return;
    if (!tripDesignDrafts.stop.city.trim()) {
      setCrmError('City is required before adding a trip stop.');
      return;
    }
    const hasStopDates = Boolean(tripDesignDrafts.stop.arrivalDate || tripDesignDrafts.stop.departureDate);
    const stopDateError =
      (hasStopDates && (!selectedTripDateRange.startDate || !selectedTripDateRange.endDate) ? 'Set the trip departure and return dates before adding dated city stops.' : '')
      || pastDateError(tripDesignDrafts.stop.arrivalDate, 'Stop arrival date')
      || pastDateError(tripDesignDrafts.stop.departureDate, 'Stop departure date')
      || dateRangeError(tripDesignDrafts.stop.arrivalDate, tripDesignDrafts.stop.departureDate, 'Stop')
      || dateContainmentError(tripDesignDrafts.stop.arrivalDate, selectedTripDateRange.startDate, selectedTripDateRange.endDate, 'Stop arrival date', 'the trip dates')
      || dateContainmentError(tripDesignDrafts.stop.departureDate, selectedTripDateRange.startDate, selectedTripDateRange.endDate, 'Stop departure date', 'the trip dates');
    if (stopDateError) {
      setCrmError(stopDateError);
      return;
    }

    try {
      const itinerary = await ensureTripItineraryForLead(selectedLead);
      await createCrmItineraryStopRecord(
        {
          itineraryId: itinerary.id,
          sequenceNumber: (itinerary.stops?.length ?? 0) + 1,
          city: tripDesignDrafts.stop.city.trim(),
          country: tripDesignDrafts.stop.country.trim(),
          arrivalDate: tripDesignDrafts.stop.arrivalDate || null,
          departureDate: tripDesignDrafts.stop.departureDate || null,
          nights: Number(tripDesignDrafts.stop.nights) || 0,
          purpose: tripDesignDrafts.stop.purpose,
          notes: tripDesignDrafts.stop.notes,
        },
        crmSession,
      );
      setTripDesignDrafts((current) => ({ ...current, stop: emptyTripDesignDrafts().stop }));
      await reloadItineraries();
      setCrmError('');
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : 'Could not add trip stop.');
    }
  }

  async function submitTripDesignStay() {
    const stopId = tripDesignDrafts.stay.stopId || selectedItinerary?.stops[0]?.id || '';
    const stop = selectedItinerary?.stops.find((item) => item.id === stopId) ?? null;
    if (!stopId) {
      setCrmError('Add a trip stop before adding a stay.');
      return;
    }
    if (!tripDesignDrafts.stay.name.trim()) {
      setCrmError('Stay name is required.');
      return;
    }
    const hasStayDates = Boolean(tripDesignDrafts.stay.checkIn || tripDesignDrafts.stay.checkOut);
    const stayDateError =
      (hasStayDates && (!stop?.arrivalDate || !stop?.departureDate) ? 'Set stop arrival and departure dates before adding stay dates.' : '')
      || pastDateError(tripDesignDrafts.stay.checkIn, 'Check-in date')
      || pastDateError(tripDesignDrafts.stay.checkOut, 'Check-out date')
      || dateRangeError(tripDesignDrafts.stay.checkIn, tripDesignDrafts.stay.checkOut, 'Stay')
      || dateContainmentError(tripDesignDrafts.stay.checkIn, stop?.arrivalDate, stop?.departureDate, 'Check-in date', 'the stop dates')
      || dateContainmentError(tripDesignDrafts.stay.checkOut, stop?.arrivalDate, stop?.departureDate, 'Check-out date', 'the stop dates');
    if (stayDateError) {
      setCrmError(stayDateError);
      return;
    }

    try {
      await createCrmAccommodationBlockRecord(
        {
          stopId,
          name: tripDesignDrafts.stay.name.trim(),
          accommodationType: 'hotel',
          roomType: tripDesignDrafts.stay.roomType,
          checkIn: tripDesignDrafts.stay.checkIn || null,
          checkOut: tripDesignDrafts.stay.checkOut || null,
          rooms: Number(tripDesignDrafts.stay.rooms) || 1,
          supplier: tripDesignDrafts.stay.supplier,
          bookingStatus: tripDesignDrafts.stay.bookingStatus,
        },
        crmSession,
      );
      setTripDesignDrafts((current) => ({ ...current, stay: { ...emptyTripDesignDrafts().stay, stopId } }));
      await reloadItineraries();
      setCrmError('');
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : 'Could not add stay.');
    }
  }

  async function submitTripDesignMovement() {
    if (!selectedLead) return;
    if (!tripDesignDrafts.movement.fromCity.trim() || !tripDesignDrafts.movement.toCity.trim()) {
      setCrmError('Movement origin and destination are required.');
      return;
    }
    const hasMovementDates = Boolean(tripDesignDrafts.movement.departureAt || tripDesignDrafts.movement.arrivalAt);
    const tripStartDateTime = selectedTripDateRange.startDate ? `${selectedTripDateRange.startDate}T00:00` : null;
    const tripEndDateTime = selectedTripDateRange.endDate ? `${selectedTripDateRange.endDate}T23:59` : null;
    const movementDateError =
      (hasMovementDates && (!selectedTripDateRange.startDate || !selectedTripDateRange.endDate) ? 'Set the trip departure and return dates before adding dated movements.' : '')
      || pastDateError(tripDesignDrafts.movement.departureAt, 'Movement departure')
      || pastDateError(tripDesignDrafts.movement.arrivalAt, 'Movement arrival')
      || dateRangeError(tripDesignDrafts.movement.departureAt, tripDesignDrafts.movement.arrivalAt, 'Movement')
      || dateContainmentError(tripDesignDrafts.movement.departureAt, tripStartDateTime, tripEndDateTime, 'Movement departure', 'the trip dates')
      || dateContainmentError(tripDesignDrafts.movement.arrivalAt, tripStartDateTime, tripEndDateTime, 'Movement arrival', 'the trip dates');
    if (movementDateError) {
      setCrmError(movementDateError);
      return;
    }

    try {
      const itinerary = await ensureTripItineraryForLead(selectedLead);
      await createCrmTransportSegmentRecord(
        {
          itineraryId: itinerary.id,
          sequenceNumber: (itinerary.transports?.length ?? 0) + 1,
          mode: tripDesignDrafts.movement.mode,
          fromCity: tripDesignDrafts.movement.fromCity.trim(),
          toCity: tripDesignDrafts.movement.toCity.trim(),
          departureAt: localDateTimeToIso(tripDesignDrafts.movement.departureAt),
          arrivalAt: localDateTimeToIso(tripDesignDrafts.movement.arrivalAt),
          supplier: tripDesignDrafts.movement.supplier,
          bookingStatus: tripDesignDrafts.movement.bookingStatus,
        },
        crmSession,
      );
      setTripDesignDrafts((current) => ({ ...current, movement: emptyTripDesignDrafts().movement }));
      await reloadItineraries();
      setCrmError('');
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : 'Could not add movement.');
    }
  }

  async function submitTripDesignExperience() {
    const stopId = tripDesignDrafts.experience.stopId || selectedItinerary?.stops[0]?.id || '';
    if (!stopId) {
      setCrmError('Add a trip stop before adding an experience.');
      return;
    }
    if (!tripDesignDrafts.experience.title.trim()) {
      setCrmError('Experience title is required.');
      return;
    }

    try {
      await createCrmExperienceBlockRecord(
        {
          stopId,
          title: tripDesignDrafts.experience.title.trim(),
          category: tripDesignDrafts.experience.category,
          supplier: tripDesignDrafts.experience.supplier,
          status: tripDesignDrafts.experience.status,
        },
        crmSession,
      );
      setTripDesignDrafts((current) => ({ ...current, experience: { ...emptyTripDesignDrafts().experience, stopId } }));
      await reloadItineraries();
      setCrmError('');
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : 'Could not add experience.');
    }
  }

  async function submitManualRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const serviceKey = manualRequest.serviceKey as InquiryKind;
    if (serviceKey === 'corporate') {
      setCrmError('Corporate requests must come from CTM. Use phone intake here for Classic or Luxury only.');
      return;
    }
    const manualDateError =
      pastDateError(manualRequest.startDate, 'Trip departure date')
      || pastDateError(manualRequest.endDate, 'Trip return date')
      || dateRangeError(manualRequest.startDate, manualRequest.endDate, 'Trip');
    if (manualDateError) {
      setCrmError(manualDateError);
      return;
    }
    const dates = [manualRequest.startDate, manualRequest.endDate].filter(Boolean).join(' - ');
    try {
      const lead = await createCrmLeadRecord(
        {
          service: `${typeLabels[serviceKey]} Phone Request`,
          serviceKey,
          name: manualRequest.name || 'Phone request',
          contact: [manualRequest.email, manualRequest.phone].filter(Boolean).join(' / '),
          email: manualRequest.email,
          whatsapp: manualRequest.phone,
          preferredContact: manualRequest.phone ? 'Phone / WhatsApp' : 'Email',
          requestedServices: serviceKey === 'luxury' ? 'Concierge support' : 'Travel planning',
          tripType: serviceKey === 'luxury' ? 'Luxury / Prestige travel' : 'Leisure trip',
          departureCity: manualRequest.departureCity,
          destination: manualRequest.destination,
          dates,
          travelers: manualRequest.travelers,
          budget: manualRequest.budget || 'Not captured',
          urgency: 'Needs attention this week',
          priority: 'high',
          notes: [`Phone intake`, manualRequest.notes].filter(Boolean).join('\n\n'),
        },
        crmSession,
      );
      await reloadLeads();
      setSelectedLeadId(lead.id);
      setTypeFilter(serviceKey);
      setStatusFilter('new');
      setPriorityFilter('all');
      setShowManualRequest(false);
      setManualRequest(emptyManualRequest());
      setCrmError('');
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : 'Could not create phone request.');
    }
  }

  function openClientRegistrationFromLead(lead?: CrmLead | null) {
    if (lead) {
      setClientForm(makeClientFromLead(lead));
    } else {
      setClientForm(emptyClientRegistration());
    }
    setShowClientRegistration(true);
  }

  function updateClientField(field: string, value: string) {
    setClientForm((current) => ({ ...current, [field]: value }));
  }

  async function submitClientRegistration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      if (potentialClientMatch) {
        if (selectedLead && selectedLead.clientId !== potentialClientMatch.id) {
          await updateCrmLeadRecord(selectedLead.id, { clientId: potentialClientMatch.id }, crmSession);
          await Promise.all([reloadClients(), reloadLeads()]);
        }
        setSelectedClientId(potentialClientMatch.id);
        setActiveNav('clients');
        setShowClientRegistration(false);
        setClientForm(emptyClientRegistration());
        setCrmError('');
        return;
      }

      const client = await createCrmClientRecord(clientForm, crmSession);
      if (selectedLead && !selectedLead.clientId) {
        await updateCrmLeadRecord(selectedLead.id, { clientId: client.id }, crmSession);
      }
      await Promise.all([reloadClients(), reloadLeads()]);
      setSelectedClientId(client.id);
      setSelectedLeadId(selectedLead?.id ?? null);
      setActiveNav('clients');
      setShowClientRegistration(false);
      setClientForm(emptyClientRegistration());
      setCrmError('');
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : 'Could not register client.');
    }
  }

  async function submitUserManagement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      if (editingUserId) {
        await updateCrmUserRecord(
          editingUserId,
          {
            username: userForm.username,
            email: userForm.email,
            first_name: userForm.first_name,
            last_name: userForm.last_name,
            role: userForm.role,
            isActive: userForm.isActive,
            password: userForm.password || undefined,
          },
          crmSession,
        );
      } else {
        await createCrmUserRecord(
          {
            username: userForm.username,
            email: userForm.email,
            first_name: userForm.first_name,
            last_name: userForm.last_name,
            role: userForm.role,
            isActive: userForm.isActive,
            password: userForm.password,
          },
          crmSession,
        );
      }

      await reloadUsers();
      if (crmSession?.user?.id === editingUserId) {
        const nextUser = await fetchCrmCurrentUser(crmSession);
        if (nextUser?.canAccessCrm) {
          const nextSession = { ...crmSession, user: nextUser };
          setCrmSession(nextSession);
          saveCrmSession(nextSession);
        }
      }
      setShowUserManagementModal(false);
      setEditingUserId(null);
      setUserForm(emptyUserForm());
      setCrmError('');
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : 'Could not save CRM user.');
    }
  }

  async function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoggingIn(true);
    setCrmError('');

    try {
      const session = await loginCrm(loginIdentifier, loginPassword);
      setCrmSession(session);
      setLoginPassword('');
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : 'Could not sign in to CRM.');
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function signOut() {
    await logoutCrm(crmSession);
    setCrmSession(null);
    setLeads([]);
    setClients([]);
    setCrmUsers([]);
  }

  function renderBriefingGate() {
    if (!selectedLead || !selectedBriefing) return null;

    return (
      <BriefingGate
        key={selectedLead.id}
        lead={selectedLead}
        readiness={selectedBriefing}
        styles={styles}
        owner={selectedWorkflowState?.responsibleOwner || leadOwner(selectedLead)}
        lifecycleLabel={leadLifecycleLabel(selectedLead)}
        onNotesChange={(notes) => refreshLead(selectedLead.id, { internalNotes: notes })}
        onSaveValidationBrief={(summary) => saveBriefingValidationSummary(selectedLead, summary)}
        onDecision={(decision, detail) => applyBriefingDecision(selectedLead, decision, detail)}
      />
    );
  }
  if (!apiEnabled) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#07111d] px-4 text-white">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d1828] p-6 shadow-2xl">
          <CrmBrandMark theme="dark" />
          <div className="mt-8">
            <h1 className="text-2xl font-semibold">CRM backend required</h1>
            <p className="mt-2 text-sm leading-6 text-white/60">
              CRM access is role-based and only works when the backend API is configured. Set `VITE_CRM_API_URL` and sign in with a CRM-enabled account.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!crmSession) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#07111d] px-4 text-white">
        <form onSubmit={submitLogin} className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1828] p-6 shadow-2xl">
          <CrmBrandMark theme="dark" />
          <div className="mt-8">
            <h1 className="text-2xl font-semibold">CRM Sign In</h1>
            <p className="mt-2 text-sm leading-6 text-white/60">Use a DPM staff account with CRM access to manage requests, client records, notes, and workflow status.</p>
          </div>
          <label className="mt-6 block text-sm font-medium text-white/75">
            Username or email
            <input
              value={loginIdentifier}
              onChange={(event) => setLoginIdentifier(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-white/8 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#d4af37]"
              placeholder="staff@dpmundo.com"
              autoComplete="username"
              required
            />
          </label>
          <label className="mt-4 block text-sm font-medium text-white/75">
            Password
            <input
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-white/8 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#d4af37]"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {crmError ? <div className="mt-4 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">{crmError}</div> : null}
          <button
            type="submit"
            disabled={isLoggingIn}
            className="mt-6 h-11 w-full rounded-lg bg-[#d4af37] px-4 text-sm font-semibold text-[#241f1b] transition hover:bg-[#e0bc4e] disabled:opacity-55"
          >
            {isLoggingIn ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className={`min-h-screen ${styles.shell}`}>
      <div className="grid min-h-screen xl:grid-cols-[244px_minmax(0,1fr)]">
        <aside className={`hidden min-h-screen border-r px-4 py-5 xl:flex xl:flex-col ${styles.sidebar}`}>
          <div className="mb-7">
            <CrmBrandMark theme={theme} />
          </div>

          <nav className="grid gap-2">
            {navItems.map(({ id, label, Icon }) => {
              const active = activeNav === id;
              const count = navCounts[id];
              return (
              <button
                key={label}
                type="button"
                onClick={() => activateNav(id)}
                className={`flex h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
                  active ? styles.buttonActive : styles.buttonGhost
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                {count && count > 0 && id !== 'settings' ? (
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-xs ${id === 'tasks' ? 'bg-red-500 text-white' : active ? 'bg-white/18 text-white' : 'bg-black/15 text-current'}`}>
                    {count}
                  </span>
                ) : null}
              </button>
              );
            })}
          </nav>

          <a
            href="https://etios.net"
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-auto flex items-center gap-3 rounded-xl p-3 ring-1 transition ${styles.etios}`}
            aria-label="Powered by ETIOS registered trademark"
          >
            <img src="/etios-icon.png" alt="" className="h-9 w-9 rounded-lg object-cover" loading="lazy" decoding="async" />
            <span className="min-w-0">
              <span className="block text-[9px] uppercase tracking-[0.2em] text-white/48">Powered by</span>
              <span className="flex items-start gap-1 text-sm font-semibold tracking-[0.2em] text-white">
                ETIOS
                <sup className="text-[8px] text-white/70">&reg;</sup>
              </span>
            </span>
          </a>
        </aside>

        <section className="min-w-0">
          <header className={`border-b px-5 py-5 ${styles.header}`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-[240px] flex-1">
                <div className="text-[11px] uppercase tracking-[0.26em] text-[#d9b46f]">DPM CRM workspace</div>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">{navCopy[activeNav].title}</h1>
                <p className={`mt-1 text-sm ${styles.muted}`}>{navCopy[activeNav].subtitle}</p>
              </div>
              <div className="hidden min-w-[320px] flex-1 justify-center px-6 lg:flex">
                <label className={`flex h-11 w-full max-w-2xl items-center gap-2 rounded-lg border px-3 ${styles.input}`}>
                  <Search className={`h-4 w-4 ${styles.muted}`} />
                  <input
                    value={query}
                    onChange={(event) => changeQuery(event.target.value)}
                    className="w-full bg-transparent text-sm outline-none placeholder:inherit"
                    placeholder="Search client, destination, date..."
                  />
                </label>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    activeNav === 'clients'
                      ? openClientRegistrationFromLead(selectedLead)
                      : activeNav === 'settings'
                        ? openUserModal()
                        : setShowManualRequest(true)
                  }
                  disabled={
                    (activeNav === 'clients' && !canManageClients(crmSession?.user)) ||
                    (activeNav === 'settings' && !canManageUsers(crmSession?.user))
                  }
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#12305a] px-4 text-sm font-medium text-white transition hover:bg-[#173d72] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Plus className="h-4 w-4" />
                  {activeNav === 'clients' ? 'Register Client' : activeNav === 'settings' ? 'Add User' : 'New Leisure Request'}
                </button>
                <button
                  type="button"
                  onClick={showPriorityQueue}
                  className={`relative inline-flex h-11 w-11 items-center justify-center rounded-lg ${styles.buttonGhost}`}
                  aria-label="Show priority new requests"
                >
                  <Bell className="h-4 w-4" />
                  {urgentNewCount > 0 ? (
                    <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
                      {urgentNewCount}
                    </span>
                  ) : null}
                </button>
                <button type="button" onClick={toggleTheme} className={`inline-flex h-11 w-11 items-center justify-center rounded-lg ${styles.buttonGhost}`}>
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                {apiEnabled ? (
                  <button type="button" onClick={signOut} className={`inline-flex h-11 items-center gap-2 rounded-lg px-3 text-sm ${styles.buttonGhost}`}>
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                ) : null}
              </div>
            </div>
            <div className="mt-4 lg:hidden">
              <label className={`flex h-11 w-full items-center gap-2 rounded-lg border px-3 ${styles.input}`}>
                <Search className={`h-4 w-4 ${styles.muted}`} />
                <input
                  value={query}
                  onChange={(event) => changeQuery(event.target.value)}
                  className="w-full bg-transparent text-sm outline-none placeholder:inherit"
                  placeholder="Search client, destination, date..."
                />
              </label>
            </div>
          </header>

          <div className={activeNav === 'leisureStudio' || activeNav === 'corporateDesk' ? 'grid xl:grid-cols-[360px_minmax(0,1fr)]' : requestCentricNav ? 'grid xl:grid-cols-[380px_minmax(0,1fr)]' : 'grid xl:grid-cols-[minmax(720px,1fr)_430px]'}>
            <div className={`min-w-0 border-r ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
          <div className="p-5">
            {crmError ? <div className="mb-4 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{crmError}</div> : null}
            {isLoadingLeads ? <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${styles.panelSoft}`}>Loading CRM requests...</div> : null}
            {activeNav !== 'leisureStudio' && activeNav !== 'corporateDesk' ? (
              <div className={`grid gap-4 ${activeNav === 'command' ? 'md:grid-cols-2 xl:grid-cols-5' : 'lg:grid-cols-4'}`}>
                {(activeNav === 'settings' ? settingsMetricCards : metricCards).map((card) => (
                  <button
                    key={card.label}
                    type="button"
                    onClick={() => {
                      if (activeNav === 'command') {
                        if (card.label === 'Corporate') setCommandLens('corporate');
                        else if (card.label === 'Leisure') setCommandLens('leisure');
                        else if (card.label === 'Blocked') setCommandLens('blocked');
                        else if (card.label === 'Ready to Advance') setCommandLens('ready');
                        else setCommandLens('attention');
                      } else if (card.filter) changeStatusFilter(card.filter);
                    }}
                    className={`rounded-xl border p-4 text-left transition ${
                      activeNav === 'command'
                        ? ((card.label === 'Corporate' && commandLens === 'corporate') ||
                            (card.label === 'Leisure' && commandLens === 'leisure') ||
                            (card.label === 'Blocked' && commandLens === 'blocked') ||
                            (card.label === 'Ready to Advance' && commandLens === 'ready') ||
                            (card.label === 'At Risk' && commandLens === 'attention')
                            ? `${styles.panelSoft} ring-1 ring-[#d4af37]/45`
                            : styles.panel)
                        : activeNav !== 'settings' && card.filter && statusFilter === card.filter
                          ? `${styles.panelSoft} ring-1 ring-[#d4af37]/45`
                          : styles.panel
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className={`text-sm ${styles.soft}`}>{card.label}</span>
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#12305a] text-white">
                        <card.Icon className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="mt-3 text-3xl font-semibold">{card.value}</div>
                    <div className={`mt-3 text-sm ${card.label === 'New Requests' ? 'text-emerald-400' : styles.muted}`}>{card.meta}</div>
                  </button>
                ))}
              </div>
            ) : null}

            {activeNav !== 'clients' && activeNav !== 'settings' && activeNav !== 'command' && activeNav !== 'leisureStudio' && activeNav !== 'corporateDesk' && selectedLead ? (
              <div className={`mt-5 rounded-xl border p-4 ${styles.panel}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className={`text-xs uppercase tracking-[0.14em] ${styles.muted}`}>Status report</div>
                    <div className="mt-2 text-base font-semibold">{selectedLead.name}</div>
                    <div className={`mt-1 text-sm ${styles.muted}`}>{leadSegment(selectedLead)} · {selectedLead.destination || 'Destination pending'}</div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${styles.type[selectedLead.serviceKey]}`}>
                    {leadLifecycleLabel(selectedLead)}
                  </span>
                </div>
                <div className="mt-4 grid gap-3">
                  {selectedStatusCards.map((card) => (
                    <div key={card.label} className={`rounded-lg border p-3 ${styles.panelSoft}`}>
                      <div className={`text-xs uppercase tracking-[0.12em] ${styles.muted}`}>{card.label}</div>
                      <div className="mt-2 text-sm font-semibold">{card.value}</div>
                      {card.meta ? <div className={`mt-2 text-sm leading-6 ${styles.muted}`}>{card.meta}</div> : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {activeNav !== 'settings' && activeNav !== 'command' && activeNav !== 'leisureStudio' && activeNav !== 'corporateDesk' ? (
            <div className="mt-5 flex flex-wrap items-center gap-3">
                {([
                  { key: 'all', label: 'All desks', meta: 'Unified CRM view' },
                  { key: 'leisure', label: 'Leisure Desk', meta: 'Classic + Luxury' },
                  { key: 'corporate', label: 'Corporate Desk', meta: 'Approvals + finance flow' },
                ] as Array<{ key: DeskView; label: string; meta: string }>).map((desk) => (
                  <button
                    key={desk.key}
                    type="button"
                    onClick={() => changeDeskView(desk.key)}
                    className={`inline-flex h-12 items-center gap-3 rounded-xl border px-4 text-sm transition ${
                      deskView === desk.key ? `${styles.buttonActive} border-transparent` : `${styles.buttonGhost} border-white/10`
                    }`}
                  >
                    <span className="font-medium">{desk.label}</span>
                    <span className={`text-xs ${deskView === desk.key ? 'text-white/70' : styles.muted}`}>{desk.meta}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {activeNav === 'command' ? (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {([
                  { key: 'all', label: 'All' },
                  { key: 'corporate', label: 'Corporate' },
                  { key: 'leisure', label: 'Leisure' },
                  { key: 'attention', label: 'Needs Attention' },
                  { key: 'blocked', label: 'Blocked' },
                  { key: 'ready', label: 'Ready to Advance' },
                ] as Array<{ key: CommandLens; label: string }>).map((lens) => (
                  <button
                    key={lens.key}
                    type="button"
                    onClick={() => {
                      setCommandLens(lens.key);
                      setPage(1);
                    }}
                    className={`inline-flex h-10 items-center rounded-xl border px-4 text-sm transition ${
                      commandLens === lens.key ? `${styles.buttonActive} border-transparent` : `${styles.buttonGhost} border-white/10`
                    }`}
                  >
                    {lens.label}
                  </button>
                ))}
              </div>
            ) : null}

            {activeNav !== 'command' && activeNav !== 'leisureStudio' && activeNav !== 'corporateDesk' ? (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {visibleTypeFilters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => changeTypeFilter(filter)}
                  className={`inline-flex h-11 items-center gap-2 rounded-xl border px-5 text-sm transition ${
                    typeFilter === filter ? `${styles.buttonActive} border-transparent` : `${styles.buttonGhost} border-white/10`
                  }`}
                >
                  {filter === 'luxury' ? <Sparkles className="h-4 w-4 text-[#d4af37]" /> : filter === 'corporate' ? <Briefcase className="h-4 w-4" /> : null}
                  <span>{typeLabels[filter]}</span>
                  <span className="rounded-full bg-black/15 px-2 py-0.5 text-xs">{typeCounts[filter]}</span>
                </button>
              ))}

              <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                <select
                  value={statusFilter}
                  onChange={(event) => changeStatusFilter(event.target.value as StatusFilter)}
                  className={`h-11 rounded-xl border px-3 text-sm font-medium outline-none ${styles.select}`}
                >
                  <option value="all">All statuses</option>
                  <option value="workflowGroup">Active workflow</option>
                  <option value="confirmedGroup">Confirmed pipeline</option>
                  {statusOrder.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowFilters((visible) => !visible)}
                  className={`inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 px-4 ${showFilters ? styles.buttonActive : styles.buttonGhost}`}
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </button>
              </div>
            </div>
            ) : null}

            {showFilters && activeNav !== 'leisureStudio' && activeNav !== 'corporateDesk' ? (
              <div className={`mt-3 grid gap-3 rounded-xl border p-3 md:grid-cols-[1fr_1fr_auto] ${styles.panelSoft}`}>
                <label className="text-xs font-medium uppercase tracking-[0.14em]">
                  <span className={styles.muted}>Priority</span>
                  <select
                    value={priorityFilter}
                    onChange={(event) => {
                      setPriorityFilter(event.target.value as PriorityFilter);
                      setPage(1);
                    }}
                    className={`mt-2 h-10 w-full rounded-lg border px-3 text-sm font-medium outline-none ${styles.select}`}
                  >
                    <option value="all">All priorities</option>
                    <option value="attention">High + urgent</option>
                    {(['urgent', 'high', 'normal', 'low'] as LeadPriority[]).map((priority) => (
                      <option key={priority} value={priority}>
                        {priorityLabels[priority]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium uppercase tracking-[0.14em]">
                  <span className={styles.muted}>Source</span>
                  <select
                    value={query === 'Phone intake' ? 'phone' : 'all'}
                    onChange={(event) => changeQuery(event.target.value === 'phone' ? 'Phone intake' : '')}
                    className={`mt-2 h-10 w-full rounded-lg border px-3 text-sm font-medium outline-none ${styles.select}`}
                  >
                    <option value="all">All requests</option>
                    <option value="phone">Phone requests</option>
                  </select>
                </label>
                <button type="button" onClick={clearFilters} className={`self-end rounded-lg px-4 py-2 text-sm ${styles.buttonGhost}`}>
                  Clear
                </button>
              </div>
            ) : null}

            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {activeNav === 'settings'
                    ? 'CRM User Access'
                    : activeNav === 'leisureStudio'
                      ? 'Leisure Requests'
                      : activeNav === 'corporateDesk'
                        ? 'Corporate Requests'
                    : statusFilter === 'all'
                    ? activeNav === 'calendar'
                      ? 'Dated Requests'
                      : activeNav === 'clients'
                        ? 'Registered Clients'
                        : 'Requests'
                    : statusFilter === 'confirmedGroup'
                      ? 'Confirmed Pipeline'
                      : statusFilter === 'workflowGroup'
                        ? 'Active Workflow'
                      : statusLabels[statusFilter]}
                </h2>
                {activeNav !== 'settings' ? (
                  <button
                    type="button"
                    onClick={() => (activeNav === 'clients' ? exportClientsCsv(filteredClients) : exportCsv(filteredLeads))}
                    className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm ${styles.buttonGhost}`}
                  >
                    <Download className="h-4 w-4" />
                    CSV
                  </button>
                ) : null}
              </div>

              <div className={`overflow-hidden rounded-xl border ${styles.panel}`}>
                {activeNav === 'settings' ? (
                  <>
                    <div className={`grid grid-cols-[1.5fr_110px_100px_1fr_84px] gap-4 border-b px-5 py-3 text-xs uppercase tracking-[0.12em] ${styles.tableHead}`}>
                      <div>User</div>
                      <div>Role</div>
                      <div>Status</div>
                      <div>Groups</div>
                      <div className="text-right">Action</div>
                    </div>

                    {pageUsers.length === 0 ? (
                      <div className="p-10 text-center">
                        <Shield className={`mx-auto h-10 w-10 ${styles.muted}`} />
                        <div className="mt-4 text-lg font-semibold">No CRM users found</div>
                        <p className={`mt-2 text-sm ${styles.muted}`}>Create CRM accounts for managers, agents, and viewers from this screen.</p>
                      </div>
                    ) : (
                      pageUsers.map((user) => {
                        const isCurrentUser = crmSession?.user?.id === user.id;
                        const canEditUser = canEditManagedUser(crmSession?.user, user);
                        const roleLabel = crmRoleLabels[user.role as keyof typeof crmRoleLabels] ?? user.role;
                        return (
                          <div
                            key={user.id}
                            className={`grid grid-cols-[1.5fr_110px_100px_1fr_84px] gap-4 border-b px-5 py-4 text-left transition ${styles.row}`}
                          >
                            <div className="flex min-w-0 items-center gap-4">
                              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#12305a] text-sm font-semibold text-white">
                                {initials(user.displayName || user.username)}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold">
                                  {user.displayName}
                                  {isCurrentUser ? <span className={`ml-2 text-xs font-medium ${styles.muted}`}>(you)</span> : null}
                                </span>
                                <span className={`mt-1 block truncate text-xs ${styles.muted}`}>
                                  {user.email || user.username}
                                </span>
                              </span>
                            </div>
                            <div className="flex items-center">
                              <span className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${user.role === 'admin' || user.role === 'manager' ? styles.type.corporate : user.role === 'agent' ? styles.type.classic : styles.panelSoft}`}>
                                {roleLabel}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${user.isActive ? 'bg-emerald-500/12 text-emerald-300 ring-emerald-400/20' : 'bg-slate-500/12 text-slate-300 ring-slate-400/20'}`}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <div className={`flex min-w-0 items-center truncate text-sm ${styles.soft}`}>
                              {user.groups.length > 0 ? user.groups.join(', ') : 'No CRM groups assigned'}
                            </div>
                            <div className="flex items-center justify-end">
                              <button
                                type="button"
                                onClick={() => openUserModal(user)}
                                disabled={!canEditUser}
                                title={canEditUser ? 'Edit CRM user' : 'Only admins can modify admin or manager accounts'}
                                className={`inline-flex h-9 items-center rounded-lg px-3 text-xs ${styles.buttonGhost} disabled:cursor-not-allowed disabled:opacity-45`}
                              >
                                {canEditUser ? 'Edit' : 'Protected'}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </>
                ) : activeNav === 'clients' ? (
                  <>
                    <div className={`grid grid-cols-[1.5fr_1fr_1fr_110px_84px] gap-4 border-b px-5 py-3 text-xs uppercase tracking-[0.12em] ${styles.tableHead}`}>
                      <div>Client</div>
                      <div>Segment</div>
                      <div>Primary Contact</div>
                      <div>Open Requests</div>
                      <div className="text-right">Updated</div>
                    </div>

                    {pageClients.length === 0 ? (
                      <div className="p-10 text-center">
                        <Users className={`mx-auto h-10 w-10 ${styles.muted}`} />
                        <div className="mt-4 text-lg font-semibold">No registered clients yet</div>
                        <p className={`mt-2 text-sm ${styles.muted}`}>Register clients from a selected request or add one manually.</p>
                      </div>
                    ) : (
                      pageClients.map((client) => {
                        const isSelected = selectedClient?.id === client.id;
                        return (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => {
                              setSelectedClientId(client.id);
                              setDetailTab('overview');
                            }}
                            className={`grid w-full grid-cols-[1.5fr_1fr_1fr_110px_84px] gap-4 border-b px-5 py-4 text-left transition ${
                              isSelected ? styles.rowActive : styles.row
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-4">
                              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#7a5a08] text-sm font-semibold text-white">
                                {initials(clientLabel(client))}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold">{clientLabel(client)}</span>
                                <span className={`mt-1 block truncate text-xs ${styles.muted}`}>
                                  {clientSegment(client)} - {client.owner || 'Owner pending'}
                                </span>
                              </span>
                            </div>
                            <div className="flex items-center">
                              <span className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${styles.type[client.serviceLevel]}`}>
                                {typeLabels[client.serviceLevel]}
                              </span>
                            </div>
                            <div className="flex min-w-0 flex-col justify-center">
                              <span className={`truncate text-sm ${styles.soft}`}>{client.email || client.phone || 'Contact pending'}</span>
                              <span className={`mt-1 truncate text-xs ${styles.muted}`}>{client.preferredContact || 'Preferred contact pending'}</span>
                            </div>
                            <div className={`flex items-center text-sm ${styles.soft}`}>{client.activeRequestCount}</div>
                            <div className={`flex items-center justify-end text-sm ${styles.muted}`}>{formatDate(client.updatedAt)}</div>
                          </button>
                        );
                      })
                    )}
                  </>
                ) : (
                  <>
                    {activeNav === 'command' ? (
                      pageLeads.length === 0 ? (
                        <div className="p-10 text-center">
                          <Inbox className={`mx-auto h-10 w-10 ${styles.muted}`} />
                          <div className="mt-4 text-lg font-semibold">No requests in this board</div>
                          <p className={`mt-2 text-sm ${styles.muted}`}>Adjust filters or submit a form to create a request.</p>
                        </div>
                      ) : (
                        <div>
                          <div className={`grid grid-cols-[96px_minmax(0,1.3fr)_110px_120px_100px_120px_minmax(0,1.2fr)] gap-4 border-b px-4 py-3 text-xs uppercase tracking-[0.12em] ${styles.tableHead}`}>
                            <div>Request</div>
                            <div>Client / Trip</div>
                            <div>Status</div>
                            <div>Owner</div>
                            <div>Travel date</div>
                            <div>Urgency</div>
                            <div>Bottleneck</div>
                          </div>
                          {pageLeads.map((lead) => {
                            const priority = fallbackPriority(lead);
                            const isSelected = selectedLead?.id === lead.id;
                            const rowOwner = extractManagerBoardMeta(lead.internalNotes)?.owner || leadOwner(lead);
                            return (
                              <button
                                key={lead.id}
                                type="button"
                                onClick={() => {
                                  setSelectedLeadId(lead.id);
                                  setDetailTab('overview');
                                }}
                                className={`grid w-full grid-cols-[96px_minmax(0,1.3fr)_110px_120px_100px_120px_minmax(0,1.2fr)] gap-4 border-b px-4 py-3 text-left transition ${
                                  isSelected ? styles.rowActive : styles.row
                                }`}
                              >
                                <div className="flex items-center">
                                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${styles.buttonGhost}`}>{lead.id.slice(0, 8).toUpperCase()}</span>
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold">{lead.name}</div>
                                  <div className={`mt-1 truncate text-xs ${styles.muted}`}>{lead.destination || 'Destination pending'} - {typeLabels[lead.serviceKey]}</div>
                                </div>
                                <div className="flex items-center">
                                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${styles.type[lead.serviceKey]}`}>
                                    {leadLifecycleLabel(lead)}
                                  </span>
                                </div>
                                <div className="flex min-w-0 items-center">
                                  <span className="truncate text-sm font-medium">{rowOwner}</span>
                                </div>
                                <div className="flex min-w-0 flex-col justify-center">
                                  <span className="truncate text-sm font-medium">{lead.dates || 'Pending'}</span>
                                </div>
                                <div className="flex items-center">
                                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${styles.priority[priority]}`}>
                                    {priorityLabels[priority]}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium">{leadPrimaryBlocker(lead)}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )
                    ) : pageLeads.length === 0 ? (
                      <div className="p-10 text-center">
                        <Inbox className={`mx-auto h-10 w-10 ${styles.muted}`} />
                        <div className="mt-4 text-lg font-semibold">{activeNav === 'leisureStudio' ? 'No leisure trips in this inbox' : activeNav === 'corporateDesk' ? 'No corporate trips in this inbox' : 'No requests in this queue'}</div>
                        <p className={`mt-2 text-sm ${styles.muted}`}>{activeNav === 'leisureStudio' ? 'Adjust the stage lens or add a leisure request to start working.' : activeNav === 'corporateDesk' ? 'Adjust the stage lens or wait for CTM requests to arrive.' : 'Adjust filters or submit a form to create a request.'}</p>
                      </div>
                    ) : (
                      leadSections.map((section) => (
                        <div key={section.key}>
                          <div className={`${activeNav === 'leisureStudio' || activeNav === 'corporateDesk' ? 'border-b px-4 py-3' : `border-b px-5 py-3 ${styles.panelSoft}`}`}>
                            {activeNav === 'leisureStudio' || activeNav === 'corporateDesk' ? (
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="text-sm font-semibold">{section.title}</div>
                                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${styles.buttonGhost}`}>{section.leads.length}</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {(activeNav === 'corporateDesk'
                                    ? ([
                                        { key: 'all', label: 'All' },
                                        { key: 'contacted', label: 'Qualify' },
                                        { key: 'planning', label: 'Plan' },
                                        { key: 'proposal', label: 'Approval' },
                                        { key: 'won', label: 'Finance' },
                                        { key: 'execution', label: 'Release' },
                                      ] as Array<{ key: StatusFilter; label: string }>)
                                    : ([
                                        { key: 'all', label: 'All' },
                                        { key: 'contacted', label: 'Brief' },
                                        { key: 'planning', label: 'Research' },
                                        { key: 'proposal', label: 'Package' },
                                        { key: 'won', label: 'Payment' },
                                        { key: 'execution', label: 'Travel Pack' },
                                      ] as Array<{ key: StatusFilter; label: string }>)).map((filter) => (
                                    <button
                                      key={filter.key}
                                      type="button"
                                      onClick={() => changeStatusFilter(filter.key)}
                                      className={`inline-flex h-8 items-center rounded-lg border px-3 text-xs transition ${
                                        statusFilter === filter.key ? `${styles.buttonActive} border-transparent` : `${styles.buttonGhost} border-white/10`
                                      }`}
                                    >
                                      {filter.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <div className="text-sm font-semibold">{section.title}</div>
                                  <div className={`mt-1 text-xs ${styles.muted}`}>{section.subtitle}</div>
                                </div>
                                <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>{section.leads.length} in view</span>
                              </div>
                            )}
                          </div>
                          <div className={activeNav === 'leisureStudio' || activeNav === 'corporateDesk' ? 'grid' : 'grid gap-3 p-4'}>
                            {section.leads.map((lead) => {
                              const priority = fallbackPriority(lead);
                              const isSelected = selectedLead?.id === lead.id;
                              return (
                                activeNav === 'leisureStudio' || activeNav === 'corporateDesk' ? (
                                  <button
                                    key={lead.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedLeadId(lead.id);
                                      setDetailTab(activeNav === 'corporateDesk' ? 'travelers' : 'brief');
                                    }}
                                    className={`grid w-full grid-cols-[minmax(0,1fr)_92px] gap-3 border-b px-4 py-3 text-left transition ${
                                      isSelected ? styles.rowActive : styles.row
                                    }`}
                                  >
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${activeNav === 'corporateDesk' ? 'bg-sky-400' : lead.serviceKey === 'luxury' ? 'bg-[#d4af37]' : 'bg-emerald-400'}`} />
                                        <div className="truncate text-sm font-semibold">{lead.name}</div>
                                      </div>
                                      <div className={`mt-1 truncate text-xs ${styles.muted}`}>{lead.destination || 'Destination pending'}</div>
                                      <div className={`mt-1 truncate text-[11px] ${styles.muted}`}>{lead.dates || 'Dates pending'} - {leadLifecycleLabel(lead)}</div>
                                      {activeNav === 'corporateDesk' ? <div className={`mt-1 truncate text-[11px] ${styles.muted}`}>{lead.travelers || 'Traveler list pending'}</div> : null}
                                    </div>
                                    <div className="flex flex-col items-end justify-center gap-1">
                                      <span className={`rounded-full px-2 py-0.5 text-[10px] ring-1 ${styles.type[lead.serviceKey]}`}>{activeNav === 'corporateDesk' ? 'CTM' : typeLabels[lead.serviceKey]}</span>
                                      <span className={`inline-flex items-center gap-1 text-[10px] ${priority === 'urgent' || priority === 'high' ? 'text-red-300' : priority === 'normal' ? styles.soft : styles.muted}`}>
                                        <span className={`${priority === 'urgent' || priority === 'high' ? 'text-red-400' : priority === 'normal' ? 'text-sky-300' : 'text-slate-400'}`}>⚑</span>
                                        {priorityLabels[priority]}
                                      </span>
                                      {activeNav === 'corporateDesk' ? <span className={`truncate text-[10px] ${styles.muted}`}>{leadOwner(lead)}</span> : null}
                                    </div>
                                  </button>
                                ) : (
                                <button
                                  key={lead.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedLeadId(lead.id);
                                    setDetailTab('overview');
                                  }}
                                  className={`rounded-xl border p-4 text-left transition ${isSelected ? styles.rowActive : styles.row}`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex min-w-0 items-center gap-3">
                                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#7a5a08] text-sm font-semibold text-white">
                                          {initials(lead.name)}
                                        </span>
                                        <div className="min-w-0">
                                          <div className="truncate text-sm font-semibold">{lead.name}</div>
                                          <div className={`mt-1 truncate text-xs ${styles.muted}`}>
                                            {leadSegment(lead)} · {lead.destination || 'Destination pending'}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${styles.type[lead.serviceKey]}`}>
                                      {typeLabels[lead.serviceKey]}
                                    </span>
                                  </div>
                                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <div>
                                      <div className={`text-[11px] uppercase tracking-[0.12em] ${styles.muted}`}>Travel dates</div>
                                      <div className="mt-1 text-sm font-medium">{lead.dates || 'Dates pending'}</div>
                                      <div className={`mt-1 text-xs ${styles.muted}`}>{lead.travelers || 'Travelers pending'}</div>
                                    </div>
                                    <div>
                                      <div className={`text-[11px] uppercase tracking-[0.12em] ${styles.muted}`}>Budget</div>
                                      <div className="mt-1 text-sm font-medium">{lead.budget || 'Budget pending'}</div>
                                      <div className={`mt-1 text-xs ${styles.muted}`}>Received {formatDate(lead.createdAt)}</div>
                                    </div>
                                  </div>
                                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${styles.priority[priority]}`}>
                                      <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${styles.attention[attentionLevel(lead)]}`} />
                                      {priorityLabels[priority]}
                                    </span>
                                    <span className={`text-xs ${styles.muted}`}>Blocker: {leadPrimaryBlocker(lead)}</span>
                                  </div>
                                </button>
                                )
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>

              <div className={`flex flex-wrap items-center justify-between gap-3 px-1 py-4 text-sm ${styles.muted}`}>
                <div>
                  {activeNav === 'command'
                    ? `${activeItems.length === 0 ? 0 : pageStart + 1}-${Math.min(pageStart + PAGE_SIZE, activeItems.length)} of ${filteredLeads.length} active requests in the manager board`
                    : `${activeItems.length === 0 ? 0 : pageStart + 1}-${Math.min(pageStart + PAGE_SIZE, activeItems.length)} of ${activeItems.length} ${
                        activeNav === 'clients' ? 'clients' : activeNav === 'settings' ? 'users' : 'requests'
                      }`}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage(Math.max(1, safePage - 1))}
                    disabled={safePage === 1}
                    className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 transition disabled:opacity-45 ${styles.buttonGhost}`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  <span>
                    Page {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                    disabled={safePage === totalPages}
                    className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 transition disabled:opacity-45 ${styles.buttonGhost}`}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
            </div>

        <aside className={`hidden min-h-full px-5 py-6 xl:block ${styles.rightPane}`}>
          {activeNav === 'settings' ? (
            <div className="grid gap-4">
              <div className={`rounded-xl border p-5 ${styles.panel}`}>
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#12305a] text-white">
                    <Shield className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-lg font-semibold">Access Policy</div>
                    <p className={`mt-1 text-sm ${styles.muted}`}>Admins can manage everyone. Managers can maintain agent and viewer accounts only.</p>
                  </div>
                </div>
                <div className={`mt-4 rounded-lg border px-4 py-4 text-sm ${styles.panelSoft}`}>
                  <div className="font-medium">Current session</div>
                  <div className={`mt-2 ${styles.soft}`}>{crmSession.user.first_name || crmSession.user.last_name ? `${crmSession.user.first_name ?? ''} ${crmSession.user.last_name ?? ''}`.trim() : crmSession.user.username}</div>
                  <div className={`mt-1 text-xs ${styles.muted}`}>{crmRoleLabels[(crmSession.user.role === 'admin' || crmSession.user.role === 'manager' || crmSession.user.role === 'agent' || crmSession.user.role === 'viewer' ? crmSession.user.role : 'viewer') as keyof typeof crmRoleLabels]}</div>
                </div>
              </div>

              <div className={`rounded-xl border p-5 ${styles.panel}`}>
                <div className="font-semibold">Role Guide</div>
                <div className="mt-4 grid gap-3">
                  {(Object.keys(crmRoleLabels) as Array<keyof typeof crmRoleLabels>).map((role) => (
                    <div key={role} className={`rounded-lg border px-4 py-3 ${styles.panelSoft}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium">{crmRoleLabels[role]}</div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${role === 'admin' || role === 'manager' ? styles.type.corporate : role === 'agent' ? styles.type.classic : styles.priority.low}`}>
                          {role}
                        </span>
                      </div>
                      <p className={`mt-2 text-sm leading-6 ${styles.muted}`}>{crmRoleDescriptions[role]}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`rounded-xl border p-5 ${styles.panel}`}>
                <div className="font-semibold">Recommended Setup</div>
                <div className="mt-4 grid gap-3 text-sm">
                  <div className={`rounded-lg border px-4 py-3 ${styles.panelSoft}`}>
                    <div className="font-medium">Admin / Manager</div>
                    <p className={`mt-2 leading-6 ${styles.muted}`}>Admins own access control. Managers supervise operations but should not modify protected leadership accounts.</p>
                  </div>
                  <div className={`rounded-lg border px-4 py-3 ${styles.panelSoft}`}>
                    <div className="font-medium">Agent</div>
                    <p className={`mt-2 leading-6 ${styles.muted}`}>Use for day-to-day request handling, client registration, and workflow execution.</p>
                  </div>
                  <div className={`rounded-lg border px-4 py-3 ${styles.panelSoft}`}>
                    <div className="font-medium">Viewer</div>
                    <p className={`mt-2 leading-6 ${styles.muted}`}>Use for oversight roles that need visibility without operational edit permissions.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : activeNav === 'clients' ? (
            selectedClient ? (
              <div className="grid gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#7a5a08] text-lg font-semibold text-white">
                      {initials(clientLabel(selectedClient))}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-lg font-semibold">{clientLabel(selectedClient)}</h2>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${styles.type[selectedClient.serviceLevel]}`}>
                          {typeLabels[selectedClient.serviceLevel]}
                        </span>
                      </div>
                      <p className={`mt-1 text-sm ${styles.muted}`}>{clientSegment(selectedClient)} - {selectedClient.owner || 'Owner pending'}</p>
                    </div>
                  </div>
                </div>

                <div className={`rounded-xl border p-5 ${styles.panel}`}>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <div className={`text-sm ${styles.muted}`}>Primary Email</div>
                      <div className="mt-1 font-semibold">{selectedClient.email || '-'}</div>
                    </div>
                    <div>
                      <div className={`text-sm ${styles.muted}`}>Phone</div>
                      <div className="mt-1 font-semibold">{selectedClient.phone || '-'}</div>
                    </div>
                    <div>
                      <div className={`text-sm ${styles.muted}`}>Preferred Contact</div>
                      <div className="mt-1 font-semibold">{selectedClient.preferredContact || '-'}</div>
                    </div>
                    <div>
                      <div className={`text-sm ${styles.muted}`}>Open Requests</div>
                      <div className="mt-1 font-semibold">{selectedClient.activeRequestCount}</div>
                    </div>
                  </div>

                  <label className="mt-5 block">
                    <span className="font-semibold">Client Notes</span>
                    <textarea
                      value={selectedClient.notes || ''}
                      onChange={(event) => refreshClient(selectedClient.id, { notes: event.target.value })}
                      className={`mt-3 min-h-24 w-full resize-y rounded-lg border px-3 py-3 text-sm leading-6 outline-none transition ${styles.input}`}
                      placeholder="Relationship notes, preferences, commercial context..."
                    />
                  </label>
                </div>

                <div className={`rounded-xl border p-5 ${styles.panel}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">Related Requests</div>
                    <span className={`text-sm ${styles.muted}`}>{selectedClientLeads.length} linked</span>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {selectedClientLeads.length === 0 ? (
                      <div className={`rounded-lg border p-4 text-sm ${styles.panelSoft}`}>No requests linked to this client yet.</div>
                    ) : (
                      selectedClientLeads.map((lead) => (
                        <button
                          key={lead.id}
                          type="button"
                          onClick={() => {
                            setActiveNav('command');
                            setSelectedLeadId(lead.id);
                            setDetailTab('overview');
                          }}
                          className={`rounded-lg border p-4 text-left transition ${styles.panelSoft}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-medium">{lead.destination || lead.service}</div>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${styles.type[lead.serviceKey]}`}>
                              {typeLabels[lead.serviceKey]}
                            </span>
                          </div>
                          <div className={`mt-2 text-sm ${styles.muted}`}>{lead.dates || 'Dates pending'} - {leadLifecycleLabel(lead)}</div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center">
                <Users className={`mx-auto h-10 w-10 ${styles.muted}`} />
                <div className="mt-4 text-lg font-semibold">Select a client</div>
                <p className={`mt-2 text-sm ${styles.muted}`}>Registered client context appears here.</p>
              </div>
            )
          ) : activeNav === 'command' ? (
            selectedLead ? (
              <div className="grid gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#7a5a08] text-lg font-semibold text-white">
                      {initials(selectedLead.name)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-lg font-semibold">{selectedLead.name}</h2>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${styles.type[selectedLead.serviceKey]}`}>
                          {typeLabels[selectedLead.serviceKey]}
                        </span>
                      </div>
                      <p className={`mt-1 text-sm ${styles.muted}`}>{leadSegment(selectedLead)} · {selectedLead.destination || 'Destination pending'}</p>
                      <p className={`mt-1 text-xs uppercase tracking-[0.16em] ${styles.muted}`}>Manager decision board</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>{leadLifecycleLabel(selectedLead)}</span>
                </div>

                <div className={`rounded-xl border p-4 ${styles.panel}`}>
                  <div className="font-semibold">Status report</div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className={`rounded-lg border px-3 py-3 ${styles.panelSoft}`}>
                      <div className={`text-[11px] uppercase tracking-[0.12em] ${styles.muted}`}>Current status</div>
                      <div className="mt-1 text-sm font-semibold">{leadLifecycleLabel(selectedLead)}</div>
                    </div>
                    <div className={`rounded-lg border px-3 py-3 ${styles.panelSoft}`}>
                      <div className={`text-[11px] uppercase tracking-[0.12em] ${styles.muted}`}>Current owner</div>
                      <div className="mt-1 text-sm font-semibold">{managerMeta?.owner || leadOwner(selectedLead)}</div>
                    </div>
                    <div className={`rounded-lg border px-3 py-3 ${styles.panelSoft}`}>
                      <div className={`text-[11px] uppercase tracking-[0.12em] ${styles.muted}`}>Travel date</div>
                      <div className="mt-1 text-sm font-semibold">{selectedLead.dates || 'Dates pending'}</div>
                    </div>
                    <div className={`rounded-lg border px-3 py-3 ${styles.panelSoft}`}>
                      <div className={`text-[11px] uppercase tracking-[0.12em] ${styles.muted}`}>Urgency</div>
                      <div className="mt-1 text-sm font-semibold">{priorityLabels[fallbackPriority(selectedLead)]}</div>
                    </div>
                    <div className={`rounded-lg border px-3 py-3 sm:col-span-2 ${styles.panelSoft}`}>
                      <div className={`text-[11px] uppercase tracking-[0.12em] ${styles.muted}`}>Bottleneck</div>
                      <div className="mt-1 text-sm font-semibold">{selectedPrimaryBlocker}</div>
                    </div>
                  </div>
                </div>

                <div className={`rounded-xl border p-4 ${styles.panel}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">Value-chain progress</div>
                    <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>{selectedWorkflowState?.responsibleOwner || managerMeta?.task || selectedProcess?.primaryAction || 'Review request'}</span>
                  </div>
                  {(() => {
                    const currentStage = leadLifecycleStage(selectedLead);
                    const nextStage = nextLifecycleStage(selectedLead);
                    const backendStages = selectedWorkflowState?.stages ?? [];
                    const steps = backendStages.length > 0 ? backendStages : lifecycleWorkflowSteps.map(([stage, label]) => ({
                      stage,
                      label,
                      state: stage === currentStage ? 'current' : lifecycleWorkflowSteps.findIndex(([item]) => item === stage) < lifecycleWorkflowSteps.findIndex(([item]) => item === currentStage) ? 'done' : 'upcoming',
                    }));
                    const currentStep = steps.find((step) => step.state === 'current') ?? null;
                    const canAdvance = selectedWorkflowState ? selectedWorkflowState.canAdvance : Boolean(nextStage);

                    return (
                      <div className="mt-4 grid gap-3">
                        <div className={`rounded-lg border px-3 py-3 ${styles.panelSoft}`}>
                          <div className={`text-[11px] uppercase tracking-[0.12em] ${styles.muted}`}>Stage roadmap</div>
                          <div className="mt-3 grid grid-cols-4 gap-x-2 gap-y-3">
                            {steps.map((step) => {
                              const isDone = step.state === 'done';
                              const isCurrent = step.state === 'current';
                              const isBlocked = selectedWorkflowState ? selectedWorkflowState.blockers.length > 0 && isCurrent : (currentStage === 'awaiting_approval' || currentStage === 'awaiting_payment_finance') && isCurrent;
                              const StageIcon = isDone ? CheckSquare : isCurrent ? (isBlocked ? Bell : ClipboardCheck) : MoreHorizontal;

                              return (
                                <div key={step.stage} className="flex min-w-0 flex-col items-center text-center">
                                  <span
                                    className={`flex h-9 w-9 items-center justify-center rounded-full border ${
                                      isDone
                                        ? 'border-emerald-400/60 bg-emerald-500/12 text-emerald-300'
                                        : isCurrent
                                          ? isBlocked
                                            ? 'border-red-400/60 bg-red-500/12 text-red-300'
                                            : 'border-sky-400/60 bg-sky-500/12 text-sky-300'
                                          : 'border-white/10 bg-white/5 text-white/40'
                                    }`}
                                  >
                                    <StageIcon className="h-4 w-4" />
                                  </span>
                                  <div className={`mt-1 max-w-full text-[11px] leading-4 ${isCurrent ? styles.soft : styles.muted}`}>
                                    {step.label}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {currentStage === 'closed' ? (
                          <div className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-3 text-sm text-red-200">
                            Request closed. Capture the reason and decide whether it should return to nurture.
                          </div>
                        ) : currentStep ? (
                          <div className={`rounded-lg border px-3 py-3 ${styles.panelSoft}`}>
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className={`text-[11px] uppercase tracking-[0.12em] ${styles.muted}`}>Current stage</div>
                                <div className="mt-1 text-sm font-semibold">{currentStep.label}</div>
                              </div>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[11px] ${
                                  currentStage === 'awaiting_approval' || currentStage === 'awaiting_payment_finance'
                                    ? 'bg-red-500/15 text-red-300'
                                    : 'bg-sky-500/15 text-sky-300'
                                }`}
                              >
                                {selectedWorkflowState?.blockers.length || currentStage === 'awaiting_approval' || currentStage === 'awaiting_payment_finance' ? 'Current blocker' : 'In progress'}
                              </span>
                            </div>
                            <div className={`mt-3 text-sm leading-6 ${styles.soft}`}>
                              {selectedWorkflowState?.blockers[0]?.detail || selectedProcess?.stageGate || 'Current operating checkpoint.'}
                            </div>
                            <div className={`mt-3 border-t pt-3 text-sm leading-6 ${styles.muted}`}>
                              <span className={`text-[11px] uppercase tracking-[0.12em] ${styles.muted}`}>Next move</span>
                              <div className={`mt-1 ${styles.soft}`}>{selectedNextAction || 'No active process note yet.'}</div>
                            </div>
                            {selectedWorkflowState?.blockers.length ? (
                              <div className="mt-3 grid gap-2">
                                {selectedWorkflowState.blockers.map((blocker) => (
                                  <div key={blocker.key} className="rounded-lg border border-red-300/20 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                                    <span className="font-semibold">{blocker.label}:</span> {blocker.detail}
                                  </div>
                                ))}
                              </div>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => advanceLeadLifecycle(selectedLead)}
                              disabled={!canAdvance}
                              className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-45"
                            >
                              <CheckSquare className="h-4 w-4" />
                              {selectedWorkflowState?.nextStageLabel ? `Advance to ${selectedWorkflowState.nextStageLabel}` : lifecycleStageActionLabel(nextStage)}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })()}
                </div>

                <div className={`rounded-xl border p-4 ${styles.panel}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">Workflow reminders</div>
                      <div className={`mt-1 text-xs ${styles.muted}`}>{selectedWorkflowReminders.length} pending for this request</div>
                    </div>
                    <button
                      type="button"
                      onClick={generateWorkflowReminders}
                      disabled={!selectedReminderGeneration.available}
                      title={selectedReminderGeneration.reason}
                      className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs font-medium transition ${
                        selectedReminderGeneration.available
                          ? 'bg-[#12305a] text-white hover:bg-[#173d72]'
                          : 'cursor-not-allowed bg-slate-500/20 text-slate-400'
                      }`}
                    >
                      <Bell className="h-4 w-4" />
                      Generate
                    </button>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {selectedWorkflowReminders.length > 0 ? selectedWorkflowReminders.slice(0, 4).map((reminder) => (
                      <div key={reminder.id} className={`rounded-lg border px-3 py-3 ${styles.panelSoft}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{reminder.title}</div>
                            <div className={`mt-1 text-xs ${styles.muted}`}>{reminder.assignedTo || 'Unassigned'} - due {formatDate(reminder.dueAt)}</div>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] ${reminder.reminderType === 'blocker' ? 'bg-red-500/15 text-red-200' : styles.buttonGhost}`}>
                            {reminder.reminderType.replace('_', ' ')}
                          </span>
                        </div>
                        {reminder.message ? <div className={`mt-2 line-clamp-2 text-xs ${styles.soft}`}>{reminder.message}</div> : null}
                        <div className="mt-3 flex gap-2">
                          <button type="button" onClick={() => completeWorkflowReminder(reminder)} className="h-8 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white">
                            Complete
                          </button>
                          <button type="button" onClick={() => cancelWorkflowReminder(reminder)} className={`h-8 rounded-lg px-3 text-xs ${styles.buttonGhost}`}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )) : (
                      <div className={`rounded-lg border p-3 text-sm ${styles.panelSoft}`}>No pending backend reminders for this request.</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center">
                <Inbox className={`mx-auto h-10 w-10 ${styles.muted}`} />
                <div className="mt-4 text-lg font-semibold">Select a request</div>
                <p className={`mt-2 text-sm ${styles.muted}`}>Manager decision context appears here.</p>
              </div>
            )
          ) : activeNav === 'corporateDesk' ? (
            selectedLead ? (() => {
              const currentStage = leadLifecycleStage(selectedLead);
              const nextStage = nextLifecycleStage(selectedLead);
              const currentCorporateIndex = corporateWorkbenchTabs.findIndex((tab) => tab.id === detailTab);
              const activeCorporateIndex = lifecycleWorkflowSteps.findIndex(([stage]) => stage === currentStage);
              const currentCorporateLabel = corporateWorkbenchTabs.find((tab) => tab.id === detailTab)?.label ?? 'Travelers';
              const bookings = mockBookingRecords(selectedLead);
              const readinessCards =
                detailTab === 'travelers'
                  ? corporateTravelerCards(selectedLead)
                  : detailTab === 'approvals'
                    ? corporateApprovalCards(selectedLead)
                    : detailTab === 'finance'
                      ? corporateFinanceCards(selectedLead)
                      : corporateDocumentCards(selectedLead);

              return (
                <div className="grid gap-4">
                  <div className={`rounded-xl border p-5 ${styles.panel}`}>
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-[#d9b46f]">DPM Corporate Desk</div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <h2 className="text-2xl font-semibold">{selectedLead.name}</h2>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${styles.type.corporate}`}>CTM request</span>
                          <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>{leadLifecycleLabel(selectedLead)}</span>
                        </div>
                        <div className={`mt-2 text-sm ${styles.muted}`}>
                          {selectedLead.destination || 'Destination pending'} - {selectedLead.tripType || selectedLead.service} - {selectedLead.dates || 'Dates pending'}
                        </div>
                        <div className={`mt-2 text-sm ${styles.soft}`}>
                          Keep traveler readiness, approval ownership, finance clearance, documents, and booking release visible in one operating view.
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {selectedQuote ? (
                            <>
                              <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>{selectedQuote.quoteNumber} v{selectedQuote.version}</span>
                              <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>{quoteStatusLabels[selectedQuote.status]}</span>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => createDraftQuoteForLead(selectedLead)}
                              className={`inline-flex h-8 items-center rounded-lg px-3 text-xs ${styles.buttonGhost}`}
                            >
                              Create draft quote
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-right">
                        <div className={`rounded-lg border px-3 py-2 ${styles.panelSoft}`}>
                          <div className={`text-[10px] uppercase tracking-[0.16em] ${styles.muted}`}>Travelers</div>
                          <div className="mt-1 text-sm font-semibold">{selectedLead.travelers || 'Pending'}</div>
                        </div>
                        <div className={`rounded-lg border px-3 py-2 ${styles.panelSoft}`}>
                          <div className={`text-[10px] uppercase tracking-[0.16em] ${styles.muted}`}>Owner</div>
                          <div className="mt-1 text-sm font-semibold">{managerMeta?.owner || leadOwner(selectedLead)}</div>
                        </div>
                        <div className={`rounded-lg border px-3 py-2 ${styles.panelSoft}`}>
                          <div className={`text-[10px] uppercase tracking-[0.16em] ${styles.muted}`}>Urgency</div>
                          <div className="mt-1 text-sm font-semibold">{priorityLabels[fallbackPriority(selectedLead)]}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                      <div className={`rounded-lg border px-3 py-3 ${styles.panelSoft}`}>
                        <div className={`text-[11px] uppercase tracking-[0.12em] ${styles.muted}`}>Route</div>
                        <div className="mt-1 text-sm font-semibold">{selectedLead.departureCity || 'Origin pending'} to {selectedLead.destination || 'Destination pending'}</div>
                        <div className={`mt-1 text-xs ${styles.muted}`}>{selectedLead.dates || 'Dates pending'}</div>
                      </div>
                      <div className={`rounded-lg border px-3 py-3 ${styles.panelSoft}`}>
                        <div className={`text-[11px] uppercase tracking-[0.12em] ${styles.muted}`}>Department / Scope</div>
                        <div className="mt-1 text-sm font-semibold">{selectedLead.requestedServices || 'Scope pending'}</div>
                        <div className={`mt-1 text-xs ${styles.muted}`}>Company-owned movement</div>
                      </div>
                      <div className={`rounded-lg border px-3 py-3 ${styles.panelSoft}`}>
                        <div className={`text-[11px] uppercase tracking-[0.12em] ${styles.muted}`}>Finance</div>
                        <div className="mt-1 text-sm font-semibold">{selectedQuote ? moneyValue(selectedQuote.subtotalSell, selectedQuote.currency) : selectedLead.budget || 'Budget / PO pending'}</div>
                        <div className={`mt-1 text-xs ${styles.muted}`}>{selectedQuote ? `${quoteStatusLabels[selectedQuote.status]} quote` : 'Invoice-aware release'}</div>
                      </div>
                      <div className={`rounded-lg border px-3 py-3 ${styles.panelSoft}`}>
                        <div className={`text-[11px] uppercase tracking-[0.12em] ${styles.muted}`}>Bottleneck</div>
                        <div className="mt-1 text-sm font-semibold">{selectedPrimaryBlocker}</div>
                        <div className={`mt-1 text-xs ${styles.muted}`}>{selectedWorkflowState?.responsibleOwner || selectedProcess?.primaryAction || 'Review request'}</div>
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-xl border p-5 ${styles.panel}`}>
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-[#d9b46f]">Linked CTM request</div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <select
                            value={selectedCtmTrip?.id ?? ''}
                            onChange={(event) => linkCtmRequestToLead(event.target.value)}
                            className={`h-10 min-w-[260px] rounded-lg border px-3 text-sm ${styles.select}`}
                          >
                            {ctmTripRequests.length > 0 ? ctmTripRequests.map((trip) => (
                              <option key={trip.id} value={trip.id}>{trip.id} - {trip.route}</option>
                            )) : (
                              <option value="">No CTM requests loaded</option>
                            )}
                          </select>
                          <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>
                            {selectedLead.ctmRequestId === selectedCtmTrip?.id ? 'Saved link' : 'Link pending'}
                          </span>
                          {selectedCtmTrip ? (
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${styles.type.corporate}`}>{selectedCtmTrip.status}</span>
                          ) : null}
                        </div>
                        <p className={`mt-2 text-sm leading-6 ${styles.soft}`}>
                          {selectedCtmTrip
                            ? `${selectedCtmTrip.requestedBy} from ${selectedCtmTrip.department} requested ${selectedCtmTrip.route} for ${selectedCtmTrip.travelDate}.`
                            : 'Corporate work should be attached to a CTM request before quote, booking, billing, or shared client updates are processed.'}
                        </p>
                      </div>
                      {selectedCtmTrip ? (
                        <button
                          type="button"
                          onClick={() => setDetailTab('finance')}
                          className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-sm ${styles.buttonGhost}`}
                        >
                          <FileText className="h-4 w-4" />
                          Commercial output
                        </button>
                      ) : null}
                    </div>

                    {selectedCtmTrip ? (
                      <>
                        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                          {[
                            { label: 'Travelers', value: String(selectedCtmTrip.travelers.length), meta: selectedCtmTrip.travelers[0]?.name || 'Traveler list pending' },
                            {
                              label: 'Approvals',
                              value: `${selectedCtmTrip.approvals.filter((approval) => approval.status === 'Approved').length}/${selectedCtmTrip.approvals.length}`,
                              meta: selectedCtmTrip.approvals.find((approval) => approval.status === 'Pending')?.stage || 'No pending approval',
                            },
                            {
                              label: 'Quote',
                              value: selectedCtmTrip.quote ? corporateQuoteStatusLabels[selectedCtmTrip.quote.status] : 'Not created',
                              meta: selectedCtmTrip.quote ? moneyValue(selectedCtmTrip.quote.amount, selectedCtmTrip.quote.currency) : 'Prepare in CRM',
                            },
                            {
                              label: 'Booking',
                              value: selectedCtmTrip.booking ? corporateBookingStatusLabels[selectedCtmTrip.booking.status] : 'Not created',
                              meta: selectedCtmTrip.booking?.bookingReference || 'Supplier release pending',
                            },
                            {
                              label: 'Invoice',
                              value: selectedCtmTrip.invoice ? corporateInvoiceStatusLabels[selectedCtmTrip.invoice.status] : 'Not created',
                              meta: selectedCtmTrip.invoice ? moneyValue(selectedCtmTrip.invoice.amount, selectedCtmTrip.invoice.currency) : 'Billing pending',
                            },
                            {
                              label: 'Payments',
                              value: String(selectedCtmTrip.payments.length),
                              meta: selectedCtmTrip.payments[0] ? corporatePaymentStatusLabels[selectedCtmTrip.payments[0].status] : 'No payment records',
                            },
                          ].map((card) => (
                            <div key={card.label} className={`rounded-lg border px-3 py-3 ${styles.panelSoft}`}>
                              <div className={`text-[11px] uppercase tracking-[0.12em] ${styles.muted}`}>{card.label}</div>
                              <div className="mt-1 truncate text-sm font-semibold">{card.value}</div>
                              <div className={`mt-1 truncate text-xs ${styles.muted}`}>{card.meta}</div>
                            </div>
                          ))}
                        </div>

                        <div className={`mt-4 rounded-lg border p-4 ${styles.panelSoft}`}>
                          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                            <div>
                              <div className="font-semibold">CTM response loop</div>
                              <p className={`mt-1 text-sm leading-6 ${styles.muted}`}>
                                Client portal actions translated into DPM operating signals for the Corporate Desk.
                              </p>
                            </div>
                            <div className={`rounded-lg border px-3 py-2 text-sm ${styles.panel}`}>
                              <div className={`text-[10px] uppercase tracking-[0.14em] ${styles.muted}`}>Next DPM action</div>
                              <div className="mt-1 max-w-xl font-semibold">{selectedCtmNextAction}</div>
                            </div>
                          </div>
                          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {selectedCtmSignals.map((signal) => (
                              <div key={signal.label} className={`rounded-lg border px-3 py-3 ${ctmSignalToneClass(signal.tone)}`}>
                                <div className="text-[10px] uppercase tracking-[0.14em] opacity-75">{signal.label}</div>
                                <div className="mt-1 truncate text-sm font-semibold">{signal.value}</div>
                                <div className="mt-1 line-clamp-2 text-xs opacity-75">{signal.meta}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className={`mt-4 rounded-lg border p-4 text-sm ${styles.panelSoft}`}>
                        No CTM request is available. Ask the company to submit the request in CTM, then process it from this Corporate Desk.
                      </div>
                    )}
                  </div>

                  <div className={`rounded-xl border p-5 ${styles.panel}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">Corporate value chain</div>
                      <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>{leadLifecycleLabel(selectedLead)}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
                      {lifecycleWorkflowSteps.map(([stage, label], index) => {
                        const isDone = activeCorporateIndex >= 0 && index < activeCorporateIndex;
                        const isCurrent = activeCorporateIndex === index;
                        const isBlocked = isCurrent && (currentStage === 'awaiting_approval' || currentStage === 'awaiting_payment_finance');
                        const StageIcon = isDone ? CheckSquare : isCurrent ? (isBlocked ? Bell : ClipboardCheck) : MoreHorizontal;
                        return (
                          <div key={stage} className="flex min-w-0 flex-col items-center text-center">
                            <span
                              className={`flex h-9 w-9 items-center justify-center rounded-full border ${
                                isDone
                                  ? 'border-emerald-400/60 bg-emerald-500/12 text-emerald-300'
                                  : isCurrent
                                    ? isBlocked
                                      ? 'border-red-400/60 bg-red-500/12 text-red-300'
                                      : 'border-sky-400/60 bg-sky-500/12 text-sky-300'
                                    : 'border-white/10 bg-white/5 text-white/40'
                              }`}
                            >
                              <StageIcon className="h-4 w-4" />
                            </span>
                            <div className={`mt-1 max-w-full text-[11px] leading-4 ${isCurrent ? styles.soft : styles.muted}`}>{label}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className={`mt-4 rounded-lg border px-3 py-3 ${styles.panelSoft}`}>
                      <div className={`text-[11px] uppercase tracking-[0.12em] ${styles.muted}`}>Current control point</div>
                      <div className="mt-1 text-sm font-semibold">{selectedPrimaryBlocker}</div>
                      <p className={`mt-2 text-sm leading-6 ${styles.soft}`}>{selectedWorkflowState?.blockers[0]?.detail || selectedProcess?.stageGate || 'Keep the current corporate checkpoint controlled before release.'}</p>
                      <button
                        type="button"
                        onClick={() => advanceLeadLifecycle(selectedLead)}
                        disabled={selectedWorkflowState ? !selectedWorkflowState.canAdvance : !nextStage}
                        className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <CheckSquare className="h-4 w-4" />
                        {selectedWorkflowState?.nextStageLabel ? `Advance to ${selectedWorkflowState.nextStageLabel}` : lifecycleStageActionLabel(nextStage)}
                      </button>
                    </div>
                  </div>

                  <div className={`rounded-xl border p-5 ${styles.panel}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">Corporate work area</div>
                      <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>{currentCorporateLabel}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-6">
                      {corporateWorkbenchTabs.map(({ id, label, Icon }, index) => {
                        const isDone = currentCorporateIndex > index;
                        const isCurrent = currentCorporateIndex === index;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setDetailTab(id)}
                            className={`rounded-xl border px-3 py-3 text-left transition ${
                              isDone
                                ? 'border-emerald-400/25 bg-emerald-500/10'
                                : isCurrent
                                  ? 'border-sky-400/25 bg-sky-500/10'
                                  : `${styles.panelSoft}`
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                                  isDone
                                    ? 'border-emerald-400/60 text-emerald-300'
                                    : isCurrent
                                      ? 'border-sky-400/60 text-sky-300'
                                      : 'border-white/10 text-white/45'
                                }`}
                              >
                                <Icon className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium">{label}</div>
                                <div className={`mt-0.5 text-[11px] ${isCurrent ? styles.soft : styles.muted}`}>
                                  {isDone ? 'Done' : isCurrent ? 'Live' : 'Upcoming'}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className={`rounded-xl border p-5 ${styles.panel}`}>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold">{currentCorporateLabel}</div>
                        <div className={`mt-1 text-sm ${styles.muted}`}>{selectedNextAction || 'Move the corporate request through the active checkpoint.'}</div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>{selectedWorkflowState?.currentStageLabel || selectedProcess?.primaryAction || 'Working stage'}</span>
                    </div>

                    {detailTab === 'itinerary' ? (
                      <div className="grid gap-4">
                        {selectedQuote ? (
                          <div className="grid gap-3 md:grid-cols-3">
                            {selectedQuote.lines.map((line) => (
                              <div key={line.id} className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                                <div className="flex items-center justify-between gap-3">
                                  <div className="font-semibold">{line.description}</div>
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${styles.buttonGhost}`}>{line.status}</span>
                                </div>
                                <div className={`mt-2 text-sm ${styles.muted}`}>{line.supplier || line.category}</div>
                                <div className="mt-3 text-xs font-semibold text-[#d9b46f]">{selectedQuote.quoteNumber}</div>
                                <p className={`mt-3 text-sm leading-6 ${styles.soft}`}>Sell value: {moneyValue(line.totalSell, selectedQuote.currency)}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="grid gap-3 md:grid-cols-3">
                            {bookings.map((booking) => (
                              <div key={booking.reference} className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                                <div className="flex items-center justify-between gap-3">
                                  <div className="font-semibold">{booking.service}</div>
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${styles.buttonGhost}`}>{booking.status}</span>
                                </div>
                                <div className={`mt-2 text-sm ${styles.muted}`}>{booking.supplier}</div>
                                <div className="mt-3 text-xs font-semibold text-[#d9b46f]">{booking.reference}</div>
                                <p className={`mt-3 text-sm leading-6 ${styles.soft}`}>{booking.note}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                          <div className="font-semibold">Booking release rule</div>
                          <p className={`mt-2 text-sm leading-6 ${styles.soft}`}>
                            Release booking only when traveler names, approver sign-off, finance posture, and document readiness are visible for the account owner.
                          </p>
                        </div>
                      </div>
                    ) : detailTab === 'history' ? (
                      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                        <div className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                          <div className="font-semibold">Fulfilment timeline</div>
                          <div className="mt-4 grid gap-4">
                            {selectedHistory.map((item) => (
                              <div key={`${item.label}-${item.meta}`} className="flex gap-3">
                                <span
                                  className={`mt-1 h-2.5 w-2.5 rounded-full ${
                                    item.tone === 'done'
                                      ? 'bg-emerald-400'
                                      : item.tone === 'current'
                                        ? 'bg-sky-400'
                                        : item.tone === 'closed'
                                          ? 'bg-red-400'
                                          : 'bg-white/30'
                                  }`}
                                />
                                <div>
                                  <div className="font-medium">{item.label}</div>
                                  <div className={`text-sm ${styles.muted}`}>{item.meta}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                          <div className="font-semibold">Post-trip account intelligence</div>
                          <p className={`mt-3 text-sm leading-6 ${styles.soft}`}>
                            Capture route performance, traveler changes, invoice friction, preferred suppliers, and repeat patterns so the next CTM request starts cleaner.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        <div className="grid gap-3 md:grid-cols-3">
                          {readinessCards.map((card) => (
                            <div key={card.label} className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                              <div className={`text-sm ${styles.muted}`}>{card.label}</div>
                              <div className="mt-2 font-semibold">{card.value}</div>
                              {card.meta ? <div className={`mt-2 text-sm leading-6 ${styles.muted}`}>{card.meta}</div> : null}
                            </div>
                          ))}
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                          {mockWorkflowItems(selectedLead, detailTab).map((item) => (
                            <div key={item.title} className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                              <div className="font-semibold">{item.title}</div>
                              <div className="mt-2 text-sm font-medium">{item.value}</div>
                              <p className={`mt-2 text-sm leading-6 ${styles.muted}`}>{item.meta}</p>
                            </div>
                          ))}
                        </div>
                        {detailTab === 'documents' ? (
                          <label className="block">
                            <span className="font-semibold">Internal readiness notes</span>
                            <textarea
                              value={selectedLead.internalNotes || ''}
                              onChange={(event) => refreshLead(selectedLead.id, { internalNotes: event.target.value })}
                              className={`mt-3 min-h-28 w-full resize-y rounded-lg border px-3 py-3 text-sm leading-6 outline-none transition ${styles.input}`}
                              placeholder="Visa status, missing traveler data, invoice dependencies..."
                            />
                          </label>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              );
            })() : (
              <div className="p-8 text-center">
                <Inbox className={`mx-auto h-10 w-10 ${styles.muted}`} />
                <div className="mt-4 text-lg font-semibold">Select a corporate request</div>
                <p className={`mt-2 text-sm ${styles.muted}`}>Corporate operating context appears here.</p>
              </div>
            )
          ) : activeNav === 'leisureStudio' ? (
            selectedLead ? (() => {
              const currentWorkbenchIndex = leisureWorkbenchTabs.findIndex((tab) => tab.id === detailTab);
              const fallbackPricing = selectedLeisureRows.reduce(
                (totals, row) => ({
                  cost: totals.cost + row.cost,
                  sell: totals.sell + row.sell,
                }),
                { cost: 0, sell: 0 },
              );
              const pricing = selectedQuote
                ? {
                    cost: Number(selectedQuote.subtotalCost),
                    sell: Number(selectedQuote.subtotalSell),
                  }
                : fallbackPricing;
              const margin = pricing.sell - pricing.cost;
              const marginPercent = pricing.sell > 0 ? Math.round((margin / pricing.sell) * 100) : 0;
              const currentWorkbenchLabel =
                leisureWorkbenchTabs.find((tab) => tab.id === detailTab)?.label ?? 'Brief';
              const nextStage = nextLifecycleStage(selectedLead);

              return (
                <div className="grid gap-4">
                    <div className={`rounded-xl border p-5 ${styles.panel}`}>
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-[#d9b46f]">DPM Leisure Studio</div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <h2 className="text-2xl font-semibold">{selectedLead.destination || 'Destination pending'}</h2>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${styles.type[selectedLead.serviceKey]}`}>
                              {typeLabels[selectedLead.serviceKey]}
                            </span>
                            <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>{leadLifecycleLabel(selectedLead)}</span>
                          </div>
                          <div className={`mt-2 text-sm ${styles.muted}`}>
                            {selectedLead.name} · {selectedLead.tripType || selectedLead.service} · {selectedLead.dates || 'Dates pending'}
                          </div>
                          <div className={`mt-2 text-sm ${styles.soft}`}>
                            {selectedLead.serviceKey === 'luxury' ? 'High-touch leisure design with premium service framing.' : 'Balanced leisure design focused on clarity, fit, and smooth delivery.'}
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {selectedQuote ? (
                              <>
                                <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>{selectedQuote.quoteNumber} v{selectedQuote.version}</span>
                                <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>{quoteStatusLabels[selectedQuote.status]}</span>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => createDraftQuoteForLead(selectedLead)}
                                className={`inline-flex h-8 items-center rounded-lg px-3 text-xs ${styles.buttonGhost}`}
                              >
                                Create draft quote
                              </button>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => advanceLeadLifecycle(selectedLead)}
                            disabled={!nextStage}
                            className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            <CheckSquare className="h-4 w-4" />
                            {lifecycleStageActionLabel(nextStage)}
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-right">
                          <div className={`rounded-lg border px-3 py-2 ${styles.panelSoft}`}>
                            <div className={`text-[10px] uppercase tracking-[0.16em] ${styles.muted}`}>Budget</div>
                            <div className="mt-1 text-sm font-semibold">{selectedLead.budget || 'Pending'}</div>
                          </div>
                          <div className={`rounded-lg border px-3 py-2 ${styles.panelSoft}`}>
                            <div className={`text-[10px] uppercase tracking-[0.16em] ${styles.muted}`}>Sell</div>
                            <div className="mt-1 text-sm font-semibold">${pricing.sell.toLocaleString()}</div>
                          </div>
                          <div className={`rounded-lg border px-3 py-2 ${styles.panelSoft}`}>
                            <div className={`text-[10px] uppercase tracking-[0.16em] ${styles.muted}`}>Margin</div>
                            <div className="mt-1 text-sm font-semibold">{marginPercent}%</div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <div className={`rounded-lg border px-3 py-3 ${styles.panelSoft}`}>
                          <div className={`text-[11px] uppercase tracking-[0.12em] ${styles.muted}`}>Travel mood</div>
                          <div className="mt-1 text-sm font-semibold">{selectedLead.urgency || 'Planned trip'}</div>
                          <div className={`mt-1 text-xs ${styles.muted}`}>{selectedLead.preferredContact || 'Contact preference pending'}</div>
                        </div>
                        <div className={`rounded-lg border px-3 py-3 ${styles.panelSoft}`}>
                          <div className={`text-[11px] uppercase tracking-[0.12em] ${styles.muted}`}>Travelers</div>
                          <div className="mt-1 text-sm font-semibold">{selectedLead.travelers || 'Pending'}</div>
                          <div className={`mt-1 text-xs ${styles.muted}`}>{selectedLead.departureCity || 'Origin pending'}</div>
                        </div>
                        <div className={`rounded-lg border px-3 py-3 ${styles.panelSoft}`}>
                          <div className={`text-[11px] uppercase tracking-[0.12em] ${styles.muted}`}>Current owner</div>
                          <div className="mt-1 text-sm font-semibold">{selectedWorkflowState?.responsibleOwner || leadOwner(selectedLead)}</div>
                          <div className={`mt-1 text-xs ${styles.muted}`}>Studio work owner</div>
                        </div>
                        <div className={`rounded-lg border px-3 py-3 ${styles.panelSoft}`}>
                          <div className={`text-[11px] uppercase tracking-[0.12em] ${styles.muted}`}>Current stage</div>
                          <div className="mt-1 text-sm font-semibold">{selectedWorkflowState?.currentStageLabel || currentWorkbenchLabel}</div>
                          <div className={`mt-1 text-xs ${styles.muted}`}>{selectedPrimaryBlocker}</div>
                        </div>
                      </div>
                    </div>

                    <div className={`rounded-xl border p-5 ${styles.panel}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold">Leisure value chain</div>
                        <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>{currentWorkbenchLabel}</span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-7">
                        {leisureWorkbenchTabs.map(({ id, label, Icon }, index) => {
                          const isDone = currentWorkbenchIndex > index;
                          const isCurrent = currentWorkbenchIndex === index;
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => setDetailTab(id)}
                              className={`rounded-xl border px-3 py-3 text-left transition ${
                                isDone
                                  ? 'border-emerald-400/25 bg-emerald-500/10'
                                  : isCurrent
                                    ? 'border-sky-400/25 bg-sky-500/10'
                                    : `${styles.panelSoft}`
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                                    isDone
                                      ? 'border-emerald-400/60 text-emerald-300'
                                      : isCurrent
                                        ? 'border-sky-400/60 text-sky-300'
                                        : 'border-white/10 text-white/45'
                                  }`}
                                >
                                  <Icon className="h-4 w-4" />
                                </span>
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium">{label}</div>
                                  <div className={`mt-0.5 text-[11px] ${isCurrent ? styles.soft : styles.muted}`}>
                                    {isDone ? 'Done' : isCurrent ? 'Live' : 'Upcoming'}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className={`rounded-xl border p-5 ${styles.panel}`}>
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold">{currentWorkbenchLabel}</div>
                          <div className={`mt-1 text-sm ${styles.muted}`}>{selectedWorkflowState?.blockers[0]?.detail || selectedProcess?.stageGate || 'Use this space to move the trip through the active leisure checkpoint.'}</div>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>{selectedWorkflowState?.currentStageLabel || selectedProcess?.primaryAction || 'Working stage'}</span>
                      </div>

                      {detailTab === 'brief' ? renderBriefingGate() : null}

                      {detailTab === 'itinerary' ? (
                        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
                          <div className="grid gap-4">
                            <div className={`rounded-xl border p-4 ${styles.panelSoft}`}>
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <div className="text-[11px] uppercase tracking-[0.18em] text-[#d9b46f]">Trip Design</div>
                                  <div className="mt-2 text-xl font-semibold">{selectedItinerary?.title || selectedLead.destination || 'Route pending'}</div>
                                  <div className={`mt-1 text-sm ${styles.muted}`}>
                                    {selectedItinerary ? formatDateRange(selectedItinerary.startDate, selectedItinerary.endDate) : selectedLead.dates || 'Dates pending'} - {selectedLead.travelers || 'Travelers pending'}
                                  </div>
                                </div>
                                <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>
                                  {selectedItinerary ? itineraryStatusLabels[selectedItinerary.status] : 'Local design draft'}
                                </span>
                              </div>
                              <div className="mt-4 grid gap-3 md:grid-cols-4">
                                {selectedItinerarySummary.map((card) => (
                                  <div key={card.label} className={`rounded-lg border px-3 py-3 ${styles.panel}`}>
                                    <div className={`text-[10px] uppercase tracking-[0.14em] ${styles.muted}`}>{card.label}</div>
                                    <div className="mt-1 text-sm font-semibold">{card.value}</div>
                                    {card.meta ? <div className={`mt-1 line-clamp-2 text-xs ${styles.muted}`}>{card.meta}</div> : null}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className={`overflow-hidden rounded-xl border ${styles.panelSoft}`}>
                              <div className={`grid grid-cols-[70px_minmax(160px,1fr)_120px_minmax(180px,1.2fr)_minmax(160px,1fr)_110px] gap-3 border-b px-4 py-3 text-xs uppercase tracking-[0.14em] ${styles.tableHead}`}>
                                <div>Stop</div>
                                <div>City</div>
                                <div>Nights</div>
                                <div>Stay</div>
                                <div>Room</div>
                                <div>Status</div>
                              </div>
                              {selectedItineraryStops.map((stop, index) => (
                                <div key={`${stop.city}-${index}`} className={`grid grid-cols-[70px_minmax(160px,1fr)_120px_minmax(180px,1.2fr)_minmax(160px,1fr)_110px] gap-3 border-b px-4 py-3 text-sm ${styles.panel}`}>
                                  <div className="font-semibold text-[#d9b46f]">{index + 1}</div>
                                  <div>
                                    <div className="font-semibold">{stop.city}</div>
                                    {stop.dates ? <div className={`mt-1 text-xs ${styles.muted}`}>{stop.dates}</div> : null}
                                  </div>
                                  <div>{stop.nights}</div>
                                  <div className={styles.soft}>{stop.stay}</div>
                                  <div className={styles.soft}>{stop.room}</div>
                                  <div>
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${styles.buttonGhost}`}>{stop.status || stop.focus}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const accommodation = selectedItinerary?.stops[index]?.accommodations[0];
                                        linkTripDesignItemToQuote({
                                          category: 'hotel',
                                          description: `${stop.city} stay - ${accommodation?.name || stop.stay}`,
                                          supplier: accommodation?.supplier || '',
                                          notes: `Linked from Trip Design stop ${index + 1}. Room: ${stop.room}.`,
                                        });
                                      }}
                                      disabled={quoteHasLine(`${stop.city} stay - ${selectedItinerary?.stops[index]?.accommodations[0]?.name || stop.stay}`)}
                                      className={`mt-2 block h-7 rounded-lg px-2 text-[10px] disabled:cursor-not-allowed disabled:opacity-45 ${styles.buttonGhost}`}
                                    >
                                      {quoteHasLine(`${stop.city} stay - ${selectedItinerary?.stops[index]?.accommodations[0]?.name || stop.stay}`) ? 'Linked' : 'Quote'}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2">
                              <div className={`rounded-xl border p-4 ${styles.panelSoft}`}>
                                <div className="flex items-center justify-between gap-3">
                                  <div className="font-semibold">Movement plan</div>
                                  <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>{selectedTransportSegments.length || selectedItineraryStops.length} segments</span>
                                </div>
                                <div className="mt-4 grid gap-3">
                                  {selectedTransportSegments.length > 0 ? (
                                    selectedTransportSegments.map((segment) => (
                                      <div key={segment.id} className={`rounded-lg border p-3 ${styles.panel}`}>
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="font-medium">{segment.fromCity} to {segment.toCity}</div>
                                          <div className="shrink-0 text-right">
                                            <span className={`rounded-full px-2 py-0.5 text-[10px] ${styles.buttonGhost}`}>{itineraryBookingStatusLabels[segment.bookingStatus]}</span>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                linkTripDesignItemToQuote({
                                                  category: segment.mode === 'flight' ? 'flight' : 'transfer',
                                                  description: `${segment.mode} - ${segment.fromCity} to ${segment.toCity}`,
                                                  supplier: segment.supplier,
                                                  notes: `Linked from Trip Design movement. Reference: ${segment.reference || 'pending'}.`,
                                                })
                                              }
                                              disabled={quoteHasLine(`${segment.mode} - ${segment.fromCity} to ${segment.toCity}`)}
                                              className={`mt-2 block h-7 rounded-lg px-2 text-[10px] disabled:cursor-not-allowed disabled:opacity-45 ${styles.buttonGhost}`}
                                            >
                                              {quoteHasLine(`${segment.mode} - ${segment.fromCity} to ${segment.toCity}`) ? 'Linked' : 'Quote'}
                                            </button>
                                          </div>
                                        </div>
                                        <div className={`mt-2 text-xs ${styles.muted}`}>{segment.mode} - {segment.supplier || 'Supplier pending'}</div>
                                        <div className={`mt-1 text-xs ${styles.muted}`}>{segment.reference || 'Reference pending'}</div>
                                      </div>
                                    ))
                                  ) : (
                                    selectedItineraryStops.map((stop, index) => (
                                      <div key={`${stop.city}-movement`} className={`rounded-lg border p-3 ${styles.panel}`}>
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="font-medium">{index === 0 ? selectedLead.departureCity || 'Origin' : selectedItineraryStops[index - 1]?.city} to {stop.city}</div>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              linkTripDesignItemToQuote({
                                                category: 'transfer',
                                                description: `movement - ${index === 0 ? selectedLead.departureCity || 'Origin' : selectedItineraryStops[index - 1]?.city} to ${stop.city}`,
                                                notes: 'Linked from Trip Design movement placeholder.',
                                              })
                                            }
                                            disabled={quoteHasLine(`movement - ${index === 0 ? selectedLead.departureCity || 'Origin' : selectedItineraryStops[index - 1]?.city} to ${stop.city}`)}
                                            className={`h-7 rounded-lg px-2 text-[10px] disabled:cursor-not-allowed disabled:opacity-45 ${styles.buttonGhost}`}
                                          >
                                            {quoteHasLine(`movement - ${index === 0 ? selectedLead.departureCity || 'Origin' : selectedItineraryStops[index - 1]?.city} to ${stop.city}`) ? 'Linked' : 'Quote'}
                                          </button>
                                        </div>
                                        <div className={`mt-2 text-xs ${styles.muted}`}>Movement method and supplier pending.</div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>

                              <div className={`rounded-xl border p-4 ${styles.panelSoft}`}>
                                <div className="flex items-center justify-between gap-3">
                                  <div className="font-semibold">Experiences</div>
                                  <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>{selectedItineraryExperiences.length} planned</span>
                                </div>
                                <div className="mt-4 grid gap-3">
                                  {selectedItineraryExperiences.map((experience) => (
                                    <div key={`${experience.title}-${experience.timing}`} className={`rounded-lg border p-3 ${styles.panel}`}>
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="font-medium">{experience.title}</div>
                                        <div className="shrink-0 text-right">
                                          <span className={`rounded-full px-2 py-0.5 text-[10px] ${styles.buttonGhost}`}>{experience.status || experience.timing}</span>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              linkTripDesignItemToQuote({
                                                category: 'activity',
                                                description: `experience - ${experience.title}`,
                                                supplier: experience.category.split(' - ').at(-1) === 'Experience' ? '' : experience.category.split(' - ').at(-1),
                                                notes: `Linked from Trip Design experience. Timing: ${experience.timing}.`,
                                              })
                                            }
                                            disabled={quoteHasLine(`experience - ${experience.title}`)}
                                            className={`mt-2 block h-7 rounded-lg px-2 text-[10px] disabled:cursor-not-allowed disabled:opacity-45 ${styles.buttonGhost}`}
                                          >
                                            {quoteHasLine(`experience - ${experience.title}`) ? 'Linked' : 'Quote'}
                                          </button>
                                        </div>
                                      </div>
                                      <div className={`mt-2 text-xs ${styles.muted}`}>{experience.category} - {experience.timing}</div>
                                      <p className={`mt-2 text-sm leading-6 ${styles.soft}`}>{experience.note}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid content-start gap-3 xl:sticky xl:top-24">
                            <div className={`rounded-xl border p-3 ${styles.panelSoft}`}>
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-semibold">Design readiness</div>
                                <span className={`rounded-full px-2.5 py-1 text-[11px] ${isCostingReady ? 'bg-emerald-500/15 text-emerald-200' : 'bg-red-500/15 text-red-200'}`}>
                                  {isCostingReady ? 'Costing ready' : 'Costing gate'}
                                </span>
                              </div>
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                {selectedTripDesignReadiness.map((item) => (
                                  <div key={item.label} className={`min-w-0 rounded-lg border px-2.5 py-2 ${styles.panel}`}>
                                    <div className="flex items-center gap-1.5">
                                      <CheckSquare className={`h-3.5 w-3.5 ${item.ready ? 'text-emerald-300' : 'text-red-300'}`} />
                                      <span className="truncate text-xs font-medium">{item.label}</span>
                                    </div>
                                    <div className={`mt-1 truncate text-[11px] ${styles.muted}`}>{item.meta}</div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className={`rounded-xl border p-3 ${styles.panelSoft}`}>
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-semibold">Add / edit</div>
                                <span className={`rounded-full px-2.5 py-1 text-[11px] ${styles.buttonGhost}`}>One editor</span>
                              </div>
                              <div className="mt-3 grid grid-cols-3 gap-1.5">
                                {([
                                  ['stop', 'City'],
                                  ['stay', 'Stay'],
                                  ['movement', 'Move'],
                                  ['experience', 'Experience'],
                                  ['notes', 'Notes'],
                                ] as Array<[TripDesignEditor, string]>).map(([id, label]) => (
                                  <button
                                    key={id}
                                    type="button"
                                    onClick={() => setActiveTripDesignEditor(id)}
                                    className={`h-9 rounded-lg px-2 text-xs transition ${activeTripDesignEditor === id ? styles.buttonActive : styles.buttonGhost}`}
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>

                              <div className={`mt-3 rounded-lg border p-3 ${styles.panel}`}>
                                {activeTripDesignEditor === 'stop' ? (
                                  <div className="grid gap-2">
                                    <div className="text-sm font-semibold">City stop</div>
                                    <input value={tripDesignDrafts.stop.city} onChange={(event) => updateTripDesignDraft('stop', 'city', event.target.value)} className={`h-9 rounded-lg border px-3 text-xs ${styles.input}`} placeholder="City" />
                                    <div className="grid grid-cols-2 gap-2">
                                      <input value={tripDesignDrafts.stop.country} onChange={(event) => updateTripDesignDraft('stop', 'country', event.target.value)} className={`h-9 rounded-lg border px-3 text-xs ${styles.input}`} placeholder="Country" />
                                      <input value={tripDesignDrafts.stop.nights} onChange={(event) => updateTripDesignDraft('stop', 'nights', event.target.value)} className={`h-9 rounded-lg border px-3 text-xs ${styles.input}`} placeholder="Nights" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <input type="date" value={tripDesignDrafts.stop.arrivalDate} min={maxDateInput(currentDateInput(), selectedTripDateRange.startDate)} max={selectedTripDateRange.endDate ?? undefined} onChange={(event) => updateTripDesignDraft('stop', 'arrivalDate', event.target.value)} className={`h-9 rounded-lg border px-3 text-xs ${styles.input}`} />
                                      <input type="date" value={tripDesignDrafts.stop.departureDate} min={maxDateInput(currentDateInput(), tripDesignDrafts.stop.arrivalDate, selectedTripDateRange.startDate)} max={selectedTripDateRange.endDate ?? undefined} onChange={(event) => updateTripDesignDraft('stop', 'departureDate', event.target.value)} className={`h-9 rounded-lg border px-3 text-xs ${styles.input}`} />
                                    </div>
                                    <select value={tripDesignDrafts.stop.purpose} onChange={(event) => updateTripDesignDraft('stop', 'purpose', event.target.value as TripDesignDrafts['stop']['purpose'])} className={`h-9 rounded-lg border px-3 text-xs ${styles.select}`}>
                                      {['leisure', 'business', 'transit', 'event', 'extension'].map((purpose) => (
                                        <option key={purpose} value={purpose}>{purpose}</option>
                                      ))}
                                    </select>
                                    <button type="button" onClick={submitTripDesignStop} className="h-9 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white">
                                      Add city
                                    </button>
                                  </div>
                                ) : null}

                                {activeTripDesignEditor === 'stay' ? (
                                  <div className="grid gap-2">
                                    <div className="text-sm font-semibold">Stay</div>
                                    <select value={tripDesignDrafts.stay.stopId || selectedItinerary?.stops[0]?.id || ''} onChange={(event) => updateTripDesignDraft('stay', 'stopId', event.target.value)} className={`h-9 rounded-lg border px-3 text-xs ${styles.select}`}>
                                      <option value="">Choose stop</option>
                                      {selectedItinerary?.stops.map((stop) => (
                                        <option key={stop.id} value={stop.id}>{stop.city}</option>
                                      ))}
                                    </select>
                                    <input value={tripDesignDrafts.stay.name} onChange={(event) => updateTripDesignDraft('stay', 'name', event.target.value)} className={`h-9 rounded-lg border px-3 text-xs ${styles.input}`} placeholder="Hotel / accommodation" />
                                    <input value={tripDesignDrafts.stay.roomType} onChange={(event) => updateTripDesignDraft('stay', 'roomType', event.target.value)} className={`h-9 rounded-lg border px-3 text-xs ${styles.input}`} placeholder="Room type" />
                                    <div className="grid grid-cols-2 gap-2">
                                      <input type="date" value={tripDesignDrafts.stay.checkIn} min={maxDateInput(currentDateInput(), selectedStayStop?.arrivalDate)} max={selectedStayStop?.departureDate ?? undefined} onChange={(event) => updateTripDesignDraft('stay', 'checkIn', event.target.value)} className={`h-9 rounded-lg border px-3 text-xs ${styles.input}`} />
                                      <input type="date" value={tripDesignDrafts.stay.checkOut} min={maxDateInput(currentDateInput(), tripDesignDrafts.stay.checkIn, selectedStayStop?.arrivalDate)} max={selectedStayStop?.departureDate ?? undefined} onChange={(event) => updateTripDesignDraft('stay', 'checkOut', event.target.value)} className={`h-9 rounded-lg border px-3 text-xs ${styles.input}`} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <input value={tripDesignDrafts.stay.rooms} onChange={(event) => updateTripDesignDraft('stay', 'rooms', event.target.value)} className={`h-9 rounded-lg border px-3 text-xs ${styles.input}`} placeholder="Rooms" />
                                      <select value={tripDesignDrafts.stay.bookingStatus} onChange={(event) => updateTripDesignDraft('stay', 'bookingStatus', event.target.value as TripDesignDrafts['stay']['bookingStatus'])} className={`h-9 rounded-lg border px-3 text-xs ${styles.select}`}>
                                        {Object.keys(itineraryBookingStatusLabels).map((status) => (
                                          <option key={status} value={status}>{itineraryBookingStatusLabels[status as keyof typeof itineraryBookingStatusLabels]}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <input value={tripDesignDrafts.stay.supplier} onChange={(event) => updateTripDesignDraft('stay', 'supplier', event.target.value)} className={`h-9 rounded-lg border px-3 text-xs ${styles.input}`} placeholder="Supplier" />
                                    <button type="button" onClick={submitTripDesignStay} className="h-9 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white">
                                      Add stay
                                    </button>
                                  </div>
                                ) : null}

                                {activeTripDesignEditor === 'movement' ? (
                                  <div className="grid gap-2">
                                    <div className="text-sm font-semibold">Movement</div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <input value={tripDesignDrafts.movement.fromCity} onChange={(event) => updateTripDesignDraft('movement', 'fromCity', event.target.value)} className={`h-9 rounded-lg border px-3 text-xs ${styles.input}`} placeholder="From" />
                                      <input value={tripDesignDrafts.movement.toCity} onChange={(event) => updateTripDesignDraft('movement', 'toCity', event.target.value)} className={`h-9 rounded-lg border px-3 text-xs ${styles.input}`} placeholder="To" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <select value={tripDesignDrafts.movement.mode} onChange={(event) => updateTripDesignDraft('movement', 'mode', event.target.value as TripDesignDrafts['movement']['mode'])} className={`h-9 rounded-lg border px-3 text-xs ${styles.select}`}>
                                        {['flight', 'train', 'car', 'ferry', 'transfer', 'other'].map((mode) => (
                                          <option key={mode} value={mode}>{mode}</option>
                                        ))}
                                      </select>
                                      <select value={tripDesignDrafts.movement.bookingStatus} onChange={(event) => updateTripDesignDraft('movement', 'bookingStatus', event.target.value as TripDesignDrafts['movement']['bookingStatus'])} className={`h-9 rounded-lg border px-3 text-xs ${styles.select}`}>
                                        {Object.keys(itineraryBookingStatusLabels).map((status) => (
                                          <option key={status} value={status}>{itineraryBookingStatusLabels[status as keyof typeof itineraryBookingStatusLabels]}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <input type="datetime-local" value={tripDesignDrafts.movement.departureAt} min={`${maxDateInput(currentDateInput(), selectedTripDateRange.startDate) ?? currentDateInput()}T00:00`} max={selectedTripDateRange.endDate ? `${selectedTripDateRange.endDate}T23:59` : undefined} onChange={(event) => updateTripDesignDraft('movement', 'departureAt', event.target.value)} className={`h-9 rounded-lg border px-3 text-xs ${styles.input}`} />
                                      <input type="datetime-local" value={tripDesignDrafts.movement.arrivalAt} min={tripDesignDrafts.movement.departureAt || `${maxDateInput(currentDateInput(), selectedTripDateRange.startDate) ?? currentDateInput()}T00:00`} max={selectedTripDateRange.endDate ? `${selectedTripDateRange.endDate}T23:59` : undefined} onChange={(event) => updateTripDesignDraft('movement', 'arrivalAt', event.target.value)} className={`h-9 rounded-lg border px-3 text-xs ${styles.input}`} />
                                    </div>
                                    <input value={tripDesignDrafts.movement.supplier} onChange={(event) => updateTripDesignDraft('movement', 'supplier', event.target.value)} className={`h-9 rounded-lg border px-3 text-xs ${styles.input}`} placeholder="Supplier" />
                                    <button type="button" onClick={submitTripDesignMovement} className="h-9 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white">
                                      Add movement
                                    </button>
                                  </div>
                                ) : null}

                                {activeTripDesignEditor === 'experience' ? (
                                  <div className="grid gap-2">
                                    <div className="text-sm font-semibold">Experience</div>
                                    <select value={tripDesignDrafts.experience.stopId || selectedItinerary?.stops[0]?.id || ''} onChange={(event) => updateTripDesignDraft('experience', 'stopId', event.target.value)} className={`h-9 rounded-lg border px-3 text-xs ${styles.select}`}>
                                      <option value="">Choose stop</option>
                                      {selectedItinerary?.stops.map((stop) => (
                                        <option key={stop.id} value={stop.id}>{stop.city}</option>
                                      ))}
                                    </select>
                                    <input value={tripDesignDrafts.experience.title} onChange={(event) => updateTripDesignDraft('experience', 'title', event.target.value)} className={`h-9 rounded-lg border px-3 text-xs ${styles.input}`} placeholder="Activity / experience" />
                                    <input value={tripDesignDrafts.experience.category} onChange={(event) => updateTripDesignDraft('experience', 'category', event.target.value)} className={`h-9 rounded-lg border px-3 text-xs ${styles.input}`} placeholder="Category" />
                                    <input value={tripDesignDrafts.experience.supplier} onChange={(event) => updateTripDesignDraft('experience', 'supplier', event.target.value)} className={`h-9 rounded-lg border px-3 text-xs ${styles.input}`} placeholder="Supplier" />
                                    <button type="button" onClick={submitTripDesignExperience} className="h-9 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white">
                                      Add experience
                                    </button>
                                  </div>
                                ) : null}

                                {activeTripDesignEditor === 'notes' ? (
                                  <div className="grid gap-2">
                                    <div className="text-sm font-semibold">Design notes</div>
                                    <textarea
                                      value={selectedLead.internalNotes || ''}
                                      onChange={(event) => refreshLead(selectedLead.id, { internalNotes: event.target.value })}
                                      className={`h-44 w-full resize-none rounded-lg border px-3 py-3 text-sm leading-6 outline-none transition ${styles.input}`}
                                      placeholder="Capture routing logic, hotel reasons, room preferences, activity notes, and proposal angle."
                                    />
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            <div className={`rounded-xl border p-3 ${styles.panelSoft}`}>
                              <div className="grid grid-cols-2 gap-2">
                                <button type="button" onClick={() => setDetailTab('research')} className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm ${styles.buttonGhost}`}>
                                  <Search className="h-4 w-4" />
                                  Research
                                </button>
                                <button type="button" onClick={openCostingWithGate} className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-white ${isCostingReady ? 'bg-emerald-600' : 'bg-red-600'}`}>
                                  <FileText className="h-4 w-4" />
                                  {isCostingReady ? 'Costing' : 'Gate'}
                                </button>
                              </div>
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                {selectedCostingGateItems.slice(0, 4).map((item) => (
                                  <div key={item.label} className={`rounded-lg border px-2.5 py-2 ${styles.panel}`}>
                                    <div className="flex items-center gap-1.5">
                                      <CheckSquare className={`h-3.5 w-3.5 ${item.ready ? 'text-emerald-300' : 'text-red-300'}`} />
                                      <span className="truncate text-xs font-medium">{item.label}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {detailTab === 'research' ? (
                        <div className="grid gap-4">
                          <div className="grid gap-3 xl:grid-cols-4">
                            {selectedLeisureRows.map((row) => (
                              <div key={row.service} className={`rounded-xl border p-4 ${styles.panelSoft}`}>
                                <div className="flex items-center justify-between gap-2">
                                  <div className="font-semibold">{row.service}</div>
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${styles.buttonGhost}`}>{row.status}</span>
                                </div>
                                <div className={`mt-3 text-xs uppercase tracking-[0.14em] ${styles.muted}`}>Supplier</div>
                                <div className="mt-1 text-sm">{row.supplier}</div>
                                <div className="mt-4 grid grid-cols-2 gap-2">
                                  <div className={`rounded-lg border px-3 py-2 ${styles.panel}`}>
                                    <div className={`text-[10px] uppercase tracking-[0.14em] ${styles.muted}`}>Cost</div>
                                    <div className="mt-1 text-sm font-semibold">${row.cost.toLocaleString()}</div>
                                  </div>
                                  <div className={`rounded-lg border px-3 py-2 ${styles.panel}`}>
                                    <div className={`text-[10px] uppercase tracking-[0.14em] ${styles.muted}`}>Sell</div>
                                    <div className="mt-1 text-sm font-semibold">${row.sell.toLocaleString()}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className={`rounded-xl border p-4 ${styles.panelSoft}`}>
                            <div className="font-semibold">Research focus</div>
                            <div className="mt-3 grid gap-3 md:grid-cols-3">
                              {leisureProposalCards(selectedLead).map((card) => (
                                <div key={card.label} className={`rounded-lg border p-4 ${styles.panel}`}>
                                  <div className={`text-sm ${styles.muted}`}>{card.label}</div>
                                  <div className="mt-2 font-semibold">{card.value}</div>
                                  {card.meta ? <div className={`mt-2 text-sm leading-6 ${styles.muted}`}>{card.meta}</div> : null}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                            <div className={`rounded-xl border p-4 ${styles.panelSoft}`}>
                              <div className="font-semibold">Supplier notes</div>
                              <textarea
                                className={`mt-4 h-36 w-full resize-none rounded-xl border px-4 py-4 text-sm leading-6 outline-none transition ${styles.input}`}
                                defaultValue={`${selectedLeisureRows[0]?.supplier || 'Supplier partner'} availability should be protected before client review. Keep hotel and transfer timing aligned with ${selectedLead.dates || 'the current travel window'}.`}
                              />
                            </div>
                            <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4">
                              <div className="text-xs uppercase tracking-[0.18em] text-red-200">Decision alert</div>
                              <div className="mt-3 text-sm font-semibold text-white">{leadPrimaryBlocker(selectedLead)}</div>
                              <p className="mt-2 text-sm leading-6 text-red-100/90">
                                Protect the best-fit suppliers before this request moves into package comparison.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {detailTab === 'costing' ? (
                        <div className="grid gap-4">
                          <div className={`overflow-hidden rounded-xl border ${styles.panelSoft}`}>
                            <div className={`grid grid-cols-[130px_1.1fr_1fr_90px_110px_110px_100px] gap-3 border-b px-4 py-3 text-xs uppercase tracking-[0.14em] ${styles.tableHead}`}>
                              <div>Category</div>
                              <div>Description</div>
                              <div>Supplier</div>
                              <div>Qty</div>
                              <div>Cost</div>
                              <div>Sell</div>
                              <div>Status</div>
                            </div>
                            {selectedQuote
                              ? selectedQuote.lines.map((line) => (
                                  <div key={line.id} className={`grid grid-cols-[130px_1.1fr_1fr_90px_110px_110px_100px] gap-3 border-b px-4 py-3 text-sm ${styles.panel}`}>
                                    <select value={line.category} onChange={(event) => saveQuoteLine(line, { category: event.target.value as QuoteLineCategory })} className={`h-9 rounded-lg border px-2 text-xs ${styles.select}`}>
                                      {quoteLineCategories.map((category) => (
                                        <option key={category} value={category}>{quoteLineCategoryLabels[category]}</option>
                                      ))}
                                    </select>
                                    <input value={line.description} onChange={(event) => saveQuoteLine(line, { description: event.target.value })} className={`h-9 rounded-lg border px-2 text-xs ${styles.input}`} />
                                    <input value={line.supplier} onChange={(event) => saveQuoteLine(line, { supplier: event.target.value })} className={`h-9 rounded-lg border px-2 text-xs ${styles.input}`} />
                                    <input value={line.quantity} onChange={(event) => saveQuoteLine(line, { quantity: event.target.value })} className={`h-9 rounded-lg border px-2 text-xs ${styles.input}`} />
                                    <input value={line.unitCost} onChange={(event) => saveQuoteLine(line, { unitCost: event.target.value })} className={`h-9 rounded-lg border px-2 text-xs ${styles.input}`} />
                                    <input value={line.unitSell} onChange={(event) => saveQuoteLine(line, { unitSell: event.target.value })} className={`h-9 rounded-lg border px-2 text-xs ${styles.input}`} />
                                    <select value={line.status} onChange={(event) => saveQuoteLine(line, { status: event.target.value as QuoteLineStatus })} className={`h-9 rounded-lg border px-2 text-xs ${styles.select}`}>
                                      {quoteLineStatuses.map((status) => (
                                        <option key={status} value={status}>{quoteLineStatusLabels[status]}</option>
                                      ))}
                                    </select>
                                  </div>
                                ))
                              : selectedLeisureRows.map((row) => (
                                  <div key={row.service} className={`grid grid-cols-[1.1fr_1fr_110px_110px_110px] gap-4 border-b px-4 py-4 text-sm ${styles.panel}`}>
                                    <div className="font-semibold">{row.service}</div>
                                    <div className={styles.soft}>{row.supplier}</div>
                                    <div>${row.cost.toLocaleString()}</div>
                                    <div className="text-emerald-300">${row.sell.toLocaleString()}</div>
                                    <div className="text-fuchsia-300">${(row.sell - row.cost).toLocaleString()}</div>
                                  </div>
                                ))}
                            {selectedQuote ? (
                              <div className={`grid grid-cols-[130px_1.1fr_1fr_90px_110px_110px_100px_auto] gap-3 px-4 py-3 text-sm ${styles.panelSoft}`}>
                                <select value={quoteLineDraft.category} onChange={(event) => updateQuoteLineDraft('category', event.target.value as QuoteLineCategory)} className={`h-9 rounded-lg border px-2 text-xs ${styles.select}`}>
                                  {quoteLineCategories.map((category) => (
                                    <option key={category} value={category}>{quoteLineCategoryLabels[category]}</option>
                                  ))}
                                </select>
                                <input value={quoteLineDraft.description} onChange={(event) => updateQuoteLineDraft('description', event.target.value)} className={`h-9 rounded-lg border px-2 text-xs ${styles.input}`} placeholder="New quote line" />
                                <input value={quoteLineDraft.supplier} onChange={(event) => updateQuoteLineDraft('supplier', event.target.value)} className={`h-9 rounded-lg border px-2 text-xs ${styles.input}`} placeholder="Supplier" />
                                <input value={quoteLineDraft.quantity} onChange={(event) => updateQuoteLineDraft('quantity', event.target.value)} className={`h-9 rounded-lg border px-2 text-xs ${styles.input}`} />
                                <input value={quoteLineDraft.unitCost} onChange={(event) => updateQuoteLineDraft('unitCost', event.target.value)} className={`h-9 rounded-lg border px-2 text-xs ${styles.input}`} />
                                <input value={quoteLineDraft.unitSell} onChange={(event) => updateQuoteLineDraft('unitSell', event.target.value)} className={`h-9 rounded-lg border px-2 text-xs ${styles.input}`} />
                                <select value={quoteLineDraft.status} onChange={(event) => updateQuoteLineDraft('status', event.target.value as QuoteLineStatus)} className={`h-9 rounded-lg border px-2 text-xs ${styles.select}`}>
                                  {quoteLineStatuses.map((status) => (
                                    <option key={status} value={status}>{quoteLineStatusLabels[status]}</option>
                                  ))}
                                </select>
                                <button type="button" onClick={() => submitQuoteLine(selectedQuote)} className="h-9 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white">
                                  Add
                                </button>
                              </div>
                            ) : null}
                            <div className="grid grid-cols-3 gap-3 p-4">
                              <div className={`rounded-lg border px-3 py-3 ${styles.panel}`}>
                                <div className={`text-[10px] uppercase tracking-[0.14em] ${styles.muted}`}>Total cost</div>
                                <div className="mt-1 text-sm font-semibold">{moneyValue(pricing.cost, selectedQuote?.currency ?? 'USD')}</div>
                              </div>
                              <div className={`rounded-lg border px-3 py-3 ${styles.panel}`}>
                                <div className={`text-[10px] uppercase tracking-[0.14em] ${styles.muted}`}>Total sell</div>
                                <div className="mt-1 text-sm font-semibold">{moneyValue(pricing.sell, selectedQuote?.currency ?? 'USD')}</div>
                              </div>
                              <div className={`rounded-lg border px-3 py-3 ${styles.panel}`}>
                                <div className={`text-[10px] uppercase tracking-[0.14em] ${styles.muted}`}>Gross margin</div>
                                <div className="mt-1 text-sm font-semibold">{marginPercent}%</div>
                              </div>
                            </div>
                          </div>
                          <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="text-xs uppercase tracking-[0.18em] text-red-200">Package gate</div>
                                <div className="mt-3 text-sm font-semibold text-white">Do not release package until pricing is complete</div>
                                <p className="mt-2 text-sm leading-6 text-red-100/90">
                                  Use costing to pressure-test supplier, hotel, transfer, and experience sell values before the client-facing package is locked.
                                </p>
                              </div>
                              <button type="button" onClick={openPackageWithGate} className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs font-medium text-white ${isPackageReady ? 'bg-emerald-600' : 'bg-red-600'}`}>
                                <Sparkles className="h-4 w-4" />
                                {isPackageReady ? 'Open package' : 'Resolve package gate'}
                              </button>
                            </div>
                            <div className="mt-4 grid gap-2 md:grid-cols-2">
                              {selectedPackageGateItems.map((item) => (
                                <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg border border-red-300/15 bg-black/10 px-3 py-2">
                                  <span className="flex min-w-0 items-center gap-2">
                                    <CheckSquare className={`h-4 w-4 ${item.ready ? 'text-emerald-300' : 'text-red-300'}`} />
                                    <span className="text-sm font-medium text-white">{item.label}</span>
                                  </span>
                                  <span className="truncate text-right text-xs text-red-100/80">{item.meta}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {detailTab === 'package' ? (
                        selectedQuote ? (
                          <div className="grid gap-4">
                            {!isPackageReady ? (
                              <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4">
                                <div className="text-xs uppercase tracking-[0.18em] text-red-200">Package not ready</div>
                                <div className="mt-3 grid gap-2 md:grid-cols-2">
                                  {selectedPackageGateItems.map((item) => (
                                    <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg border border-red-300/15 bg-black/10 px-3 py-2">
                                      <span className="flex min-w-0 items-center gap-2">
                                        <CheckSquare className={`h-4 w-4 ${item.ready ? 'text-emerald-300' : 'text-red-300'}`} />
                                        <span className="text-sm font-medium text-white">{item.label}</span>
                                      </span>
                                      <span className="truncate text-right text-xs text-red-100/80">{item.meta}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                            <div className={`rounded-xl border p-5 ${styles.panelSoft}`}>
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <div className="font-semibold">{selectedQuote.quoteNumber} v{selectedQuote.version}</div>
                                  <div className={`mt-1 text-sm ${styles.muted}`}>{selectedQuote.notes || 'Quote package ready for client review.'}</div>
                                </div>
                                <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>{quoteStatusLabels[selectedQuote.status]}</span>
                              </div>
                              <button type="button" onClick={() => setDetailTab('clientReview')} className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white">
                                <Mail className="h-4 w-4" />
                                Preview client proposal
                              </button>
                              <div className="mt-5 grid gap-3 md:grid-cols-3">
                                <div className={`rounded-lg border p-4 ${styles.panel}`}>
                                  <div className={`text-sm ${styles.muted}`}>Client sell</div>
                                  <div className="mt-2 text-xl font-semibold text-emerald-300">{moneyValue(selectedQuote.subtotalSell, selectedQuote.currency)}</div>
                                </div>
                                <div className={`rounded-lg border p-4 ${styles.panel}`}>
                                  <div className={`text-sm ${styles.muted}`}>Gross margin</div>
                                  <div className="mt-2 text-xl font-semibold text-fuchsia-300">{moneyValue(selectedQuote.margin, selectedQuote.currency)}</div>
                                </div>
                                <div className={`rounded-lg border p-4 ${styles.panel}`}>
                                  <div className={`text-sm ${styles.muted}`}>Valid until</div>
                                  <div className="mt-2 text-xl font-semibold">{selectedQuote.validUntil || 'Not set'}</div>
                                </div>
                              </div>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              {selectedQuote.lines.map((line) => (
                                <div key={line.id} className={`rounded-xl border p-4 ${styles.panelSoft}`}>
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="font-semibold">{line.description}</div>
                                      <div className={`mt-1 text-sm ${styles.muted}`}>{line.supplier || line.category}</div>
                                    </div>
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${styles.buttonGhost}`}>{line.status}</span>
                                  </div>
                                  <div className="mt-4 flex items-center justify-between gap-3">
                                    <span className={styles.muted}>Sell</span>
                                    <span className="font-semibold text-emerald-300">{moneyValue(line.totalSell, selectedQuote.currency)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                        <div className="grid gap-4 xl:grid-cols-3">
                          {selectedLeisurePackages.map((option) => (
                            <div key={option.name} className={`rounded-xl border p-4 ${styles.panelSoft}`}>
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-semibold">{option.name}</div>
                                  <div className={`mt-1 text-xs ${styles.muted}`}>Package concept</div>
                                </div>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] ${styles.buttonGhost}`}>{option.fit}</span>
                              </div>
                              <div className="mt-5 text-2xl font-bold text-emerald-300">${option.price.toLocaleString()}</div>
                              <div className={`mt-3 text-sm leading-6 ${styles.soft}`}>{option.recommendation}</div>
                              <div className="mt-4 grid gap-3">
                                {leisureProposalCards(selectedLead).map((card) => (
                                  <div key={card.label} className={`rounded-lg border p-3 ${styles.panel}`}>
                                    <div className={`text-xs ${styles.muted}`}>{card.label}</div>
                                    <div className="mt-1 text-sm font-semibold">{card.value}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                        )
                      ) : null}

                      {detailTab === 'clientReview' ? (
                        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
                          <div className={`overflow-hidden rounded-xl border ${styles.panelSoft}`}>
                            <div className={`border-b px-6 py-5 ${styles.panel}`}>
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                  <div className={`text-xs uppercase tracking-[0.2em] ${styles.muted}`}>Client proposal preview</div>
                                  <h3 className="mt-2 text-2xl font-semibold">{selectedLead.destination || 'Tailored journey'}</h3>
                                  <p className={`mt-2 max-w-2xl text-sm leading-6 ${styles.soft}`}>
                                    Prepared for {selectedLead.name}. This view removes internal cost, margin, and operational notes so the client sees only the story, inclusions, and next decision.
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-semibold text-[#d9b46f]">DPM</div>
                                  <div className={`mt-1 text-xs ${styles.muted}`}>Destinos pelo Mundo</div>
                                </div>
                              </div>
                              <div className="mt-5 grid gap-3 md:grid-cols-4">
                                {[
                                  { label: 'Traveler', value: selectedLead.name },
                                  { label: 'Travel dates', value: selectedItinerary ? formatDateRange(selectedItinerary.startDate, selectedItinerary.endDate) : selectedLead.dates || 'Dates pending' },
                                  { label: 'Style', value: selectedLead.serviceKey === 'luxury' ? 'Luxury' : 'Classic' },
                                  { label: 'Proposal total', value: selectedQuote ? moneyValue(selectedQuote.subtotalSell, selectedQuote.currency) : 'Quote pending' },
                                ].map((item) => (
                                  <div key={item.label} className={`rounded-lg border p-3 ${styles.panelSoft}`}>
                                    <div className={`text-xs ${styles.muted}`}>{item.label}</div>
                                    <div className="mt-1 text-sm font-semibold">{item.value}</div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="grid gap-5 p-6">
                              <section>
                                <div className="flex items-center justify-between gap-3">
                                  <h4 className="font-semibold">Journey flow</h4>
                                  <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>{selectedItineraryStops.length || 0} stops</span>
                                </div>
                                <div className="mt-3 grid gap-3">
                                  {selectedItineraryStops.length > 0 ? selectedItineraryStops.map((stop, index) => (
                                    <div key={`${stop.city}-${index}`} className={`rounded-xl border p-4 ${styles.panel}`}>
                                      <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                          <div className="text-xs font-semibold text-[#d9b46f]">Day block {index + 1}</div>
                                          <div className="mt-1 font-semibold">{stop.city}</div>
                                          <div className={`mt-1 text-sm ${styles.muted}`}>{stop.dates} - {stop.nights}</div>
                                        </div>
                                        <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>{stop.focus}</span>
                                      </div>
                                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                                        <div>
                                          <div className={`text-xs uppercase tracking-[0.14em] ${styles.muted}`}>Stay</div>
                                          <div className="mt-1 text-sm font-medium">{stop.stay}</div>
                                          <div className={`mt-1 text-xs ${styles.muted}`}>{stop.room}</div>
                                        </div>
                                        <div>
                                          <div className={`text-xs uppercase tracking-[0.14em] ${styles.muted}`}>Experience note</div>
                                          <div className={`mt-1 text-sm leading-6 ${styles.soft}`}>{stop.note}</div>
                                        </div>
                                      </div>
                                    </div>
                                  )) : (
                                    <div className={`rounded-xl border p-4 text-sm ${styles.panel}`}>Add city stops in Trip Design to build the client journey flow.</div>
                                  )}
                                </div>
                              </section>

                              <section className="grid gap-4 lg:grid-cols-2">
                                <div className={`rounded-xl border p-4 ${styles.panel}`}>
                                  <div className="font-semibold">Movement plan</div>
                                  <div className="mt-3 grid gap-2">
                                    {selectedTransportSegments.length > 0 ? selectedTransportSegments.map((segment) => (
                                      <div key={segment.id} className={`rounded-lg border px-3 py-2 ${styles.panelSoft}`}>
                                        <div className="text-sm font-medium">{segment.fromCity} to {segment.toCity}</div>
                                        <div className={`mt-1 text-xs ${styles.muted}`}>{segment.mode} - {formatDateRange(segment.departureAt, segment.arrivalAt)}</div>
                                      </div>
                                    )) : (
                                      <div className={`text-sm ${styles.muted}`}>Movement details will appear after flights or transfers are added.</div>
                                    )}
                                  </div>
                                </div>
                                <div className={`rounded-xl border p-4 ${styles.panel}`}>
                                  <div className="font-semibold">Experience highlights</div>
                                  <div className="mt-3 grid gap-2">
                                    {selectedItineraryExperiences.length > 0 ? selectedItineraryExperiences.slice(0, 4).map((experience) => (
                                      <div key={`${experience.title}-${experience.timing}`} className={`rounded-lg border px-3 py-2 ${styles.panelSoft}`}>
                                        <div className="text-sm font-medium">{experience.title}</div>
                                        <div className={`mt-1 text-xs ${styles.muted}`}>{experience.category} - {experience.timing}</div>
                                      </div>
                                    )) : (
                                      <div className={`text-sm ${styles.muted}`}>Add activities in Trip Design to make the proposal feel complete.</div>
                                    )}
                                  </div>
                                </div>
                              </section>

                              <section>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <h4 className="font-semibold">Included in this proposal</h4>
                                  {selectedQuote ? <span className="text-lg font-semibold text-emerald-300">{moneyValue(selectedQuote.subtotalSell, selectedQuote.currency)}</span> : null}
                                </div>
                                <div className="mt-3 grid gap-3 md:grid-cols-2">
                                  {selectedClientProposalSections.length > 0 ? selectedClientProposalSections.map((section) => (
                                    <div key={section.title} className={`rounded-xl border p-4 ${styles.panel}`}>
                                      <div className="font-semibold">{section.title}</div>
                                      <div className={`mt-1 text-xs ${styles.muted}`}>{section.subtitle}</div>
                                      <div className="mt-3 grid gap-2">
                                        {section.lines.map((line) => (
                                          <div key={line.id} className="flex items-start justify-between gap-3 text-sm">
                                            <div>
                                              <div className="font-medium">{line.description}</div>
                                              <div className={`mt-0.5 text-xs ${styles.muted}`}>{quoteLineCategoryLabels[line.category]}</div>
                                            </div>
                                            <div className="font-semibold text-emerald-300">{moneyValue(line.totalSell, selectedQuote?.currency ?? 'USD')}</div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )) : (
                                    <div className={`rounded-xl border p-4 text-sm ${styles.panel}`}>Quote lines will become client-facing inclusions after Trip Design is linked to Costing.</div>
                                  )}
                                </div>
                              </section>
                            </div>
                          </div>

                          <div className="grid content-start gap-4">
                            {!isPackageReady ? (
                              <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4">
                                <div className="text-xs uppercase tracking-[0.18em] text-red-200">Before sending</div>
                                <div className="mt-3 grid gap-2">
                                  {selectedPackageGateItems.map((item) => (
                                    <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg border border-red-300/15 bg-black/10 px-3 py-2">
                                      <span className="flex min-w-0 items-center gap-2">
                                        <CheckSquare className={`h-4 w-4 ${item.ready ? 'text-emerald-300' : 'text-red-300'}`} />
                                        <span className="text-sm font-medium text-white">{item.label}</span>
                                      </span>
                                      <span className="truncate text-right text-xs text-red-100/80">{item.meta}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            <div className={`rounded-xl border p-4 ${styles.panelSoft}`}>
                              <div className="flex items-center justify-between gap-3">
                                <div className="font-semibold">Communication composer</div>
                                <span className={`rounded-full px-2.5 py-1 text-xs ${isCommunicationReady ? 'bg-emerald-500/15 text-emerald-200' : 'bg-red-500/15 text-red-200'}`}>
                                  {isCommunicationReady ? 'Ready' : 'Check gates'}
                                </span>
                              </div>
                              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                <select value={communicationDraft.kind} onChange={(event) => updateCommunicationKind(event.target.value as CommunicationKind)} className={`h-10 rounded-lg border px-3 text-sm ${styles.select}`}>
                                  {communicationKinds.map((kind) => (
                                    <option key={kind} value={kind}>{communicationKindLabels[kind]}</option>
                                  ))}
                                </select>
                                <select value={communicationDraft.channel} onChange={(event) => setCommunicationDraft((current) => ({ ...current, channel: event.target.value as CommunicationChannel }))} className={`h-10 rounded-lg border px-3 text-sm ${styles.select}`}>
                                  {communicationChannels.map((channel) => (
                                    <option key={channel} value={channel}>{communicationChannelLabels[channel]}</option>
                                  ))}
                                </select>
                              </div>
                              <textarea
                                value={selectedCommunicationMessage}
                                onChange={(event) => setCommunicationDraft((current) => ({ ...current, message: event.target.value }))}
                                className={`mt-3 h-64 w-full resize-none rounded-xl border px-4 py-4 text-sm leading-6 outline-none transition ${styles.input}`}
                              />
                              <div className="mt-3 grid gap-2">
                                {selectedCommunicationReadinessItems.map((item) => (
                                  <div key={item.label} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${styles.panel}`}>
                                    <span className="flex min-w-0 items-center gap-2">
                                      <CheckSquare className={`h-4 w-4 ${item.ready ? 'text-emerald-300' : 'text-red-300'}`} />
                                      <span className="text-sm font-medium">{item.label}</span>
                                    </span>
                                    <span className={`truncate text-right text-xs ${styles.muted}`}>{item.meta}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                                <input value={communicationDraft.followUpDue} onChange={(event) => setCommunicationDraft((current) => ({ ...current, followUpDue: event.target.value }))} className={`h-10 rounded-lg border px-3 text-sm ${styles.input}`} placeholder="Next follow-up" />
                                <button type="button" onClick={() => saveCommunicationRecord(isCommunicationReady ? 'ready' : 'draft')} className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-white ${isCommunicationReady ? 'bg-emerald-600' : 'bg-red-600'}`}>
                                  <Mail className="h-4 w-4" />
                                  {isCommunicationReady ? 'Save ready record' : 'Save draft'}
                                </button>
                              </div>
                            </div>

                            <div className={`rounded-xl border p-4 ${styles.panelSoft}`}>
                              <div className="font-semibold">Send log</div>
                              <div className="mt-3 grid gap-3">
                                {selectedCommunicationLog.map((item) => (
                                  <div key={`${item.type}-${item.meta}`} className={`rounded-lg border p-3 ${styles.panel}`}>
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <div className="text-sm font-semibold">{item.type}</div>
                                        <div className={`mt-1 text-xs ${styles.muted}`}>{item.channel} - {item.owner}</div>
                                      </div>
                                      <span className={`rounded-full px-2 py-0.5 text-[10px] ${styles.buttonGhost}`}>{item.status}</span>
                                    </div>
                                    <div className={`mt-2 text-xs ${styles.muted}`}>{item.meta}</div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className={`rounded-xl border p-4 ${styles.panelSoft}`}>
                              <div className="font-semibold">Client review note</div>
                              <p className={`mt-3 text-sm leading-6 ${styles.soft}`}>
                                {selectedProcess?.nextAction || 'Keep the proposal clear, emotionally strong, and easy to choose.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {detailTab === 'payment' ? (
                        <div className="grid gap-4">
                          <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
                            <div className={`rounded-xl border p-4 ${styles.panelSoft}`}>
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-semibold">Payment workflow</div>
                                  <p className={`mt-2 text-sm leading-6 ${styles.soft}`}>
                                    {selectedPaymentSummary?.nextAction}
                                  </p>
                                </div>
                                <span className={`rounded-full px-2.5 py-1 text-xs ${selectedPaymentSummary?.paid ? 'bg-emerald-500/15 text-emerald-200' : selectedPaymentSummary?.approved ? 'bg-amber-500/15 text-amber-200' : 'bg-red-500/15 text-red-200'}`}>
                                  {selectedPaymentSummary?.status}
                                </span>
                              </div>
                              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                {[
                                  { label: 'Package total', value: selectedQuote ? moneyValue(selectedPaymentSummary?.total, selectedQuote.currency) : 'Quote pending' },
                                  { label: 'Deposit target', value: selectedQuote ? moneyValue(selectedPaymentSummary?.deposit, selectedQuote.currency) : 'Quote pending' },
                                  { label: 'Outstanding balance', value: selectedQuote ? moneyValue(selectedPaymentSummary?.balance, selectedQuote.currency) : 'Quote pending' },
                                  { label: 'Payment due', value: selectedPaymentSummary?.dueDate || 'Set due date' },
                                ].map((item) => (
                                  <div key={item.label} className={`rounded-lg border p-3 ${styles.panel}`}>
                                    <div className={`text-xs ${styles.muted}`}>{item.label}</div>
                                    <div className="mt-1 text-sm font-semibold">{item.value}</div>
                                  </div>
                                ))}
                              </div>
                              <div className={`mt-4 rounded-lg border p-3 ${styles.panel}`}>
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <div className={`text-xs uppercase tracking-[0.14em] ${styles.muted}`}>Payment records</div>
                                    <div className={`mt-1 text-sm ${styles.soft}`}>{selectedPaymentRecords.length ? `${selectedPaymentRecords.length} persisted checkpoint(s)` : 'No payment record yet'}</div>
                                  </div>
                                  <button type="button" onClick={createPaymentCheckpoint} className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs ${styles.buttonGhost}`}>
                                    <Plus className="h-4 w-4" />
                                    Add checkpoint
                                  </button>
                                </div>
                                {selectedPaymentRecords.length ? (
                                  <div className="mt-3 grid gap-2">
                                    {selectedPaymentRecords.map((record) => (
                                      <div key={record.id} className={`grid gap-2 rounded-lg border px-3 py-2 text-xs ${styles.panelSoft} md:grid-cols-[1fr_auto_auto] md:items-center`}>
                                        <div>
                                          <div className="font-semibold">{record.paymentType} - {record.status}</div>
                                          <div className={styles.muted}>{moneyValue(record.amountReceived, record.currency)} / {moneyValue(record.amountExpected, record.currency)} - due {record.dueDate || 'not set'}</div>
                                        </div>
                                        <div className={styles.muted}>{record.proofReference || 'Proof pending'}</div>
                                        {record.status !== 'paid' ? (
                                          <button type="button" onClick={() => markPaymentRecordPaid(record)} className="h-8 rounded-lg bg-emerald-600 px-3 font-medium text-white">
                                            Mark paid
                                          </button>
                                        ) : (
                                          <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-emerald-200">Cleared</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                              <div className={`mt-4 rounded-lg border p-3 ${styles.panel}`}>
                                <div className={`text-xs uppercase tracking-[0.14em] ${styles.muted}`}>Client instruction</div>
                                <p className={`mt-2 text-sm leading-6 ${styles.soft}`}>
                                  Send payment instructions only after the client approves the package. Supplier bookings should move from quoted to held/confirmed after payment proof is received.
                                </p>
                                <button type="button" onClick={() => prepareCommunication('payment')} className={`mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs ${styles.buttonGhost}`}>
                                  <Mail className="h-4 w-4" />
                                  Prepare payment message
                                </button>
                              </div>
                            </div>

                            <div className={`rounded-xl border p-4 ${styles.panelSoft}`}>
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <div className="font-semibold">Booking confirmation workflow</div>
                                  <p className={`mt-2 text-sm leading-6 ${styles.soft}`}>
                                    Each priced quote line becomes an operational booking item. Move items to Held or Confirmed as suppliers respond.
                                  </p>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                  <div className={`rounded-lg border px-3 py-2 ${styles.panel}`}>
                                    <div className="font-semibold">{selectedBookingSummary.heldOrConfirmed}/{selectedBookingSummary.total}</div>
                                    <div className={styles.muted}>released</div>
                                  </div>
                                  <div className={`rounded-lg border px-3 py-2 ${styles.panel}`}>
                                    <div className="font-semibold text-emerald-300">{selectedBookingSummary.confirmed}</div>
                                    <div className={styles.muted}>confirmed</div>
                                  </div>
                                  <div className={`rounded-lg border px-3 py-2 ${styles.panel}`}>
                                    <div className="font-semibold text-red-300">{selectedBookingSummary.blocked}</div>
                                    <div className={styles.muted}>open</div>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-4 grid gap-3">
                                {selectedQuote?.lines.length ? selectedQuote.lines.map((line) => (
                                  <div key={line.id} className={`rounded-lg border p-3 ${styles.panel}`}>
                                    <div className="grid gap-3 lg:grid-cols-[1fr_150px_150px]">
                                      <div>
                                        <div className="font-medium">{line.description}</div>
                                        <div className={`mt-1 text-xs ${styles.muted}`}>{quoteLineCategoryLabels[line.category]} - {line.supplier || 'Supplier pending'}</div>
                                      </div>
                                      <select value={line.status} onChange={(event) => saveQuoteLine(line, { status: event.target.value as QuoteLineStatus })} className={`h-9 rounded-lg border px-2 text-xs ${styles.select}`}>
                                        {quoteLineStatuses.map((status) => (
                                          <option key={status} value={status}>{quoteLineStatusLabels[status]}</option>
                                        ))}
                                      </select>
                                      <div className="grid grid-cols-2 gap-2">
                                        <button type="button" onClick={() => saveQuoteLine(line, { status: 'held' })} className={`h-9 rounded-lg px-2 text-xs ${styles.buttonGhost}`}>Hold</button>
                                        <button type="button" onClick={() => saveQuoteLine(line, { status: 'confirmed', confirmedAt: new Date().toISOString() })} className="h-9 rounded-lg bg-emerald-600 px-2 text-xs font-medium text-white">Confirm</button>
                                      </div>
                                    </div>
                                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                                      <input value={line.supplier} onChange={(event) => saveQuoteLine(line, { supplier: event.target.value })} className={`h-9 rounded-lg border px-2 text-xs ${styles.input}`} placeholder="Supplier" />
                                      <input value={line.bookingOwner} onChange={(event) => saveQuoteLine(line, { bookingOwner: event.target.value })} className={`h-9 rounded-lg border px-2 text-xs ${styles.input}`} placeholder="Booking owner" />
                                      <input value={line.confirmationReference} onChange={(event) => saveQuoteLine(line, { confirmationReference: event.target.value })} className={`h-9 rounded-lg border px-2 text-xs ${styles.input}`} placeholder="Confirmation reference" />
                                      <input type="date" value={line.supplierDeadline ?? ''} onChange={(event) => saveQuoteLine(line, { supplierDeadline: event.target.value || null })} className={`h-9 rounded-lg border px-2 text-xs ${styles.input}`} />
                                      <input value={line.bookingNotes} onChange={(event) => saveQuoteLine(line, { bookingNotes: event.target.value })} className={`h-9 rounded-lg border px-2 text-xs ${styles.input} md:col-span-2`} placeholder="Booking note" />
                                    </div>
                                  </div>
                                )) : (
                                  <div className={`rounded-lg border p-4 text-sm ${styles.panel}`}>Quote lines will become booking items after Costing is completed.</div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-3">
                            {[
                              { label: 'Approval', value: selectedPaymentSummary?.approved ? 'Client approved' : 'Awaiting decision', meta: selectedLead.preferredContact || 'Preferred contact pending' },
                              { label: 'Payment clearance', value: selectedPaymentSummary?.paid ? 'Cleared' : 'Not cleared', meta: selectedQuote ? moneyValue(selectedQuote.subtotalSell, selectedQuote.currency) : 'Quote pending' },
                              { label: 'Travel Pack gate', value: selectedBookingSummary.ready && selectedPaymentSummary?.paid ? 'Can prepare final pack' : 'Do not release yet', meta: leadPrimaryBlocker(selectedLead) },
                            ].map((card) => (
                              <div key={card.label} className={`rounded-xl border p-4 ${styles.panelSoft}`}>
                                <div className={`text-sm ${styles.muted}`}>{card.label}</div>
                                <div className="mt-2 font-semibold">{card.value}</div>
                                <div className={`mt-2 text-sm leading-6 ${styles.muted}`}>{card.meta}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {detailTab === 'travelPack' ? (
                        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
                          <div className={`overflow-hidden rounded-xl border ${styles.panelSoft}`}>
                            <div className={`border-b px-6 py-5 ${styles.panel}`}>
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                  <div className={`text-xs uppercase tracking-[0.2em] ${styles.muted}`}>Travel pack output</div>
                                  <h3 className="mt-2 text-2xl font-semibold">{selectedLead.destination || 'Confirmed trip'}</h3>
                                  <p className={`mt-2 max-w-2xl text-sm leading-6 ${styles.soft}`}>
                                    Final traveler-facing handoff for {selectedLead.name}. This pack focuses on what is confirmed, how the trip moves, and who to contact during travel.
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-semibold text-[#d9b46f]">DPM</div>
                                  <div className={`mt-1 text-xs ${styles.muted}`}>Travel support pack</div>
                                </div>
                              </div>
                              <div className="mt-5 grid gap-3 md:grid-cols-4">
                                {[
                                  { label: 'Traveler', value: selectedLead.name },
                                  { label: 'Travel dates', value: selectedItinerary ? formatDateRange(selectedItinerary.startDate, selectedItinerary.endDate) : selectedLead.dates || 'Dates pending' },
                                  { label: 'Travelers', value: selectedLead.travelers || 'Traveler count pending' },
                                  { label: 'Support', value: selectedLead.serviceKey === 'luxury' ? 'Concierge support' : 'DPM support' },
                                ].map((item) => (
                                  <div key={item.label} className={`rounded-lg border p-3 ${styles.panelSoft}`}>
                                    <div className={`text-xs ${styles.muted}`}>{item.label}</div>
                                    <div className="mt-1 text-sm font-semibold">{item.value}</div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="grid gap-5 p-6">
                              <section>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <h4 className="font-semibold">Confirmed itinerary</h4>
                                  <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>{selectedItinerary?.status ? selectedItinerary.status.replace('_', ' ') : 'draft pack'}</span>
                                </div>
                                <div className="mt-3 grid gap-3">
                                  {selectedItineraryStops.length > 0 ? selectedItineraryStops.map((stop, index) => (
                                    <div key={`${stop.city}-${index}`} className={`rounded-xl border p-4 ${styles.panel}`}>
                                      <div className="grid gap-4 md:grid-cols-[90px_1fr_1fr]">
                                        <div>
                                          <div className={`text-xs uppercase tracking-[0.14em] ${styles.muted}`}>Stop {index + 1}</div>
                                          <div className="mt-2 text-xl font-semibold text-[#d9b46f]">{stop.nights}</div>
                                        </div>
                                        <div>
                                          <div className="font-semibold">{stop.city}</div>
                                          <div className={`mt-1 text-sm ${styles.muted}`}>{stop.dates}</div>
                                          <div className={`mt-3 text-sm leading-6 ${styles.soft}`}>{stop.note}</div>
                                        </div>
                                        <div className={`rounded-lg border p-3 ${styles.panelSoft}`}>
                                          <div className={`text-xs uppercase tracking-[0.14em] ${styles.muted}`}>Accommodation</div>
                                          <div className="mt-1 text-sm font-semibold">{stop.stay}</div>
                                          <div className={`mt-1 text-xs ${styles.muted}`}>{stop.room}</div>
                                          <div className="mt-3 text-xs text-emerald-300">{stop.status}</div>
                                        </div>
                                      </div>
                                    </div>
                                  )) : (
                                    <div className={`rounded-xl border p-4 text-sm ${styles.panel}`}>No final itinerary stops yet. Build the route in Trip Design before sending the pack.</div>
                                  )}
                                </div>
                              </section>

                              <section className="grid gap-4 lg:grid-cols-2">
                                <div className={`rounded-xl border p-4 ${styles.panel}`}>
                                  <div className="font-semibold">Movement instructions</div>
                                  <div className="mt-3 grid gap-2">
                                    {selectedTransportSegments.length > 0 ? selectedTransportSegments.map((segment) => (
                                      <div key={segment.id} className={`rounded-lg border px-3 py-3 ${styles.panelSoft}`}>
                                        <div className="flex items-start justify-between gap-3">
                                          <div>
                                            <div className="text-sm font-medium">{segment.fromCity} to {segment.toCity}</div>
                                            <div className={`mt-1 text-xs ${styles.muted}`}>{segment.mode} - {formatDateRange(segment.departureAt, segment.arrivalAt)}</div>
                                          </div>
                                          <span className={`rounded-full px-2 py-0.5 text-[10px] ${styles.buttonGhost}`}>{itineraryBookingStatusLabels[segment.bookingStatus]}</span>
                                        </div>
                                        {segment.reference ? <div className="mt-2 text-xs text-[#d9b46f]">Reference: {segment.reference}</div> : null}
                                      </div>
                                    )) : (
                                      <div className={`text-sm ${styles.muted}`}>Movement instructions will appear when flights or transfers are added.</div>
                                    )}
                                  </div>
                                </div>

                                <div className={`rounded-xl border p-4 ${styles.panel}`}>
                                  <div className="font-semibold">Experiences and timing</div>
                                  <div className="mt-3 grid gap-2">
                                    {selectedItineraryExperiences.length > 0 ? selectedItineraryExperiences.map((experience) => (
                                      <div key={`${experience.title}-${experience.timing}`} className={`rounded-lg border px-3 py-3 ${styles.panelSoft}`}>
                                        <div className="flex items-start justify-between gap-3">
                                          <div>
                                            <div className="text-sm font-medium">{experience.title}</div>
                                            <div className={`mt-1 text-xs ${styles.muted}`}>{experience.category}</div>
                                          </div>
                                          <span className={`rounded-full px-2 py-0.5 text-[10px] ${styles.buttonGhost}`}>{experience.timing}</span>
                                        </div>
                                        <p className={`mt-2 text-xs leading-5 ${styles.soft}`}>{experience.note}</p>
                                      </div>
                                    )) : (
                                      <div className={`text-sm ${styles.muted}`}>Experience timing will appear when activities are added.</div>
                                    )}
                                  </div>
                                </div>
                              </section>

                              <section>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <h4 className="font-semibold">Confirmations and documents</h4>
                                  <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>{selectedQuote ? selectedQuote.quoteNumber : 'Quote pending'}</span>
                                </div>
                                <div className="mt-3 grid gap-3 md:grid-cols-2">
                                  {(selectedQuote?.lines.length ? selectedQuote.lines : mockBookingRecords(selectedLead).map((booking) => ({
                                    id: booking.reference,
                                    category: 'other' as QuoteLineCategory,
                                    description: booking.service,
                                    supplier: booking.supplier,
                                    status: booking.status.toLowerCase().includes('confirm') ? 'confirmed' : 'held',
                                    notes: booking.note,
                                    totalSell: '0',
                                  }))).map((item) => (
                                    <div key={item.id} className={`rounded-xl border p-4 ${styles.panel}`}>
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <div className="font-semibold">{item.description}</div>
                                          <div className={`mt-1 text-sm ${styles.muted}`}>{item.supplier || quoteLineCategoryLabels[item.category]}</div>
                                        </div>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${styles.buttonGhost}`}>{item.status}</span>
                                      </div>
                                      <p className={`mt-3 text-sm leading-6 ${styles.soft}`}>
                                        {'confirmationReference' in item && item.confirmationReference ? `Reference: ${String(item.confirmationReference)}. ` : ''}
                                        {'bookingNotes' in item && item.bookingNotes ? String(item.bookingNotes) : item.notes || 'Confirmation details should be attached before sending the pack.'}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </section>
                            </div>
                          </div>

                          <div className="grid content-start gap-4">
                            <div className={`rounded-xl border p-4 ${styles.panelSoft}`}>
                              <div className="flex items-center justify-between gap-3">
                                <div className="font-semibold">Pack readiness</div>
                                <span className={`rounded-full px-2.5 py-1 text-xs ${isTravelPackReady ? 'bg-emerald-500/15 text-emerald-200' : 'bg-red-500/15 text-red-200'}`}>
                                  {isTravelPackReady ? 'Ready' : 'Needs work'}
                                </span>
                              </div>
                              <div className="mt-4 grid gap-2">
                                {selectedTravelPackReadinessItems.map((item) => (
                                  <div key={item.label} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${styles.panel}`}>
                                    <span className="flex min-w-0 items-center gap-2">
                                      <CheckSquare className={`h-4 w-4 ${item.ready ? 'text-emerald-300' : 'text-red-300'}`} />
                                      <span className="text-sm font-medium">{item.label}</span>
                                    </span>
                                    <span className={`truncate text-right text-xs ${styles.muted}`}>{item.meta}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className={`rounded-xl border p-4 ${styles.panelSoft}`}>
                              <div className="font-semibold">Traveler support card</div>
                              <div className="mt-4 grid gap-3">
                                {[
                                  { label: 'Primary DPM contact', value: crmSession?.user.first_name || crmSession?.user.username || 'DPM Travel Desk' },
                                  { label: 'Support channel', value: selectedLead.email || 'Client email pending' },
                                  { label: 'Urgency posture', value: fallbackPriority(selectedLead) === 'urgent' ? 'Priority monitoring' : 'Standard monitoring' },
                                  { label: 'Final note', value: selectedLead.serviceKey === 'luxury' ? 'Confirm special requests before departure.' : 'Keep movement instructions simple and clear.' },
                                ].map((item) => (
                                  <div key={item.label} className={`rounded-lg border p-3 ${styles.panel}`}>
                                    <div className={`text-xs ${styles.muted}`}>{item.label}</div>
                                    <div className="mt-1 text-sm font-semibold">{item.value}</div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className={`rounded-xl border p-4 ${styles.panelSoft}`}>
                              <div className="font-semibold">Output actions</div>
                              <div className="mt-4 grid gap-2">
                                <button type="button" className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-white ${isTravelPackReady ? 'bg-emerald-600' : 'bg-red-600'}`}>
                                  <Download className="h-4 w-4" />
                                  {isTravelPackReady ? 'Travel pack ready' : 'Resolve pack checklist'}
                                </button>
                                <button type="button" onClick={() => prepareCommunication('travel_pack')} className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm ${styles.buttonGhost}`}>
                                  <Mail className="h-4 w-4" />
                                  Prepare send message
                                </button>
                              </div>
                              <p className={`mt-4 text-sm leading-6 ${styles.soft}`}>
                                Final confirmations, documents, and traveler-facing instructions should be coherent before the travel pack is sent.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                </div>
              );
            })() : (
              <div className="p-8 text-center">
                <Inbox className={`mx-auto h-10 w-10 ${styles.muted}`} />
                <div className="mt-4 text-lg font-semibold">Select a leisure request</div>
                <p className={`mt-2 text-sm ${styles.muted}`}>Leisure Studio workbench appears here.</p>
              </div>
            )
          ) : selectedLead ? (
            <div className="grid gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#7a5a08] text-lg font-semibold text-white">
                    {initials(selectedLead.name)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-lg font-semibold">{selectedLead.name}</h2>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${styles.type[selectedLead.serviceKey]}`}>
                        {typeLabels[selectedLead.serviceKey]}
                      </span>
                    </div>
                    <p className={`mt-1 text-sm ${styles.muted}`}>{leadSegment(selectedLead)} - {selectedLead.destination || 'Destination pending'}</p>
                    <p className={`mt-1 text-xs uppercase tracking-[0.16em] ${styles.muted}`}>{leadFlowTitle(selectedLead)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${styles.buttonGhost}`}>
                    <ExternalLink className="h-4 w-4" />
                  </button>
                  <button type="button" className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${styles.buttonGhost}`}>
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  <button type="button" className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${styles.buttonGhost}`}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className={`rounded-xl border p-5 ${styles.panel}`}>
                <div className={`mb-5 rounded-lg border px-3 py-3 ${styles.panelSoft}`}>
                  <div className="text-xs uppercase tracking-[0.14em] text-[#d9b46f]">{leadFlowTitle(selectedLead)}</div>
                  <div className={`mt-2 text-sm leading-6 ${styles.soft}`}>{leadFlowDescription(selectedLead)}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-3">
                  {workflowStepsForLead(selectedLead).map(([status, label], index) => {
                    const activeIndex = selectedLead.status === 'lost' ? -1 : workflowStepsForLead(selectedLead).findIndex(([step]) => step === selectedLead.status);
                    const isDone = activeIndex >= 0 && index <= activeIndex;
                    return (
                      <div key={status} className="min-w-0 text-center">
                        <span className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full border ${
                          isDone ? 'border-emerald-400 bg-emerald-500/16 text-emerald-300' : 'border-white/10 bg-white/8 text-white/38'
                        }`}>
                          <CheckSquare className="h-4 w-4" />
                        </span>
                        <span className={`mt-2 block truncate text-xs ${isDone ? styles.soft : styles.muted}`}>{label}</span>
                      </div>
                    );
                  })}
                </div>
                {selectedLead.status === 'lost' ? (
                  <div className="mt-4 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    Request closed. Capture the reason and decide if it should return to nurture.
                  </div>
                ) : null}

                <div className="mt-6 grid grid-cols-2 gap-5">
                  <div>
                    <div className={`text-sm ${styles.muted}`}>Travel Dates</div>
                    <div className="mt-1 font-semibold">{selectedLead.dates || 'Dates pending'}</div>
                    <div className={`mt-1 text-sm ${styles.muted}`}>{selectedLead.travelers || 'Travelers pending'}</div>
                  </div>
                  <div>
                    <div className={`text-sm ${styles.muted}`}>Budget</div>
                    <div className="mt-1 font-semibold">{selectedLead.budget || 'Budget pending'}</div>
                    <div className={`mt-1 text-sm ${styles.muted}`}>USD</div>
                  </div>
                  <div>
                    <div className={`text-sm ${styles.muted}`}>Owner</div>
                    <div className="mt-1 font-semibold">{leadOwner(selectedLead)}</div>
                  </div>
                  <div>
                    <div className={`text-sm ${styles.muted}`}>Form</div>
                    <div className="mt-1 font-semibold">{selectedLead.service}</div>
                    <div className={`mt-1 text-xs ${styles.muted}`}>{leadLifecycleLabel(selectedLead)}</div>
                  </div>
                </div>

                {selectedProcess ? (
                  <div className={`mt-5 rounded-lg border px-3 py-3 ${styles.panelSoft}`}>
                    <div className={`text-xs uppercase tracking-[0.14em] ${styles.muted}`}>Next operating step</div>
                    <div className="mt-2 text-sm font-semibold">{selectedProcess.primaryAction}</div>
                    <p className={`mt-2 text-sm leading-6 ${styles.soft}`}>{selectedProcess.nextAction}</p>
                    <div className={`mt-3 text-xs ${styles.muted}`}>{selectedProcess.stageGate}</div>
                  </div>
                ) : null}
              </div>

              <div className={`rounded-xl border p-4 ${styles.panel}`}>
                <div className="mb-3 font-semibold">Quick Actions</div>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => advanceLeadLifecycle(selectedLead)}
                    disabled={!nextLifecycleStage(selectedLead)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Phone className="h-4 w-4" />
                    {lifecycleStageActionLabel(nextLifecycleStage(selectedLead))}
                  </button>
                  <a href={`mailto:${selectedLead.email || ''}`} className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm ${styles.buttonGhost}`}>
                    <Mail className="h-4 w-4" />
                    Email
                  </a>
                  <button type="button" className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm ${styles.buttonGhost}`}>
                    <FileText className="h-4 w-4" />
                    Note
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                {selectedDetailTabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setDetailTab(tab)}
                    className={`h-10 rounded-lg px-4 text-sm capitalize ${detailTab === tab ? styles.buttonActive : styles.buttonGhost}`}
                  >
                    {detailTabLabel(tab)}
                    {(tab === 'approvals' || tab === 'proposal') ? <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-xs text-white">{selectedTasks.length}</span> : null}
                  </button>
                ))}
              </div>

              <div className={`rounded-xl border p-5 ${styles.panel}`}>
                {detailTab === 'overview' ? (
                  <div>
                    <div className="font-semibold">Client Information</div>
                    <div className={`mt-4 grid grid-cols-3 gap-4 border-y py-4 ${styles.tableHead}`}>
                      <div>
                        <div className={`text-xs ${styles.muted}`}>Email</div>
                        <div className="mt-1 text-sm">{selectedLead.email || '-'}</div>
                      </div>
                      <div>
                        <div className={`text-xs ${styles.muted}`}>Phone</div>
                        <div className="mt-1 text-sm">{selectedLead.whatsapp || '-'}</div>
                      </div>
                      <div>
                        <div className={`text-xs ${styles.muted}`}>Preferred</div>
                        <div className="mt-1 text-sm">{selectedLead.preferredContact || '-'}</div>
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold">Client Record</div>
                        {!selectedLead.clientId && canManageClients(crmSession?.user) ? (
                          <button
                            type="button"
                            onClick={() => openClientRegistrationFromLead(selectedLead)}
                            className={`inline-flex h-8 items-center rounded-lg px-3 text-xs ${styles.buttonGhost}`}
                          >
                            Convert to client
                          </button>
                        ) : null}
                      </div>
                      <div className={`mt-3 rounded-lg border px-3 py-3 text-sm ${styles.panelSoft}`}>
                        {selectedLead.clientId ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveNav('clients');
                              setSelectedClientId(selectedLead.clientId ?? null);
                            }}
                            className="font-medium text-[#d4af37]"
                          >
                            {selectedLead.clientName || 'Open linked client'}
                          </button>
                        ) : (
                          <span className={styles.muted}>This request is not linked to a registered client yet.</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="font-semibold">Request Summary</div>
                      <p className={`mt-3 text-sm leading-6 ${styles.soft}`}>{selectedLead.notes || 'No extra client notes yet.'}</p>
                    </div>

                    <div className="mt-5">
                      <div className="font-semibold">Preferences</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(selectedLead.requestedServices || 'Services pending')
                          .split(',')
                          .map((item) => item.trim())
                          .filter(Boolean)
                          .map((item) => (
                            <span key={item} className="rounded-full bg-[#12305a] px-3 py-1 text-xs text-white">
                              {item}
                            </span>
                          ))}
                      </div>
                    </div>

                    <label className="mt-5 block">
                      <span className="font-semibold">Internal Notes</span>
                      <textarea
                        value={selectedLead.internalNotes || ''}
                        onChange={(event) => refreshLead(selectedLead.id, { internalNotes: event.target.value })}
                        className={`mt-3 min-h-24 w-full resize-y rounded-lg border px-3 py-3 text-sm leading-6 outline-none transition ${styles.input}`}
                        placeholder="Concierge notes, follow-up context, preferences..."
                      />
                    </label>
                  </div>
                ) : null}

                {detailTab === 'brief' ? renderBriefingGate() : null}

                {detailTab === 'proposal' ? (
                  <div className="grid gap-3">
                    <div className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                      <div className="font-semibold">Proposal direction</div>
                      <p className={`mt-2 text-sm leading-6 ${styles.soft}`}>{selectedProcess?.nextAction}</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      {leisureProposalCards(selectedLead).map((card) => (
                        <div key={card.label} className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                          <div className={`text-sm ${styles.muted}`}>{card.label}</div>
                          <div className="mt-2 font-semibold">{card.value}</div>
                          {card.meta ? <div className={`mt-2 text-sm leading-6 ${styles.muted}`}>{card.meta}</div> : null}
                        </div>
                      ))}
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      {mockWorkflowItems(selectedLead, 'proposal').map((item) => (
                        <div key={item.title} className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                          <div className="font-semibold">{item.title}</div>
                          <div className="mt-2 text-sm font-medium">{item.value}</div>
                          <p className={`mt-2 text-sm leading-6 ${styles.muted}`}>{item.meta}</p>
                        </div>
                      ))}
                    </div>
                    {selectedTasks.map((task) => (
                      <div key={task.title} className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${styles.panelSoft}`}>
                        <span className="flex min-w-0 items-center gap-3">
                          <CheckSquare className={`h-4 w-4 ${task.tone === 'urgent' ? 'text-red-400' : task.tone === 'upcoming' ? styles.muted : 'text-sky-400'}`} />
                          <span className="truncate text-sm">{task.title}</span>
                        </span>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${task.tone === 'urgent' ? 'bg-red-500/15 text-red-300' : styles.buttonGhost}`}>
                          {task.due}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}

                {detailTab === 'payments' ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                      <div className="font-semibold">Payment posture</div>
                      <p className={`mt-2 text-sm leading-6 ${styles.soft}`}>
                        {selectedLead.status === 'won' || selectedLead.status === 'execution' || selectedLead.status === 'completed'
                          ? 'Client approval is secured. Track payment confirmation before or alongside supplier fulfilment.'
                          : 'Keep payment expectations clear in the proposal so the client knows what unlocks booking.'}
                      </p>
                    </div>
                    <div className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                      <div className={`text-sm ${styles.muted}`}>Budget band</div>
                      <div className="mt-2 text-lg font-semibold">{selectedLead.budget || 'Budget pending'}</div>
                      <div className={`mt-2 text-sm ${styles.muted}`}>Preferred contact: {selectedLead.preferredContact || 'Not captured yet'}</div>
                    </div>
                    {leisurePaymentCards(selectedLead).map((card) => (
                      <div key={card.label} className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                        <div className={`text-sm ${styles.muted}`}>{card.label}</div>
                        <div className="mt-2 font-semibold">{card.value}</div>
                        {card.meta ? <div className={`mt-2 text-sm leading-6 ${styles.muted}`}>{card.meta}</div> : null}
                      </div>
                    ))}
                    {mockWorkflowItems(selectedLead, 'payments').map((item) => (
                      <div key={item.title} className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                        <div className="font-semibold">{item.title}</div>
                        <div className="mt-2 text-sm font-medium">{item.value}</div>
                        <p className={`mt-2 text-sm leading-6 ${styles.muted}`}>{item.meta}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {detailTab === 'travelPack' ? (
                  <div className="grid gap-4">
                    <div className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                      <div className="font-semibold">Travel pack readiness</div>
                      <p className={`mt-2 text-sm leading-6 ${styles.soft}`}>
                        Use this stage for itinerary polish, service confirmations, and final client communication before departure.
                      </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      {leisureTravelPackCards(selectedLead).map((card) => (
                        <div key={card.label} className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                          <div className={`text-sm ${styles.muted}`}>{card.label}</div>
                          <div className="mt-2 font-semibold">{card.value}</div>
                          {card.meta ? <div className={`mt-2 text-sm leading-6 ${styles.muted}`}>{card.meta}</div> : null}
                        </div>
                      ))}
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      {mockWorkflowItems(selectedLead, 'travelPack').map((item) => (
                        <div key={item.title} className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                          <div className="font-semibold">{item.title}</div>
                          <div className="mt-2 text-sm font-medium">{item.value}</div>
                          <p className={`mt-2 text-sm leading-6 ${styles.muted}`}>{item.meta}</p>
                        </div>
                      ))}
                    </div>
                    <div className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold">Simulated booking snapshot</div>
                        <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>Leisure fulfillment mock</span>
                      </div>
                      <div className="mt-4 grid gap-3">
                        {mockBookingRecords(selectedLead).map((booking) => (
                          <div key={booking.reference} className={`rounded-lg border p-4 ${styles.panel}`}>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <div className="font-medium">{booking.service}</div>
                                <div className={`mt-1 text-sm ${styles.muted}`}>{booking.supplier}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold">{booking.status}</div>
                                <div className={`mt-1 text-xs ${styles.muted}`}>{booking.reference}</div>
                              </div>
                            </div>
                            <p className={`mt-3 text-sm leading-6 ${styles.soft}`}>{booking.note}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-3">
                      {selectedHistory.map((item) => (
                        <div key={`${item.label}-${item.meta}`} className={`rounded-lg border p-3 ${styles.panelSoft}`}>
                          <div className="font-medium">{item.label}</div>
                          <div className={`mt-1 text-sm ${styles.muted}`}>{item.meta}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {detailTab === 'itinerary' ? (
                  <div className="grid gap-5">
                    <div className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold">Trip processing workspace</div>
                          <p className={`mt-2 text-sm leading-6 ${styles.soft}`}>
                            Use this dedicated itinerary lane to shape the full trip: routing, hotel count, room type, activities, and the operating notes that make the proposal bookable.
                          </p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>
                          {selectedItinerary ? itineraryStatusLabels[selectedItinerary.status] : 'Draft workspace'}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-4">
                      {selectedItinerarySummary.map((card) => (
                        <div key={card.label} className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                          <div className={`text-sm ${styles.muted}`}>{card.label}</div>
                          <div className="mt-2 font-semibold">{card.value}</div>
                          {card.meta ? <div className={`mt-2 text-sm leading-6 ${styles.muted}`}>{card.meta}</div> : null}
                        </div>
                      ))}
                    </div>

                    <div className={`rounded-lg border p-4 ${styles.panel}`}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="font-semibold">Route and stay plan</div>
                        <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>
                          {selectedItinerary ? formatDateRange(selectedItinerary.startDate, selectedItinerary.endDate) : `${selectedItineraryStops.length} cities / stays`}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-4">
                        {selectedItineraryStops.map((stop, index) => (
                          <div key={`${stop.city}-${index}`} className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="text-xs uppercase tracking-[0.14em] text-[#d9b46f]">Stop {index + 1}</div>
                                <div className="mt-2 text-lg font-semibold">{stop.city}</div>
                                <div className={`mt-1 text-sm ${styles.muted}`}>{stop.nights} - {stop.stay}</div>
                                {stop.dates ? <div className={`mt-1 text-xs ${styles.muted}`}>{stop.dates}</div> : null}
                              </div>
                              <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>{stop.status || stop.focus}</span>
                            </div>
                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                              <div>
                                <div className={`text-xs uppercase tracking-[0.12em] ${styles.muted}`}>Room setup</div>
                                <div className="mt-1 text-sm font-medium">{stop.room}</div>
                              </div>
                              <div>
                                <div className={`text-xs uppercase tracking-[0.12em] ${styles.muted}`}>Operational note</div>
                                <div className="mt-1 text-sm font-medium">{stop.note}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                      <div className={`rounded-lg border p-4 ${styles.panel}`}>
                        <div className="font-semibold">Activities and experiences</div>
                        <div className="mt-4 grid gap-3">
                          {selectedItineraryExperiences.map((experience) => (
                            <div key={experience.title} className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="font-medium">{experience.title}</div>
                                <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>{experience.status || experience.timing}</span>
                              </div>
                              <div className={`mt-2 text-sm ${styles.muted}`}>{experience.category} - {experience.timing}</div>
                              <p className={`mt-3 text-sm leading-6 ${styles.soft}`}>{experience.note}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-4">
                        <div className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                          <div className="font-semibold">Hotel count and room control</div>
                          <div className="mt-3 text-sm leading-6">
                            <div className={`flex items-center justify-between gap-3 ${styles.soft}`}>
                              <span>Planned hotel stays</span>
                              <span className="font-semibold">{selectedItinerary ? selectedItinerary.stops.reduce((count, stop) => count + stop.accommodations.length, 0) : selectedItineraryStops.length}</span>
                            </div>
                            <div className={`mt-2 flex items-center justify-between gap-3 ${styles.soft}`}>
                              <span>Traveler setup</span>
                              <span className="font-semibold">{selectedLead.travelers || 'Pending'}</span>
                            </div>
                            <div className={`mt-2 flex items-center justify-between gap-3 ${styles.soft}`}>
                              <span>Room brief</span>
                              <span className="font-semibold">{isCorporateLead(selectedLead) ? 'Executive allocation' : selectedLead.serviceKey === 'luxury' ? 'Suite-led' : 'Double / twin mix'}</span>
                            </div>
                          </div>
                        </div>

                        <div className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                          <div className="font-semibold">Itinerary processing note</div>
                          <p className={`mt-3 text-sm leading-6 ${styles.soft}`}>
                            {selectedItinerary?.notes || 'Use this space to control routing, hotel count, room types, transfers, and experiences directly from the trip workspace.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {detailTab === 'notes' ? (
                  <p className={`text-sm leading-6 ${styles.soft}`}>{selectedLead.internalNotes || 'No internal notes yet.'}</p>
                ) : null}

                {detailTab === 'travelers' ? (
                  <div className="grid gap-4">
                    <div className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                      <div className="font-semibold">Traveler coordination</div>
                      <p className={`mt-2 text-sm leading-6 ${styles.soft}`}>
                        Corporate movement should keep traveler count, route coordination, and readiness visible before booking is released.
                      </p>
                    </div>
                    <div className="grid gap-3">
                      <div className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                        <div className={`text-sm ${styles.muted}`}>Traveler scope</div>
                        <div className="mt-2 text-lg font-semibold">{selectedLead.travelers || 'Traveler list pending'}</div>
                        <div className={`mt-2 text-sm ${styles.muted}`}>{selectedLead.departureCity || 'Departure city pending'} - {selectedLead.destination || 'Destination pending'}</div>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      {corporateTravelerCards(selectedLead).map((card) => (
                        <div key={card.label} className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                          <div className={`text-sm ${styles.muted}`}>{card.label}</div>
                          <div className="mt-2 font-semibold">{card.value}</div>
                          {card.meta ? <div className={`mt-2 text-sm leading-6 ${styles.muted}`}>{card.meta}</div> : null}
                        </div>
                      ))}
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      {mockWorkflowItems(selectedLead, 'travelers').map((item) => (
                        <div key={item.title} className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                          <div className="font-semibold">{item.title}</div>
                          <div className="mt-2 text-sm font-medium">{item.value}</div>
                          <p className={`mt-2 text-sm leading-6 ${styles.muted}`}>{item.meta}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {detailTab === 'approvals' ? (
                  <div className="grid gap-3">
                    <div className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                      <div className="font-semibold">Approval posture</div>
                      <p className={`mt-2 text-sm leading-6 ${styles.soft}`}>{selectedProcess?.stageGate}</p>
                    </div>
                    {selectedQuote ? (
                      <div className="grid gap-3 md:grid-cols-3">
                        {selectedQuote.approvals.map((approval) => (
                          <div key={approval.id} className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                            <div className={`text-sm ${styles.muted}`}>Quote approval</div>
                            <div className="mt-2 font-semibold">{approval.approverName}</div>
                            <div className={`mt-2 text-sm ${styles.muted}`}>{quoteApprovalLabels[approval.decision]}</div>
                          </div>
                        ))}
                        <div className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                          <div className={`text-sm ${styles.muted}`}>Quote status</div>
                          <div className="mt-2 font-semibold">{quoteStatusLabels[selectedQuote.status]}</div>
                          <div className={`mt-2 text-sm ${styles.muted}`}>{selectedQuote.quoteNumber}</div>
                        </div>
                      </div>
                    ) : null}
                    <div className="grid gap-3 md:grid-cols-3">
                      {corporateApprovalCards(selectedLead).map((card) => (
                        <div key={card.label} className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                          <div className={`text-sm ${styles.muted}`}>{card.label}</div>
                          <div className="mt-2 font-semibold">{card.value}</div>
                          {card.meta ? <div className={`mt-2 text-sm leading-6 ${styles.muted}`}>{card.meta}</div> : null}
                        </div>
                      ))}
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      {mockWorkflowItems(selectedLead, 'approvals').map((item) => (
                        <div key={item.title} className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                          <div className="font-semibold">{item.title}</div>
                          <div className="mt-2 text-sm font-medium">{item.value}</div>
                          <p className={`mt-2 text-sm leading-6 ${styles.muted}`}>{item.meta}</p>
                        </div>
                      ))}
                    </div>
                    {selectedTasks.map((task) => (
                      <div key={task.title} className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${styles.panelSoft}`}>
                        <span className="flex min-w-0 items-center gap-3">
                          <CheckSquare className={`h-4 w-4 ${task.tone === 'urgent' ? 'text-red-400' : task.tone === 'upcoming' ? styles.muted : 'text-sky-400'}`} />
                          <span className="truncate text-sm">{task.title}</span>
                        </span>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${task.tone === 'urgent' ? 'bg-red-500/15 text-red-300' : styles.buttonGhost}`}>
                          {task.due}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}

                {detailTab === 'finance' ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                      <div className="font-semibold">Finance clearance</div>
                      <p className={`mt-2 text-sm leading-6 ${styles.soft}`}>
                        Use this lane for PO, invoice approval, or account-credit coordination before booking is released.
                      </p>
                    </div>
                    <div className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                      <div className={`text-sm ${styles.muted}`}>CTM source request</div>
                      <select
                        value={selectedCtmTrip?.id ?? ''}
                        onChange={(event) => linkCtmRequestToLead(event.target.value)}
                        className={`mt-2 h-10 w-full rounded-lg border px-3 text-sm ${styles.select}`}
                      >
                        {ctmTripRequests.length > 0 ? ctmTripRequests.map((trip) => (
                          <option key={trip.id} value={trip.id}>{trip.id} - {trip.route}</option>
                        )) : (
                          <option value="">No CTM requests loaded</option>
                        )}
                      </select>
                      <div className={`mt-2 text-xs ${styles.muted}`}>
                        {selectedCtmTrip ? `${selectedCtmTrip.department} - ${selectedCtmTrip.travelDate} - ${selectedCtmTrip.status}` : 'Corporate requests must originate from CTM.'}
                      </div>
                    </div>
                    {selectedCtmTrip ? (
                      <div className={`rounded-lg border p-4 md:col-span-2 ${styles.panelSoft}`}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold">CTM shared commercial output</div>
                            <div className={`mt-1 text-sm ${styles.muted}`}>DPM controls these outputs in CRM. CTM users only see the shared state.</div>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>{selectedCtmTrip.id}</span>
                        </div>
                        <div className="mt-4 grid gap-4 xl:grid-cols-4">
                          <div className={`rounded-lg border p-3 ${styles.panel}`}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold">Quote</div>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] ${styles.buttonGhost}`}>{selectedCtmTrip.quote ? corporateQuoteStatusLabels[selectedCtmTrip.quote.status] : 'Not created'}</span>
                            </div>
                            <div className="mt-3 grid grid-cols-[1fr_74px] gap-2">
                              <input value={corporateOutputDraft.quoteAmount} onChange={(event) => updateCorporateOutputDraft('quoteAmount', event.target.value)} className={`h-9 rounded-lg border px-2 text-xs ${styles.input}`} placeholder="Amount" />
                              <input value={corporateOutputDraft.quoteCurrency} onChange={(event) => updateCorporateOutputDraft('quoteCurrency', event.target.value.toUpperCase())} className={`h-9 rounded-lg border px-2 text-xs ${styles.input}`} placeholder="USD" />
                            </div>
                            <div className="mt-2 grid grid-cols-[1fr_1fr] gap-2">
                              <input type="date" value={corporateOutputDraft.quoteValidUntil} onChange={(event) => updateCorporateOutputDraft('quoteValidUntil', event.target.value)} className={`h-9 rounded-lg border px-2 text-xs ${styles.input}`} />
                              <select value={corporateOutputDraft.quoteStatus} onChange={(event) => updateCorporateOutputDraft('quoteStatus', event.target.value as CorporateQuoteStatus)} className={`h-9 rounded-lg border px-2 text-xs ${styles.select}`}>
                                {corporateQuoteStatuses.map((status) => <option key={status} value={status}>{corporateQuoteStatusLabels[status]}</option>)}
                              </select>
                            </div>
                            <textarea value={corporateOutputDraft.quoteNotes} onChange={(event) => updateCorporateOutputDraft('quoteNotes', event.target.value)} className={`mt-2 h-20 w-full resize-none rounded-lg border px-2 py-2 text-xs ${styles.input}`} placeholder="Quote note visible to CTM when shared" />
                            <button type="button" disabled={isSavingCorporateOutput} onClick={saveCorporateQuoteOutput} className="mt-3 h-9 w-full rounded-lg bg-sky-600 px-3 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">
                              {selectedCtmTrip.quote ? 'Update quote' : 'Create quote'}
                            </button>
                          </div>

                          <div className={`rounded-lg border p-3 ${styles.panel}`}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold">Booking</div>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] ${styles.buttonGhost}`}>{selectedCtmTrip.booking ? corporateBookingStatusLabels[selectedCtmTrip.booking.status] : 'Not created'}</span>
                            </div>
                            <input value={corporateOutputDraft.bookingReference} onChange={(event) => updateCorporateOutputDraft('bookingReference', event.target.value)} className={`mt-3 h-9 w-full rounded-lg border px-2 text-xs ${styles.input}`} placeholder="Booking reference" />
                            <div className="mt-2 grid grid-cols-[1fr_74px] gap-2">
                              <input value={corporateOutputDraft.bookingTotalCost} onChange={(event) => updateCorporateOutputDraft('bookingTotalCost', event.target.value)} className={`h-9 rounded-lg border px-2 text-xs ${styles.input}`} placeholder="Total cost" />
                              <input value={corporateOutputDraft.bookingCurrency} onChange={(event) => updateCorporateOutputDraft('bookingCurrency', event.target.value.toUpperCase())} className={`h-9 rounded-lg border px-2 text-xs ${styles.input}`} placeholder="USD" />
                            </div>
                            <select value={corporateOutputDraft.bookingStatus} onChange={(event) => updateCorporateOutputDraft('bookingStatus', event.target.value as CorporateBookingStatus)} className={`mt-2 h-9 w-full rounded-lg border px-2 text-xs ${styles.select}`}>
                              {corporateBookingStatuses.map((status) => <option key={status} value={status}>{corporateBookingStatusLabels[status]}</option>)}
                            </select>
                            <textarea value={corporateOutputDraft.bookingSupplierSummary} onChange={(event) => updateCorporateOutputDraft('bookingSupplierSummary', event.target.value)} className={`mt-2 h-20 w-full resize-none rounded-lg border px-2 py-2 text-xs ${styles.input}`} placeholder="Flights, hotels, transfers, supplier holds" />
                            <button type="button" disabled={isSavingCorporateOutput} onClick={saveCorporateBookingOutput} className="mt-3 h-9 w-full rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">
                              {selectedCtmTrip.booking ? 'Update booking' : 'Create booking'}
                            </button>
                          </div>

                          <div className={`rounded-lg border p-3 ${styles.panel}`}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold">Invoice</div>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] ${styles.buttonGhost}`}>{selectedCtmTrip.invoice ? corporateInvoiceStatusLabels[selectedCtmTrip.invoice.status] : 'Not created'}</span>
                            </div>
                            <div className="mt-3 grid grid-cols-[1fr_74px] gap-2">
                              <input value={corporateOutputDraft.invoiceAmount} onChange={(event) => updateCorporateOutputDraft('invoiceAmount', event.target.value)} className={`h-9 rounded-lg border px-2 text-xs ${styles.input}`} placeholder="Amount" />
                              <input value={corporateOutputDraft.invoiceCurrency} onChange={(event) => updateCorporateOutputDraft('invoiceCurrency', event.target.value.toUpperCase())} className={`h-9 rounded-lg border px-2 text-xs ${styles.input}`} placeholder="USD" />
                            </div>
                            <div className="mt-2 grid grid-cols-[1fr_1fr] gap-2">
                              <input type="date" value={corporateOutputDraft.invoiceDueDate} onChange={(event) => updateCorporateOutputDraft('invoiceDueDate', event.target.value)} className={`h-9 rounded-lg border px-2 text-xs ${styles.input}`} />
                              <select value={corporateOutputDraft.invoiceStatus} onChange={(event) => updateCorporateOutputDraft('invoiceStatus', event.target.value as CorporateInvoiceStatus)} className={`h-9 rounded-lg border px-2 text-xs ${styles.select}`}>
                                {corporateInvoiceStatuses.map((status) => <option key={status} value={status}>{corporateInvoiceStatusLabels[status]}</option>)}
                              </select>
                            </div>
                            <textarea value={corporateOutputDraft.invoiceNotes} onChange={(event) => updateCorporateOutputDraft('invoiceNotes', event.target.value)} className={`mt-2 h-20 w-full resize-none rounded-lg border px-2 py-2 text-xs ${styles.input}`} placeholder="PO, due date, billing instructions" />
                            <button type="button" disabled={isSavingCorporateOutput} onClick={saveCorporateInvoiceOutput} className="mt-3 h-9 w-full rounded-lg bg-amber-600 px-3 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">
                              {selectedCtmTrip.invoice ? 'Update invoice' : 'Create invoice'}
                            </button>
                          </div>

                          <div className={`rounded-lg border p-3 ${styles.panel}`}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold">Payment</div>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] ${styles.buttonGhost}`}>{selectedCtmTrip.payments.length} records</span>
                            </div>
                            <div className="mt-3 grid grid-cols-[1fr_74px] gap-2">
                              <input value={corporateOutputDraft.paymentAmount} onChange={(event) => updateCorporateOutputDraft('paymentAmount', event.target.value)} className={`h-9 rounded-lg border px-2 text-xs ${styles.input}`} placeholder="Amount" />
                              <input value={corporateOutputDraft.paymentCurrency} onChange={(event) => updateCorporateOutputDraft('paymentCurrency', event.target.value.toUpperCase())} className={`h-9 rounded-lg border px-2 text-xs ${styles.input}`} placeholder="USD" />
                            </div>
                            <div className="mt-2 grid grid-cols-[1fr_1fr] gap-2">
                              <select value={corporateOutputDraft.paymentMethod} onChange={(event) => updateCorporateOutputDraft('paymentMethod', event.target.value as CorporatePaymentMethod)} className={`h-9 rounded-lg border px-2 text-xs ${styles.select}`}>
                                {corporatePaymentMethods.map((method) => <option key={method} value={method}>{corporatePaymentMethodLabels[method]}</option>)}
                              </select>
                              <select value={corporateOutputDraft.paymentStatus} onChange={(event) => updateCorporateOutputDraft('paymentStatus', event.target.value as CorporatePaymentStatus)} className={`h-9 rounded-lg border px-2 text-xs ${styles.select}`}>
                                {corporatePaymentStatuses.map((status) => <option key={status} value={status}>{corporatePaymentStatusLabels[status]}</option>)}
                              </select>
                            </div>
                            <input value={corporateOutputDraft.paymentReference} onChange={(event) => updateCorporateOutputDraft('paymentReference', event.target.value)} className={`mt-2 h-9 w-full rounded-lg border px-2 text-xs ${styles.input}`} placeholder="Payment reference" />
                            <textarea value={corporateOutputDraft.paymentNotes} onChange={(event) => updateCorporateOutputDraft('paymentNotes', event.target.value)} className={`mt-2 h-14 w-full resize-none rounded-lg border px-2 py-2 text-xs ${styles.input}`} placeholder="Payment note" />
                            <button type="button" disabled={isSavingCorporateOutput || !selectedCtmTrip.invoice} onClick={recordCorporatePaymentOutput} className="mt-3 h-9 w-full rounded-lg bg-fuchsia-600 px-3 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">
                              Record payment
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <div className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                      <div className={`text-sm ${styles.muted}`}>Commercial shape</div>
                      <div className="mt-2 text-lg font-semibold">{selectedQuote ? moneyValue(selectedQuote.subtotalSell, selectedQuote.currency) : selectedLead.budget || 'Policy-based / budget pending'}</div>
                      <div className={`mt-2 text-sm ${styles.muted}`}>{selectedQuote ? `${selectedQuote.quoteNumber} - ${quoteStatusLabels[selectedQuote.status]}` : selectedLead.requestedServices || 'Service scope pending'}</div>
                    </div>
                    {selectedQuote ? (
                      <>
                        <div className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                          <div className={`text-sm ${styles.muted}`}>Quote cost</div>
                          <div className="mt-2 font-semibold">{moneyValue(selectedQuote.subtotalCost, selectedQuote.currency)}</div>
                          <div className={`mt-2 text-sm ${styles.muted}`}>Supplier-side estimate</div>
                        </div>
                        <div className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                          <div className={`text-sm ${styles.muted}`}>Quote margin</div>
                          <div className="mt-2 font-semibold text-fuchsia-300">{moneyValue(selectedQuote.margin, selectedQuote.currency)}</div>
                          <div className={`mt-2 text-sm ${styles.muted}`}>Before invoice release</div>
                        </div>
                      </>
                    ) : null}
                    {corporateFinanceCards(selectedLead).map((card) => (
                      <div key={card.label} className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                        <div className={`text-sm ${styles.muted}`}>{card.label}</div>
                        <div className="mt-2 font-semibold">{card.value}</div>
                        {card.meta ? <div className={`mt-2 text-sm leading-6 ${styles.muted}`}>{card.meta}</div> : null}
                      </div>
                    ))}
                    {mockWorkflowItems(selectedLead, 'finance').map((item) => (
                      <div key={item.title} className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                        <div className="font-semibold">{item.title}</div>
                        <div className="mt-2 text-sm font-medium">{item.value}</div>
                        <p className={`mt-2 text-sm leading-6 ${styles.muted}`}>{item.meta}</p>
                      </div>
                    ))}
                    <div className={`rounded-lg border p-4 md:col-span-2 ${styles.panelSoft}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold">{selectedQuote ? 'Quote release snapshot' : 'Simulated booking release snapshot'}</div>
                        <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>{selectedQuote ? quoteStatusLabels[selectedQuote.status] : 'Corporate fulfillment mock'}</span>
                      </div>
                      <div className="mt-4 grid gap-3">
                        {selectedQuote ? selectedQuote.lines.map((line) => (
                          <div key={line.id} className={`rounded-lg border p-4 ${styles.panel}`}>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <input value={line.description} onChange={(event) => saveQuoteLine(line, { description: event.target.value })} className={`h-9 rounded-lg border px-2 text-sm font-medium ${styles.input}`} />
                                <input value={line.supplier} onChange={(event) => saveQuoteLine(line, { supplier: event.target.value })} className={`mt-2 h-9 rounded-lg border px-2 text-sm ${styles.input}`} placeholder="Supplier" />
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-right">
                                <select value={line.status} onChange={(event) => saveQuoteLine(line, { status: event.target.value as QuoteLineStatus })} className={`h-9 rounded-lg border px-2 text-xs ${styles.select}`}>
                                  {quoteLineStatuses.map((status) => (
                                    <option key={status} value={status}>{quoteLineStatusLabels[status]}</option>
                                  ))}
                                </select>
                                <select value={line.category} onChange={(event) => saveQuoteLine(line, { category: event.target.value as QuoteLineCategory })} className={`h-9 rounded-lg border px-2 text-xs ${styles.select}`}>
                                  {quoteLineCategories.map((category) => (
                                    <option key={category} value={category}>{quoteLineCategoryLabels[category]}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="mt-3 grid gap-2 md:grid-cols-4">
                              <input value={line.quantity} onChange={(event) => saveQuoteLine(line, { quantity: event.target.value })} className={`h-9 rounded-lg border px-2 text-xs ${styles.input}`} />
                              <input value={line.unitCost} onChange={(event) => saveQuoteLine(line, { unitCost: event.target.value })} className={`h-9 rounded-lg border px-2 text-xs ${styles.input}`} />
                              <input value={line.unitSell} onChange={(event) => saveQuoteLine(line, { unitSell: event.target.value })} className={`h-9 rounded-lg border px-2 text-xs ${styles.input}`} />
                              <div className={`flex h-9 items-center justify-end rounded-lg border px-2 text-xs ${styles.panelSoft}`}>{moneyValue(line.margin, selectedQuote.currency)}</div>
                            </div>
                          </div>
                        )) : mockBookingRecords(selectedLead).map((booking) => (
                          <div key={booking.reference} className={`rounded-lg border p-4 ${styles.panel}`}>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <div className="font-medium">{booking.service}</div>
                                <div className={`mt-1 text-sm ${styles.muted}`}>{booking.supplier}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold">{booking.status}</div>
                                <div className={`mt-1 text-xs ${styles.muted}`}>{booking.reference}</div>
                              </div>
                            </div>
                            <p className={`mt-3 text-sm leading-6 ${styles.soft}`}>{booking.note}</p>
                          </div>
                        ))}
                        {selectedQuote ? (
                          <div className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                            <div className="grid gap-3 md:grid-cols-[130px_1fr_1fr_90px_110px_110px_100px_auto]">
                              <select value={quoteLineDraft.category} onChange={(event) => updateQuoteLineDraft('category', event.target.value as QuoteLineCategory)} className={`h-9 rounded-lg border px-2 text-xs ${styles.select}`}>
                                {quoteLineCategories.map((category) => (
                                  <option key={category} value={category}>{quoteLineCategoryLabels[category]}</option>
                                ))}
                              </select>
                              <input value={quoteLineDraft.description} onChange={(event) => updateQuoteLineDraft('description', event.target.value)} className={`h-9 rounded-lg border px-2 text-xs ${styles.input}`} placeholder="New quote line" />
                              <input value={quoteLineDraft.supplier} onChange={(event) => updateQuoteLineDraft('supplier', event.target.value)} className={`h-9 rounded-lg border px-2 text-xs ${styles.input}`} placeholder="Supplier" />
                              <input value={quoteLineDraft.quantity} onChange={(event) => updateQuoteLineDraft('quantity', event.target.value)} className={`h-9 rounded-lg border px-2 text-xs ${styles.input}`} />
                              <input value={quoteLineDraft.unitCost} onChange={(event) => updateQuoteLineDraft('unitCost', event.target.value)} className={`h-9 rounded-lg border px-2 text-xs ${styles.input}`} />
                              <input value={quoteLineDraft.unitSell} onChange={(event) => updateQuoteLineDraft('unitSell', event.target.value)} className={`h-9 rounded-lg border px-2 text-xs ${styles.input}`} />
                              <select value={quoteLineDraft.status} onChange={(event) => updateQuoteLineDraft('status', event.target.value as QuoteLineStatus)} className={`h-9 rounded-lg border px-2 text-xs ${styles.select}`}>
                                {quoteLineStatuses.map((status) => (
                                  <option key={status} value={status}>{quoteLineStatusLabels[status]}</option>
                                ))}
                              </select>
                              <button type="button" onClick={() => submitQuoteLine(selectedQuote)} className="h-9 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white">
                                Add
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}

                {detailTab === 'documents' ? (
                  <div className="grid gap-4">
                    <div className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                      <div className="font-semibold">Documents and readiness</div>
                      <p className={`mt-2 text-sm leading-6 ${styles.soft}`}>
                        Keep approvals, traveler documentation, and operational notes aligned before fulfilment starts.
                      </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      {corporateDocumentCards(selectedLead).map((card) => (
                        <div key={card.label} className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                          <div className={`text-sm ${styles.muted}`}>{card.label}</div>
                          <div className="mt-2 font-semibold">{card.value}</div>
                          {card.meta ? <div className={`mt-2 text-sm leading-6 ${styles.muted}`}>{card.meta}</div> : null}
                        </div>
                      ))}
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      {mockWorkflowItems(selectedLead, 'documents').map((item) => (
                        <div key={item.title} className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                          <div className="font-semibold">{item.title}</div>
                          <div className="mt-2 text-sm font-medium">{item.value}</div>
                          <p className={`mt-2 text-sm leading-6 ${styles.muted}`}>{item.meta}</p>
                        </div>
                      ))}
                    </div>
                    <label className="block">
                      <span className="font-semibold">Internal readiness notes</span>
                      <textarea
                        value={selectedLead.internalNotes || ''}
                        onChange={(event) => refreshLead(selectedLead.id, { internalNotes: event.target.value })}
                        className={`mt-3 min-h-24 w-full resize-y rounded-lg border px-3 py-3 text-sm leading-6 outline-none transition ${styles.input}`}
                        placeholder="Visa status, missing traveler data, invoice dependencies..."
                      />
                    </label>
                  </div>
                ) : null}

                {detailTab === 'history' ? (
                  <div className="grid gap-4">
                    {selectedHistory.map((item) => (
                      <div key={`${item.label}-${item.meta}`} className="flex gap-3">
                        <span
                          className={`mt-1 h-2.5 w-2.5 rounded-full ${
                            item.tone === 'done'
                              ? 'bg-emerald-400'
                              : item.tone === 'current'
                                ? 'bg-sky-400'
                                : item.tone === 'closed'
                                  ? 'bg-red-400'
                                  : 'bg-white/30'
                          }`}
                        />
                        <div>
                          <div className="font-medium">{item.label}</div>
                          <div className={`text-sm ${styles.muted}`}>{item.meta}</div>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-3">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#d4af37]" />
                      <div>
                        <div className="font-medium">Email status</div>
                        <div className={`text-sm ${styles.muted}`}>{selectedLead.emailStatus}</div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <Inbox className={`mx-auto h-10 w-10 ${styles.muted}`} />
              <div className="mt-4 text-lg font-semibold">Select a request</div>
              <p className={`mt-2 text-sm ${styles.muted}`}>Lead context appears here.</p>
            </div>
          )}
        </aside>
          </div>
        </section>
      </div>
      {showManualRequest ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/55 px-4 py-6 backdrop-blur-sm">
          <form onSubmit={submitManualRequest} className={`w-full max-w-2xl rounded-xl border p-5 shadow-2xl ${styles.panel}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className={`text-xs uppercase tracking-[0.18em] ${styles.muted}`}>Phone intake</div>
                <h2 className="mt-1 text-xl font-semibold">New leisure request from phone call</h2>
                <p className={`mt-1 text-sm ${styles.muted}`}>Capture the essentials for Classic or Luxury now and qualify the request later. Corporate requests should come from CTM.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowManualRequest(false)}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${styles.buttonGhost}`}
                aria-label="Close phone request form"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium">
                Client / company
                <input
                  value={manualRequest.name}
                  onChange={(event) => updateManualField('name', event.target.value)}
                  className={`mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`}
                  placeholder="Name heard on call"
                  required
                />
              </label>
              <label className="text-sm font-medium">
                Segment
                <select
                  value={manualRequest.serviceKey}
                  onChange={(event) => updateManualField('serviceKey', event.target.value)}
                  className={`mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none ${styles.select}`}
                >
                  <option value="classic">Classic</option>
                  <option value="luxury">Luxury</option>
                </select>
              </label>
              <label className="text-sm font-medium">
                Phone / WhatsApp
                <input
                  value={manualRequest.phone}
                  onChange={(event) => updateManualField('phone', event.target.value)}
                  className={`mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`}
                  placeholder="+258..."
                />
              </label>
              <label className="text-sm font-medium">
                Email
                <input
                  value={manualRequest.email}
                  onChange={(event) => updateManualField('email', event.target.value)}
                  className={`mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`}
                  placeholder="optional@email.com"
                  type="email"
                />
              </label>
              <label className="text-sm font-medium">
                Destination
                <input
                  value={manualRequest.destination}
                  onChange={(event) => updateManualField('destination', event.target.value)}
                  className={`mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`}
                  placeholder="Where do they want to go?"
                />
              </label>
              <label className="text-sm font-medium">
                Departure city
                <input
                  value={manualRequest.departureCity}
                  onChange={(event) => updateManualField('departureCity', event.target.value)}
                  className={`mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`}
                  placeholder="Where from?"
                />
              </label>
              <label className="text-sm font-medium">
                Departure date
                <input
                  value={manualRequest.startDate}
                  onChange={(event) => updateManualField('startDate', event.target.value)}
                  className={`mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`}
                  type="date"
                  min={currentDateInput()}
                />
              </label>
              <label className="text-sm font-medium">
                Return date
                <input
                  value={manualRequest.endDate}
                  onChange={(event) => updateManualField('endDate', event.target.value)}
                  className={`mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`}
                  type="date"
                  min={maxDateInput(currentDateInput(), manualRequest.startDate)}
                />
              </label>
              <label className="text-sm font-medium">
                Travelers
                <input
                  value={manualRequest.travelers}
                  onChange={(event) => updateManualField('travelers', event.target.value)}
                  className={`mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`}
                  placeholder="2 travelers, executive team..."
                />
              </label>
              <label className="text-sm font-medium">
                Budget
                <input
                  value={manualRequest.budget}
                  onChange={(event) => updateManualField('budget', event.target.value)}
                  className={`mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`}
                  placeholder="If mentioned"
                />
              </label>
            </div>
            <label className="mt-4 block text-sm font-medium">
              Call notes
              <textarea
                value={manualRequest.notes}
                onChange={(event) => updateManualField('notes', event.target.value)}
                className={`mt-2 min-h-24 w-full rounded-lg border px-3 py-3 text-sm outline-none ${styles.input}`}
                placeholder="Capture what was said on the call..."
              />
            </label>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setShowManualRequest(false)} className={`rounded-lg px-4 py-2 text-sm ${styles.buttonGhost}`}>
                Cancel
              </button>
              <button type="submit" className="rounded-lg bg-[#12305a] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#173d72]">
                Create leisure request
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {showClientRegistration ? (
        <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/55 px-4 py-6 backdrop-blur-sm">
          <form onSubmit={submitClientRegistration} className={`w-full max-w-2xl rounded-xl border p-5 shadow-2xl ${styles.panel}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className={`text-xs uppercase tracking-[0.18em] ${styles.muted}`}>Client registration</div>
                <h2 className="mt-1 text-xl font-semibold">{selectedLead ? 'Convert request to client' : 'Create CRM client record'}</h2>
                <p className={`mt-1 text-sm ${styles.muted}`}>
                  {selectedLead ? 'Turn this request into a reusable client record and link future requests cleanly.' : 'Register a reusable client profile and link it to future requests.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowClientRegistration(false)}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${styles.buttonGhost}`}
                aria-label="Close client registration form"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {potentialClientMatch ? (
              <div className={`mt-5 rounded-xl border px-4 py-4 ${styles.panelSoft}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Existing client found</div>
                    <p className={`mt-1 text-sm ${styles.muted}`}>
                      {clientLabel(potentialClientMatch)} already exists with matching contact details. Saving will link this request to that client instead of creating a duplicate record.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClientId(potentialClientMatch.id);
                      setActiveNav('clients');
                      setShowClientRegistration(false);
                    }}
                    className={`inline-flex h-9 items-center rounded-lg px-3 text-xs ${styles.buttonGhost}`}
                  >
                    Open existing client
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium">
                Client name
                <input
                  value={clientForm.name}
                  onChange={(event) => updateClientField('name', event.target.value)}
                  className={`mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`}
                  required
                />
              </label>
              <label className="text-sm font-medium">
                Client type
                <select
                  value={clientForm.clientType}
                  onChange={(event) => updateClientField('clientType', event.target.value)}
                  className={`mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none ${styles.select}`}
                >
                  <option value="private">Private</option>
                  <option value="corporate">Corporate</option>
                </select>
              </label>
              <label className="text-sm font-medium">
                Company name
                <input
                  value={clientForm.companyName}
                  onChange={(event) => updateClientField('companyName', event.target.value)}
                  className={`mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`}
                />
              </label>
              <label className="text-sm font-medium">
                Service level
                <select
                  value={clientForm.serviceLevel}
                  onChange={(event) => updateClientField('serviceLevel', event.target.value)}
                  className={`mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none ${styles.select}`}
                >
                  <option value="classic">Classic</option>
                  <option value="luxury">Luxury</option>
                  <option value="corporate">Corporate</option>
                </select>
              </label>
              <label className="text-sm font-medium">
                Email
                <input
                  value={clientForm.email}
                  onChange={(event) => updateClientField('email', event.target.value)}
                  className={`mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`}
                  type="email"
                />
              </label>
              <label className="text-sm font-medium">
                Phone
                <input
                  value={clientForm.phone}
                  onChange={(event) => updateClientField('phone', event.target.value)}
                  className={`mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`}
                />
              </label>
              <label className="text-sm font-medium">
                Preferred contact
                <input
                  value={clientForm.preferredContact}
                  onChange={(event) => updateClientField('preferredContact', event.target.value)}
                  className={`mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`}
                />
              </label>
              <label className="text-sm font-medium">
                Owner
                <input
                  value={clientForm.owner}
                  onChange={(event) => updateClientField('owner', event.target.value)}
                  className={`mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`}
                />
              </label>
            </div>

            <label className="mt-4 block text-sm font-medium">
              Notes
              <textarea
                value={clientForm.notes}
                onChange={(event) => updateClientField('notes', event.target.value)}
                className={`mt-2 min-h-24 w-full rounded-lg border px-3 py-3 text-sm outline-none ${styles.input}`}
              />
            </label>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setShowClientRegistration(false)} className={`rounded-lg px-4 py-2 text-sm ${styles.buttonGhost}`}>
                Cancel
              </button>
              <button type="submit" className="rounded-lg bg-[#12305a] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#173d72]">
                {potentialClientMatch ? 'Link existing client' : selectedLead ? 'Convert to client' : 'Save client'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {showUserManagementModal ? (
        <div className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto bg-black/55 px-4 py-6 backdrop-blur-sm">
          <form onSubmit={submitUserManagement} className={`w-full max-w-2xl rounded-xl border p-5 shadow-2xl ${styles.panel}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className={`text-xs uppercase tracking-[0.18em] ${styles.muted}`}>CRM access</div>
                <h2 className="mt-1 text-xl font-semibold">{editingUserId ? 'Update CRM user' : 'Create CRM user'}</h2>
                <p className={`mt-1 text-sm ${styles.muted}`}>Set credentials, active status, and role-based CRM access.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUserManagementModal(false);
                  setEditingUserId(null);
                  setUserForm(emptyUserForm());
                }}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${styles.buttonGhost}`}
                aria-label="Close CRM user form"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium">
                First name
                <input
                  value={userForm.first_name}
                  onChange={(event) => updateUserField('first_name', event.target.value)}
                  className={`mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`}
                />
              </label>
              <label className="text-sm font-medium">
                Last name
                <input
                  value={userForm.last_name}
                  onChange={(event) => updateUserField('last_name', event.target.value)}
                  className={`mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`}
                />
              </label>
              <label className="text-sm font-medium">
                Username
                <input
                  value={userForm.username}
                  onChange={(event) => updateUserField('username', event.target.value)}
                  className={`mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`}
                  required
                />
              </label>
              <label className="text-sm font-medium">
                Email
                <input
                  value={userForm.email}
                  onChange={(event) => updateUserField('email', event.target.value)}
                  className={`mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`}
                  type="email"
                  required
                />
              </label>
              <label className="text-sm font-medium">
                Role
                <select
                  value={userForm.role}
                  onChange={(event) => updateUserField('role', event.target.value as UserFormState['role'])}
                  className={`mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none ${styles.select}`}
                >
                  {manageableRoleOptions.map((role) => (
                    <option key={role} value={role}>
                      {crmRoleLabels[role]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Password
                <input
                  value={userForm.password}
                  onChange={(event) => updateUserField('password', event.target.value)}
                  className={`mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`}
                  type="password"
                  placeholder={editingUserId ? 'Leave blank to keep current password' : 'Required for new user'}
                  required={!editingUserId}
                />
              </label>
            </div>

            <label className={`mt-4 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${styles.panelSoft}`}>
              <input
                checked={userForm.isActive}
                onChange={(event) => updateUserField('isActive', event.target.checked)}
                type="checkbox"
                className="h-4 w-4 rounded border-white/20"
              />
              <span>
                <span className="font-medium">Active CRM account</span>
                <span className={`mt-1 block ${styles.muted}`}>Inactive users keep their record but cannot sign in.</span>
              </span>
            </label>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowUserManagementModal(false);
                  setEditingUserId(null);
                  setUserForm(emptyUserForm());
                }}
                className={`rounded-lg px-4 py-2 text-sm ${styles.buttonGhost}`}
              >
                Cancel
              </button>
              <button type="submit" className="rounded-lg bg-[#12305a] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#173d72]">
                {editingUserId ? 'Save user' : 'Create user'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
