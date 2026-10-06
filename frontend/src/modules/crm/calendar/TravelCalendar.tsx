import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import type { CrmLead, CrmTripItinerary, CrmWorkflowReminder } from '../../../types';
import type { CrmSurfaceStyles } from '../shared/types';
import { calendarEvents, dateKey, type CalendarEvent } from './calendarEvents';

export function TravelCalendar({ leads, itineraries, tasks, styles, onOpenLead, loading, query }: {
  leads: CrmLead[]; itineraries: CrmTripItinerary[]; tasks: CrmWorkflowReminder[]; styles: CrmSurfaceStyles;
  onOpenLead: (id: string) => void; loading: boolean; query: string;
}) {
  const { i18n } = useTranslation();
  const pt = i18n.resolvedLanguage === 'pt';
  const copy = (en: string, portuguese: string) => pt ? portuguese : en;
  const locale = pt ? 'pt-MZ' : 'en-GB';
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [view, setView] = useState<'month' | 'agenda'>('month');
  const [kind, setKind] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);
  const { events, unscheduled } = useMemo(() => calendarEvents(leads, itineraries, tasks), [leads, itineraries, tasks]);
  const filtered = events.filter(event => (kind === 'all' || event.kind === kind) && `${event.title} ${event.detail}`.toLowerCase().includes(query.toLowerCase()));
  const first = dateKey(month);
  const last = dateKey(new Date(month.getFullYear(), month.getMonth() + 1, 0));
  const monthEvents = filtered.filter(event => event.start <= last && event.end >= first);
  const agenda = selected ? monthEvents.filter(event => event.start <= selected && event.end >= selected) : monthEvents;
  const offset = (month.getDay() + 6) % 7;
  const days = Array.from({ length: 42 }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index - offset + 1));
  const today = dateKey(new Date());
  const labels = { travel: copy('Travel', 'Viagem'), task: copy('Task deadline', 'Prazo de tarefa'), followup: copy('Follow-up', 'Seguimento') };
  const tones = { travel: 'border-orange-400/40 bg-orange-400/10', task: 'border-sky-400/40 bg-sky-400/10', followup: 'border-violet-400/40 bg-violet-400/10' };
  const format = (day: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(`${day}T12:00:00`));
  function move(amount: number) { setMonth(new Date(month.getFullYear(), month.getMonth() + amount, 1)); setSelected(null); }
  function eventCard(event: CalendarEvent) {
    return <button key={event.id} type="button" onClick={() => onOpenLead(event.leadId)} className={`w-full rounded-xl border p-4 text-left transition hover:brightness-110 ${tones[event.kind]}`}>
      <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold">{labels[event.kind]} · {format(event.start)}{event.at ? ` · ${new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(event.at))}` : ""}{event.end !== event.start ? ` – ${format(event.end)}` : ''}</span><ArrowUpRight className="h-4 w-4 shrink-0" /></div>
      <div className="mt-2 font-semibold break-words">{event.title}</div><div className={`mt-1 text-sm ${styles.muted}`}>{event.detail}</div>
      <span className={`mt-2 block text-xs ${styles.muted}`}>{copy('Open request', 'Abrir pedido')}</span>
    </button>;
  }
  return <section className="space-y-5" aria-label={copy('Travel and tasks calendar', 'Calendário de viagens e tarefas')}>
    <div className={`rounded-2xl border p-5 ${styles.panel}`}>
      <p className="crm-accent-text text-xs font-semibold uppercase tracking-widest">{copy('Plan ahead', 'Planear com antecedência')}</p>
      <h2 className="mt-2 text-2xl font-semibold">{copy('Every journey. Every next step.', 'Cada viagem. Cada próximo passo.')}</h2>
      <p className={`mt-2 text-sm ${styles.muted}`}>{copy('Travel dates, task deadlines and scheduled follow-ups in one place. Dates reflect your local time.', 'Datas de viagem, prazos e seguimentos num só lugar. As datas respeitam a sua hora local.')}</p>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2"><button type="button" onClick={() => move(-1)} aria-label={copy('Previous month', 'Mês anterior')} className={`rounded-lg p-2 ${styles.buttonGhost}`}><ChevronLeft className="h-5 w-5" /></button><h3 aria-live="polite" className="min-w-40 text-center font-semibold">{new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(month)}</h3><button type="button" onClick={() => move(1)} aria-label={copy('Next month', 'Próximo mês')} className={`rounded-lg p-2 ${styles.buttonGhost}`}><ChevronRight className="h-5 w-5" /></button><button type="button" className={`rounded-lg px-3 py-2 text-sm ${styles.buttonGhost}`} onClick={() => { setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); setSelected(null); }}>{copy('Today', 'Hoje')}</button></div>
      <div className="flex flex-wrap gap-2"><select aria-label={copy('Event type', 'Tipo de evento')} value={kind} onChange={event => setKind(event.target.value)} className={`rounded-lg border px-3 py-2 text-sm ${styles.select}`}><option value="all">{copy('All events', 'Todos os eventos')}</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><div className="hidden gap-1 md:flex">{(['month', 'agenda'] as const).map(item => <button type="button" key={item} aria-pressed={view === item} onClick={() => { setView(item); setSelected(null); }} className={`rounded-lg px-3 py-2 text-sm ${view === item ? styles.buttonActive : styles.buttonGhost}`}>{item === 'month' ? copy('Month', 'Mês') : 'Agenda'}</button>)}</div></div>
    </div>
    {loading ? <p role="status">{copy('Loading calendar…', 'A carregar calendário…')}</p> : <>
      {view === 'month' && <div className={`hidden overflow-hidden rounded-xl border md:block ${styles.panel}`}>
        <div className={`grid grid-cols-7 border-b ${styles.tableHead}`}>{days.slice(0, 7).map(day => <div className="p-3 text-center text-xs font-semibold" key={dateKey(day)}>{new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day)}</div>)}</div>
        <div className="grid grid-cols-7">{days.map(day => {
          const key = dateKey(day); const entries = filtered.filter(event => event.start <= key && event.end >= key);
          return <button type="button" key={key} onClick={() => { setSelected(key); if (day.getMonth() !== month.getMonth()) setMonth(new Date(day.getFullYear(), day.getMonth(), 1)); }} aria-pressed={selected === key} aria-label={`${new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(day)}: ${entries.length} ${entries.length === 1 ? copy('event', 'evento') : copy('events', 'eventos')}`} className={`flex min-h-28 min-w-0 flex-col items-stretch border-b border-r border-current/10 p-2 text-left ${day.getMonth() !== month.getMonth() ? 'opacity-45' : ''} ${selected === key ? styles.rowActive : styles.row}`}>
            <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs ${key === today ? 'bg-orange-500 text-slate-950 font-bold' : ''}`}>{day.getDate()}</span>
            {entries.slice(0, 2).map(event => <span key={event.id} className={`mt-1 block truncate rounded border px-1 py-1 text-[11px] ${tones[event.kind]}`}>{labels[event.kind]} · {event.title}</span>)}{entries.length > 2 && <span className="mt-1 block text-xs">+{entries.length - 2} {copy('more', 'mais')}</span>}
          </button>;
        })}</div>
      </div>}
      <div><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">{selected ? format(selected) : copy('This month', 'Este mês')} · {agenda.length}</h3>{selected && <button className={`rounded-lg px-3 py-2 text-sm ${styles.buttonGhost}`} onClick={() => setSelected(null)}>{copy('Show whole month', 'Ver mês completo')}</button>}</div><div className="grid gap-3 lg:grid-cols-2">{agenda.map(eventCard)}</div>{!agenda.length && <div className={`rounded-xl border p-8 text-center ${styles.panel}`}><p className="font-semibold">{copy('No events in this period', 'Sem eventos neste período')}</p><p className={`mt-2 text-sm ${styles.muted}`}>{copy('Change month or event type to explore your schedule.', 'Altere o mês ou o tipo de evento para consultar a agenda.')}</p></div>}</div>
      {!!unscheduled.length && <details className={`rounded-xl border p-4 ${styles.panelSoft}`}><summary className="cursor-pointer font-medium">{copy('Dates to confirm', 'Datas por confirmar')} · {unscheduled.length}</summary><p className={`my-3 text-sm ${styles.muted}`}>{copy('Flexible or unstructured dates stay here until exact itinerary dates are set.', 'As datas flexíveis ou em texto ficam aqui até definir datas exactas no itinerário.')}</p><div className="grid gap-2 sm:grid-cols-2">{unscheduled.filter(lead => `${lead.name} ${lead.destination}`.toLowerCase().includes(query.toLowerCase())).map(lead => <button key={lead.id} onClick={() => onOpenLead(lead.id)} className={`rounded-lg p-3 text-left ${styles.buttonGhost}`}><span className="block font-medium">{lead.name} · {lead.destination}</span><span className="text-sm">{lead.dates || copy('Dates not supplied', 'Sem datas indicadas')}</span></button>)}</div></details>}
    </>}
  </section>;
}
