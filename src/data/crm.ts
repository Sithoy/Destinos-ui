import type { CrmLead } from '../types';

const CRM_STORAGE_KEY = 'dpm.crm.leads.v1';
const CRM_EVENT = 'dpm-crm-leads-updated';
const CRM_DEMO_VERSION_KEY = 'dpm.crm.demo.version';
const CRM_DEMO_VERSION = 'process-v1';

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

export function readCrmLeads(): CrmLead[] {
  if (!hasStorage()) return [];

  try {
    const raw = window.localStorage.getItem(CRM_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function ensureCrmDemoLeads(): CrmLead[] {
  if (!hasStorage()) return demoCrmLeads;

  const leads = readCrmLeads();
  if (window.localStorage.getItem(CRM_DEMO_VERSION_KEY) === CRM_DEMO_VERSION) return leads;

  const existingIds = new Set(leads.map((lead) => lead.id));
  const mergedLeads = [...leads, ...demoCrmLeads.filter((lead) => !existingIds.has(lead.id))].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  window.localStorage.setItem(CRM_DEMO_VERSION_KEY, CRM_DEMO_VERSION);
  writeCrmLeads(mergedLeads);
  return mergedLeads;
}

function writeCrmLeads(leads: CrmLead[]) {
  if (!hasStorage()) return;
  window.localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(leads));
  notifyCrmUpdated();
}

export function createCrmLead(input: Omit<CrmLead, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'emailStatus' | 'internalNotes'>) {
  const now = new Date().toISOString();
  const lead: CrmLead = {
    ...input,
    id: createId(),
    createdAt: now,
    updatedAt: now,
    status: 'new',
    emailStatus: 'pending',
    internalNotes: '',
  };

  writeCrmLeads([lead, ...readCrmLeads()]);
  return lead;
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

export function deleteCrmLead(id: string) {
  writeCrmLeads(readCrmLeads().filter((lead) => lead.id !== id));
}

export { CRM_EVENT };
