import type { CrmLead, InquiryKind } from '../../../types';

export type BriefingDecision = 'approved' | 'moreInfo' | 'cancelled';

export type BriefingTemplateDraft = {
  purpose: string;
  successDefinition: string;
  travelStyle: string;
  pace: string;
  accommodationLevel: string;
  roomPreferences: string;
  routePreferences: string;
  dateFlexibility: string;
  travelerProfile: string;
  specialRequirements: string;
  budgetFlexibility: string;
  decisionPriority: string;
  servicesNeeded: string;
  flightRequirements: string;
  accommodationRequirements: string;
  groundTransport: string;
  visaDocuments: string;
  billingRequirements: string;
  approvalRequirements: string;
  quoteOutput: string;
  assumptionsExclusions: string;
  validationQuestions: string;
};

export type BriefingChecklistItem = {
  label: string;
  ready: boolean;
  detail: string;
};

export type BriefingReadiness = {
  items: BriefingChecklistItem[];
  readyCount: number;
  total: number;
  canApprove: boolean;
};

const leadTypeLabels: Record<InquiryKind, string> = {
  classic: 'Classic',
  luxury: 'Luxury',
  corporate: 'Corporate',
};

export function hasBriefingValue(value?: string | null) {
  const text = (value ?? '').trim().toLowerCase();
  if (!text) return false;
  return !['pending', 'date pending', 'dates pending', 'budget pending', 'not captured', 'not captured yet', '-'].includes(text);
}

export function briefingChecklistItems(lead: CrmLead) {
  if (lead.serviceKey === 'corporate') {
    return [
      {
        label: 'Company contact',
        ready: hasBriefingValue(lead.email) || hasBriefingValue(lead.whatsapp) || hasBriefingValue(lead.contact),
        detail: lead.email || lead.whatsapp || lead.contact || 'Missing company coordinator contact.',
      },
      {
        label: 'Business purpose',
        ready: hasBriefingValue(lead.tripType) || hasBriefingValue(lead.notes),
        detail: lead.tripType || lead.notes || 'Capture why the company movement is needed.',
      },
      {
        label: 'Route / cities',
        ready: hasBriefingValue(lead.destination) || hasBriefingValue(lead.departureCity),
        detail: [lead.departureCity, lead.destination].filter(Boolean).join(' to ') || 'Capture origin, destination, and any intermediate cities.',
      },
      {
        label: 'Travel window',
        ready: hasBriefingValue(lead.dates),
        detail: lead.dates || 'Confirm fixed or flexible corporate travel dates.',
      },
      {
        label: 'Traveler scope',
        ready: hasBriefingValue(lead.travelers),
        detail: lead.travelers || 'Confirm traveler count, names, departments, and readiness.',
      },
      {
        label: 'Service scope',
        ready: hasBriefingValue(lead.requestedServices) || hasBriefingValue(lead.notes),
        detail: lead.requestedServices || lead.notes || 'Capture flights, hotels, transfers, visa, billing, and support needs.',
      },
      {
        label: 'Budget / policy',
        ready: hasBriefingValue(lead.budget),
        detail: lead.budget || 'Capture policy limits, budget band, PO, cost center, or invoice posture.',
      },
      {
        label: 'Corporate brief saved',
        ready: (lead.internalNotes || '').includes('[Corporate validation brief]'),
        detail: (lead.internalNotes || '').includes('[Corporate validation brief]') ? 'Structured corporate brief saved.' : 'Save the corporate brief before quotation starts.',
      },
    ];
  }

  return [
    {
      label: 'Contact channel',
      ready: hasBriefingValue(lead.email) || hasBriefingValue(lead.whatsapp) || hasBriefingValue(lead.contact),
      detail: lead.email || lead.whatsapp || lead.contact || 'Missing email or phone.',
    },
    {
      label: 'Destination / route idea',
      ready: hasBriefingValue(lead.destination) || hasBriefingValue(lead.notes),
      detail: lead.destination || 'Capture the route, destination, or travel intent.',
    },
    {
      label: 'Travel window',
      ready: hasBriefingValue(lead.dates),
      detail: lead.dates || 'Capture approximate or fixed travel dates.',
    },
    {
      label: 'Traveler scope',
      ready: hasBriefingValue(lead.travelers),
      detail: lead.travelers || 'Capture number of travelers or traveler list shape.',
    },
    {
      label: 'Budget posture',
      ready: hasBriefingValue(lead.budget),
      detail: lead.budget || 'Capture a budget range or buying posture.',
    },
    {
      label: 'Service expectation',
      ready: hasBriefingValue(lead.requestedServices) || hasBriefingValue(lead.notes),
      detail: lead.requestedServices || lead.notes || 'Capture what DPM is expected to solve.',
    },
  ];
}

export function briefingReadiness(lead: CrmLead): BriefingReadiness {
  const items = briefingChecklistItems(lead);
  const readyCount = items.filter((item) => item.ready).length;
  return {
    items,
    readyCount,
    total: items.length,
    canApprove: lead.serviceKey === 'corporate' ? readyCount >= 8 : readyCount >= 5,
  };
}

export function appendBriefingDecisionNote(lead: CrmLead, decision: BriefingDecision, detail: string) {
  const decisionLabels: Record<BriefingDecision, string> = {
    approved: 'Approved for Trip Design',
    moreInfo: 'More information requested',
    cancelled: 'Request cancelled',
  };
  const stamp = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());
  const decisionNote = `[Briefing ${stamp}] ${decisionLabels[decision]}${detail ? ` - ${detail}` : ''}`;
  return [lead.internalNotes?.trim(), decisionNote].filter(Boolean).join('\n\n');
}

