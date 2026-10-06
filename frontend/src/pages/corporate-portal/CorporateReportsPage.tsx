import { useState } from 'react';
import { opsLocale, opsText } from '../../locales/operations';
import type { CorporateBillingSummary, CorporatePortalTheme, CorporateTripInvoice, CorporateTripPayment } from '../../types/corporatePortal';
import { ReportControls, ReportMetric } from '../../modules/reports/ReportControls';
import { useReportCopy } from '../../modules/reports/useReportCopy';
import { periodRange, validRange, type ReportPeriod } from '../../modules/reports/reportMath';
import { billingRows, billingTotals } from '../../modules/reports/billingMath';
import { corporatePortalThemeStyles } from './portalTheme';

export function CorporateReportsPage({ summary, invoices, payments, theme, onOpenRequest, query = '' }: {
  summary: CorporateBillingSummary | null; invoices: CorporateTripInvoice[]; payments: CorporateTripPayment[]; theme: CorporatePortalTheme; onOpenRequest: (tripId: string) => void; query?: string;
}) {
  const c = useReportCopy();
  const styles = corporatePortalThemeStyles[theme];
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [currency, setCurrency] = useState('all');
  const [metric, setMetric] = useState<'invoiced' | 'collected' | 'outstanding' | 'overdue'>('invoiced');
  const [limit, setLimit] = useState(20);
  const range = periodRange(period, custom);
  const rows = billingRows(invoices.filter(i => `${i.invoiceNumber} ${i.tripRequestId}`.toLowerCase().includes(query.trim().toLowerCase())), payments, range, currency);
  const totals = billingTotals(rows);
  const visible = rows.filter(r => metric === 'invoiced' || (metric === 'overdue' ? r.overdue : r[metric] > 0));
  const currencies = [...new Set(invoices.map(i => i.currency))].sort();
  const excluded = invoices.filter(i => !['draft', 'void'].includes(i.status) && (!i.issuedAt || !Number.isFinite(new Date(i.issuedAt).getTime()))).length;
  const mismatches = rows.reduce((n, r) => n + r.mismatches, 0);
  const money = (value: number, unit: string) => `${unit} ${value.toLocaleString(opsLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const labels = { invoiced: c('Invoiced in period', 'Faturado no período'), collected: c('Collected to date', 'Recebido até hoje'), outstanding: c('Outstanding now', 'Saldo em aberto'), overdue: c('Overdue now', 'Saldo em atraso') };
  return <section className="space-y-5">
    <div><h2 className="text-2xl font-semibold">{c('Spend & billing', 'Despesas e faturação')}</h2><p className={`mt-2 text-sm ${styles.muted}`}>{c('Select invoices by issue date. Collections and balances show the current position for those invoices, separately in each currency.', 'Selecione faturas pela data de emissão. Recebimentos e saldos mostram a posição atual dessas faturas, separadamente por moeda.')}</p></div>
    <ReportControls period={period} custom={custom} onPeriod={setPeriod} onCustom={setCustom}><label className="grid gap-1 text-xs">{c('Currency', 'Moeda')}<select value={currency} onChange={e => setCurrency(e.target.value)} className="crm-select rounded-lg border p-2"><option value="all">{c('All currencies', 'Todas as moedas')}</option>{currencies.map(unit => <option key={unit}>{unit}</option>)}</select></label></ReportControls>
    {!summary ? <p role="status">{c('Billing data is unavailable. Refresh to try again.', 'Dados de faturação indisponíveis. Atualize para tentar novamente.')}</p> : !validRange(range) ? <p role="alert">{c('Choose a valid date range.', 'Selecione um período válido.')}</p> : <>
      {(excluded > 0 || mismatches > 0) && <p role="status" className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm">{c('Data to review', 'Dados a rever')}: {excluded} {c('invoices without a valid issue date excluded', 'faturas sem data de emissão válida excluídas')}; {mismatches} {c('payments with a different currency excluded from collections', 'pagamentos noutra moeda excluídos dos recebimentos')}.</p>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{(Object.keys(labels) as (keyof typeof labels)[]).map(key => <ReportMetric key={key} label={labels[key]} value={totals.length ? totals.map(t => money(t[key], t.currency)).join(' · ') : '—'} note={key === 'invoiced' ? c('Draft and void invoices excluded', 'Exclui rascunhos e faturas anuladas') : key === 'collected' ? c('Received and reconciled payments on selected invoices, across all dates', 'Pagamentos recebidos e reconciliados das faturas selecionadas, em todas as datas') : key === 'overdue' ? c('Unpaid balance past the due date', 'Saldo por pagar após a data de vencimento') : c('Overpayments do not offset other invoices', 'Pagamentos em excesso não compensam outras faturas')} active={metric === key} onClick={() => { setMetric(key); setLimit(20); }} />)}</div>
      {totals.some(t => t.credit > 0) && <p className="text-sm">{c('Overpayments to review', 'Pagamentos em excesso a rever')}: {totals.filter(t => t.credit > 0).map(t => money(t.credit, t.currency)).join(' · ')}</p>}
      <div className={`rounded-xl border p-5 ${styles.panel}`}><h3 className="font-semibold">{labels[metric]} · {visible.length} {c('invoices', 'faturas')}</h3><p className={`mt-1 text-xs ${styles.muted}`}>{c('Select an invoice to open the travel request and review its billing records.', 'Selecione uma fatura para abrir o pedido de viagem e consultar os registos de faturação.')}</p>
        <div className="mt-4 divide-y">{visible.slice(0, limit).map(row => <button key={row.invoice.id} onClick={() => onOpenRequest(row.invoice.tripRequestId)} className="grid w-full gap-3 py-4 text-left sm:grid-cols-3"><span><strong className="block text-sm">{row.invoice.invoiceNumber}</strong><span className={`text-xs ${styles.muted}`}>{row.invoice.tripRequestId} · {opsText(row.invoice.status.replace(/_/g, ' '))}</span></span><span className="text-xs">{c('Issued', 'Emitida')}: {row.invoice.issuedAt?.slice(0, 10)}<br />{c('Due', 'Vencimento')}: {row.invoice.dueDate || '—'}</span><span className="text-sm sm:text-right">{money(metric === 'invoiced' ? row.invoice.amount : metric === 'collected' ? row.collected : row.outstanding, row.invoice.currency)} →</span></button>)}</div>
        {!visible.length && <p className={`py-6 text-sm ${styles.muted}`}>{c('No invoices match this selection.', 'Nenhuma fatura corresponde a esta seleção.')}</p>}
        {visible.length > limit && <button onClick={() => setLimit(limit + 20)} className="mt-3 rounded-lg border px-4 py-2">{c('Show more', 'Mostrar mais')}</button>}
      </div>
    </>}
  </section>;
}
