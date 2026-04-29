import type { CrmClient, CrmLead, CrmManagedUser, CrmSession, CrmUser, InquiryKind, LeadLifecycleStage, LeadStatus } from '../types';

const CRM_STORAGE_KEY = 'dpm.crm.leads.v1';
const CRM_CLIENT_STORAGE_KEY = 'dpm.crm.clients.v1';
const CRM_AUTH_STORAGE_KEY = 'dpm.crm.auth.v1';
const CRM_EVENT = 'dpm-crm-leads-updated';
const CRM_CLIENT_EVENT = 'dpm-crm-clients-updated';
const CRM_AUTH_EVENT = 'dpm-crm-auth-updated';
const CRM_DEMO_VERSION_KEY = 'dpm.crm.demo.version';
const CRM_DEMO_VERSION = 'process-v3';

type CrmLeadCreateInput = Omit<CrmLead, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'emailStatus' | 'internalNotes'>;
type CrmClientCreateInput = Omit<CrmClient, 'id' | 'createdAt' | 'updatedAt' | 'lastRequestAt' | 'activeRequestCount'>;
type CrmManagedUserInput = {
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: 'admin' | 'manager' | 'agent' | 'viewer';
  isActive: boolean;
  password?: string;
};

const statusLifecycleFallback: Record<LeadStatus, LeadLifecycleStage> = {
  new: 'new_request',
  contacted: 'pending_information',
  planning: 'quote_in_progress',
  proposal: 'awaiting_approval',
  won: 'awaiting_payment_finance',
  execution: 'booking_in_progress',
  completed: 'completed',
  lost: 'closed',
};

const demoLifecycleStages: Record<string, LeadLifecycleStage> = {
  'demo-luxury-zanzibar-anniversary': 'new_request',
  'demo-corporate-bluearc-mining': 'pending_information',
  'demo-classic-cape-town-family': 'quote_in_progress',
  'demo-luxury-namibia-safari': 'travel_pack_sent',
  'demo-corporate-dubai-summit': 'awaiting_approval',
  'demo-classic-lisbon-city-break': 'closed',
  'demo-luxury-paris-fashion-week': 'validated',
  'demo-corporate-lagos-mobility': 'pending_information',
  'demo-classic-vilanculos-holiday': 'new_request',
  'demo-corporate-karingana-conference': 'awaiting_payment_finance',
  'demo-luxury-marrakech-retreat': 'confirmed',
  'demo-classic-durban-school-break': 'booking_in_progress',
};

function normalizeCrmLead(lead: CrmLead): CrmLead {
  return {
    ...lead,
    lifecycleStage: lead.lifecycleStage ?? demoLifecycleStages[lead.id] ?? statusLifecycleFallback[lead.status],
  };
}

