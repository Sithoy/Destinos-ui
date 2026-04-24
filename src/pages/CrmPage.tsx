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
import type { CrmClient, CrmLead, CrmManagedUser, CrmRole, CrmSession, InquiryKind, LeadPriority, LeadStatus } from '../types';

type LeadTypeFilter = 'all' | InquiryKind;
type StatusFilter = 'all' | LeadStatus | 'confirmedGroup' | 'workflowGroup';
type PriorityFilter = 'all' | LeadPriority | 'attention';
type CrmTheme = 'dark' | 'light';
type DetailTab = 'overview' | 'tasks' | 'notes' | 'history';
type CrmNavId = 'command' | 'workflow' | 'tasks' | 'calendar' | 'clients' | 'trips' | 'reports' | 'settings';
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

type ProcessHistoryItem = {
  label: string;
  meta: string;
  tone: 'done' | 'current' | 'upcoming' | 'closed';
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

const workflowSteps = [
  ['new', 'New'],
  ['contacted', 'Qualification'],
  ['planning', 'Trip Design'],
  ['proposal', 'Proposal'],
  ['won', 'Confirmed'],
  ['execution', 'Execution'],
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

const statusProcess: Record<
  LeadStatus,
  {
    primaryAction: string;
    nextAction: string;
    nextStatus: LeadStatus | null;
    stageGate: string;
    taskTitles: [string, string, string];
  }
> = {
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

const navItems: Array<{ id: CrmNavId; label: string; Icon: LucideIcon }> = [
  { id: 'command', label: 'Command Center', Icon: LayoutDashboard },
  { id: 'workflow', label: 'Workflow', Icon: ClipboardCheck },
  { id: 'tasks', label: 'Tasks', Icon: CheckSquare },
  { id: 'calendar', label: 'Calendar', Icon: CalendarDays },
  { id: 'clients', label: 'Clients', Icon: Users },
  { id: 'trips', label: 'Trips', Icon: Sparkles },
  { id: 'reports', label: 'Reports', Icon: FileText },
  { id: 'settings', label: 'Settings', Icon: Settings },
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
  const process = statusProcess[lead.status];
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
  const activeIndex = workflowSteps.findIndex(([status]) => status === lead.status);
  const visibleSteps =
    lead.status === 'lost'
      ? workflowSteps.slice(0, 3)
      : workflowSteps.slice(0, Math.max(1, activeIndex + 1));

  const history: ProcessHistoryItem[] = [
    {
      label: 'Website request received',
      meta: formatDate(lead.createdAt),
      tone: 'done',
    },
    {
      label: `Assigned to ${leadOwner(lead)}`,
      meta: typeLabels[lead.serviceKey],
      tone: 'done',
    },
    ...visibleSteps.slice(1).map(([status], index) => ({
      label: statusLabels[status],
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
  const isLight = theme === 'light';
  const titleTone = isLight
    ? 'bg-[linear-gradient(180deg,#334155_0%,#0f172a_55%,#020617_100%)]'
    : 'bg-[linear-gradient(180deg,#ffffff_0%,#e7f0ff_52%,#a9bfd8_100%)]';
  const scriptTone = isLight ? 'text-slate-900' : 'text-white';
  const lineTone = isLight ? 'bg-slate-400/55' : 'bg-white/35';
  const descriptorTone = isLight ? 'text-slate-600' : 'text-white/70';
  const descriptorLineTone = isLight ? 'bg-slate-300' : 'bg-white/25';

  return (
    <div className="flex w-full items-center gap-3 overflow-hidden">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-visible">
        <img
          src={classicLogo}
          alt="Destinos pelo Mundo"
          className="h-full w-full scale-[1.35] object-contain drop-shadow-[0_10px_22px_rgba(0,0,0,0.32)]"
          loading="lazy"
          decoding="async"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block whitespace-nowrap bg-clip-text font-serif text-xl font-semibold uppercase leading-none tracking-[0.08em] text-transparent drop-shadow-[0_5px_12px_rgba(0,0,0,0.28)] ${titleTone}`}>
          Destinos
        </span>
        <span className={`mt-0.5 flex items-center gap-1.5 text-base ${scriptTone}`}>
          <span className={`h-px min-w-3 flex-1 ${lineTone}`} />
          <span className="whitespace-nowrap font-serif font-semibold italic leading-none">pelo mundo</span>
          <span className={`h-px min-w-3 flex-1 ${lineTone}`} />
        </span>
        <span className={`mt-1.5 flex items-center gap-1.5 ${descriptorTone}`}>
          <span className={`h-px min-w-2 flex-1 ${descriptorLineTone}`} />
          <span className="whitespace-nowrap text-[7px] font-semibold uppercase tracking-[0.22em]">Tourism & Travel</span>
          <span className={`h-px min-w-2 flex-1 ${descriptorLineTone}`} />
        </span>
      </span>
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
      return matchesType && matchesStatus && matchesPriority && matchesNav && matchesQuery;
    });
  }, [activeNav, leads, priorityFilter, query, statusFilter, typeFilter]);

  const filteredClients = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return clients.filter((client) => {
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

      return matchesType && matchesPriority && matchesQuery;
    });
  }, [clients, priorityFilter, query, typeFilter]);

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

  const typeCounts = useMemo(() => {
    const source = activeNav === 'clients' ? filteredClients : leads;
    return typeFilters.reduce(
      (counts, filter) => ({
        ...counts,
        [filter]:
          filter === 'all'
            ? source.length
            : activeNav === 'clients'
              ? filteredClients.filter((client) => client.serviceLevel === filter).length
              : leads.filter((lead) => lead.serviceKey === filter).length,
      }),
      {} as Record<LeadTypeFilter, number>,
    );
  }, [activeNav, filteredClients, leads]);

  const activeItems = activeNav === 'clients' ? filteredClients : activeNav === 'settings' ? filteredUsers : filteredLeads;
  const totalPages = Math.max(1, Math.ceil(activeItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageLeads = filteredLeads.slice(pageStart, pageStart + PAGE_SIZE);
  const pageClients = filteredClients.slice(pageStart, pageStart + PAGE_SIZE);
  const pageUsers = filteredUsers.slice(pageStart, pageStart + PAGE_SIZE);
  const selectedLead = filteredLeads.find((lead) => lead.id === selectedLeadId) ?? pageLeads[0] ?? filteredLeads[0] ?? null;
  const selectedClient = filteredClients.find((client) => client.id === selectedClientId) ?? pageClients[0] ?? filteredClients[0] ?? null;
  const selectedProcess = selectedLead ? processForLead(selectedLead) : null;
  const selectedTasks = selectedLead ? leadTasks(selectedLead) : [];
  const selectedHistory = selectedLead ? workflowHistory(selectedLead) : [];
  const selectedClientLeads = selectedClient ? leads.filter((lead) => lead.clientId === selectedClient.id) : [];
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
  const urgentNewCount = leads.filter((lead) => lead.status === 'new' && (fallbackPriority(lead) === 'urgent' || fallbackPriority(lead) === 'high')).length;
  const workflowCount = leads.filter((lead) => lead.status === 'contacted' || lead.status === 'planning' || lead.status === 'proposal' || lead.status === 'execution').length;
  const taskCount = leads.filter((lead) => fallbackPriority(lead) === 'urgent' || fallbackPriority(lead) === 'high').length;
  const calendarCount = leads.filter((lead) => Boolean(lead.dates) && lead.status !== 'lost' && lead.status !== 'completed').length;
  const clientCount = clients.length;
  const activeUserCount = crmUsers.filter((user) => user.isActive).length;
  const managerAdminCount = crmUsers.filter((user) => user.role === 'admin' || user.role === 'manager').length;
  const activeAgentCount = crmUsers.filter((user) => user.role === 'agent' && user.isActive).length;
  const inactiveUserCount = crmUsers.filter((user) => !user.isActive).length;
  const navCounts: Partial<Record<CrmNavId, number>> = {
    command: newCount,
    workflow: workflowCount,
    tasks: taskCount,
    calendar: calendarCount,
    clients: clientCount,
    trips: confirmedCount,
    reports: filteredLeads.length,
    settings: crmUsers.length,
  };
  const navCopy: Record<CrmNavId, { title: string; subtitle: string }> = {
    command: { title: 'Command Center', subtitle: 'Incoming requests from website forms and phone intake' },
    workflow: { title: 'Workflow', subtitle: 'Active requests moving through qualification, design, proposal, and execution' },
    tasks: { title: 'Priority Tasks', subtitle: 'High-attention requests that need action from the team' },
    calendar: { title: 'Travel Calendar', subtitle: 'Requests with travel dates, useful for upcoming movement planning' },
    clients: { title: 'Clients', subtitle: 'Client and company requests captured in the CRM pipeline' },
    trips: { title: 'Trips', subtitle: 'Confirmed, executing, and completed travel work' },
    reports: { title: 'Reports', subtitle: 'Filtered CRM data ready for export and review' },
    settings: { title: 'Settings', subtitle: 'CRM access, user roles, and operating preferences' },
  };
  const metricCards: MetricCard[] = [
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

    if (nextNav === 'command') {
      clearFilters();
      setShowFilters(false);
      return;
    }

    setTypeFilter('all');
    setPriorityFilter('all');
    setQuery('');

    if (nextNav === 'workflow') {
      setStatusFilter('workflowGroup');
      setShowFilters(false);
      return;
    }

    if (nextNav === 'tasks') {
      setStatusFilter('all');
      setPriorityFilter('attention');
      setShowFilters(true);
      return;
    }

    if (nextNav === 'calendar') {
      setStatusFilter('all');
      setShowFilters(false);
      return;
    }

    if (nextNav === 'trips') {
      setStatusFilter('confirmedGroup');
      setShowFilters(false);
      return;
    }

    if (nextNav === 'reports' || nextNav === 'settings') {
      setStatusFilter('all');
      setShowFilters(true);
      return;
    }

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
          requestedServices: serviceKey === 'corporate' ? 'Corporate coordination' : serviceKey === 'luxury' ? 'Concierge support' : 'Travel planning',
          tripType: serviceKey === 'corporate' ? 'Corporate travel' : serviceKey === 'luxury' ? 'Luxury / Prestige travel' : 'Leisure trip',
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
      <div className="grid min-h-screen xl:grid-cols-[244px_minmax(660px,1fr)_430px]">
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

        <section className="min-w-0 border-r border-white/10">
          <header className={`border-b px-5 py-5 ${styles.header}`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{navCopy[activeNav].title}</h1>
                <p className={`mt-1 text-sm ${styles.muted}`}>{navCopy[activeNav].subtitle}</p>
              </div>
              <div className="flex items-center gap-2">
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
                  {activeNav === 'clients' ? 'Register Client' : activeNav === 'settings' ? 'Add User' : 'New Request'}
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
                  <button type="button" onClick={signOut} className={`inline-flex h-11 items-center justify-center rounded-lg px-3 text-sm ${styles.buttonGhost}`}>
                    Sign out
                  </button>
                ) : null}
              </div>
            </div>
          </header>

          <div className="p-5">
            {crmError ? <div className="mb-4 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{crmError}</div> : null}
            {isLoadingLeads ? <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${styles.panelSoft}`}>Loading CRM requests...</div> : null}
            <div className="grid gap-4 lg:grid-cols-4">
              {(activeNav === 'settings' ? settingsMetricCards : metricCards).map((card) => (
                <button
                  key={card.label}
                  type="button"
                  onClick={() => {
                    if (card.filter) changeStatusFilter(card.filter);
                  }}
                  className={`rounded-xl border p-4 text-left transition ${
                    activeNav !== 'settings' && card.filter && statusFilter === card.filter ? `${styles.panelSoft} ring-1 ring-[#d4af37]/45` : styles.panel
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

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {typeFilters.map((filter) => (
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

              <div className="ml-auto flex min-w-[280px] flex-1 items-center justify-end gap-2">
                <label className="relative min-w-[260px] flex-1 xl:max-w-[360px]">
                  <Search className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${styles.muted}`} />
                  <input
                    value={query}
                    onChange={(event) => changeQuery(event.target.value)}
                    className={`h-11 w-full rounded-xl border pl-10 pr-4 text-sm outline-none transition ${styles.input}`}
                    placeholder="Search client, destination, date..."
                  />
                </label>
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

            {showFilters ? (
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
                    <div className={`grid grid-cols-[1.5fr_1fr_1fr_1fr_100px_84px] gap-4 border-b px-5 py-3 text-xs uppercase tracking-[0.12em] ${styles.tableHead}`}>
                      <div>Client / Request</div>
                      <div>Segment</div>
                      <div>Travel Dates</div>
                      <div>Budget</div>
                      <div>Priority</div>
                      <div className="text-right">Received</div>
                    </div>

                    {pageLeads.length === 0 ? (
                      <div className="p-10 text-center">
                        <Inbox className={`mx-auto h-10 w-10 ${styles.muted}`} />
                        <div className="mt-4 text-lg font-semibold">No requests in this queue</div>
                        <p className={`mt-2 text-sm ${styles.muted}`}>Adjust filters or submit a form to create a request.</p>
                      </div>
                    ) : (
                      pageLeads.map((lead) => {
                        const priority = fallbackPriority(lead);
                        const isSelected = selectedLead?.id === lead.id;
                        return (
                          <button
                            key={lead.id}
                            type="button"
                            onClick={() => {
                              setSelectedLeadId(lead.id);
                              setDetailTab('overview');
                            }}
                            className={`grid w-full grid-cols-[1.5fr_1fr_1fr_1fr_100px_84px] gap-4 border-b px-5 py-4 text-left transition ${
                              isSelected ? styles.rowActive : styles.row
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-4">
                              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#7a5a08] text-sm font-semibold text-white">
                                {initials(lead.name)}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold">{lead.name}</span>
                                <span className={`mt-1 block truncate text-xs ${styles.muted}`}>
                                  {leadSegment(lead)} - {lead.destination || 'Destination pending'} - {statusLabels[lead.status]}
                                </span>
                              </span>
                            </div>
                            <div className="flex items-center">
                              <span className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${styles.type[lead.serviceKey]}`}>
                                {typeLabels[lead.serviceKey]}
                              </span>
                            </div>
                            <div className="flex min-w-0 flex-col justify-center">
                              <span className={`truncate text-sm ${styles.soft}`}>{lead.dates || 'Dates pending'}</span>
                              <span className={`mt-1 truncate text-xs ${styles.muted}`}>{lead.travelers || 'Travelers pending'}</span>
                            </div>
                            <div className="flex min-w-0 flex-col justify-center">
                              <span className={`truncate text-sm ${styles.soft}`}>{lead.budget || 'Budget pending'}</span>
                              <span className={`mt-1 text-xs ${styles.muted}`}>USD</span>
                            </div>
                            <div className="flex items-center">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${styles.priority[priority]}`}>
                                <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${styles.attention[attentionLevel(lead)]}`} />
                                {priorityLabels[priority]}
                              </span>
                            </div>
                            <div className={`flex items-center justify-end text-sm ${styles.muted}`}>{formatDate(lead.createdAt)}</div>
                          </button>
                        );
                      })
                    )}
                  </>
                )}
              </div>

              <div className={`flex flex-wrap items-center justify-between gap-3 px-1 py-4 text-sm ${styles.muted}`}>
                <div>
                  {activeItems.length === 0 ? 0 : pageStart + 1}-{Math.min(pageStart + PAGE_SIZE, activeItems.length)} of {activeItems.length}{' '}
                  {activeNav === 'clients' ? 'clients' : activeNav === 'settings' ? 'users' : 'requests'}
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
        </section>

        <aside className={`hidden min-h-screen px-5 py-6 xl:block ${styles.rightPane}`}>
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
                <div className="grid grid-cols-4 items-center gap-3">
                  {workflowSteps.map(([status, label], index) => {
                    const activeIndex = selectedLead.status === 'lost' ? -1 : workflowSteps.findIndex(([step]) => step === selectedLead.status);
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
                {(['overview', 'tasks', 'notes', 'history'] as DetailTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setDetailTab(tab)}
                    className={`h-10 rounded-lg px-4 text-sm capitalize ${detailTab === tab ? styles.buttonActive : styles.buttonGhost}`}
                  >
                    {tab}
                    {tab === 'tasks' ? <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-xs text-white">{selectedTasks.length}</span> : null}
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

                {detailTab === 'tasks' ? (
                  <div className="grid gap-3">
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

                {detailTab === 'notes' ? (
                  <p className={`text-sm leading-6 ${styles.soft}`}>{selectedLead.internalNotes || 'No internal notes yet.'}</p>
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
      {showManualRequest ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/55 px-4 py-6 backdrop-blur-sm">
          <form onSubmit={submitManualRequest} className={`w-full max-w-2xl rounded-xl border p-5 shadow-2xl ${styles.panel}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className={`text-xs uppercase tracking-[0.18em] ${styles.muted}`}>Phone intake</div>
                <h2 className="mt-1 text-xl font-semibold">New request from phone call</h2>
                <p className={`mt-1 text-sm ${styles.muted}`}>Capture the essentials now and qualify the request later.</p>
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
                  <option value="corporate">Corporate</option>
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
                Create phone request
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
