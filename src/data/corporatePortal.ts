import type {
  CorporateCostBand,
  CorporatePortalCompany,
  CorporatePortalStat,
  CorporatePortalUser,
  CorporateServiceType,
  CorporateTimelineEvent,
  CorporateTripRequest,
  CorporateTripStatus,
} from '../types/corporatePortal';

export const corporatePortalCompany: CorporatePortalCompany = {
  id: 'company-mozal-operations',
  name: 'Mozal Operations',
  descriptor: 'Corporate Travel Platform',
};

export const corporatePortalUser: CorporatePortalUser = {
  id: 'company-user-travel-desk',
  name: 'Travel Desk',
  role: 'travel_coordinator',
  companyId: corporatePortalCompany.id,
};

export const corporateDepartments = ['Finance', 'Maintenance', 'Procurement', 'Operations', 'Executive Office'];

export const corporateServiceCatalog: CorporateServiceType[] = ['Flight', 'Hotel', 'Transfer', 'Visa support'];

export const corporateCostBands: CorporateCostBand[] = [
  { key: 'lt1k', label: '< $1,000', approval: 'Manager optional', estimate: 800 },
  { key: '1k_5k', label: '$1,000 - $5,000', approval: 'Manager approval', estimate: 3000 },
  { key: 'gt5k', label: '> $5,000', approval: 'Finance approval', estimate: 7000 },
];

function costBand(key: CorporateCostBand['key']) {
  return corporateCostBands.find((item) => item.key === key) ?? corporateCostBands[0];
}

export function getCorporateCurrentTripCost(trip: CorporateTripRequest) {
  return trip.finalCost ?? trip.quotedCost ?? costBand(trip.budgetBand).estimate;
}

function currency(value?: number) {
  return value ? `$${value.toLocaleString('en-US')}` : '-';
}

export const corporateTripRequests: CorporateTripRequest[] = [
  {
    id: 'DPM-2418',
    requestedBy: 'Travel Desk',
    requesterRole: 'travel_coordinator',
    department: 'Finance',
    route: 'Maputo -> Johannesburg',
    origin: 'Maputo',
    destination: 'Johannesburg',
    travelDate: '26 Apr 2026',
    status: 'Pending approval',
    budgetBand: 'lt1k',
    services: ['Flight', 'Transfer'],
    purpose: 'Quarterly finance audit meeting',
    payments: [],
    internalSummary: 'Need-level approval pending before DPM validates the supplier mix and final quote.',
    travelers: [
      {
        id: 'traveler-ana-matusse',
        name: 'Ana Matusse',
        department: 'Finance',
        email: 'ana.matusse@mozal.example',
        phone: '+258 84 444 1001',
        readiness: { passport: 'OK', visa: 'N/A' },
      },
      {
        id: 'traveler-joao-paulo',
        name: 'Joao Paulo',
        department: 'Finance',
        email: 'joao.paulo@mozal.example',
        phone: '+258 84 444 1002',
        readiness: { passport: 'OK', visa: 'N/A' },
      },
    ],
    approvals: [
      { stage: 'Travel need', approver: 'Helena Sitoe', status: 'Pending' },
      { stage: 'Final cost', approver: 'Finance Controller', status: 'Pending' },
    ],
    timeline: [
      { id: 'tl-2418-1', title: 'Group request created', meta: 'Travel Desk - 2 travelers - Finance', time: '09:40', type: 'done' },
      { id: 'tl-2418-2', title: 'Approval requested', meta: 'Awaiting manager review', time: '10:15', type: 'pending' },
    ],
  },
  {
    id: 'DPM-2419',
    requestedBy: 'Carlos Nhantumbo',
    requesterRole: 'employee',
    department: 'Maintenance',
    route: 'Maputo -> Cape Town',
    origin: 'Maputo',
    destination: 'Cape Town',
    travelDate: '28 Apr 2026',
    status: 'Booked',
    budgetBand: '1k_5k',
    quotedCost: 1240,
    finalCost: 1215,
    services: ['Flight', 'Hotel', 'Transfer'],
    purpose: 'OEM technical training',
    payments: [],
    internalSummary: 'Trip booked and cost locked. DPM is preparing the final itinerary package.',
    travelers: [
      {
        id: 'traveler-carlos-nhantumbo',
        name: 'Carlos Nhantumbo',
        department: 'Maintenance',
        email: 'carlos.nhantumbo@mozal.example',
        phone: '+258 84 444 2001',
        readiness: { passport: 'OK', visa: 'N/A' },
      },
    ],
    approvals: [
      { stage: 'Travel need', approver: 'Plant Manager', status: 'Approved' },
      { stage: 'Final cost', approver: 'Plant Manager', status: 'Approved' },
    ],
    timeline: [
      { id: 'tl-2419-1', title: 'Request approved', meta: 'Need approved by plant manager', time: '08:35', type: 'done' },
      { id: 'tl-2419-2', title: 'DPM quote accepted', meta: 'Validated quote accepted by coordinator', time: '09:20', type: 'done' },
      { id: 'tl-2419-3', title: 'Trip booked', meta: 'Flights, hotel and transfers confirmed', time: '11:10', type: 'done' },
    ],
  },
  {
    id: 'DPM-2420',
    requestedBy: 'Procurement Travel Desk',
    requesterRole: 'travel_coordinator',
    department: 'Procurement',
    route: 'Maputo -> Dubai',
    origin: 'Maputo',
    destination: 'Dubai',
    travelDate: '02 May 2026',
    status: 'Needs documents',
    budgetBand: 'gt5k',
    quotedCost: 4980,
    services: ['Flight', 'Hotel', 'Visa support'],
    purpose: 'Supplier negotiation visit',
    payments: [],
    internalSummary: 'Quote is ready, but missing passport documentation is blocking final booking confirmation.',
    travelers: [
      {
        id: 'traveler-marta-chissano',
        name: 'Marta Chissano',
        department: 'Procurement',
        email: 'marta.chissano@mozal.example',
        phone: '+258 84 444 3001',
        readiness: { passport: 'Missing', visa: 'Required' },
      },
      {
        id: 'traveler-edson-macamo',
        name: 'Edson Macamo',
        department: 'Procurement',
        email: 'edson.macamo@mozal.example',
        phone: '+258 84 444 3002',
        readiness: { passport: 'OK', visa: 'Required' },
      },
      {
        id: 'traveler-lina-mabunda',
        name: 'Lina Mabunda',
        department: 'Procurement',
        email: 'lina.mabunda@mozal.example',
        phone: '+258 84 444 3003',
        readiness: { passport: 'OK', visa: 'Required' },
      },
    ],
    approvals: [
      { stage: 'Travel need', approver: 'Procurement Manager', status: 'Approved' },
      { stage: 'Final cost', approver: 'Finance Controller', status: 'Pending' },
    ],
    timeline: [
      { id: 'tl-2420-1', title: 'Group request submitted', meta: '3 travelers - Dubai supplier visit', time: '09:05', type: 'done' },
      { id: 'tl-2420-2', title: 'Visa document missing', meta: 'Passport scan needed for Marta Chissano', time: '11:20', type: 'alert' },
      { id: 'tl-2420-3', title: 'DPM quote prepared', meta: 'Awaiting final approval after docs are complete', time: '13:10', type: 'pending' },
    ],
  },
];

