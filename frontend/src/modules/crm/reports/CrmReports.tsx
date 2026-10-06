import { useState } from 'react';
import type { CrmLead, CrmQuote, CrmWorkflowReminder } from '../../../types';
import { opsLocale, opsText } from '../../../locales/operations';
import { ReportControls, ReportMetric } from '../../reports/ReportControls';
import { useReportCopy } from '../../reports/useReportCopy';
import { downloadReport, periodRange, previousRange, validRange, type ReportPeriod } from '../../reports/reportMath';
import { cohortLeads, latestReportQuotes, quoteTotals, reportGroups } from './reportData';

export function CrmReports({ leads, quotes, tasks, canViewFinancials, canExport, onOpenLead, query = '' }: {
  leads: CrmLead[]; quotes: CrmQuote[]; tasks: CrmWorkflowReminder[]; canViewFinancials: boolean; canExport: boolean; onOpenLead: (lead: CrmLead) => void; query?: string;
}) {
  const c = useReportCopy();
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [service, setService] = useState('all');
  const [owner, setOwner] = useState('all');
  const [tab, setTab] = useState('overview');
  const [group, setGroup] = useState<keyof ReturnType<typeof reportGroups>>('all');
  const [limit, setLimit] = useState(20);
  const range = periodRange(period, custom);
  const searched = leads.filter(l => `${l.id} ${l.name} ${l.destination} ${l.ownerName || ''}`.toLowerCase().includes(query.trim().toLowerCase()));
  const cohort = cohortLeads(searched, range, service, owner);
  const groups = reportGroups(cohort, tasks);
  const priorRange = previousRange(range);
  const prior = priorRange ? cohortLeads(searched, priorRange, service, owner).length : null;
  const rows = groups[group];
  const totals = quoteTotals(latestReportQuotes(quotes, cohort), canViewFinancials);
  const owners = [...new Map(leads.filter(l => l.ownerId).map(l => [String(l.ownerId), l.ownerName || String(l.ownerId)])).entries()];
  const labels = { all: c('Requests', 'Pedidos'), active: c('Active requests', 'Pedidos ativos'), confirmed: c('Confirmed', 'Confirmados'), proposal: c('At proposal stage', 'Em proposta'), lost: c('Lost', 'Perdidos'), overdue: c('Overdue tasks', 'Tarefas em atraso'), unassigned: c('Unassigned', 'Sem responsável'), stale: c('No update for 7 days', 'Sem atualização há 7 dias') };
  const metrics: (keyof typeof groups)[] = tab === 'operations' ? ['active', 'overdue', 'unassigned', 'stale'] : tab === 'commercial' ? ['all', 'proposal', 'confirmed', 'lost'] : ['all', 'active', 'confirmed', 'overdue'];
  return <section className="space-y-5">
    <div><h2 className="text-2xl font-semibold">{c('Reports', 'Relatórios')}</h2><p className="mt-2 text-sm crm-muted">{c('Requests created in the selected period, with their current status. Only records available to your role are included.', 'Pedidos criados no período selecionado, com o estado atual. Apenas os registos acessíveis à sua função são incluídos.')}</p></div>
    <ReportControls period={period} custom={custom} onPeriod={setPeriod} onCustom={setCustom}>
      <label className="grid gap-1 text-xs">{c('Service', 'Serviço')}<select className="crm-select rounded-lg border p-2" value={service} onChange={e => setService(e.target.value)}><option value="all">{c('All services', 'Todos os serviços')}</option>{['classic', 'luxury', 'corporate'].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}</select></label>
      <label className="grid gap-1 text-xs">{c('Owner', 'Responsável')}<select className="crm-select rounded-lg border p-2" value={owner} onChange={e => setOwner(e.target.value)}><option value="all">{c('All owners', 'Todos os responsáveis')}</option><option value="unassigned">{labels.unassigned}</option>{owners.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
    </ReportControls>
    {!validRange(range) ? <p role="alert">{c('Choose a valid date range.', 'Selecione um período válido.')}</p> : <>
      <div className="flex flex-wrap gap-2" aria-label={c('Report sections', 'Secções do relatório')}>{[['overview', c('Overview', 'Visão geral')], ['commercial', c('Commercial', 'Comercial')], ['operations', c('Operations', 'Operações')]].map(([id, label]) => <button key={id} aria-pressed={tab === id} className={`rounded-lg border px-4 py-2 text-sm ${tab === id ? 'bg-orange-500/15 border-orange-400' : 'crm-panel'}`} onClick={() => { setTab(id); setGroup('all'); }}>{label}</button>)}</div>
      {prior !== null && <p className="text-xs crm-muted">{c('Request intake', 'Entrada de pedidos')}: {cohort.length} · {c('Previous equal-length period', 'Período anterior de igual duração')}: {prior} ({priorRange?.from} – {priorRange?.to})</p>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(key => <ReportMetric key={key} label={labels[key]} value={groups[key].length} active={group === key} onClick={() => { setGroup(key); setLimit(20); }} note={key === 'overdue' ? c('Requests with an overdue open task or follow-up', 'Pedidos com tarefa ou acompanhamento em atraso') : key === 'stale' ? c('Based on last record update, not customer response time', 'Baseado na última atualização, não no tempo de resposta ao cliente') : key === 'confirmed' ? c('Won, in execution or completed', 'Ganhos, em execução ou concluídos') : c('Select to inspect requests', 'Selecione para consultar os pedidos')} />)}</div>
      {tab === 'overview' && cohort.length > 0 && <div className="crm-panel rounded-xl border p-5"><h3 className="font-semibold">{c('Requests by service', 'Pedidos por serviço')}</h3><div className="mt-4 grid gap-4 sm:grid-cols-3">{['classic', 'luxury', 'corporate'].map(key => { const count = cohort.filter(l => l.serviceKey === key).length; return <button key={key} className="text-left" onClick={() => { setService(key); setGroup('all'); }}><span className="flex justify-between text-sm"><span className="capitalize">{key}</span><strong>{count}</strong></span><span className="mt-2 block h-2 rounded-full bg-orange-500/10"><span className="block h-2 rounded-full bg-orange-500" style={{ width: `${count / cohort.length * 100}%` }} /></span></button>; })}</div></div>}
      {tab === 'commercial' && <div className="crm-panel rounded-xl border p-5"><h3 className="font-semibold">{c('Current quoted value', 'Valor atual das propostas')}</h3><p className="my-2 text-xs crm-muted">{c('Latest quote per request, including drafts. Rejected and expired quotes excluded. These values are not revenue or collected payments.', 'Última proposta por pedido, incluindo rascunhos. Exclui propostas rejeitadas e expiradas. Estes valores não representam receitas ou pagamentos recebidos.')}</p>{totals.length === 0 ? <p>{c('No eligible quotes in this selection.', 'Sem propostas elegíveis nesta seleção.')}</p> : totals.map(t => <div key={t.currency} className="flex flex-wrap justify-between gap-3 border-t py-3"><strong>{t.currency} {t.value?.toLocaleString(opsLocale(), { minimumFractionDigits: 2 }) ?? '—'}</strong><span>{t.count} {c('quotes', 'propostas')}</span>{canViewFinancials && <span>{c('Quoted margin', 'Margem proposta')}: {t.currency} {t.margin?.toLocaleString(opsLocale(), { minimumFractionDigits: 2 }) ?? '—'}</span>}</div>)}</div>}
      <div className="crm-panel rounded-xl border p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{labels[group]} <span className="crm-muted">· {rows.length}</span></h3>{canExport && <button className="rounded-lg border px-3 py-2 text-sm" onClick={() => downloadReport('crm-report', [[c('Request', 'Pedido'), c('Created', 'Criado'), c('Service', 'Serviço'), c('Destination', 'Destino'), c('Status', 'Estado'), c('Owner', 'Responsável')], ...rows.map(l => [l.id, l.createdAt, l.serviceKey, l.destination, l.status, l.ownerName])])}>{c('Export selection', 'Exportar seleção')}</button>}</div>
        <div className="mt-3 divide-y">{rows.slice(0, limit).map(lead => <button key={lead.id} className="flex w-full flex-wrap items-center justify-between gap-2 py-4 text-left" onClick={() => onOpenLead(lead)}><span><strong className="block text-sm">{lead.name}</strong><span className="text-xs crm-muted">{lead.destination || '—'} · {lead.serviceKey}</span></span><span className="text-xs">{opsText(lead.status)} · {lead.ownerName || labels.unassigned} →</span></button>)}</div>
        {!rows.length && <p className="py-6 text-sm crm-muted">{c('No requests match this selection.', 'Nenhum pedido corresponde a esta seleção.')}</p>}
        {rows.length > limit && <button className="mt-3 rounded-lg border px-4 py-2" onClick={() => setLimit(limit + 20)}>{c('Show more', 'Mostrar mais')}</button>}
      </div>
    </>}
  </section>;
}
