import type { CrmLead, InquiryKind, LeadLifecycleStage, LeadPriority, LeadStatus } from '../../../types';

export type LeadTypeFilter = 'all' | InquiryKind;

export type FlowProcessMap = Record<
  LeadStatus,
  {
    primaryAction: string;
    nextAction: string;
    nextStatus: LeadStatus | null;
    stageGate: string;
    taskTitles: [string, string, string];
  }
>;

export type InfoCard = {
  label: string;
  value: string;
  meta?: string;
};

export const statusLabels: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Qualification',
  planning: 'Trip Design',
  proposal: 'Proposal Sent',
  won: 'Confirmed',
  execution: 'Execution',
  completed: 'Completed',
  lost: 'Cancelled',
};

export const lifecycleStageLabels: Record<LeadLifecycleStage, string> = {
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

export const statusToLifecycleStage: Record<LeadStatus, LeadLifecycleStage> = {
  new: 'new_request',
  contacted: 'pending_information',
  planning: 'quote_in_progress',
  proposal: 'quote_sent',
  won: 'awaiting_payment_finance',
  execution: 'booking_in_progress',
  completed: 'completed',
  lost: 'closed',
};

export const priorityLabels: Record<LeadPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

export const typeLabels: Record<LeadTypeFilter, string> = {
  all: 'All',
  classic: 'Classic',
  luxury: 'Luxury',
  corporate: 'Corporate',
};

export const serviceProcessFocus: Record<InquiryKind, string> = {
  classic: 'simple package clarity, budget fit, and practical travel options',
  luxury: 'concierge preferences, premium availability, and discreet service details',
  corporate: 'traveler list, approval flow, policy fit, and invoice structure',
};

export const traditionalStatusProcess: FlowProcessMap = {
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

export const corporateStatusProcess: FlowProcessMap = {
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

export function fallbackPriority(lead: CrmLead): LeadPriority {
  if (lead.priority) return lead.priority;
  const urgency = (lead.urgency ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (urgency.includes('semana') || urgency.includes('week')) return 'urgent';
  if (urgency.includes('mes') || urgency.includes('mês') || urgency.includes('month')) return 'high';
  if (urgency.includes('pesquisar') || urgency.includes('research')) return 'low';
  return 'normal';
}

export function attentionLevel(lead: CrmLead) {
  const priority = fallbackPriority(lead);
  if (priority === 'urgent' || priority === 'high') return 'urgent';
  if (lead.status === 'new') return 'new';
  if (lead.status === 'contacted' || lead.status === 'planning' || lead.status === 'proposal' || lead.status === 'execution') return 'active';
  if (lead.status === 'won' || lead.status === 'completed') return 'settled';
  return 'quiet';
}

export type AttentionLevel = ReturnType<typeof attentionLevel>;

export function leadSegment(lead: CrmLead) {
  if (lead.serviceKey === 'corporate') return 'Corporate';
  if (lead.serviceKey === 'luxury') return 'Private Client';
  return 'Private Client';
}

export function isCorporateLead(lead: CrmLead) {
  return lead.serviceKey === 'corporate';
}

export function leadLifecycleStage(lead: CrmLead): LeadLifecycleStage {
  return lead.lifecycleStage ?? statusToLifecycleStage[lead.status];
}

export function leadLifecycleLabel(lead: CrmLead) {
  return lifecycleStageLabels[leadLifecycleStage(lead)];
}

export function leadFlowTitle(lead: CrmLead) {
  return isCorporateLead(lead) ? 'Corporate travel operations flow' : 'Traditional trip design flow';
}

export function leadPrimaryBlocker(lead: CrmLead) {
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

export function leadOwner(lead: CrmLead) {
  // Real accountable owner from the CRM API; "Unassigned" when nobody owns
  // the record. The service-desk label is a queue hint only, never an owner.
  return lead.ownerName?.trim() || 'Unassigned';
}

export function processForLead(lead: CrmLead) {
  const process = (isCorporateLead(lead) ? corporateStatusProcess : traditionalStatusProcess)[lead.status];
  return {
    ...process,
    nextAction: `${process.nextAction} Focus on ${serviceProcessFocus[lead.serviceKey]}.`,
  };
}

export function leftRailStatusCards(lead: CrmLead): InfoCard[] {
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