const demoCrmLeads: CrmLead[] = [
  {
    id: 'demo-luxury-zanzibar-anniversary',
    createdAt: '2026-04-23T06:12:00.000Z',
    updatedAt: '2026-04-23T06:12:00.000Z',
    service: 'Prestige Luxury Form',
    serviceKey: 'luxury',
    name: 'Alicia Mendes',
    contact: 'alicia.mendes@email.com',
    email: 'alicia.mendes@email.com',
    whatsapp: '+258 84 421 1100',
    preferredContact: 'WhatsApp',
    requestedServices: 'Flights, Luxury hotels, Private transfers, Experiences',
    tripType: 'Anniversary trip',
    departureCity: 'Maputo',
    destination: 'Zanzibar',
    dates: '12 Jun - 18 Jun 2026',
    travelers: '2 travelers',
    budget: '$12,000 - $18,000',
    urgency: 'This week',
    priority: 'high',
    notes: 'Concierge-style request with private villa, romantic dinner planning, and premium transfers.',
    status: 'new',
    emailStatus: 'sent',
    internalNotes: 'Celebrating 10th anniversary. Prefers WhatsApp and wants one surprise premium experience built into the itinerary.',
    clientId: 'client-alicia-mendes',
    clientName: 'Alicia Mendes',
  },
  {
    id: 'demo-corporate-bluearc-mining',
    createdAt: '2026-04-23T05:40:00.000Z',
    updatedAt: '2026-04-23T05:51:00.000Z',
    service: 'Prestige Corporate Form',
    serviceKey: 'corporate',
    name: 'BlueArc Mining',
    contact: 'travel@bluearc.example',
    email: 'travel@bluearc.example',
    whatsapp: '+258 87 612 4410',
    preferredContact: 'Email',
    requestedServices: 'Flights, Hotel, Visa support, Corporate invoicing',
    tripType: 'Executive travel',
    departureCity: 'Maputo',
    destination: 'Johannesburg',
    dates: '04 May - 07 May 2026',
    travelers: '6 travelers',
    budget: 'Policy-based',
    urgency: 'As soon as possible',
    priority: 'urgent',
    notes: 'Urgent business travel request requiring policy compliance, invoice split, and flexible fare options.',
    status: 'contacted',
    emailStatus: 'sent',
    internalNotes: 'Finance requires separate billing by department. Two travelers may return on different dates.',
    clientId: 'client-bluearc-mining',
    clientName: 'BlueArc Mining',
  },
  {
    id: 'demo-classic-cape-town-family',
    createdAt: '2026-04-22T14:20:00.000Z',
    updatedAt: '2026-04-23T08:00:00.000Z',
    service: 'Classic Form',
    serviceKey: 'classic',
    name: 'Helena Sitoe',
    contact: 'helena.sitoe@email.com',
    email: 'helena.sitoe@email.com',
    whatsapp: '+351 912 345 678',
    preferredContact: 'Email',
    requestedServices: 'Flights, Hotel, Activities, Transfers',
    tripType: 'Family holiday',
    departureCity: 'Maputo',
    destination: 'Cape Town',
    dates: '19 Jul - 26 Jul 2026',
    travelers: '4 travelers',
    budget: '$3,500 - $5,000',
    urgency: 'This month',
    priority: 'normal',
    notes: 'Family leisure package with balanced budget, kid-friendly accommodation, and optional tours.',
    status: 'planning',
    emailStatus: 'sent',
    internalNotes: 'Traveling with two children. Wants Table Mountain and aquarium included as options.',
    clientId: 'client-helena-sitoe',
    clientName: 'Helena Sitoe',
  },
  {
    id: 'demo-luxury-namibia-safari',
    createdAt: '2026-04-21T09:45:00.000Z',
    updatedAt: '2026-04-23T09:15:00.000Z',
    service: 'Prestige Luxury Form',
    serviceKey: 'luxury',
    name: 'Daniel Ribeiro',
    contact: 'daniel.ribeiro@email.com',
    email: 'daniel.ribeiro@email.com',
    whatsapp: '+258 84 770 9912',
    preferredContact: 'WhatsApp',
    requestedServices: 'Luxury lodges, Private guide, Transfers, Concierge',
    tripType: 'Private safari',
    departureCity: 'Maputo',
    destination: 'Namibia',
    dates: '02 May - 09 May 2026',
    travelers: '2 travelers',
    budget: '$22,000+',
    urgency: 'This week',
    priority: 'high',
    notes: 'Confirmed premium safari with private guide, luxury lodges, and anniversary experience management.',
    status: 'execution',
    emailStatus: 'sent',
    internalNotes: 'All bookings confirmed. Needs polished itinerary PDF and discreet celebration setup.',
  },
  {
    id: 'demo-corporate-dubai-summit',
    createdAt: '2026-04-22T07:10:00.000Z',
    updatedAt: '2026-04-22T15:20:00.000Z',
    service: 'Prestige Corporate Form',
    serviceKey: 'corporate',
    name: 'Luma Capital',
    contact: 'ops@lumacapital.example',
    email: 'ops@lumacapital.example',
    whatsapp: '+258 85 100 4420',
    preferredContact: 'Email',
    requestedServices: 'Flights, Hotel, Meet-and-greet, Visa support',
    tripType: 'Investor summit',
    departureCity: 'Maputo',
    destination: 'Dubai',
    dates: '28 May - 01 Jun 2026',
    travelers: '3 travelers',
    budget: 'Corporate account',
    urgency: 'This month',
    priority: 'high',
    notes: 'Premium but policy-compliant options for an investor summit with possible return-date split.',
    status: 'proposal',
    emailStatus: 'sent',
    internalNotes: 'Follow up approval and hold negotiated fares. May need visa guidance.',
    clientId: 'client-luma-capital',
    clientName: 'Luma Capital',
  },
  {
    id: 'demo-classic-lisbon-city-break',
    createdAt: '2026-04-20T12:35:00.000Z',
    updatedAt: '2026-04-22T10:10:00.000Z',
    service: 'Classic Form',
    serviceKey: 'classic',
    name: 'Tania Biza',
    contact: 'tania.biza@email.com',
    email: 'tania.biza@email.com',
    whatsapp: '+258 86 455 2101',
    preferredContact: 'Email',
    requestedServices: 'Flights, Hotel',
    tripType: 'City break',
    departureCity: 'Maputo',
    destination: 'Lisbon',
    dates: '14 Aug - 18 Aug 2026',
    travelers: '2 travelers',
    budget: '$1,500 - $2,200',
    urgency: 'Researching options',
    priority: 'low',
    notes: 'Trip postponed by client due to leave schedule changes.',
    status: 'lost',
    emailStatus: 'sent',
    internalNotes: 'Record cancellation reason and nurture later with lower-season Lisbon offers.',
  },
  {
    id: 'demo-luxury-paris-fashion-week',
    createdAt: '2026-04-23T04:55:00.000Z',
    updatedAt: '2026-04-23T05:05:00.000Z',
    service: 'Prestige Luxury Form',
    serviceKey: 'luxury',
    name: 'Amira Patel',
    contact: 'amira.patel@email.com',
    email: 'amira.patel@email.com',
    whatsapp: '+258 84 220 9033',
    preferredContact: 'WhatsApp',
    requestedServices: 'Business class, Luxury hotel, Fine dining, VIP experiences',
    tripType: 'Fashion week',
    departureCity: 'Maputo',
    destination: 'Paris',
    dates: '24 Sep - 30 Sep 2026',
    travelers: '2 travelers',
    budget: '$18,000 - $25,000',
    urgency: 'This week',
    priority: 'high',
    notes: 'Private client wants a discreet high-touch itinerary around Paris Fashion Week.',
    status: 'contacted',
    emailStatus: 'sent',
    internalNotes: 'Check suite availability near the 8th arrondissement and reserve two fine dining options.',
    clientId: 'client-amira-patel',
    clientName: 'Amira Patel',
  },
  {
    id: 'demo-corporate-lagos-mobility',
    createdAt: '2026-04-23T03:30:00.000Z',
    updatedAt: '2026-04-23T03:30:00.000Z',
    service: 'Prestige Corporate Form',
    serviceKey: 'corporate',
    name: 'Solucoes Moveis',
    contact: 'admin@solucoesmoveis.example',
    email: 'admin@solucoesmoveis.example',
    whatsapp: '+258 82 777 1400',
    preferredContact: 'Phone',
    requestedServices: 'Flights, Visa support, Airport hotel, Corporate invoicing',
    tripType: 'Regional operations visit',
    departureCity: 'Maputo',
    destination: 'Lagos',
    dates: '06 May - 10 May 2026',
    travelers: '5 travelers',
    budget: '$7,000 - $10,000',
    urgency: 'As soon as possible',
    priority: 'urgent',
    notes: 'New corporate lead with visa sensitivity and short lead time.',
    status: 'new',
    emailStatus: 'sent',
    internalNotes: 'Prioritize visa feasibility before building the fare and hotel comparison.',
  },
  {
    id: 'demo-classic-vilanculos-holiday',
    createdAt: '2026-04-22T16:05:00.000Z',
    updatedAt: '2026-04-22T16:05:00.000Z',
    service: 'Classic Form',
    serviceKey: 'classic',
    name: 'Joao Matola',
    contact: 'joao.matola@email.com',
    email: 'joao.matola@email.com',
    whatsapp: '+258 84 518 0020',
    preferredContact: 'WhatsApp',
    requestedServices: 'Flights, Hotel, Transfers',
    tripType: 'Beach holiday',
    departureCity: 'Maputo',
    destination: 'Vilanculos',
    dates: '10 Jun - 15 Jun 2026',
    travelers: '2 travelers',
    budget: '$1,200 - $1,800',
    urgency: 'This month',
    priority: 'normal',
    notes: 'Classic beach request with budget sensitivity and flexible dates.',
    status: 'new',
    emailStatus: 'sent',
    internalNotes: 'Offer two package levels and keep transport options simple.',
  },
  {
    id: 'demo-corporate-karingana-conference',
    createdAt: '2026-04-19T10:20:00.000Z',
    updatedAt: '2026-04-23T07:30:00.000Z',
    service: 'Prestige Corporate Form',
    serviceKey: 'corporate',
    name: 'Karingana Group',
    contact: 'events@karingana.example',
    email: 'events@karingana.example',
    whatsapp: '+258 87 333 0202',
    preferredContact: 'Email',
    requestedServices: 'Flights, Hotel block, Transfers, Reporting',
    tripType: 'Team conference',
    departureCity: 'Maputo',
    destination: 'Nairobi',
    dates: '30 Sep - 03 Oct 2026',
    travelers: '10 travelers',
    budget: '$12,000 - $15,000',
    urgency: 'This month',
    priority: 'high',
    notes: 'Confirmed group travel with traveler list still changing.',
    status: 'won',
    emailStatus: 'sent',
    internalNotes: 'Payment conditions accepted. Lock room block and prepare traveler data template.',
    clientId: 'client-karingana-group',
    clientName: 'Karingana Group',
  },
  {
    id: 'demo-luxury-marrakech-retreat',
    createdAt: '2026-04-21T17:30:00.000Z',
    updatedAt: '2026-04-23T07:45:00.000Z',
    service: 'Prestige Luxury Form',
    serviceKey: 'luxury',
    name: 'Sofia Nhaca',
    contact: 'sofia.nhaca@email.com',
    email: 'sofia.nhaca@email.com',
    whatsapp: '+258 85 990 3030',
    preferredContact: 'WhatsApp',
    requestedServices: 'Luxury hotel, Spa, Private transfers, Experiences',
    tripType: 'Wellness retreat',
    departureCity: 'Maputo',
    destination: 'Marrakech',
    dates: '05 Sep - 12 Sep 2026',
    travelers: '2 travelers',
    budget: '$5,000 - $8,000',
    urgency: 'This month',
    priority: 'high',
    notes: 'Luxury wellness request focused on privacy, spa quality, and calm pacing.',
    status: 'planning',
    emailStatus: 'sent',
    internalNotes: 'Shortlist riads with spa access and private courtyard rooms.',
  },
  {
    id: 'demo-classic-durban-school-break',
    createdAt: '2026-04-18T13:15:00.000Z',
    updatedAt: '2026-04-20T09:15:00.000Z',
    service: 'Classic Form',
    serviceKey: 'classic',
    name: 'Miguel Costa',
    contact: 'miguel.costa@email.com',
    email: 'miguel.costa@email.com',
    whatsapp: '+258 82 444 8822',
    preferredContact: 'Phone',
    requestedServices: 'Flights, Hotel, Car rental',
    tripType: 'School break',
    departureCity: 'Maputo',
    destination: 'Durban',
    dates: '03 Aug - 09 Aug 2026',
    travelers: '3 travelers',
    budget: '$2,000 - $3,000',
    urgency: 'Researching options',
    priority: 'low',
    notes: 'Flexible family request; client is still comparing school break dates.',
    status: 'completed',
    emailStatus: 'sent',
    internalNotes: 'Trip completed successfully. Ask for testimonial and repeat travel preferences.',
  },
];

