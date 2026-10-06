import type { CrmCommunicationRecord, CrmLead, CrmPaymentRecord, CrmQuote, CrmReminderCompletionCondition, CrmReminderOrigin, CrmReminderStatus, CrmReminderWaitingOn, CrmWorkflowReminder, CrmWorkflowState } from '../../../types';
import { isDueBy } from '../shared/formatting';
import { fallbackPriority, processForLead } from '../shared/leadMeta';

export type ProcessTaskTone = 'urgent' | 'normal' | 'upcoming';

export type ProcessTask = {
  title: string;
  due: string;
  tone: ProcessTaskTone;
};

export function leadTasks(lead: CrmLead): ProcessTask[] {
  const process = processForLead(lead);
  const priority = fallbackPriority(lead);
  const due = priority === 'urgent' ? 'Due now' : priority === 'high' ? 'Today' : priority === 'normal' ? '24h' : 'This week';
  return process.taskTitles.map((title, index) => ({
    title,
    due: index === 0 ? due : index === 1 ? 'Next step' : 'Before stage move',
    tone: index === 0 && (priority === 'urgent' || priority === 'high') ? 'urgent' : index === 2 ? 'upcoming' : 'normal',
  }));
}

export function workflowReminderGenerationAvailability(
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
    return { available: false, reason: 'Open tasks already exist for this request.' };
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

export function taskQueueCount(_leads: CrmLead[], workflowReminders: CrmWorkflowReminder[]) {
  return workflowReminders.filter(isOpenTask).length;
}

export const tasksSurfaceMeta = {
  title: 'Tasks',
  subtitle: 'Assigned work, follow-ups and deadlines across your journeys',
};

export const reminderStatusLabels: Record<CrmReminderStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  waiting: 'Waiting',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const reminderOriginLabels: Record<CrmReminderOrigin, string> = {
  system: 'System',
  manager: 'Manager',
  automation: 'Automation',
};

export const reminderCompletionConditionLabels: Record<CrmReminderCompletionCondition, string> = {
  none: 'Complete when done',
  payment_verified: 'Requires verified payment',
  supplier_confirmed: 'Requires supplier confirmation',
  client_responded: 'Requires client response',
};

export const reminderWaitingOnLabels: Record<CrmReminderWaitingOn, string> = {
  client: 'Client',
  supplier: 'Supplier',
  internal: 'Internal',
};

export const reminderTypeLabels: Record<CrmWorkflowReminder['reminderType'], string> = {
  blocker: 'Workflow blocker',
  follow_up: 'Follow-up',
  payment_due: 'Payment due',
  booking_deadline: 'Booking deadline',
  travel_pack: 'Travel pack',
};

export type TaskScopeFilter = 'mine' | 'team' | 'unassigned';
export type TaskPeriodFilter = 'today' | 'overdue' | 'upcoming' | 'waiting';

export function isOpenTask(task: CrmWorkflowReminder) {
  return task.status === 'pending' || task.status === 'in_progress' || task.status === 'waiting';
}

export function taskPeriod(task: CrmWorkflowReminder, now: Date = new Date()): TaskPeriodFilter {
  if (task.status === 'waiting') return 'waiting';
  const due = new Date(task.dueAt);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  if (due.getTime() < startOfToday.getTime()) return 'overdue';
  if (due.getTime() < startOfTomorrow.getTime()) return 'today';
  return 'upcoming';
}

export function taskMatchesScope(task: CrmWorkflowReminder, scope: TaskScopeFilter, currentUserId: number | null) {
  if (scope === 'mine') return currentUserId != null && task.assignedToId === currentUserId;
  if (scope === 'unassigned') return task.assignedToId == null;
  return true;
}
