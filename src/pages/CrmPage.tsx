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
  createCrmLeadRecord,
  createCrmClientRecord,
  createCrmUserRecord,
  emptyClientRegistration,
  fetchCrmCurrentUser,
  fetchCrmLeads,
  fetchCrmClients,
  fetchCrmUsers,
  hasCrmApi,
  loginCrm,
  logoutCrm,
  makeClientFromLead,
  readCrmLeads,
  readCrmSession,
  saveCrmSession,
  updateCrmLeadRecord,
  updateCrmClientRecord,
  updateCrmUserRecord,
} from '../data/crm';
import { classicLogo } from '../data/travel';
import { BrandLockup } from '../components/ui';
import type { CrmClient, CrmLead, CrmManagedUser, CrmRole, CrmSession, InquiryKind, LeadPriority, LeadStatus } from '../types';

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
type UserFormState = {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Extract<CrmRole, 'admin' | 'manager' | 'agent' | 'viewer'>;
  isActive: boolean;
  password: string;
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
};

type ItineraryExperience = {
  title: string;
  category: string;
  timing: string;
  note: string;
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

const priorityLabels: Record<LeadPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

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
  { id: 'research', label: 'Research', Icon: Search },
  { id: 'costing', label: 'Costing', Icon: FileText },
  { id: 'package', label: 'Package', Icon: Sparkles },
  { id: 'clientReview', label: 'Client Review', Icon: Mail },
  { id: 'payment', label: 'Payment', Icon: Phone },
  { id: 'travelPack', label: 'Travel Pack', Icon: Download },
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

function leadStatusLabel(lead: CrmLead, status: LeadStatus) {
  const steps = workflowStepsForLead(lead);
  return steps.find(([step]) => step === status)?.[1] ?? statusLabels[status];
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
    ? ['overview', 'travelers', 'approvals', 'finance', 'documents', 'itinerary', 'history']
    : ['overview', 'proposal', 'payments', 'travelPack', 'itinerary', 'notes', 'history'];
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
      meta: `Status: ${leadStatusLabel(lead, lead.status)}`,
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
      value: leadStatusLabel(lead, lead.status),
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

function itinerarySummaryCards(lead: CrmLead): InfoCard[] {
  const travelerCount = travelerCountValue(lead) || 2;
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
  const flowSteps = workflowStepsForLead(lead);
  const activeIndex = flowSteps.findIndex(([status]) => status === lead.status);
  const visibleSteps =
    lead.status === 'lost'
      ? flowSteps.slice(0, 3)
      : flowSteps.slice(0, Math.max(1, activeIndex + 1));

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
    ...visibleSteps.slice(1).map(([status], index) => ({
      label: leadStatusLabel(lead, status),
      meta: lead.status !== 'lost' && index === visibleSteps.length - 2 ? 'Current operating stage' : 'Completed stage gate',
      tone: lead.status !== 'lost' && index === visibleSteps.length - 2 ? ('current' as const) : ('done' as const),
    })),
  ];

  if (lead.status === 'lost') {
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

export function CrmPage() {
  const apiEnabled = hasCrmApi();
  const [crmSession, setCrmSession] = useState<CrmSession | null>(() => readCrmSession());
  const [leads, setLeads] = useState<CrmLead[]>(() => (apiEnabled ? [] : readCrmLeads()));
  const [clients, setClients] = useState<CrmClient[]>([]);
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
        canManageUsers(crmSession?.user) ? fetchCrmUsers(crmSession) : Promise.resolve([]),
      ])
        .then(([nextLeads, nextClients, nextUsers]) => {
          setLeads(nextLeads);
          setClients(nextClients);
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
  const selectedProcess = selectedLead ? processForLead(selectedLead) : null;
  const selectedDetailTabs = useMemo(() => {
    if (!selectedLead) return [];
    return activeNav === 'leisureStudio' ? leisureWorkbenchTabs.map((tab) => tab.id) : detailTabsForLead(selectedLead);
  }, [activeNav, selectedLead]);
  const selectedTasks = selectedLead ? leadTasks(selectedLead) : [];
  const selectedHistory = selectedLead ? workflowHistory(selectedLead) : [];
  const selectedStatusCards = selectedLead ? leftRailStatusCards(selectedLead) : [];
  const selectedItinerarySummary = selectedLead ? itinerarySummaryCards(selectedLead) : [];
  const selectedItineraryStops = selectedLead ? itineraryStops(selectedLead) : [];
  const selectedItineraryExperiences = selectedLead ? itineraryExperiences(selectedLead) : [];
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
  const taskCount = leads.filter((lead) => fallbackPriority(lead) === 'urgent' || fallbackPriority(lead) === 'high').length;
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
    tasks: { title: 'Priority Tasks', subtitle: 'High-attention requests that need action from the team' },
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

  async function refreshLead(id: string, patch: Partial<Pick<CrmLead, 'status' | 'priority' | 'internalNotes'>>) {
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
      setShowFilters(false);
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

  async function submitManualRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const serviceKey = manualRequest.serviceKey as InquiryKind;
    if (serviceKey === 'corporate') {
      setCrmError('Corporate requests must come from CTM. Use phone intake here for Classic or Luxury only.');
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

          <div className={activeNav === 'leisureStudio' ? 'grid xl:grid-cols-[360px_minmax(0,1fr)]' : requestCentricNav ? 'grid xl:grid-cols-[380px_minmax(0,1fr)]' : 'grid xl:grid-cols-[minmax(720px,1fr)_430px]'}>
            <div className={`min-w-0 border-r ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
          <div className="p-5">
            {crmError ? <div className="mb-4 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{crmError}</div> : null}
            {isLoadingLeads ? <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${styles.panelSoft}`}>Loading CRM requests...</div> : null}
            {activeNav !== 'leisureStudio' ? (
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

            {activeNav !== 'clients' && activeNav !== 'settings' && activeNav !== 'command' && activeNav !== 'leisureStudio' && selectedLead ? (
              <div className={`mt-5 rounded-xl border p-4 ${styles.panel}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className={`text-xs uppercase tracking-[0.14em] ${styles.muted}`}>Status report</div>
                    <div className="mt-2 text-base font-semibold">{selectedLead.name}</div>
                    <div className={`mt-1 text-sm ${styles.muted}`}>{leadSegment(selectedLead)} · {selectedLead.destination || 'Destination pending'}</div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${styles.type[selectedLead.serviceKey]}`}>
                    {leadStatusLabel(selectedLead, selectedLead.status)}
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

            {activeNav !== 'command' && activeNav !== 'leisureStudio' ? (
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

            {showFilters && activeNav !== 'leisureStudio' ? (
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
                                    {leadStatusLabel(lead, lead.status)}
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
                        <div className="mt-4 text-lg font-semibold">{activeNav === 'leisureStudio' ? 'No leisure trips in this inbox' : 'No requests in this queue'}</div>
                        <p className={`mt-2 text-sm ${styles.muted}`}>{activeNav === 'leisureStudio' ? 'Adjust the stage lens or add a leisure request to start working.' : 'Adjust filters or submit a form to create a request.'}</p>
                      </div>
                    ) : (
                      leadSections.map((section) => (
                        <div key={section.key}>
                          <div className={`${activeNav === 'leisureStudio' ? 'border-b px-4 py-3' : `border-b px-5 py-3 ${styles.panelSoft}`}`}>
                            {activeNav === 'leisureStudio' ? (
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="text-sm font-semibold">{section.title}</div>
                                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${styles.buttonGhost}`}>{section.leads.length}</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {([
                                    { key: 'all', label: 'All' },
                                    { key: 'contacted', label: 'Brief' },
                                    { key: 'planning', label: 'Research' },
                                    { key: 'proposal', label: 'Package' },
                                    { key: 'won', label: 'Payment' },
                                    { key: 'execution', label: 'Travel Pack' },
                                  ] as Array<{ key: StatusFilter; label: string }>).map((filter) => (
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
                          <div className={activeNav === 'leisureStudio' ? 'grid' : 'grid gap-3 p-4'}>
                            {section.leads.map((lead) => {
                              const priority = fallbackPriority(lead);
                              const isSelected = selectedLead?.id === lead.id;
                              return (
                                activeNav === 'leisureStudio' ? (
                                  <button
                                    key={lead.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedLeadId(lead.id);
                                      setDetailTab('brief');
                                    }}
                                    className={`grid w-full grid-cols-[minmax(0,1fr)_92px] gap-3 border-b px-4 py-3 text-left transition ${
                                      isSelected ? styles.rowActive : styles.row
                                    }`}
                                  >
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${lead.serviceKey === 'luxury' ? 'bg-[#d4af37]' : 'bg-emerald-400'}`} />
                                        <div className="truncate text-sm font-semibold">{lead.name}</div>
                                      </div>
                                      <div className={`mt-1 truncate text-xs ${styles.muted}`}>{lead.destination || 'Destination pending'}</div>
                                      <div className={`mt-1 truncate text-[11px] ${styles.muted}`}>{lead.dates || 'Dates pending'} - {leadStatusLabel(lead, lead.status)}</div>
                                    </div>
                                    <div className="flex flex-col items-end justify-center gap-1">
                                      <span className={`rounded-full px-2 py-0.5 text-[10px] ring-1 ${styles.type[lead.serviceKey]}`}>{typeLabels[lead.serviceKey]}</span>
                                      <span className={`inline-flex items-center gap-1 text-[10px] ${priority === 'urgent' || priority === 'high' ? 'text-red-300' : priority === 'normal' ? styles.soft : styles.muted}`}>
                                        <span className={`${priority === 'urgent' || priority === 'high' ? 'text-red-400' : priority === 'normal' ? 'text-sky-300' : 'text-slate-400'}`}>⚑</span>
                                        {priorityLabels[priority]}
                                      </span>
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
                          <div className={`mt-2 text-sm ${styles.muted}`}>{lead.dates || 'Dates pending'} - {statusLabels[lead.status]}</div>
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
                  <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>{leadStatusLabel(selectedLead, selectedLead.status)}</span>
                </div>

                <div className={`rounded-xl border p-4 ${styles.panel}`}>
                  <div className="font-semibold">Status report</div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className={`rounded-lg border px-3 py-3 ${styles.panelSoft}`}>
                      <div className={`text-[11px] uppercase tracking-[0.12em] ${styles.muted}`}>Current status</div>
                      <div className="mt-1 text-sm font-semibold">{leadStatusLabel(selectedLead, selectedLead.status)}</div>
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
                      <div className="mt-1 text-sm font-semibold">{leadPrimaryBlocker(selectedLead)}</div>
                    </div>
                  </div>
                </div>

                <div className={`rounded-xl border p-4 ${styles.panel}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">Value-chain progress</div>
                    <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>{managerMeta?.task || selectedProcess?.primaryAction || 'Review request'}</span>
                  </div>
                  {(() => {
                    const steps = workflowStepsForLead(selectedLead);
                    const activeIndex = selectedLead.status === 'lost' ? -1 : steps.findIndex(([step]) => step === selectedLead.status);
                    const currentStep =
                      activeIndex >= 0 ? steps[activeIndex] : null;

                    return (
                      <div className="mt-4 grid gap-3">
                        <div className={`rounded-lg border px-3 py-3 ${styles.panelSoft}`}>
                          <div className={`text-[11px] uppercase tracking-[0.12em] ${styles.muted}`}>Stage roadmap</div>
                          <div className="mt-3 grid grid-cols-4 gap-x-2 gap-y-3">
                            {steps.map(([status, label], index) => {
                              const isDone = activeIndex >= 0 && index < activeIndex;
                              const isCurrent = activeIndex === index;
                              const isBlocked = (selectedLead.status === 'proposal' || selectedLead.status === 'won') && isCurrent;
                              const StageIcon = isDone ? CheckSquare : isCurrent ? (isBlocked ? Bell : ClipboardCheck) : MoreHorizontal;

                              return (
                                <div key={status} className="flex min-w-0 flex-col items-center text-center">
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
                                    {label}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {selectedLead.status === 'lost' ? (
                          <div className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-3 text-sm text-red-200">
                            Request closed. Capture the reason and decide whether it should return to nurture.
                          </div>
                        ) : currentStep ? (
                          <div className={`rounded-lg border px-3 py-3 ${styles.panelSoft}`}>
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className={`text-[11px] uppercase tracking-[0.12em] ${styles.muted}`}>Current stage</div>
                                <div className="mt-1 text-sm font-semibold">{currentStep[1]}</div>
                              </div>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[11px] ${
                                  selectedLead.status === 'proposal' || selectedLead.status === 'won'
                                    ? 'bg-red-500/15 text-red-300'
                                    : 'bg-sky-500/15 text-sky-300'
                                }`}
                              >
                                {selectedLead.status === 'proposal' || selectedLead.status === 'won' ? 'Current blocker' : 'In progress'}
                              </span>
                            </div>
                            <div className={`mt-3 text-sm leading-6 ${styles.soft}`}>
                              {selectedProcess?.stageGate || 'Current operating checkpoint.'}
                            </div>
                            <div className={`mt-3 border-t pt-3 text-sm leading-6 ${styles.muted}`}>
                              <span className={`text-[11px] uppercase tracking-[0.12em] ${styles.muted}`}>Next move</span>
                              <div className={`mt-1 ${styles.soft}`}>{selectedProcess?.nextAction || 'No active process note yet.'}</div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center">
                <Inbox className={`mx-auto h-10 w-10 ${styles.muted}`} />
                <div className="mt-4 text-lg font-semibold">Select a request</div>
                <p className={`mt-2 text-sm ${styles.muted}`}>Manager decision context appears here.</p>
              </div>
            )
          ) : activeNav === 'leisureStudio' ? (
            selectedLead ? (() => {
              const currentWorkbenchIndex = leisureWorkbenchTabs.findIndex((tab) => tab.id === detailTab);
              const pricing = selectedLeisureRows.reduce(
                (totals, row) => ({
                  cost: totals.cost + row.cost,
                  sell: totals.sell + row.sell,
                }),
                { cost: 0, sell: 0 },
              );
              const margin = pricing.sell - pricing.cost;
              const marginPercent = pricing.sell > 0 ? Math.round((margin / pricing.sell) * 100) : 0;
              const currentWorkbenchLabel =
                leisureWorkbenchTabs.find((tab) => tab.id === detailTab)?.label ?? 'Brief';

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
                            <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>{leadStatusLabel(selectedLead, selectedLead.status)}</span>
                          </div>
                          <div className={`mt-2 text-sm ${styles.muted}`}>
                            {selectedLead.name} · {selectedLead.tripType || selectedLead.service} · {selectedLead.dates || 'Dates pending'}
                          </div>
                          <div className={`mt-2 text-sm ${styles.soft}`}>
                            {selectedLead.serviceKey === 'luxury' ? 'High-touch leisure design with premium service framing.' : 'Balanced leisure design focused on clarity, fit, and smooth delivery.'}
                          </div>
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
                          <div className="mt-1 text-sm font-semibold">{leadOwner(selectedLead)}</div>
                          <div className={`mt-1 text-xs ${styles.muted}`}>Studio work owner</div>
                        </div>
                        <div className={`rounded-lg border px-3 py-3 ${styles.panelSoft}`}>
                          <div className={`text-[11px] uppercase tracking-[0.12em] ${styles.muted}`}>Current stage</div>
                          <div className="mt-1 text-sm font-semibold">{currentWorkbenchLabel}</div>
                          <div className={`mt-1 text-xs ${styles.muted}`}>{leadPrimaryBlocker(selectedLead)}</div>
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
                          <div className={`mt-1 text-sm ${styles.muted}`}>{selectedProcess?.stageGate || 'Use this space to move the trip through the active leisure checkpoint.'}</div>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>{selectedProcess?.primaryAction || 'Working stage'}</span>
                      </div>

                      {detailTab === 'brief' ? (
                        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                          <div className={`rounded-xl border p-4 ${styles.panelSoft}`}>
                            <div className="font-semibold">Client brief fields</div>
                            <div className="mt-4 grid gap-3">
                              <div className={`rounded-lg border p-3 ${styles.panel}`}>
                                <div className={`text-xs uppercase tracking-[0.14em] ${styles.muted}`}>Travelers</div>
                                <div className="mt-2 text-sm font-semibold">{selectedLead.travelers || 'Pending'}</div>
                              </div>
                              <div className={`rounded-lg border p-3 ${styles.panel}`}>
                                <div className={`text-xs uppercase tracking-[0.14em] ${styles.muted}`}>Origin</div>
                                <div className="mt-2 text-sm font-semibold">{selectedLead.departureCity || 'Pending'}</div>
                              </div>
                              <div className={`rounded-lg border p-3 ${styles.panel}`}>
                                <div className={`text-xs uppercase tracking-[0.14em] ${styles.muted}`}>Budget range</div>
                                <div className="mt-2 text-sm font-semibold">{selectedLead.budget || 'Pending'}</div>
                              </div>
                              <div className={`rounded-lg border p-3 ${styles.panel}`}>
                                <div className={`text-xs uppercase tracking-[0.14em] ${styles.muted}`}>Must-have direction</div>
                                <div className="mt-2 text-sm leading-6">{selectedLead.requestedServices || 'Service scope pending'}</div>
                              </div>
                              <div className={`rounded-lg border p-3 ${styles.panel}`}>
                                <div className={`text-xs uppercase tracking-[0.14em] ${styles.muted}`}>Client summary</div>
                                <div className="mt-2 text-sm leading-6">{selectedLead.notes || 'No request summary captured yet.'}</div>
                              </div>
                            </div>
                          </div>
                          <div className={`rounded-xl border p-4 ${styles.panelSoft}`}>
                            <div className="font-semibold">Working notes</div>
                            <textarea
                              value={selectedLead.internalNotes || ''}
                              onChange={(event) => refreshLead(selectedLead.id, { internalNotes: event.target.value })}
                              className={`mt-4 h-72 w-full resize-none rounded-xl border px-4 py-4 text-sm leading-6 outline-none transition ${styles.input}`}
                              placeholder="Capture tone, trip mood, supplier instincts, and what would make the proposal feel right."
                            />
                            <div className="mt-4 flex flex-wrap gap-2">
                              {(selectedLead.requestedServices || 'Relaxed pacing, smooth logistics')
                                .split(',')
                                .map((item) => item.trim())
                                .filter(Boolean)
                                .map((item) => (
                                  <span key={item} className="rounded-full bg-fuchsia-500/15 px-3 py-1 text-xs text-fuchsia-100">
                                    {item}
                                  </span>
                                ))}
                            </div>
                          </div>
                          <div className="xl:col-span-2 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                            <div className={`rounded-xl border p-4 ${styles.panelSoft}`}>
                              <div className="font-semibold">Action checklist</div>
                              <div className="mt-4 grid gap-3">
                                {selectedTasks.map((task, index) => (
                                  <div key={task.title} className={`flex items-center gap-3 rounded-lg border px-3 py-3 ${styles.panel}`}>
                                    <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${index < 2 ? 'border-emerald-400/50 text-emerald-300' : 'border-white/10 text-white/45'}`}>
                                      <CheckSquare className="h-3.5 w-3.5" />
                                    </span>
                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-medium">{task.title}</div>
                                      <div className={`mt-1 text-xs ${styles.muted}`}>{task.due}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="grid gap-4">
                              <div className={`rounded-xl border p-4 ${styles.panelSoft}`}>
                                <div className="font-semibold">Decision alert</div>
                                <div className="mt-3 text-sm font-semibold">{leadPrimaryBlocker(selectedLead)}</div>
                                <p className={`mt-2 text-sm leading-6 ${styles.soft}`}>
                                  {selectedProcess?.nextAction || 'Keep the current stage clean before advancing the trip.'}
                                </p>
                              </div>
                              <div className={`rounded-xl border p-4 ${styles.panelSoft}`}>
                                <div className="font-semibold">Supplier notes</div>
                                <p className={`mt-3 text-sm leading-6 ${styles.soft}`}>
                                  Use this stage to capture trip mood, supplier protection windows, and anything that should shape the proposal before research turns into pricing.
                                </p>
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
                            <div className={`grid grid-cols-[1.1fr_1fr_110px_110px_110px] gap-4 border-b px-4 py-3 text-xs uppercase tracking-[0.14em] ${styles.tableHead}`}>
                              <div>Service</div>
                              <div>Supplier</div>
                              <div>Cost</div>
                              <div>Sell</div>
                              <div>Margin</div>
                            </div>
                            {selectedLeisureRows.map((row) => (
                              <div key={row.service} className={`grid grid-cols-[1.1fr_1fr_110px_110px_110px] gap-4 border-b px-4 py-4 text-sm ${styles.panel}`}>
                                <div className="font-semibold">{row.service}</div>
                                <div className={styles.soft}>{row.supplier}</div>
                                <div>${row.cost.toLocaleString()}</div>
                                <div className="text-emerald-300">${row.sell.toLocaleString()}</div>
                                <div className="text-fuchsia-300">${(row.sell - row.cost).toLocaleString()}</div>
                              </div>
                            ))}
                            <div className="grid grid-cols-3 gap-3 p-4">
                              <div className={`rounded-lg border px-3 py-3 ${styles.panel}`}>
                                <div className={`text-[10px] uppercase tracking-[0.14em] ${styles.muted}`}>Total cost</div>
                                <div className="mt-1 text-sm font-semibold">${pricing.cost.toLocaleString()}</div>
                              </div>
                              <div className={`rounded-lg border px-3 py-3 ${styles.panel}`}>
                                <div className={`text-[10px] uppercase tracking-[0.14em] ${styles.muted}`}>Total sell</div>
                                <div className="mt-1 text-sm font-semibold">${pricing.sell.toLocaleString()}</div>
                              </div>
                              <div className={`rounded-lg border px-3 py-3 ${styles.panel}`}>
                                <div className={`text-[10px] uppercase tracking-[0.14em] ${styles.muted}`}>Gross margin</div>
                                <div className="mt-1 text-sm font-semibold">{marginPercent}%</div>
                              </div>
                            </div>
                          </div>
                          <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4">
                            <div className="text-xs uppercase tracking-[0.18em] text-red-200">Decision alert</div>
                            <div className="mt-3 text-sm font-semibold text-white">Do not release package until the margin feels safe</div>
                            <p className="mt-2 text-sm leading-6 text-red-100/90">
                              Use costing to pressure-test hotel, transfer, and experience sell values before the client-facing package is locked.
                            </p>
                          </div>
                        </div>
                      ) : null}

                      {detailTab === 'package' ? (
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
                      ) : null}

                      {detailTab === 'clientReview' ? (
                        <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
                          <div className={`rounded-xl border p-4 ${styles.panelSoft}`}>
                            <div className="font-semibold">Client message draft</div>
                            <textarea
                              className={`mt-4 h-80 w-full resize-none rounded-xl border px-4 py-4 text-sm leading-6 outline-none transition ${styles.input}`}
                              defaultValue={`Hello ${selectedLead.name},\n\nWe prepared your ${selectedLead.destination || 'upcoming'} travel direction based on your requested scope: ${selectedLead.requestedServices || 'trip design in progress'}.\n\nOur recommended package balances comfort, fit, and logistics within ${selectedLead.budget || 'your target range'}.\n\nPlease review the options and let us know which direction feels right so we can prepare the payment and confirmation steps.\n\nWarm regards,\nDestinos Pelo Mundo`}
                            />
                          </div>
                          <div className="grid gap-4">
                            <div className={`rounded-xl border p-4 ${styles.panelSoft}`}>
                              <div className="font-semibold">Attachments</div>
                              <div className="mt-3 grid gap-3">
                                {['Package comparison PDF', 'Draft itinerary', 'Payment guidance'].map((item) => (
                                  <div key={item} className={`flex items-center justify-between rounded-lg border px-3 py-3 ${styles.panel}`}>
                                    <span className="text-sm">{item}</span>
                                    <span className={`text-xs ${styles.muted}`}>Ready</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className={`rounded-xl border p-4 ${styles.panelSoft}`}>
                              <div className="font-semibold">Client review note</div>
                              <p className={`mt-3 text-sm leading-6 ${styles.soft}`}>
                                {selectedProcess?.nextAction || 'Keep the package clear, emotionally strong, and easy to choose.'}
                              </p>
                            </div>
                            <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4">
                              <div className="text-xs uppercase tracking-[0.18em] text-red-200">Decision alert</div>
                              <p className="mt-3 text-sm leading-6 text-red-100/90">
                                Make sure the client message reflects the recommended package clearly. Too many choices weakens the decision.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {detailTab === 'payment' ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className={`rounded-xl border p-4 ${styles.panelSoft}`}>
                            <div className="font-semibold">Payment posture</div>
                            <p className={`mt-3 text-sm leading-6 ${styles.soft}`}>
                              {selectedLead.status === 'won' || selectedLead.status === 'execution' || selectedLead.status === 'completed'
                                ? 'Client approval is already secured. Keep payment confirmation and supplier-hold timing tightly aligned.'
                                : 'Use this lane to make payment expectations explicit before the trip moves into booking.'}
                            </p>
                          </div>
                          <div className={`rounded-xl border p-4 ${styles.panelSoft}`}>
                            <div className={`text-sm ${styles.muted}`}>Decision pressure</div>
                            <div className="mt-2 text-lg font-semibold">{leadPrimaryBlocker(selectedLead)}</div>
                            <div className={`mt-2 text-sm ${styles.muted}`}>{selectedLead.preferredContact || 'Preferred contact pending'}</div>
                          </div>
                          {leisurePaymentCards(selectedLead).map((card) => (
                            <div key={card.label} className={`rounded-xl border p-4 ${styles.panelSoft}`}>
                              <div className={`text-sm ${styles.muted}`}>{card.label}</div>
                              <div className="mt-2 font-semibold">{card.value}</div>
                              {card.meta ? <div className={`mt-2 text-sm leading-6 ${styles.muted}`}>{card.meta}</div> : null}
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {detailTab === 'travelPack' ? (
                        <div className="grid gap-4">
                          <div className="grid gap-3 md:grid-cols-3">
                            {leisureTravelPackCards(selectedLead).map((card) => (
                              <div key={card.label} className={`rounded-xl border p-4 ${styles.panelSoft}`}>
                                <div className={`text-sm ${styles.muted}`}>{card.label}</div>
                                <div className="mt-2 font-semibold">{card.value}</div>
                                {card.meta ? <div className={`mt-2 text-sm leading-6 ${styles.muted}`}>{card.meta}</div> : null}
                              </div>
                            ))}
                          </div>
                          <div className={`rounded-xl border p-4 ${styles.panelSoft}`}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-semibold">Booking snapshot</div>
                              <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>Leisure fulfilment mock</span>
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
                          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                            <div className={`rounded-xl border p-4 ${styles.panelSoft}`}>
                              <div className="font-semibold">Action checklist</div>
                              <div className="mt-4 grid gap-3">
                                {selectedTasks.map((task, index) => (
                                  <div key={task.title} className={`flex items-center gap-3 rounded-lg border px-3 py-3 ${styles.panel}`}>
                                    <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${index < 2 ? 'border-emerald-400/50 text-emerald-300' : 'border-white/10 text-white/45'}`}>
                                      <CheckSquare className="h-3.5 w-3.5" />
                                    </span>
                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-medium">{task.title}</div>
                                      <div className={`mt-1 text-xs ${styles.muted}`}>{task.due}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className={`rounded-xl border p-4 ${styles.panelSoft}`}>
                              <div className="font-semibold">Decision alert</div>
                              <p className={`mt-3 text-sm leading-6 ${styles.soft}`}>
                                Final confirmations, notes, and traveler-facing instructions should all be coherent before the travel pack is sent.
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
                    <div className={`mt-1 text-xs ${styles.muted}`}>{leadStatusLabel(selectedLead, selectedLead.status)}</div>
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
                    onClick={() => {
                      if (selectedProcess?.nextStatus) refreshLead(selectedLead.id, { status: selectedProcess.nextStatus });
                    }}
                    disabled={!selectedProcess?.nextStatus}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Phone className="h-4 w-4" />
                    {selectedProcess?.primaryAction ?? 'Update'}
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
                        <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>Itinerary mock workspace</span>
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
                        <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>{selectedItineraryStops.length} cities / stays</span>
                      </div>
                      <div className="mt-4 grid gap-4">
                        {selectedItineraryStops.map((stop, index) => (
                          <div key={`${stop.city}-${index}`} className={`rounded-lg border p-4 ${styles.panelSoft}`}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="text-xs uppercase tracking-[0.14em] text-[#d9b46f]">Stop {index + 1}</div>
                                <div className="mt-2 text-lg font-semibold">{stop.city}</div>
                                <div className={`mt-1 text-sm ${styles.muted}`}>{stop.nights} · {stop.stay}</div>
                              </div>
                              <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>{stop.focus}</span>
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
                                <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>{experience.timing}</span>
                              </div>
                              <div className={`mt-2 text-sm ${styles.muted}`}>{experience.category}</div>
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
                              <span className="font-semibold">{selectedItineraryStops.length}</span>
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
                            This is the space where we should eventually edit routing, hotel count, room types, transfers, and experiences directly instead of squeezing them into a narrow follow-up panel.
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
                      <div className={`text-sm ${styles.muted}`}>Commercial shape</div>
                      <div className="mt-2 text-lg font-semibold">{selectedLead.budget || 'Policy-based / budget pending'}</div>
                      <div className={`mt-2 text-sm ${styles.muted}`}>{selectedLead.requestedServices || 'Service scope pending'}</div>
                    </div>
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
                        <div className="font-semibold">Simulated booking release snapshot</div>
                        <span className={`rounded-full px-2.5 py-1 text-xs ${styles.buttonGhost}`}>Corporate fulfillment mock</span>
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
                />
              </label>
              <label className="text-sm font-medium">
                Return date
                <input
                  value={manualRequest.endDate}
                  onChange={(event) => updateManualField('endDate', event.target.value)}
                  className={`mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`}
                  type="date"
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