const demoCrmClients: CrmClient[] = [
  {
    id: 'client-alicia-mendes',
    createdAt: '2026-04-23T06:12:00.000Z',
    updatedAt: '2026-04-23T06:12:00.000Z',
    name: 'Alicia Mendes',
    clientType: 'private',
    companyName: '',
    email: 'alicia.mendes@email.com',
    phone: '+258 84 421 1100',
    preferredContact: 'WhatsApp',
    serviceLevel: 'luxury',
    owner: 'Nadia Cossa',
    notes: 'Anniversary traveler who values villa privacy, seamless transfers, and discreet concierge support.',
    lastRequestAt: '2026-04-23T06:12:00.000Z',
    activeRequestCount: 1,
  },
  {
    id: 'client-bluearc-mining',
    createdAt: '2026-04-23T05:40:00.000Z',
    updatedAt: '2026-04-23T05:51:00.000Z',
    name: 'BlueArc Mining',
    clientType: 'corporate',
    companyName: 'BlueArc Mining',
    email: 'travel@bluearc.example',
    phone: '+258 87 612 4410',
    preferredContact: 'Email',
    serviceLevel: 'corporate',
    owner: 'Carlos Mavie',
    notes: 'Corporate account with invoice-split and policy-compliance sensitivity.',
    lastRequestAt: '2026-04-23T05:40:00.000Z',
    activeRequestCount: 1,
  },
  {
    id: 'client-helena-sitoe',
    createdAt: '2026-04-22T14:20:00.000Z',
    updatedAt: '2026-04-23T08:00:00.000Z',
    name: 'Helena Sitoe',
    clientType: 'private',
    companyName: '',
    email: 'helena.sitoe@email.com',
    phone: '+351 912 345 678',
    preferredContact: 'Email',
    serviceLevel: 'classic',
    owner: 'Marta Lopes',
    notes: 'Family travel profile with preference for practical planning and child-friendly experiences.',
    lastRequestAt: '2026-04-22T14:20:00.000Z',
    activeRequestCount: 1,
  },
  {
    id: 'client-luma-capital',
    createdAt: '2026-04-22T07:10:00.000Z',
    updatedAt: '2026-04-22T15:20:00.000Z',
    name: 'Luma Capital',
    clientType: 'corporate',
    companyName: 'Luma Capital',
    email: 'ops@lumacapital.example',
    phone: '+258 85 100 4420',
    preferredContact: 'Email',
    serviceLevel: 'corporate',
    owner: 'Carlos Mavie',
    notes: 'Executive account needing premium presentation with policy control.',
    lastRequestAt: '2026-04-22T07:10:00.000Z',
    activeRequestCount: 1,
  },
  {
    id: 'client-amira-patel',
    createdAt: '2026-04-23T04:55:00.000Z',
    updatedAt: '2026-04-23T05:05:00.000Z',
    name: 'Amira Patel',
    clientType: 'private',
    companyName: '',
    email: 'amira.patel@email.com',
    phone: '+258 84 220 9033',
    preferredContact: 'WhatsApp',
    serviceLevel: 'luxury',
    owner: 'Nadia Cossa',
    notes: 'Private client profile for luxury city travel with VIP dining and experience preferences.',
    lastRequestAt: '2026-04-23T04:55:00.000Z',
    activeRequestCount: 1,
  },
  {
    id: 'client-karingana-group',
    createdAt: '2026-04-19T10:20:00.000Z',
    updatedAt: '2026-04-23T07:30:00.000Z',
    name: 'Karingana Group',
    clientType: 'corporate',
    companyName: 'Karingana Group',
    email: 'events@karingana.example',
    phone: '+258 87 333 0202',
    preferredContact: 'Email',
    serviceLevel: 'corporate',
    owner: 'Carlos Mavie',
    notes: 'Conference and group-movement account with changing traveler lists.',
    lastRequestAt: '2026-04-19T10:20:00.000Z',
    activeRequestCount: 1,
  },
];

function hasStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `lead-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function notifyCrmUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CRM_EVENT));
  }
}

function notifyCrmClientsUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CRM_CLIENT_EVENT));
  }
}

function notifyCrmAuthUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CRM_AUTH_EVENT));
  }
}

function crmApiBase() {
  const raw = import.meta.env.VITE_CRM_API_URL?.toString().trim();
  return raw ? raw.replace(/\/$/, '') : '';
}

export function hasCrmApi() {
  return Boolean(crmApiBase());
}

function authHeaders(session?: CrmSession | null): Record<string, string> {
  return session?.token ? { Authorization: `Token ${session.token}` } : {};
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `CRM API request failed (${response.status})`;
    try {
      const body = await response.json();
      message = body.detail || body.non_field_errors?.[0] || body.error || message;
    } catch {
      // Keep the status-based message when the response is not JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function readCrmSession(): CrmSession | null {
  if (!hasStorage()) return null;

  try {
    const raw = window.localStorage.getItem(CRM_AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CrmSession) : null;
  } catch {
    return null;
  }
}

export function saveCrmSession(session: CrmSession) {
  if (!hasStorage()) return;
  window.localStorage.setItem(CRM_AUTH_STORAGE_KEY, JSON.stringify(session));
  notifyCrmAuthUpdated();
}

export function clearCrmSession() {
  if (!hasStorage()) return;
  window.localStorage.removeItem(CRM_AUTH_STORAGE_KEY);
  notifyCrmAuthUpdated();
}

export function canAccessCrm(user?: CrmUser | null) {
  return Boolean(user?.canAccessCrm);
}

export function canManageClients(user?: CrmUser | null) {
  return Boolean(user?.canManageClients);
}

export function canManageUsers(user?: CrmUser | null) {
  return Boolean(user?.canManageUsers);
}

export async function loginCrm(username: string, password: string) {
  const base = crmApiBase();
  if (!base) throw new Error('CRM API URL is not configured.');

  const session = await parseApiResponse<CrmSession>(
    await fetch(`${base}/api/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }),
  );
  saveCrmSession(session);
  return session;
}

