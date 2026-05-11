import { AlertCircle, AlertTriangle, Building2, CheckCircle2, CircleDot, ClipboardList, Clock3, CreditCard, FileText, MessageSquare, PlaneTakeoff, Plus, Receipt, Route, Send, ShieldCheck, UploadCloud, XCircle } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { CostLifecycleCard } from '../../components/corporate-portal/CostLifecycleCard';
import { ServiceChipList } from '../../components/corporate-portal/ServiceChipList';
import { TimelinePanel, type TimelineSource, type UnifiedTimelineEvent } from '../../components/corporate-portal/TimelinePanel';
import { TravelerReadinessList } from '../../components/corporate-portal/TravelerReadinessList';
import { TripStatusBadge } from '../../components/corporate-portal/TripStatusBadge';
import type { CorporateApprovalStage, CorporateDocumentStatus, CorporateDocumentType, CorporatePortalTheme, CorporateTripDocumentInput, CorporateTripMessageInput, CorporateTripRequest } from '../../types/corporatePortal';
import { corporatePortalThemeStyles } from './portalTheme';

type WorkbenchTab = 'documents' | 'messages' | 'tasks';
type ProcessingStageState = 'done' | 'active' | 'blocked' | 'pending';

type ProcessingStage = {
  id: string;
  label: string;
  state: ProcessingStageState;
  detail: string;
  Icon: typeof CheckCircle2;
};

const documentTypes: Array<{ value: CorporateDocumentType; label: string }> = [
  { value: 'passport', label: 'Passport' },
  { value: 'visa', label: 'Visa' },
  { value: 'itinerary', label: 'Itinerary' },
  { value: 'approval', label: 'Approval' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'other', label: 'Other' },
];

const documentStatuses: Array<{ value: CorporateDocumentStatus; label: string }> = [
  { value: 'requested', label: 'Requested' },
  { value: 'received', label: 'Received' },
  { value: 'verified', label: 'Verified' },
  { value: 'issued', label: 'Issued' },
  { value: 'missing', label: 'Missing' },
];

function labelize(value: string) {
  return value.replace(/_/g, ' ');
}

function statusTone(status: string, theme: CorporatePortalTheme) {
  if (['verified', 'issued', 'done', 'confirmed', 'ticketed', 'completed', 'approved', 'paid'].includes(status)) {
    return 'bg-emerald-500/12 text-emerald-200';
  }
  if (['missing', 'blocked', 'cancelled', 'rejected', 'overdue'].includes(status)) {
    return 'bg-rose-500/12 text-rose-200';
  }
  if (['requested', 'in_progress', 'sent', 'partially_paid'].includes(status)) {
    return 'bg-amber-500/12 text-amber-100';
  }
  return theme === 'dark' ? 'bg-sky-500/12 text-sky-200' : 'bg-sky-50 text-sky-800';
}