export function emptyBriefingTemplateDraft(lead?: CrmLead | null): BriefingTemplateDraft {
  const isCorporate = lead?.serviceKey === 'corporate';
  return {
    purpose: lead?.tripType || '',
    successDefinition: '',
    travelStyle: lead?.serviceKey === 'luxury' ? 'Luxury / premium comfort' : isCorporate ? 'Efficient business travel' : '',
    pace: '',
    accommodationLevel: lead?.serviceKey === 'luxury' ? 'Premium / luxury' : isCorporate ? 'Business hotel / policy compliant' : '',
    roomPreferences: '',
    routePreferences: lead?.destination || '',
    dateFlexibility: lead?.dates || '',
    travelerProfile: lead?.travelers || '',
    specialRequirements: '',
    budgetFlexibility: lead?.budget || '',
    decisionPriority: isCorporate ? 'Policy fit, timing, total cost, traveler convenience' : '',
    servicesNeeded: lead?.requestedServices || '',
    flightRequirements: isCorporate ? 'Preferred airports, schedule windows, fare flexibility, baggage, class of service' : '',
    accommodationRequirements: isCorporate ? 'Hotel location, policy level, room type, check-in/check-out constraints' : '',
    groundTransport: isCorporate ? 'Airport transfers, office transfers, driver/security needs, meet-and-greet' : '',
    visaDocuments: isCorporate ? 'Passport validity, visa needs, invitation letters, insurance, traveler document gaps' : '',
    billingRequirements: isCorporate ? 'Cost center, PO, invoice recipient, tax details, payment terms' : '',
    approvalRequirements: isCorporate ? 'Travel owner, finance approver, decision deadline, quote approval channel' : '',
    quoteOutput: isCorporate ? 'Line-item quote with flights, hotels, transfers, visa/support fees, taxes, validity, assumptions' : '',
    assumptionsExclusions: '',
    validationQuestions: isCorporate
      ? 'Please confirm traveler names, route, dates, flight/hotel policy, document readiness, billing details, approval owner, and quote format before DPM prepares the quote.'
      : 'Please confirm if this brief is correct, or tell us what should change before DPM starts trip design.',
  };
}

export function briefingValidationSummary(lead: CrmLead, draft: BriefingTemplateDraft) {
  if (lead.serviceKey === 'corporate') {
    return [
      `Corporate travel brief - ${lead.name}`,
      '',
      'Movement context',
      `Business purpose: ${draft.purpose || lead.tripType || lead.notes || 'To confirm'}`,
      `Success criteria: ${draft.successDefinition || 'To confirm'}`,
      `Route / cities: ${draft.routePreferences || lead.destination || 'To confirm'}`,
      `Travel dates: ${lead.dates || 'To confirm'} (${draft.dateFlexibility || 'Flexibility to confirm'})`,
      `Traveler scope: ${draft.travelerProfile || lead.travelers || 'To confirm'}`,
      '',
      'Quote input requirements',
      `Flights: ${draft.flightRequirements || draft.travelStyle || 'To confirm'}`,
      `Hotels / accommodation: ${draft.accommodationRequirements || draft.accommodationLevel || 'To confirm'}`,
      `Room requirements: ${draft.roomPreferences || 'To confirm'}`,
      `Ground transport: ${draft.groundTransport || 'To confirm'}`,
      `Visa / documents / insurance: ${draft.visaDocuments || 'To confirm'}`,
      `DPM services in scope: ${draft.servicesNeeded || lead.requestedServices || 'To confirm'}`,
      `Special requirements or risks: ${draft.specialRequirements || 'None captured yet'}`,
      '',
      'Commercial and approval controls',
      `Budget / policy / PO: ${lead.budget || 'To confirm'}${draft.budgetFlexibility ? ` - ${draft.budgetFlexibility}` : ''}`,
      `Billing requirements: ${draft.billingRequirements || 'To confirm'}`,
      `Approval requirements: ${draft.approvalRequirements || draft.decisionPriority || 'To confirm'}`,
      `Quote output expected: ${draft.quoteOutput || 'To confirm'}`,
      `Assumptions / exclusions: ${draft.assumptionsExclusions || 'None captured yet'}`,
      '',
      'Company validation needed',
      draft.validationQuestions || 'Please confirm the corporate brief before DPM prepares the quote.',
    ].join('\n');
  }

  return [
    `Client validation brief - ${lead.name}`,
    '',
    `Request type: ${leadTypeLabels[lead.serviceKey]}`,
    `Destination / route: ${draft.routePreferences || lead.destination || 'To confirm'}`,
    `Travel dates: ${lead.dates || 'To confirm'} (${draft.dateFlexibility || 'Flexibility to confirm'})`,
    `Travelers: ${draft.travelerProfile || lead.travelers || 'To confirm'}`,
    `Budget posture: ${lead.budget || 'To confirm'}${draft.budgetFlexibility ? ` - ${draft.budgetFlexibility}` : ''}`,
    '',
    'Trip intent',
    `Purpose: ${draft.purpose || lead.tripType || 'To confirm'}`,
    `Success looks like: ${draft.successDefinition || 'To confirm'}`,
    `Travel style: ${draft.travelStyle || 'To confirm'}`,
    `Preferred pace: ${draft.pace || 'To confirm'}`,
    '',
    'Stay and service preferences',
    `Accommodation level: ${draft.accommodationLevel || 'To confirm'}`,
    `Room preferences: ${draft.roomPreferences || 'To confirm'}`,
    `Services needed: ${draft.servicesNeeded || lead.requestedServices || 'To confirm'}`,
    `Special requirements: ${draft.specialRequirements || 'None captured yet'}`,
    `Decision priority: ${draft.decisionPriority || 'To confirm'}`,
    '',
    'Client validation needed',
    draft.validationQuestions || 'Please confirm if the summary above is correct before DPM starts trip design.',
  ].join('\n');
}
