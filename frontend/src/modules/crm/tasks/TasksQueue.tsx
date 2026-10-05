import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckSquare, ChevronRight, X } from 'lucide-react';
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
        .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()),
    [currentUserId, openTasks, period, scope],
  );

  async function runTaskAction(action: () => Promise<unknown>) {
    try {
      await action();
      setError('');
      await refresh();
    } catch (err) {
      // Completion-condition failures come back as 409 with a detail message.
      setError(err instanceof Error ? err.message : 'Could not update the task.');
    }
  }

  if (!session?.token) {
    return <div className={`rounded-xl border p-5 text-sm ${styles.panel}`}>The task queue needs the CRM backend connection.</div>;
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {scopeTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setScope(tab.key)}
              className={`inline-flex h-10 items-center rounded-xl border px-4 text-sm transition ${
                scope === tab.key ? `${styles.buttonActive} border-transparent` : `${styles.buttonGhost} border-white/10`
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {periodTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setPeriod(tab.key)}
              className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm transition ${
                period === tab.key ? `${styles.buttonActive} border-transparent` : `${styles.buttonGhost} border-white/10`
              }`}
            >
              {tab.label}
              <span className="rounded-full bg-black/15 px-2 py-0.5 text-xs">{periodCounts[tab.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}
      {isLoading ? <div className={`rounded-xl border px-4 py-3 text-sm ${styles.panelSoft}`}>Loading tasks...</div> : null}

      <div className={`overflow-hidden rounded-xl border ${styles.panel}`}>
        <div className={`hidden grid-cols-[minmax(0,1.6fr)_minmax(120px,0.6fr)_minmax(130px,0.7fr)_minmax(120px,0.6fr)_minmax(150px,0.8fr)_minmax(150px,0.9fr)_minmax(210px,1fr)] gap-4 border-b px-4 py-3 text-xs uppercase tracking-[0.12em] lg:grid ${styles.tableHead}`}>
          <div>Task</div>
          <div>Assignee</div>
          <div>Due</div>
          <div>Origin</div>
          <div>Completion</div>
          <div>Status</div>
          <div>Actions</div>
        </div>
        {visibleTasks.length === 0 && !isLoading ? (
          <div className="p-10 text-center">
            <CheckSquare className={`mx-auto h-10 w-10 ${styles.muted}`} />
            <div className="mt-4 text-lg font-semibold">No tasks in this view</div>
            <p className={`mt-2 text-sm ${styles.muted}`}>Switch scope or period to see other work, or generate reminders from a request.</p>
          </div>
        ) : (
          visibleTasks.map((task) => {
            const isWaiting = task.status === 'waiting';
            const isInProgress = task.status === 'in_progress';
            const assigneeName = task.assignedToName?.trim() || 'Unassigned';
            return (
              <div
                key={task.id}
                className={`grid gap-3 border-b px-4 py-3 text-left lg:grid-cols-[minmax(0,1.6fr)_minmax(120px,0.6fr)_minmax(130px,0.7fr)_minmax(120px,0.6fr)_minmax(150px,0.8fr)_minmax(150px,0.9fr)_minmax(210px,1fr)] lg:items-center ${styles.row}`}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{task.title}</div>
                  <div className={`mt-1 truncate text-xs ${styles.muted}`}>
                    <button type="button" onClick={() => onOpenLead(String(task.leadId))} className="font-medium text-[#d4af37]">
                      {task.leadName || 'Open request'}
                    </button>
                    {' · '}
                    {reminderTypeLabels[task.reminderType] ?? task.reminderType}
                  </div>
                  {task.message ? <div className={`mt-1 truncate text-xs ${styles.muted}`}>{task.message}</div> : null}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{assigneeName}</div>
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{formatDate(task.dueAt)}</div>
                  {isWaiting && task.followUpAt ? (
                    <div className={`mt-1 truncate text-xs ${styles.muted}`}>Follow up {formatDate(task.followUpAt)}</div>
                  ) : null}
                </div>
                <div className={`truncate text-xs ${styles.soft}`}>{task.origin ? reminderOriginLabels[task.origin] : '—'}</div>
                <div className={`truncate text-xs ${styles.soft}`}>
                  {task.completionCondition ? reminderCompletionConditionLabels[task.completionCondition] : '—'}
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] ring-1 ${
                      isWaiting
                        ? 'bg-amber-500/15 text-amber-200 ring-amber-300/30'
                        : isInProgress
                          ? 'bg-sky-500/15 text-sky-200 ring-sky-300/30'
                          : styles.buttonGhost
                    }`}
                  >
                    {reminderStatusLabels[task.status]}
                  </span>
                  {isWaiting && task.waitingOn ? (
                    <span className={`truncate text-[11px] ${styles.muted}`}>on {reminderWaitingOnLabels[task.waitingOn]}</span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {task.status === 'pending' ? (
                    <button
                      type="button"
                      onClick={() => runTaskAction(() => updateCrmWorkflowReminder(task.id, { status: 'in_progress' }, session))}
                      className={`h-8 rounded-lg px-3 text-xs ${styles.buttonGhost}`}
                    >
                      Start
                    </button>
                  ) : null}
                  {isInProgress || isWaiting ? (
                    <button
                      type="button"
                      onClick={() => runTaskAction(() => updateCrmWorkflowReminder(task.id, isWaiting ? { status: 'in_progress' } : { status: 'waiting' }, session))}
                      className={`h-8 rounded-lg px-3 text-xs ${styles.buttonGhost}`}
                    >
                      {isWaiting ? 'Resume' : 'Wait'}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => runTaskAction(() => completeCrmWorkflowReminder(task.id, session))}
                    className="h-8 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white"
                  >
                    Complete
                  </button>
                  <button
                    type="button"
                    onClick={() => runTaskAction(() => cancelCrmWorkflowReminder(task.id, session))}
                    title="Cancel task"
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
                      title="Assign task"
                    >
                      <option value="">Unassigned</option>
                      {assignableUsers.map((user) => (
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
                      Assign to me
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onOpenLead(String(task.leadId))}
                    title="Open linked request"
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${styles.buttonGhost}`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