export async function logoutCrm(session: CrmSession | null) {
  const base = crmApiBase();
  if (base && session?.token) {
    try {
      await fetch(`${base}/api/auth/logout/`, {
        method: 'POST',
        headers: authHeaders(session),
      });
    } catch {
      // Local sign-out should still happen if the network is unavailable.
    }
  }
  clearCrmSession();
}

export async function fetchCrmCurrentUser(session?: CrmSession | null): Promise<CrmUser | null> {
  const base = crmApiBase();
  if (!base || !session?.token) return null;

  return parseApiResponse<CrmUser>(
    await fetch(`${base}/api/auth/me/`, {
      headers: authHeaders(session),
    }),
  );
}

export function readCrmLeads(): CrmLead[] {
  if (!hasStorage()) return [];

  try {
    const raw = window.localStorage.getItem(CRM_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CrmLead[]).map(normalizeCrmLead) : [];
  } catch {
    return [];
  }
}

export function readCrmClients(): CrmClient[] {
  if (!hasStorage()) return [];

  try {
    const raw = window.localStorage.getItem(CRM_CLIENT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCrmLeads(leads: CrmLead[]) {
  if (!hasStorage()) return;
  window.localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(leads));
  notifyCrmUpdated();
}

function writeCrmClients(clients: CrmClient[]) {
  if (!hasStorage()) return;
  window.localStorage.setItem(CRM_CLIENT_STORAGE_KEY, JSON.stringify(clients));
  notifyCrmClientsUpdated();
}

export function ensureCrmDemoLeads(): CrmLead[] {
  if (!hasStorage()) return demoCrmLeads;

  const leads = readCrmLeads();
  if (window.localStorage.getItem(CRM_DEMO_VERSION_KEY) === CRM_DEMO_VERSION && leads.length > 0) return leads;

  const demoLeadById = new Map(demoCrmLeads.map((lead) => [lead.id, normalizeCrmLead(lead)]));
  const refreshedExistingLeads = leads.map((lead) => {
    const demoLead = demoLeadById.get(lead.id);
    if (!demoLead) return normalizeCrmLead(lead);
    return normalizeCrmLead({ ...demoLead, ...lead, lifecycleStage: lead.lifecycleStage ?? demoLead.lifecycleStage });
  });
  const existingIds = new Set(refreshedExistingLeads.map((lead) => lead.id));
  const mergedLeads = [...refreshedExistingLeads, ...demoCrmLeads.filter((lead) => !existingIds.has(lead.id)).map(normalizeCrmLead)].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  window.localStorage.setItem(CRM_DEMO_VERSION_KEY, CRM_DEMO_VERSION);
  writeCrmLeads(mergedLeads);
  return mergedLeads;
}

export function ensureCrmDemoClients(): CrmClient[] {
  if (!hasStorage()) return demoCrmClients;

  const clients = readCrmClients();
  if (window.localStorage.getItem(CRM_DEMO_VERSION_KEY) === CRM_DEMO_VERSION && clients.length > 0) return clients;

  const existingIds = new Set(clients.map((client) => client.id));
  const mergedClients = [...clients, ...demoCrmClients.filter((client) => !existingIds.has(client.id))].sort((a, b) => a.name.localeCompare(b.name));
  writeCrmClients(mergedClients);
  return mergedClients;
}

export function createCrmLead(input: CrmLeadCreateInput) {
  const now = new Date().toISOString();
  const lead: CrmLead = {
    ...input,
    id: createId(),
    createdAt: now,
    updatedAt: now,
    status: 'new',
    lifecycleStage: 'new_request',
    emailStatus: 'pending',
    internalNotes: '',
  };

  writeCrmLeads([lead, ...readCrmLeads()]);
  return lead;
}

export function createCrmClient(input: CrmClientCreateInput) {
  const now = new Date().toISOString();
  const client: CrmClient = {
    ...input,
    id: createId(),
    createdAt: now,
    updatedAt: now,
    lastRequestAt: now,
    activeRequestCount: 0,
  };

  writeCrmClients([client, ...readCrmClients()]);
  return client;
}

export function updateCrmLead(id: string, patch: Partial<Omit<CrmLead, 'id' | 'createdAt'>>) {
  const leads = readCrmLeads();
  writeCrmLeads(
    leads.map((lead) =>
      lead.id === id
        ? {
            ...lead,
            ...patch,
            updatedAt: new Date().toISOString(),
          }
        : lead,
    ),
  );
}

export function updateCrmClient(id: string, patch: Partial<Omit<CrmClient, 'id' | 'createdAt'>>) {
  const clients = readCrmClients();
  writeCrmClients(
    clients.map((client) =>
      client.id === id
        ? {
            ...client,
            ...patch,
            updatedAt: new Date().toISOString(),
          }
        : client,
    ),
  );
}

export function deleteCrmLead(id: string) {
  writeCrmLeads(readCrmLeads().filter((lead) => lead.id !== id));
}

export async function fetchCrmLeads(session?: CrmSession | null): Promise<CrmLead[]> {
  const base = crmApiBase();
  if (!base) return ensureCrmDemoLeads();
  if (!session?.token) return [];

  return (await parseApiResponse<CrmLead[]>(
    await fetch(`${base}/api/leads/`, {
      headers: authHeaders(session),
    }),
  )).map(normalizeCrmLead);
}

export async function fetchCrmClients(session?: CrmSession | null): Promise<CrmClient[]> {
  const base = crmApiBase();
  if (!base) return ensureCrmDemoClients();
  if (!session?.token) return [];

  return parseApiResponse<CrmClient[]>(
    await fetch(`${base}/api/clients/`, {
      headers: authHeaders(session),
    }),
  );
}

export async function fetchCrmUsers(session?: CrmSession | null): Promise<CrmManagedUser[]> {
  const base = crmApiBase();
  if (!base || !session?.token) return [];

  return parseApiResponse<CrmManagedUser[]>(
    await fetch(`${base}/api/users/`, {
      headers: authHeaders(session),
    }),
  );
}

export async function createCrmLeadRecord(input: CrmLeadCreateInput, session?: CrmSession | null): Promise<CrmLead> {
  const base = crmApiBase();
  if (!base) return createCrmLead(input);

  const endpoint = session?.token ? `${base}/api/leads/` : `${base}/api/public/leads/`;
  return normalizeCrmLead(await parseApiResponse<CrmLead>(
    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(session),
      },
      body: JSON.stringify(input),
    }),
  ));
}

