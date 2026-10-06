import { opsText } from '../../../locales/operations';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckSquare, ChevronRight, Search, X } from 'lucide-react';
import {
  CRM_EVENT,
  cancelCrmWorkflowReminder,
  completeCrmWorkflowReminder,
  fetchCrmWorkflowReminders,
  updateCrmWorkflowReminder,
  userHasCapability,
} from '../../../data/crm';
import type { CrmManagedUser, CrmSession, CrmWorkflowReminder } from '../../../types';
import { formatDate } from '../shared/formatting';
import type { CrmSurfaceStyles } from '../shared/types';
import {
  isOpenTask,
  reminderCompletionConditionLabels,
  reminderOriginLabels,
  reminderStatusLabels,
  reminderTypeLabels,
  reminderWaitingOnLabels,
  taskMatchesScope,
  taskPeriod,
  type TaskPeriodFilter,
  type TaskScopeFilter,
} from './tasksLogic';

type TasksQueueProps = {
  session: CrmSession | null;
  assignableUsers: CrmManagedUser[];
  styles: CrmSurfaceStyles;
  onOpenLead: (leadId: string) => void;
};

const scopeTabs: Array<{ key: TaskScopeFilter; label: string }> = [
  { key: 'mine', label: 'Mine' },
  { key: 'team', label: 'Team' },
  { key: 'unassigned', label: 'Unassigned' },
];

const periodTabs: Array<{ key: TaskPeriodFilter; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'waiting', label: 'Waiting' },
];