export const corporateActivityTimeline: CorporateTimelineEvent[] = [
  { id: 'activity-1', title: 'Approval requested', meta: 'DPM-2418 - Awaiting manager review', time: '10:15', type: 'pending' },
  { id: 'activity-2', title: 'Trip booked', meta: 'DPM-2419 - Cape Town training confirmed', time: '11:10', type: 'done' },
  { id: 'activity-3', title: 'Missing passport scan', meta: 'DPM-2420 - Marta Chissano', time: '11:20', type: 'alert' },
];

export const corporatePortalStats: CorporatePortalStat[] = [
  { id: 'spend', label: 'Controlled spend', value: currency(corporateTripRequests.reduce((sum, trip) => sum + getCorporateCurrentTripCost(trip), 0)), hint: 'Budget range -> quote -> final cost', tone: 'gold' },
  { id: 'travelers', label: 'Travelers managed', value: String(corporateTripRequests.reduce((sum, trip) => sum + trip.travelers.length, 0)), hint: 'Across current group requests', tone: 'sky' },
  { id: 'pendingApprovals', label: 'Pending approvals', value: String(corporateTripRequests.filter((trip) => trip.status === 'Pending approval' || trip.status === 'Final approval').length), hint: 'Need and cost approvals', tone: 'emerald' },
  { id: 'documentAlerts', label: 'Document alerts', value: String(corporateTripRequests.reduce((sum, trip) => sum + trip.travelers.filter((traveler) => traveler.readiness.passport === 'Missing' || traveler.readiness.visa === 'Required').length, 0)), hint: 'Passport or visa action needed', tone: 'amber' },
];

export function getCorporateTripRequestById(id: string) {
  return corporateTripRequests.find((trip) => trip.id === id) ?? corporateTripRequests[0];
}

export function getCorporateRequestsByStatus(status?: CorporateTripStatus) {
  return status ? corporateTripRequests.filter((trip) => trip.status === status) : corporateTripRequests;
}