export async function createCrmClientRecord(input: CrmClientCreateInput, session?: CrmSession | null): Promise<CrmClient> {
  const base = crmApiBase();
  if (!base || !session?.token) return createCrmClient(input);

  return parseApiResponse<CrmClient>(
    await fetch(`${base}/api/clients/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(session),
      },
      body: JSON.stringify(input),
    }),
  );
}

export async function updateCrmLeadRecord(
  id: string,
  patch: Partial<Omit<CrmLead, 'id' | 'createdAt'>>,
  session?: CrmSession | null,
): Promise<CrmLead | null> {
  const base = crmApiBase();
  if (!base || !session?.token) {
    updateCrmLead(id, patch);
    return readCrmLeads().find((lead) => lead.id === id) ?? null;
  }

  return normalizeCrmLead(await parseApiResponse<CrmLead>(
    await fetch(`${base}/api/leads/${id}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(session),
      },
      body: JSON.stringify(patch),
    }),
  ));
}

export async function updateCrmClientRecord(
  id: string,
  patch: Partial<Omit<CrmClient, 'id' | 'createdAt'>>,
  session?: CrmSession | null,
): Promise<CrmClient | null> {
  const base = crmApiBase();
  if (!base || !session?.token) {
    updateCrmClient(id, patch);
    return readCrmClients().find((client) => client.id === id) ?? null;
  }

  return parseApiResponse<CrmClient>(
    await fetch(`${base}/api/clients/${id}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(session),
      },
      body: JSON.stringify(patch),
    }),
  );
}

export async function createCrmUserRecord(input: CrmManagedUserInput, session?: CrmSession | null): Promise<CrmManagedUser> {
  const base = crmApiBase();
  if (!base || !session?.token) {
    throw new Error('CRM API URL is not configured for user management.');
  }

  return parseApiResponse<CrmManagedUser>(
    await fetch(`${base}/api/users/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(session),
      },
      body: JSON.stringify(input),
    }),
  );
}