export function TasksQueue({ session, assignableUsers, styles, onOpenLead }: TasksQueueProps) {
  const [tasks, setTasks] = useState<CrmWorkflowReminder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [waitingTask, setWaitingTask] = useState<string | null>(null);
  const [waitingOn, setWaitingOn] = useState<'client' | 'supplier' | 'internal'>('client');
  const [followUpAt, setFollowUpAt] = useState('');
  const canEdit = userHasCapability(session?.user, 'workflow.advance');
  const [scope, setScope] = useState<TaskScopeFilter>(() =>
    userHasCapability(session?.user, 'leads.view_all') ? 'team' : 'mine',
  );
  const [period, setPeriod] = useState<TaskPeriodFilter>('today');

  const currentUserId = session?.user.id ?? null;

  const refresh = useCallback(async () => {
    if (!session?.token) return;
    setIsLoading(true);
    try {
      setTasks(await fetchCrmWorkflowReminders(session));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load tasks.');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void refresh();
    const onRefresh = () => void refresh();
    window.addEventListener(CRM_EVENT, onRefresh);
    return () => window.removeEventListener(CRM_EVENT, onRefresh);
  }, [refresh]);

  const openTasks = useMemo(() => tasks.filter(isOpenTask), [tasks]);

  const periodCounts = useMemo(() => {
    const scoped = openTasks.filter((task) => taskMatchesScope(task, scope, currentUserId));
    return {
      today: scoped.filter((task) => taskPeriod(task) === 'today').length,
      overdue: scoped.filter((task) => taskPeriod(task) === 'overdue').length,
      upcoming: scoped.filter((task) => taskPeriod(task) === 'upcoming').length,
      waiting: scoped.filter((task) => taskPeriod(task) === 'waiting').length,
    } as Record<TaskPeriodFilter, number>;
  }, [currentUserId, openTasks, scope]);

  const visibleTasks = useMemo(
    () =>
      openTasks
        .filter((task) => taskMatchesScope(task, scope, currentUserId))
        .filter((task) => taskPeriod(task) === period)
        .filter((task) => [task.title, task.leadName, task.message, task.assignedToName].join(' ').toLowerCase().includes(query.trim().toLowerCase()))
        .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()),
    [currentUserId, openTasks, period, scope, query],
  );

  async function runTaskAction(action: () => Promise<unknown>) {
    if (busy || !canEdit) return;
    setBusy(true);
    try {
      await action();
      setWaitingTask(null);
      setError('');
      await refresh();
    } catch (err) {
      // Completion-condition failures come back as 409 with a detail message.
      setError(err instanceof Error ? err.message : 'Could not update the task.');
    } finally {
      setBusy(false);
    }
  }

  if (!session?.token) {
    return <div className={`rounded-xl border p-5 text-sm ${styles.panel}`}>{opsText("The task queue needs the CRM backend connection.")}</div>;
  }

  return (
    <div className="grid gap-4 crm-task-queue">
      <div className={`rounded-xl border p-5 ${styles.panel}`}>
        <div className="crm-eyebrow">{opsText("One clear next step")}</div>
        <h2 className="mt-2 text-xl font-semibold">{opsText("Keep every journey moving.")}</h2>
        <p className={`mt-1 text-sm ${styles.muted}`}>{opsText("See who owns the work, when it is due, and what needs to happen before it can be completed.")}</p>
        <label className={`mt-4 flex max-w-xl items-center gap-2 rounded-xl border px-3 py-2 ${styles.input}`}>
          <Search size={16} aria-hidden="true" />
          <input aria-label={opsText("Search tasks")} placeholder={opsText("Find a task, client or assignee")} value={query} onChange={event => setQuery(event.target.value)} className="min-w-0 w-full bg-transparent py-1 text-sm outline-none" />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {scopeTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setScope(tab.key)}
              aria-pressed={scope === tab.key}
              className={`inline-flex h-10 items-center rounded-xl border px-4 text-sm transition ${
                scope === tab.key ? `${styles.buttonActive} border-transparent` : `${styles.buttonGhost} border-white/10`
              }`}
            >
              {opsText(tab.label)}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {periodTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setPeriod(tab.key)}
              aria-pressed={period === tab.key}
              className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm transition ${
                period === tab.key ? `${styles.buttonActive} border-transparent` : `${styles.buttonGhost} border-white/10`
              }`}
            >
              {opsText(tab.label)}
              <span className="rounded-full bg-black/15 px-2 py-0.5 text-xs">{periodCounts[tab.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {error ? <div role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-700">{opsText(error)}</div> : null}
      {isLoading ? <div className={`rounded-xl border px-4 py-3 text-sm ${styles.panelSoft}`}>{opsText("Loading tasks...")}</div> : null}

      <div className={`overflow-hidden rounded-xl border ${styles.panel}`}>
        <div className={`border-b px-5 py-3 text-sm ${styles.tableHead}`}>{visibleTasks.length} {opsText("tasks in this view")}</div>
        {visibleTasks.length === 0 && !isLoading && !error ? (
          <div className="p-10 text-center">
            <CheckSquare className={`mx-auto h-10 w-10 ${styles.muted}`} />
            <div className="mt-4 text-lg font-semibold">{opsText("No tasks in this view")}</div>
            <p className={`mt-2 text-sm ${styles.muted}`}>{opsText("Switch scope or period to see other work, or generate reminders from a request.")}</p>
          </div>
        ) : (
          visibleTasks.map((task) => {
            const isWaiting = task.status === 'waiting';
            const isInProgress = task.status === 'in_progress';
            const assigneeName = task.assignedToName?.trim() || opsText('Unassigned');
            return (
              <div
                key={task.id}
                className={`grid gap-4 border-b p-5 text-left md:grid-cols-2 2xl:grid-cols-3 ${styles.row}`}
              >
                <div className="min-w-0">
                  <div className="text-base font-semibold">{task.title}</div>
                  <div className={`mt-1 text-xs ${styles.muted}`}>
                    <button type="button" onClick={() => onOpenLead(String(task.leadId))} className="font-medium crm-accent-text">
                      {task.leadName || opsText("Open request")}
                    </button>
                    {' · '}
                    {opsText(reminderTypeLabels[task.reminderType]) ?? task.reminderType}
                  </div>
                  {task.message ? <div className={`mt-1 text-xs ${styles.muted}`}>{task.message}</div> : null}
                </div>
                <div className="min-w-0">
                  <div className={`mb-1 text-xs ${styles.muted}`}>{opsText("Responsible person")}</div><div className="text-sm font-medium">{assigneeName}</div>
                </div>
                <div className="min-w-0">
                  <div className={`mb-1 text-xs ${styles.muted}`}>{opsText("Due")}</div><div className="text-sm font-medium">{formatDate(task.dueAt)}</div>
                  {isWaiting && task.followUpAt ? (
                    <div className={`mt-1 text-xs ${styles.muted}`}>{opsText("Follow up")}{' '}{formatDate(task.followUpAt)}</div>
                  ) : null}
                </div>
                <div className={`text-xs ${styles.soft}`}><span className={`block mb-1 ${styles.muted}`}>{opsText("Created by")}</span>{task.origin ? opsText(reminderOriginLabels[task.origin]) : '—'}</div>
                <div className={`text-xs ${styles.soft}`}><span className={`block mb-1 ${styles.muted}`}>{opsText("Completion requires")}</span>
                  {task.completionCondition ? opsText(reminderCompletionConditionLabels[task.completionCondition]) : '—'}
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] ring-1 ${
                      isWaiting
                        ? 'bg-amber-500/15 crm-accent-text ring-amber-300/30'
                        : isInProgress
                          ? 'bg-sky-500/15 crm-accent-text ring-sky-300/30'
                          : styles.buttonGhost
                    }`}
                  >
                    {opsText(reminderStatusLabels[task.status])}
                  </span>
                  {isWaiting && task.waitingOn ? (
                    <span className={`truncate text-[11px] ${styles.muted}`}>{opsText("on")}{' '}{opsText(reminderWaitingOnLabels[task.waitingOn])}</span>
                  ) : null}
                </div>
                <fieldset disabled={busy || !canEdit} className="flex min-w-0 flex-wrap items-center gap-2 md:col-span-2 2xl:col-span-3 disabled:opacity-60">
                  {!canEdit ? <span className={`text-xs ${styles.muted}`}>{opsText("Read-only access")}</span> : null}
                  {task.status === 'pending' ? (
                    <button
                      type="button"
                      onClick={() => runTaskAction(() => updateCrmWorkflowReminder(task.id, { status: 'in_progress' }, session))}
                      className={`h-8 rounded-lg px-3 text-xs ${styles.buttonGhost}`}
                    >
                      {opsText("Start")}</button>
                  ) : null}
                  {isInProgress || isWaiting ? (
                    <button
                      type="button"
                      onClick={() => isWaiting ? void runTaskAction(() => updateCrmWorkflowReminder(task.id, { status: 'in_progress', waitingOn: null, followUpAt: null }, session)) : (setWaitingTask(task.id), setWaitingOn('client'), setFollowUpAt(''))}
                      className={`h-8 rounded-lg px-3 text-xs ${styles.buttonGhost}`}
                    >
                      {isWaiting ? opsText("Resume work") : opsText("Waiting for...")}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => runTaskAction(() => completeCrmWorkflowReminder(task.id, session))}
                    className="h-8 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white"
                  >
                    {opsText("Complete")}</button>
                  <button
                    type="button"
                    onClick={() => runTaskAction(() => cancelCrmWorkflowReminder(task.id, session))}
                    aria-label={`${opsText('Cancel')} ${task.title}`}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${styles.buttonGhost}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  {assignableUsers.length > 0 ? (
                    <select
                      value={task.assignedToId ?? ''}
                      onChange={(event) =>
                        runTaskAction(() =>
                          updateCrmWorkflowReminder(task.id, { assignedToId: event.target.value ? Number(event.target.value) : null }, session),
                        )
                      }
                      className={`h-8 rounded-lg border px-2 text-xs outline-none ${styles.select}`}
                      aria-label={`${opsText('Assign')} ${task.title}`}
                    >
                      <option value="">{opsText("Unassigned")}</option>
                      {assignableUsers.filter(user => user.isActive).map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.displayName || user.username}
                        </option>
                      ))}
                    </select>
                  ) : task.assignedToId !== currentUserId ? (
                    <button
                      type="button"
                      onClick={() => runTaskAction(() => updateCrmWorkflowReminder(task.id, { assignedToId: currentUserId }, session))}
                      className={`h-8 rounded-lg px-3 text-xs ${styles.buttonGhost}`}
                    >
                      {opsText("Assign to me")}</button>
                  ) : null}
                </fieldset>
                <div>
                  <button
                    type="button"
                    onClick={() => onOpenLead(String(task.leadId))}
                    aria-label={`${opsText('Open request')}: ${task.title}`}
                    className={`flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm ${styles.buttonGhost}`}
                  >
                    {opsText("Open journey")}<ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                {waitingTask === task.id ? (
                  <form className={`grid gap-3 rounded-xl border p-4 md:col-span-2 2xl:col-span-3 ${styles.panelSoft}`} onSubmit={event => {
                    event.preventDefault();
                    if (!followUpAt || new Date(followUpAt).getTime() <= Date.now()) { setError('Choose a follow-up time in the future.'); return; }
                    void runTaskAction(() => updateCrmWorkflowReminder(task.id, { status: 'waiting', waitingOn, followUpAt: new Date(followUpAt).toISOString() }, session));
                  }}>
                    <p className="text-sm font-semibold">{opsText("Keep responsibility while you wait")}</p>
                    <label className="text-sm">{opsText("Waiting for")}<select value={waitingOn} onChange={event => setWaitingOn(event.target.value as typeof waitingOn)} className={`mt-1 block w-full rounded-lg border p-2 ${styles.select}`}>
                        <option value="client">{opsText("Client response")}</option><option value="supplier">{opsText("Supplier response")}</option><option value="internal">{opsText("Internal decision")}</option>
                      </select>
                    </label>
                    <label className="text-sm">{opsText("Follow up at (your local time)")}<input type="datetime-local" required value={followUpAt} onChange={event => setFollowUpAt(event.target.value)} className={`mt-1 block w-full rounded-lg border p-2 ${styles.input}`} />
                    </label>
                    <div className="flex gap-2"><button disabled={busy} className="crm-primary px-4 py-2 text-sm">{opsText("Save follow-up")}</button><button type="button" onClick={() => { setWaitingTask(null); setError(''); }} className={`rounded-lg px-4 py-2 text-sm ${styles.buttonGhost}`}>{opsText("Keep working")}</button></div>
                  </form>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