function RequiredMark() {
  return <span className="text-[#d9b46f]">*</span>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="mt-2 flex items-start gap-1.5 text-xs text-rose-200">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function formatMoney(amount: number | null | undefined, currency = 'USD') {
  if (amount === null || amount === undefined) return 'Pending';
  return `${currency} ${amount.toLocaleString('en-US')}`;
}

function stageClass(state: ProcessingStageState, theme: CorporatePortalTheme) {
  if (state === 'done') return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200';
  if (state === 'active') return 'border-sky-400/35 bg-sky-500/10 text-sky-200';
  if (state === 'blocked') return 'border-rose-400/35 bg-rose-500/10 text-rose-100';
  return theme === 'dark' ? 'border-white/10 bg-white/[0.03] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500';
}

function stageDotClass(state: ProcessingStageState, selected: boolean, theme: CorporatePortalTheme) {
  const selectedRing = selected ? 'ring-2 ring-[#d9b46f]/70 ring-offset-2 ring-offset-transparent' : '';
  if (state === 'done') return `border-emerald-400/45 bg-emerald-500/15 text-emerald-200 ${selectedRing}`;
  if (state === 'active') return `border-sky-400/45 bg-sky-500/15 text-sky-200 ${selectedRing}`;
  if (state === 'blocked') return `border-rose-400/45 bg-rose-500/15 text-rose-100 ${selectedRing}`;
  return `${theme === 'dark' ? 'border-white/10 bg-white/[0.03] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'} ${selectedRing}`;
}

function stageToneLabel(state: ProcessingStageState) {
  if (state === 'done') return 'Done';
  if (state === 'active') return 'In progress';
  if (state === 'blocked') return 'Blocked';
  return 'Pending';
}

function workflowProgress(stages: ProcessingStage[]) {
  const weighted = stages.reduce((total, stage) => {
    if (stage.state === 'done') return total + 1;
    if (stage.state === 'active') return total + 0.5;
    return total;
  }, 0);
  return Math.round((weighted / stages.length) * 100);
}

function approvalStatus(trip: CorporateTripRequest, stage: 'Travel need' | 'Final cost') {
  return trip.approvals.find((approval) => approval.stage === stage)?.status ?? 'Pending';
}

function hasApprovalReadyQuote(trip: CorporateTripRequest) {
  return Boolean(trip.quote && ['sent', 'approved'].includes(trip.quote.status) && trip.quote.amount > 0 && trip.quote.currency);
}

function hasDocumentBlocker(trip: CorporateTripRequest) {
  return trip.travelers.some((traveler) => traveler.readiness.passport !== 'OK' || traveler.readiness.visa === 'Required')
    || (trip.documents ?? []).some((document) => document.status === 'missing' || document.status === 'requested');
}

function buildDecisionStages(trip: CorporateTripRequest): ProcessingStage[] {
  const travelNeed = approvalStatus(trip, 'Travel need');
  const finalCost = approvalStatus(trip, 'Final cost');
  const quoteReady = hasApprovalReadyQuote(trip);
  const bookingReady = Boolean(trip.booking) || trip.status === 'Booked' || trip.status === 'Completed';
  const blockedByApproval = travelNeed === 'Rejected' || finalCost === 'Rejected';

  return [
    {
      id: 'received',
      label: 'Received',
      state: 'done',
      detail: 'CTM request is registered and visible to DPM.',
      Icon: ClipboardList,
    },
    {
      id: 'qualification',
      label: 'Qualification',
      state: blockedByApproval ? 'blocked' : travelNeed === 'Approved' || quoteReady || bookingReady ? 'done' : 'active',
      detail: travelNeed === 'Approved' ? 'Business need is approved.' : travelNeed === 'Rejected' ? 'Travel need was rejected.' : 'Waiting for travel need approval.',
      Icon: ShieldCheck,
    },
    {
      id: 'briefing',
      label: 'Briefing',
      state: quoteReady || finalCost === 'Approved' || bookingReady ? 'done' : travelNeed === 'Approved' ? 'active' : 'pending',
      detail: quoteReady ? 'DPM has enough business detail to prepare and share pricing.' : travelNeed === 'Approved' ? 'DPM is validating requirements, policy constraints, and traveler needs.' : 'Starts after the company approves the travel need.',
      Icon: ClipboardList,
    },
    {
      id: 'quote',
      label: 'Quote',
      state: quoteReady ? (trip.quote?.status === 'rejected' ? 'blocked' : trip.quote?.status === 'approved' || finalCost === 'Approved' || bookingReady ? 'done' : 'active') : travelNeed === 'Approved' ? 'active' : 'pending',
      detail: trip.quote ? `${labelize(trip.quote.status)} - ${formatMoney(trip.quote.amount, trip.quote.currency)}` : 'DPM has not shared a quote yet.',
      Icon: Receipt,
    },
    {
      id: 'approval',
      label: 'Approval',
      state: finalCost === 'Rejected' ? 'blocked' : finalCost === 'Approved' || bookingReady ? 'done' : quoteReady ? 'active' : 'pending',
      detail: finalCost === 'Approved' ? 'Final cost is approved.' : finalCost === 'Rejected' ? 'Final cost was rejected.' : 'Waiting for company final approval.',
      Icon: CheckCircle2,
    },
    {
      id: 'authorized',
      label: 'Authorized',
      state: blockedByApproval ? 'blocked' : bookingReady ? 'done' : finalCost === 'Approved' ? 'active' : 'pending',
      detail: bookingReady ? 'The request is authorized and DPM has moved into booking execution.' : finalCost === 'Approved' ? 'DPM is authorized to proceed with supplier booking.' : 'Unlocks after final cost approval.',
      Icon: PlaneTakeoff,
    },
  ];
}

function buildLogisticsStages(trip: CorporateTripRequest): ProcessingStage[] {
  const finalCost = approvalStatus(trip, 'Final cost');
  const bookingReady = Boolean(trip.booking) || trip.status === 'Booked' || trip.status === 'Completed';
  const blockedByDocuments = hasDocumentBlocker(trip) && (trip.status === 'Needs documents' || bookingReady);
  const invoiceReady = Boolean(trip.invoice);
  const paid = trip.invoice?.status === 'paid' || trip.payments.some((payment) => payment.status === 'received' || payment.status === 'reconciled');
  const requiresFlight = trip.services.includes('Flight');
  const requiresHotel = trip.services.includes('Hotel');
  const requiresVisa = trip.services.includes('Visa support') || trip.travelers.some((traveler) => traveler.readiness.visa === 'Required');
  const passportBlocked = trip.travelers.some((traveler) => traveler.readiness.passport !== 'OK');
  const visaBlocked = trip.travelers.some((traveler) => traveler.readiness.visa === 'Required');
  const documents = trip.documents ?? [];
  const itineraryReady = documents.some((document) => document.documentType === 'itinerary' && ['verified', 'issued'].includes(document.status));

  return [
    {
      id: 'travelers',
      label: 'Travelers',
      state: passportBlocked ? 'blocked' : 'done',
      detail: passportBlocked ? 'At least one traveler has missing or expired passport readiness.' : `${trip.travelers.length} traveler profile${trip.travelers.length === 1 ? '' : 's'} ready for processing.`,
      Icon: Building2,
    },
    {
      id: 'documents',
      label: 'Documents',
      state: blockedByDocuments ? 'blocked' : documents.length > 0 ? 'done' : finalCost === 'Approved' || bookingReady ? 'active' : 'pending',
      detail: blockedByDocuments ? 'Document records show missing or requested items.' : documents.length > 0 ? 'Shared documents are received or verified.' : 'Document collection starts as the trip moves toward booking.',
      Icon: FileText,
    },
    {
      id: 'visa',
      label: 'Visa',
      state: visaBlocked ? 'blocked' : requiresVisa ? 'active' : 'done',
      detail: visaBlocked ? 'Visa readiness needs attention before travel pack completion.' : requiresVisa ? 'Visa support is in scope and should be monitored.' : 'No visa blocker is currently visible.',
      Icon: ShieldCheck,
    },
    {
      id: 'flights',
      label: 'Flights',
      state: !requiresFlight ? 'done' : trip.booking?.status === 'cancelled' ? 'blocked' : ['confirmed', 'ticketed', 'completed'].includes(trip.booking?.status ?? '') ? 'done' : finalCost === 'Approved' ? 'active' : 'pending',
      detail: !requiresFlight ? 'Flights are not part of this request.' : trip.booking ? `${labelize(trip.booking.status)} - ${trip.booking.bookingReference || 'reference pending'}` : 'Flight booking starts after final approval.',
      Icon: PlaneTakeoff,
    },
    {
      id: 'hotel',
      label: 'Hotel',
      state: !requiresHotel ? 'done' : trip.booking?.status === 'cancelled' ? 'blocked' : ['confirmed', 'ticketed', 'completed'].includes(trip.booking?.status ?? '') ? 'done' : finalCost === 'Approved' ? 'active' : 'pending',
      detail: !requiresHotel ? 'Accommodation is not part of this request.' : trip.booking?.supplierSummary || 'Hotel or accommodation confirmation starts after final approval.',
      Icon: Building2,
    },
    {
      id: 'billing',
      label: 'Billing',
      state: paid ? 'done' : invoiceReady ? (trip.invoice?.status === 'overdue' ? 'blocked' : 'active') : bookingReady ? 'active' : 'pending',
      detail: trip.invoice ? `${labelize(trip.invoice.status)} - ${formatMoney(trip.invoice.amount, trip.invoice.currency)}` : 'Invoice is not issued yet.',
      Icon: CreditCard,
    },
    {
      id: 'travel-ready',
      label: 'Travel ready',
      state: blockedByDocuments ? 'blocked' : trip.status === 'Completed' || itineraryReady ? 'done' : bookingReady ? 'active' : 'pending',
      detail: blockedByDocuments ? 'Traveler documents need attention.' : trip.status === 'Completed' || itineraryReady ? 'Final travel pack is ready or issued.' : bookingReady ? 'DPM is preparing final travel pack.' : 'Unlocked after booking.',
      Icon: Route,
    },
  ];
}

function currentProcessingStage(stages: ProcessingStage[]) {
  return stages.find((stage) => stage.state === 'blocked') ?? stages.find((stage) => stage.state === 'active') ?? stages[stages.length - 1];
}

function clientNextAction(trip: CorporateTripRequest) {
  const travelNeed = approvalStatus(trip, 'Travel need');
  const finalCost = approvalStatus(trip, 'Final cost');

  if (travelNeed === 'Pending') return 'Approve the travel need so DPM can qualify the request.';
  if (hasApprovalReadyQuote(trip) && finalCost === 'Pending') return 'Review the shared quote and approve or reject the final cost.';
  if (finalCost === 'Pending') return 'DPM is preparing the quote before final approval opens.';
  if (hasDocumentBlocker(trip)) return 'Upload or validate missing traveler documents.';
  if (trip.invoice && trip.invoice.status !== 'paid') return 'Coordinate payment or invoice approval with finance.';
  if (trip.booking) return 'Review booking details and wait for the final travel pack.';
  return 'No client action is required right now. DPM is processing the request.';
}

function formatTimelineDate(value: string | null | undefined) {
  if (!value) return 'Latest';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function inferTimelineSource(title: string, meta: string): TimelineSource {
  const text = `${title} ${meta}`.toLowerCase();
  if (text.includes('invoice') || text.includes('payment') || text.includes('quote')) return 'Finance';
  if (text.includes('document') || text.includes('passport') || text.includes('visa')) return 'Documents';
  if (text.includes('message')) return 'Messages';
  if (text.includes('approved') || text.includes('rejected') || text.includes('company')) return 'Company';
  if (text.includes('dpm') || text.includes('booking')) return 'DPM';
  return 'System';
}

function hasTimelineMention(events: UnifiedTimelineEvent[], terms: string[]) {
  return events.some((event) => {
    const text = `${event.title} ${event.meta}`.toLowerCase();
    return terms.some((term) => text.includes(term));
  });
}

function buildUnifiedTimeline(trip: CorporateTripRequest): UnifiedTimelineEvent[] {
  const baseEvents: UnifiedTimelineEvent[] = trip.timeline.map((event) => ({
    ...event,
    source: inferTimelineSource(event.title, event.meta),
  }));
  const events = [...baseEvents];

  const addEvent = (event: UnifiedTimelineEvent, terms: string[]) => {
    const cleanTerms = terms.map((term) => term.trim()).filter(Boolean);
    if (cleanTerms.length > 0 && hasTimelineMention(events, cleanTerms)) return;
    events.push(event);
  };

  const travelNeed = approvalStatus(trip, 'Travel need');
  const finalCost = approvalStatus(trip, 'Final cost');

  if (!hasTimelineMention(events, ['request submitted', 'created'])) {
    events.push({
      id: `${trip.id}-request-created`,
      title: 'Request submitted',
      meta: `${trip.requestedBy} opened ${trip.route} for DPM review.`,
      time: trip.travelDate,
      type: 'done',
      source: 'Company',
    });
  }

  addEvent({
    id: `${trip.id}-travel-need-${travelNeed}`,
    title: `Travel need ${travelNeed.toLowerCase()}`,
    meta: 'Company approval path for the business need.',
    time: 'Approval',
    type: travelNeed === 'Rejected' ? 'alert' : travelNeed === 'Approved' ? 'done' : 'pending',
    source: 'Company',
  }, ['travel need']);

  if (trip.quote) {
    addEvent({
      id: `${trip.id}-quote-${trip.quote.id}`,
      title: `Quote ${labelize(trip.quote.status)}`,
      meta: `${formatMoney(trip.quote.amount, trip.quote.currency)}${trip.quote.validUntil ? ` valid until ${trip.quote.validUntil}` : ''}`,
      time: formatTimelineDate(trip.quote.updatedAt || trip.quote.createdAt),
      type: trip.quote.status === 'rejected' ? 'alert' : trip.quote.status === 'approved' || trip.quote.status === 'sent' ? 'done' : 'pending',
      source: 'Finance',
      sortAt: trip.quote.updatedAt || trip.quote.createdAt,
    }, ['quote']);
  }

  addEvent({
    id: `${trip.id}-final-cost-${finalCost}`,
    title: `Final cost ${finalCost.toLowerCase()}`,
    meta: 'Company approval for commercial release.',
    time: 'Approval',
    type: finalCost === 'Rejected' ? 'alert' : finalCost === 'Approved' ? 'done' : 'pending',
    source: 'Company',
  }, ['final cost']);

  if (trip.booking) {
    addEvent({
      id: `${trip.id}-booking-${trip.booking.id}`,
      title: `Booking ${labelize(trip.booking.status)}`,
      meta: trip.booking.bookingReference || trip.booking.supplierSummary || 'Supplier booking updated.',
      time: formatTimelineDate(trip.booking.updatedAt || trip.booking.createdAt),
      type: trip.booking.status === 'cancelled' ? 'alert' : ['confirmed', 'ticketed', 'completed'].includes(trip.booking.status) ? 'done' : 'pending',
      source: 'DPM',
      sortAt: trip.booking.updatedAt || trip.booking.createdAt,
    }, ['booking']);
  }

  if (trip.invoice) {
    addEvent({
      id: `${trip.id}-invoice-${trip.invoice.id}`,
      title: `Invoice ${labelize(trip.invoice.status)}`,
      meta: `${trip.invoice.invoiceNumber} - ${formatMoney(trip.invoice.amount, trip.invoice.currency)}`,
      time: formatTimelineDate(trip.invoice.updatedAt || trip.invoice.createdAt),
      type: trip.invoice.status === 'overdue' ? 'alert' : trip.invoice.status === 'paid' ? 'done' : 'pending',
      source: 'Finance',
      sortAt: trip.invoice.updatedAt || trip.invoice.createdAt,
    }, ['invoice']);
  }

  trip.payments.slice(0, 3).forEach((payment) => {
    addEvent({
      id: `${trip.id}-payment-${payment.id}`,
      title: `Payment ${labelize(payment.status)}`,
      meta: `${formatMoney(payment.amount, payment.currency)}${payment.reference ? ` - ${payment.reference}` : ''}`,
      time: formatTimelineDate(payment.updatedAt || payment.createdAt),
      type: ['received', 'reconciled'].includes(payment.status) ? 'done' : payment.status === 'failed' ? 'alert' : 'pending',
      source: 'Finance',
      sortAt: payment.updatedAt || payment.createdAt,
    }, [`payment ${payment.status}`, payment.reference]);
  });

  (trip.documents ?? []).slice(0, 3).forEach((document) => {
    addEvent({
      id: `${trip.id}-document-${document.id}`,
      title: `Document ${labelize(document.status)}`,
      meta: `${document.title}${document.traveler ? ` - ${document.traveler.name}` : ''}`,
      time: formatTimelineDate(document.updatedAt),
      type: document.status === 'missing' ? 'alert' : ['verified', 'issued', 'received'].includes(document.status) ? 'done' : 'pending',
      source: 'Documents',
      sortAt: document.updatedAt,
    }, [document.title.toLowerCase()]);
  });

  (trip.messages ?? []).slice(0, 3).forEach((message) => {
    addEvent({
      id: `${trip.id}-message-${message.id}`,
      title: message.senderType === 'dpm' ? 'DPM message posted' : 'Company message posted',
      meta: message.body.length > 96 ? `${message.body.slice(0, 96)}...` : message.body,
      time: formatTimelineDate(message.createdAt),
      type: 'pending',
      source: 'Messages',
      sortAt: message.createdAt,
    }, [message.body.slice(0, 36).toLowerCase()]);
  });

  return events.sort((a, b) => {
    const aTime = a.sortAt ? new Date(a.sortAt).getTime() : 0;
    const bTime = b.sortAt ? new Date(b.sortAt).getTime() : 0;
    return bTime - aTime;
  });
}

export function CorporateRequestDetailPage({
  trip,
  theme,
  onCreateDocument,
  onCreateMessage,
  onApprove,
  onReject,
}: {
  trip: CorporateTripRequest | null;
  theme: CorporatePortalTheme;
  onCreateDocument: (tripId: string, input: CorporateTripDocumentInput) => Promise<void>;
  onCreateMessage: (tripId: string, input: CorporateTripMessageInput) => Promise<void>;
  onApprove: (tripId: string, stage: CorporateApprovalStage) => Promise<void>;
  onReject: (tripId: string, stage: CorporateApprovalStage) => Promise<void>;
}) {
  const styles = corporatePortalThemeStyles[theme];
  const [activeTab, setActiveTab] = useState<WorkbenchTab>('documents');
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentType, setDocumentType] = useState<CorporateDocumentType>('passport');
  const [documentStatus, setDocumentStatus] = useState<CorporateDocumentStatus>('requested');
  const [documentTravelerId, setDocumentTravelerId] = useState('');
  const [documentFileUrl, setDocumentFileUrl] = useState('');
  const [documentNotes, setDocumentNotes] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [isSavingDocument, setIsSavingDocument] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isSavingApproval, setIsSavingApproval] = useState(false);
  const [workbenchError, setWorkbenchError] = useState('');
  const [workbenchTouched, setWorkbenchTouched] = useState<Record<string, boolean>>({});
  const [selectedWorkflowStageId, setSelectedWorkflowStageId] = useState('decision:qualification');

  if (!trip) {
    return (
      <section className={`rounded-xl border p-6 text-center shadow-2xl ${styles.panel}`}>
        <h2 className="text-xl font-semibold">No request selected</h2>
        <p className={`mt-2 text-sm ${styles.muted}`}>Open a trip from the requests queue or create a new one to continue.</p>
      </section>
    );
  }

  const documents = trip.documents ?? [];
  const messages = trip.messages ?? [];
  const tasks = trip.tasks ?? [];
  const decisionStages = buildDecisionStages(trip);
  const logisticsStages = buildLogisticsStages(trip);
  const activeDecisionStage = currentProcessingStage(decisionStages);
  const activeLogisticsStage = currentProcessingStage(logisticsStages);
  const decisionProgress = workflowProgress(decisionStages);
  const logisticsProgress = workflowProgress(logisticsStages);
  const selectedWorkflowStage =
    decisionStages.find((stage) => `decision:${stage.id}` === selectedWorkflowStageId)
    ?? logisticsStages.find((stage) => `logistics:${stage.id}` === selectedWorkflowStageId)
    ?? activeDecisionStage;
  const selectedWorkflowTrack = decisionStages.some((stage) => `decision:${stage.id}` === selectedWorkflowStageId) ? 'Managerial flow' : logisticsStages.some((stage) => `logistics:${stage.id}` === selectedWorkflowStageId) ? 'Logistics flow' : 'Managerial flow';
  const nextClientAction = clientNextAction(trip);
  const unifiedTimeline = buildUnifiedTimeline(trip);
  const pendingApprovals = trip.approvals.filter((approval) => approval.status === 'Pending');
  const actionableApprovals = pendingApprovals.filter((approval) => approval.canApprove !== false);
  const lockedApprovals = pendingApprovals.filter((approval) => approval.canApprove === false);
  const documentTitleError = documentTitle.trim() ? '' : 'Document title is required.';
  const messageBodyError = messageBody.trim() ? '' : 'Message text is required.';
  const markWorkbenchTouched = (field: string) => setWorkbenchTouched((current) => ({ ...current, [field]: true }));
  const visibleWorkbenchError = (field: 'documentTitle' | 'messageBody', message: string) => (workbenchTouched[field] ? message : '');
  const workbenchErrorClass = (field: 'documentTitle' | 'messageBody', message: string) => (visibleWorkbenchError(field, message) ? 'border-rose-400/50 ring-1 ring-rose-400/25' : '');
  const tabItems: Array<{ id: WorkbenchTab; label: string; count: number; Icon: typeof FileText }> = [
    { id: 'documents', label: 'Documents', count: documents.length, Icon: FileText },
    { id: 'messages', label: 'Messages', count: messages.length, Icon: MessageSquare },
    { id: 'tasks', label: 'Tasks', count: tasks.length, Icon: ClipboardList },
  ];

  const submitDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (documentTitleError) {
      markWorkbenchTouched('documentTitle');
      setWorkbenchError('Add a document title before saving.');
      return;
    }
    setIsSavingDocument(true);
    setWorkbenchError('');
    try {
      await onCreateDocument(trip.id, {
        title: documentTitle.trim(),
        documentType,
        status: documentStatus,
        visibility: 'shared',
        fileUrl: documentFileUrl.trim(),
        notes: documentNotes.trim(),
        travelerId: documentTravelerId || null,
      });
      setDocumentTitle('');
      setDocumentType('passport');
      setDocumentStatus('requested');
      setDocumentTravelerId('');
      setDocumentFileUrl('');
      setDocumentNotes('');
      setWorkbenchTouched((current) => ({ ...current, documentTitle: false }));
    } catch (error) {
      setWorkbenchError(error instanceof Error ? error.message : 'Could not save document.');
    } finally {
      setIsSavingDocument(false);
    }
  };

  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (messageBodyError) {
      markWorkbenchTouched('messageBody');
      setWorkbenchError('Write a message before sending.');
      return;
    }
    setIsSendingMessage(true);
    setWorkbenchError('');
    try {
      await onCreateMessage(trip.id, { body: messageBody.trim(), visibility: 'shared' });
      setMessageBody('');
      setWorkbenchTouched((current) => ({ ...current, messageBody: false }));
    } catch (error) {
      setWorkbenchError(error instanceof Error ? error.message : 'Could not send message.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const submitApprovalDecision = async (stage: CorporateApprovalStage, decision: 'Approved' | 'Rejected') => {
    setIsSavingApproval(true);
    setWorkbenchError('');
    try {
      if (decision === 'Approved') {
        await onApprove(trip.id, stage);
      } else {
        await onReject(trip.id, stage);
      }
    } catch (error) {
      setWorkbenchError(error instanceof Error ? error.message : 'Could not update approval.');
    } finally {
      setIsSavingApproval(false);
    }
  };

  const renderWorkflowTrack = (
    trackId: 'decision' | 'logistics',
    label: string,
    progress: number,
    stages: ProcessingStage[],
    activeStage: ProcessingStage,
  ) => (
    <div className={`rounded-xl border px-4 py-3 ${styles.panelSoft}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{label}</div>
          <div className={`mt-1 text-xs ${styles.muted}`}>Current: {activeStage.label}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold">{progress}%</div>
          <div className={`text-[11px] uppercase tracking-[0.12em] ${styles.muted}`}>Progress</div>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${activeStage.state === 'blocked' ? 'bg-rose-400' : activeStage.state === 'active' ? 'bg-sky-400' : 'bg-emerald-400'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-3 grid grid-cols-6 gap-2 md:grid-cols-7">
        {stages.map((stage) => {
          const Icon = stage.Icon;
          const selected = selectedWorkflowStageId === `${trackId}:${stage.id}`;
          return (
            <button
              key={`${trackId}-${stage.id}`}
              type="button"
              title={`${stage.label}: ${stageToneLabel(stage.state)}`}
              onClick={() => setSelectedWorkflowStageId(`${trackId}:${stage.id}`)}
              className="group flex min-w-0 flex-col items-center gap-1.5 text-center"
            >
              <span className={`grid h-9 w-9 place-items-center rounded-full border transition group-hover:scale-105 ${stageDotClass(stage.state, selected, theme)}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className={`max-w-full truncate text-[10px] font-medium ${selected ? 'text-[#d9b46f]' : styles.muted}`}>{stage.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <section className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[1.18fr_0.82fr]">
      <div className="grid gap-4">
        <div className={`rounded-xl border p-4 shadow-2xl ${styles.panel}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-medium text-[#d9b46f]">{trip.id}</span>
                <TripStatusBadge status={trip.status} theme={theme} />
              </div>
              <h2 className="text-xl font-semibold">{trip.route}</h2>
              <p className={`mt-1.5 max-w-2xl text-sm leading-6 ${styles.soft}`}>{trip.purpose}</p>
            </div>
            <div className={`rounded-xl border px-4 py-3 text-sm ${styles.surface}`}>
              <div className="font-medium">{trip.travelers.length} traveler{trip.travelers.length === 1 ? '' : 's'}</div>
              <div className={`mt-1 ${styles.muted}`}>{trip.travelDate}</div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className={`rounded-xl border p-3.5 ${styles.surface}`}>
              <div className={`flex items-center gap-2 ${styles.muted}`}>
                <Building2 className="h-4 w-4" />
                Department
              </div>
              <div className="mt-2 font-semibold">{trip.department}</div>
              <div className={`mt-1 text-xs ${styles.muted}`}>Requested by {trip.requestedBy}</div>
            </div>
            <div className={`rounded-xl border p-3.5 ${styles.surface}`}>
              <div className={`flex items-center gap-2 ${styles.muted}`}>
                <PlaneTakeoff className="h-4 w-4" />
                Services
              </div>
              <div className="mt-2.5">
                <ServiceChipList services={trip.services} theme={theme} />
              </div>
            </div>
            <div className={`rounded-xl border p-3.5 md:col-span-2 xl:col-span-1 ${styles.surface}`}>
              <div className={`flex items-center gap-2 ${styles.muted}`}>
                <CheckCircle2 className="h-4 w-4" />
                Operational summary
              </div>
              <div className={`mt-2 text-sm leading-6 ${styles.soft}`}>{trip.internalSummary}</div>
            </div>
          </div>

          <div className={`mt-4 rounded-xl border p-4 ${styles.surface}`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-base font-semibold">
                  <CircleDot className="h-4 w-4 text-[#d9b46f]" />
                  Corporate workflow visibility
                </div>
                <p className={`mt-1 text-sm ${styles.muted}`}>Separate decision progress from operational readiness so bottlenecks stay clear.</p>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div className={`rounded-lg border px-3 py-2 ${stageClass(activeDecisionStage.state, theme)}`}>
                  <div className="text-xs uppercase tracking-[0.12em] opacity-75">Managerial</div>
                  <div className="mt-1 font-semibold">{activeDecisionStage.label}</div>
                </div>
                <div className={`rounded-lg border px-3 py-2 ${stageClass(activeLogisticsStage.state, theme)}`}>
                  <div className="text-xs uppercase tracking-[0.12em] opacity-75">Logistics</div>
                  <div className="mt-1 font-semibold">{activeLogisticsStage.label}</div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {renderWorkflowTrack('decision', 'Managerial flow', decisionProgress, decisionStages, activeDecisionStage)}
              {renderWorkflowTrack('logistics', 'Logistics flow', logisticsProgress, logisticsStages, activeLogisticsStage)}
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
              <div className={`rounded-lg border px-3 py-3 ${styles.panelSoft}`}>
                <div className={`flex items-center gap-2 text-xs uppercase tracking-[0.12em] ${styles.muted}`}>
                  <Clock3 className="h-3.5 w-3.5" />
                  Selected detail
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] ${stageClass(selectedWorkflowStage.state, theme)}`}>{stageToneLabel(selectedWorkflowStage.state)}</span>
                  <span className="text-sm font-semibold">{selectedWorkflowTrack} - {selectedWorkflowStage.label}</span>
                </div>
                <div className={`mt-2 text-sm leading-6 ${styles.soft}`}>{selectedWorkflowStage.detail}</div>
              </div>
              <div className={`rounded-lg border px-3 py-3 ${styles.panelSoft}`}>
                <div className={`flex items-center gap-2 text-xs uppercase tracking-[0.12em] ${styles.muted}`}>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Primary next action
                </div>
                <div className="mt-2 text-sm leading-6">{nextClientAction}</div>
              </div>
            </div>
          </div>

          <div className={`mt-4 rounded-xl border p-4 ${styles.surface}`}>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="text-base font-semibold">Client actions</div>
                <p className={`mt-1 text-sm leading-6 ${styles.muted}`}>
                  Approve decisions, upload missing information, or message DPM from the same request record.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('documents')}
                  className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm ${styles.buttonGhost}`}
                >
                  <UploadCloud className="h-4 w-4" />
                  Documents
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('messages')}
                  className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm ${styles.buttonGhost}`}
                >
                  <MessageSquare className="h-4 w-4" />
                  Message DPM
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {actionableApprovals.length > 0 ? actionableApprovals.map((approval) => (
                <div key={`${approval.stage}-${approval.approver}-action`} className={`rounded-lg border px-3 py-3 ${styles.panelSoft}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{approval.stage} approval</div>
                      <div className={`mt-1 text-xs ${styles.muted}`}>Responsible: {approval.approver}</div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] ${statusTone('in_progress', theme)}`}>Pending</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isSavingApproval}
                      onClick={() => submitApprovalDecision(approval.stage, 'Approved')}
                      className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={isSavingApproval}
                      onClick={() => submitApprovalDecision(approval.stage, 'Rejected')}
                      className="inline-flex h-9 items-center gap-2 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                </div>
              )) : lockedApprovals.length === 0 ? (
                <div className={`rounded-lg border px-3 py-3 text-sm lg:col-span-2 ${styles.panelSoft}`}>
                  <div className="font-semibold">No pending approvals</div>
                  <div className={`mt-1 ${styles.muted}`}>Approval actions will appear here when travel need or final cost review is required.</div>
                </div>
              ) : null}
              {lockedApprovals.map((approval) => (
                <div key={`${approval.stage}-${approval.approver}-locked`} className={`rounded-lg border px-3 py-3 ${styles.panelSoft}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{approval.stage} approval</div>
                      <div className={`mt-1 text-xs ${styles.muted}`}>Responsible: {approval.approver}</div>
                    </div>
                    <span className={theme === 'dark' ? 'rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-slate-300' : 'rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600'}>Locked</span>
                  </div>
                  <div className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${styles.surface}`}>
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                    <span className={styles.muted}>{approval.blocker || 'Complete the previous workflow gate before this approval opens.'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className={`rounded-xl border p-4 shadow-2xl ${styles.panel}`}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Traveler readiness</h3>
              <div className={`text-xs ${styles.muted}`}>Documents and visa preparation</div>
            </div>
            <TravelerReadinessList travelers={trip.travelers} theme={theme} />
          </div>

          <div className={`rounded-xl border p-4 shadow-2xl ${styles.panel}`}>
            <div className="mb-3 text-base font-semibold">Approvals</div>
            <div className="space-y-2.5">
              {trip.approvals.map((approval) => (
                <div key={`${approval.stage}-${approval.approver}`} className={`rounded-xl border px-4 py-3 ${styles.surface}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{approval.stage}</div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] ${
                        approval.status === 'Pending' && approval.canApprove === false
                          ? theme === 'dark'
                            ? 'bg-white/8 text-slate-300'
                            : 'bg-slate-100 text-slate-600'
                          : approval.status === 'Approved'
                          ? 'bg-emerald-500/12 text-emerald-200'
                          : approval.status === 'Rejected'
                            ? 'bg-rose-500/12 text-rose-200'
                            : theme === 'dark'
                              ? 'bg-sky-500/12 text-sky-200'
                              : 'bg-sky-50 text-sky-800'
                      }`}
                    >
                      {approval.status === 'Pending' && approval.canApprove === false ? 'Locked' : approval.status}
                    </span>
                  </div>
                  <div className={`mt-1 text-xs ${styles.muted}`}>{approval.approver}</div>
                  {approval.status === 'Pending' && approval.canApprove === false ? (
                    <div className={`mt-2 text-xs ${styles.muted}`}>{approval.blocker || 'Waiting for the previous workflow gate.'}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={`rounded-xl border shadow-2xl ${styles.panel}`}>
          <div className="flex flex-col gap-3 border-b border-inherit px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-base font-semibold">Request workbench</h3>
              <p className={`mt-1 text-sm ${styles.muted}`}>Exchange documents, messages, and operational tasks for this trip.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {tabItems.map(({ id, label, count, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setActiveTab(id);
                    setWorkbenchError('');
                  }}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                    activeTab === id ? 'border-[#d9b46f]/35 bg-[#d9b46f]/10 text-[#d9b46f]' : styles.buttonGhost
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  <span className="rounded-full bg-black/15 px-2 py-0.5 text-xs">{count}</span>
                </button>
              ))}
            </div>
          </div>

          {workbenchError ? (
            <div className="mx-4 mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {workbenchError}
            </div>
          ) : null}

          {activeTab === 'documents' ? (
            <div className="grid gap-4 p-4 xl:grid-cols-[0.95fr_1.05fr]">
              <form onSubmit={submitDocument} className={`rounded-xl border p-4 ${styles.surface}`}>
                <div className="mb-3 flex items-center gap-2 font-semibold">
                  <Plus className="h-4 w-4 text-[#d9b46f]" />
                  Add document record
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm">
                    <div className={`mb-2 ${styles.muted}`}>Title <RequiredMark /></div>
                    <input
                      value={documentTitle}
                      onBlur={() => markWorkbenchTouched('documentTitle')}
                      onChange={(event) => setDocumentTitle(event.target.value)}
                      className={`h-10 w-full rounded-lg border px-3 outline-none ${styles.input} ${workbenchErrorClass('documentTitle', documentTitleError)}`}
                      placeholder="Passport scan, visa letter..."
                    />
                    <FieldError message={visibleWorkbenchError('documentTitle', documentTitleError)} />
                  </label>
                  <label className="text-sm">
                    <div className={`mb-2 ${styles.muted}`}>Traveler</div>
                    <select value={documentTravelerId} onChange={(event) => setDocumentTravelerId(event.target.value)} className={`h-10 w-full rounded-lg border px-3 outline-none ${styles.input}`}>
                      <option value="" className="bg-[#07111f]">Request level</option>
                      {trip.travelers.map((traveler) => (
                        <option key={traveler.id} value={traveler.id} className="bg-[#07111f]">{traveler.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    <div className={`mb-2 ${styles.muted}`}>Type</div>
                    <select value={documentType} onChange={(event) => setDocumentType(event.target.value as CorporateDocumentType)} className={`h-10 w-full rounded-lg border px-3 outline-none ${styles.input}`}>
                      {documentTypes.map((item) => (
                        <option key={item.value} value={item.value} className="bg-[#07111f]">{item.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    <div className={`mb-2 ${styles.muted}`}>Status</div>
                    <select value={documentStatus} onChange={(event) => setDocumentStatus(event.target.value as CorporateDocumentStatus)} className={`h-10 w-full rounded-lg border px-3 outline-none ${styles.input}`}>
                      {documentStatuses.map((item) => (
                        <option key={item.value} value={item.value} className="bg-[#07111f]">{item.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="mt-3 block text-sm">
                  <div className={`mb-2 ${styles.muted}`}>File URL</div>
                  <input value={documentFileUrl} onChange={(event) => setDocumentFileUrl(event.target.value)} className={`h-10 w-full rounded-lg border px-3 outline-none ${styles.input}`} placeholder="Optional shared document link" />
                </label>
                <label className="mt-3 block text-sm">
                  <div className={`mb-2 ${styles.muted}`}>Notes</div>
                  <textarea value={documentNotes} onChange={(event) => setDocumentNotes(event.target.value)} rows={3} className={`w-full rounded-lg border px-3 py-3 outline-none ${styles.input}`} placeholder="What is needed, received, or verified?" />
                </label>
                <button type="submit" disabled={isSavingDocument || Boolean(documentTitleError)} className={`mt-4 inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold ${styles.buttonPrimary} disabled:cursor-not-allowed disabled:opacity-55`}>
                  <FileText className="h-4 w-4" />
                  {isSavingDocument ? 'Saving...' : 'Save document'}
                </button>
                {documentTitleError ? (
                  <div className={`mt-3 text-xs ${styles.muted}`}>Add the required title before saving this document record.</div>
                ) : null}
              </form>

              <div className="grid gap-3">
                {documents.length === 0 ? (
                  <div className={`rounded-xl border p-5 text-sm ${styles.surface} ${styles.muted}`}>
                    No document records yet. Add missing passports, visa letters, approvals, or issued itineraries here.
                  </div>
                ) : documents.map((document) => (
                  <div key={document.id} className={`rounded-xl border p-4 ${styles.surface}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{document.title}</div>
                        <div className={`mt-1 text-xs capitalize ${styles.muted}`}>
                          {labelize(document.documentType)}{document.traveler ? ` - ${document.traveler.name}` : ' - request level'}
                        </div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] capitalize ${statusTone(document.status, theme)}`}>
                        {labelize(document.status)}
                      </span>
                    </div>
                    {document.notes ? <p className={`mt-3 text-sm leading-6 ${styles.soft}`}>{document.notes}</p> : null}
                    {document.fileUrl ? (
                      <a href={document.fileUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex text-sm font-semibold text-[#d9b46f]">
                        Open document
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === 'messages' ? (
            <div className="grid gap-4 p-4 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="grid max-h-[520px] gap-3 overflow-y-auto pr-1">
                {messages.length === 0 ? (
                  <div className={`rounded-xl border p-5 text-sm ${styles.surface} ${styles.muted}`}>
                    No messages yet. Use this thread for shared client-DPM coordination on this request.
                  </div>
                ) : messages.map((message) => (
                  <div key={message.id} className={`rounded-xl border p-4 ${message.senderType === 'dpm' ? styles.panelSoft : styles.surface}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm font-semibold">{message.sender}</div>
                      <div className={`text-xs ${styles.muted}`}>
                        {labelize(message.senderType)} - {new Date(message.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <p className={`mt-2 whitespace-pre-line text-sm leading-6 ${styles.soft}`}>{message.body}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={submitMessage} className={`rounded-xl border p-4 ${styles.surface}`}>
                <div className="mb-3 flex items-center gap-2 font-semibold">
                  <MessageSquare className="h-4 w-4 text-[#d9b46f]" />
                  Send shared message
                </div>
                <textarea
                  value={messageBody}
                  onBlur={() => markWorkbenchTouched('messageBody')}
                  onChange={(event) => setMessageBody(event.target.value)}
                  rows={8}
                  className={`w-full rounded-lg border px-3 py-3 outline-none ${styles.input} ${workbenchErrorClass('messageBody', messageBodyError)}`}
                  placeholder="Ask DPM a question, confirm details, or share coordination notes."
                />
                <FieldError message={visibleWorkbenchError('messageBody', messageBodyError)} />
                <button type="submit" disabled={isSendingMessage || Boolean(messageBodyError)} className={`mt-4 inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold ${styles.buttonPrimary} disabled:cursor-not-allowed disabled:opacity-55`}>
                  <Send className="h-4 w-4" />
                  {isSendingMessage ? 'Sending...' : 'Send message'}
                </button>
                {messageBodyError ? (
                  <div className={`mt-3 text-xs ${styles.muted}`}>Write a message before sending it to the shared thread.</div>
                ) : null}
              </form>
            </div>
          ) : null}

          {activeTab === 'tasks' ? (
            <div className="grid gap-3 p-4 md:grid-cols-2">
              {tasks.length === 0 ? (
                <div className={`rounded-xl border p-5 text-sm md:col-span-2 ${styles.surface} ${styles.muted}`}>
                  No shared tasks yet. DPM can use tasks to expose follow-ups such as passport upload, approval confirmation, or payment action.
                </div>
              ) : tasks.map((task) => (
                <div key={task.id} className={`rounded-xl border p-4 ${styles.surface}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{task.title}</div>
                      <div className={`mt-1 text-xs ${styles.muted}`}>{task.owner || 'Unassigned'}{task.dueDate ? ` - due ${task.dueDate}` : ''}</div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] capitalize ${statusTone(task.status, theme)}`}>
                      {labelize(task.status)}
                    </span>
                  </div>
                  {task.description ? <p className={`mt-3 text-sm leading-6 ${styles.soft}`}>{task.description}</p> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <TimelinePanel title="Unified service timeline" events={unifiedTimeline} theme={theme} />
      </div>

      <aside className="grid gap-4">
        <div className={`rounded-xl border p-4 shadow-2xl ${styles.panel}`}>
          <div className="mb-3 text-base font-semibold">Cost lifecycle</div>
          <CostLifecycleCard trip={trip} theme={theme} />
          <div className="mt-3 grid gap-2">
            <div className={`rounded-xl border px-4 py-3 ${styles.surface}`}>
              <div className={`text-xs ${styles.muted}`}>Quote</div>
              {trip.quote ? (
                <>
                  <div className="mt-1 text-sm font-semibold">{formatMoney(trip.quote.amount, trip.quote.currency)}</div>
                  <div className={`mt-1 text-xs capitalize ${styles.muted}`}>{labelize(trip.quote.status)}{trip.quote.validUntil ? ` - valid until ${trip.quote.validUntil}` : ''}</div>
                </>
              ) : (
                <div className={`mt-1 text-sm ${styles.muted}`}>No quote issued yet</div>
              )}
            </div>
            <div className={`rounded-xl border px-4 py-3 ${styles.surface}`}>
              <div className={`text-xs ${styles.muted}`}>Booking</div>
              {trip.booking ? (
                <>
                  <div className="mt-1 text-sm font-semibold">{trip.booking.bookingReference || 'Reference pending'}</div>
                  <div className={`mt-1 text-xs capitalize ${styles.muted}`}>{labelize(trip.booking.status)}{trip.booking.totalCost ? ` - ${formatMoney(trip.booking.totalCost, trip.booking.currency)}` : ''}</div>
                </>
              ) : (
                <div className={`mt-1 text-sm ${styles.muted}`}>No booking confirmed yet</div>
              )}
            </div>
          </div>
          {trip.invoice ? (
            <div className="mt-3 grid gap-2">
              <div className={`rounded-xl border px-4 py-3 ${styles.surface}`}>
                <div className={`text-xs ${styles.muted}`}>Invoice</div>
                <div className="mt-1 text-sm font-semibold">{trip.invoice.invoiceNumber}</div>
                <div className={`mt-1 text-xs ${styles.muted}`}>
                  {trip.invoice.status.replace(/_/g, ' ')} - {formatMoney(trip.invoice.amount, trip.invoice.currency)}
                </div>
              </div>
              <div className={`rounded-xl border px-4 py-3 ${styles.surface}`}>
                <div className={`text-xs ${styles.muted}`}>Payments</div>
                <div className="mt-1 text-sm font-semibold">{trip.payments.length} recorded</div>
                <div className={`mt-1 text-xs ${styles.muted}`}>
                  {trip.payments.length > 0
                    ? `${trip.payments.filter((payment) => payment.status === 'received' || payment.status === 'reconciled').length} cleared against invoice`
                    : 'No payment captured yet'}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className={`rounded-xl border p-4 shadow-2xl ${styles.panel}`}>
          <div className="mb-3 text-base font-semibold">Request signals</div>
          <div className="grid gap-2">
            <div className={`rounded-xl border px-4 py-3 ${styles.surface}`}>
              <div className={`text-xs ${styles.muted}`}>Origin</div>
              <div className="mt-1 text-sm font-medium">{trip.origin}</div>
            </div>
            <div className={`rounded-xl border px-4 py-3 ${styles.surface}`}>
              <div className={`text-xs ${styles.muted}`}>Destination</div>
              <div className="mt-1 text-sm font-medium">{trip.destination}</div>
            </div>
            <div className={`rounded-xl border px-4 py-3 ${styles.surface}`}>
              <div className={`text-xs ${styles.muted}`}>Services selected</div>
              <div className="mt-1 text-sm font-medium">{trip.services.length}</div>
            </div>
          </div>
        </div>
      </aside>
    </section>
  );
}