export async function updateCrmUserRecord(
  id: number,
  patch: Partial<CrmManagedUserInput>,
  session?: CrmSession | null,
): Promise<CrmManagedUser> {
  const base = crmApiBase();
  if (!base || !session?.token) {
    throw new Error('CRM API URL is not configured for user management.');
  }

  return parseApiResponse<CrmManagedUser>(
    await fetch(`${base}/api/users/${id}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(session),
      },
      body: JSON.stringify(patch),
    }),
  );
}

export async function deleteCrmLeadRecord(id: string, session?: CrmSession | null) {
  const base = crmApiBase();
  if (!base || !session?.token) {
    deleteCrmLead(id);
    return;
  }

  await parseApiResponse<void>(
    await fetch(`${base}/api/leads/${id}/`, {
      method: 'DELETE',
      headers: authHeaders(session),
    }),
  );
}

export function emptyClientRegistration(defaults?: Partial<CrmClientCreateInput>): CrmClientCreateInput {
  return {
    name: '',
    clientType: 'private',
    companyName: '',
    email: '',
    phone: '',
    preferredContact: '',
    serviceLevel: 'classic',
    owner: '',
    notes: '',
    ...defaults,
  };
}

export function makeClientFromLead(lead: CrmLead): CrmClientCreateInput {
  const serviceLevel = lead.serviceKey as InquiryKind;
  return {
    name: lead.name,
    clientType: serviceLevel === 'corporate' ? 'corporate' : 'private',
    companyName: serviceLevel === 'corporate' ? lead.name : '',
    email: lead.email,
    phone: lead.whatsapp,
    preferredContact: lead.preferredContact,
    serviceLevel,
    owner: serviceLevel === 'luxury' ? 'Nadia Cossa' : serviceLevel === 'corporate' ? 'Carlos Mavie' : 'Marta Lopes',
    notes: lead.notes,
  };
}

export { CRM_AUTH_EVENT, CRM_CLIENT_EVENT, CRM_EVENT };
