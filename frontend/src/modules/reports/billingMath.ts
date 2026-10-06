import type { CorporateTripInvoice, CorporateTripPayment } from '../../types/corporatePortal';
import { dayKey, inRange, sumMoney, validRange, type DateRange } from './reportMath.ts';

export function invoiceDueDay(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value) && validRange({ from: value, to: '' })) return value;
  const match = /^(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})$/.exec(value);
  if (!match) return null;
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(match[2]) + 1;
  const key = `${match[3]}-${String(month).padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  return validRange({ from: key, to: '' }) ? key : null;
}

export function billingRows(invoices: CorporateTripInvoice[], payments: CorporateTripPayment[], range: DateRange, currency: string, now = new Date()) {
  return invoices.filter(i => !['draft', 'void'].includes(i.status) && inRange(i.issuedAt, range) && (currency === 'all' || i.currency === currency)).map(invoice => {
    const linked = payments.filter(p => p.invoiceId === invoice.id && ['received', 'reconciled'].includes(p.status));
    const collected = sumMoney(linked.filter(p => p.currency === invoice.currency).map(p => p.amount));
    const difference = sumMoney([invoice.amount, -collected]);
    const outstanding = Math.max(0, difference);
    const due = invoiceDueDay(invoice.dueDate || '');
    return { invoice, collected, outstanding, credit: Math.max(0, -difference), overdue: outstanding > 0 && !!due && due < dayKey(now), mismatches: linked.filter(p => p.currency !== invoice.currency).length };
  });
}

export function billingTotals(rows: ReturnType<typeof billingRows>) {
  return [...new Set(rows.map(r => r.invoice.currency))].sort().map(currency => {
    const selected = rows.filter(r => r.invoice.currency === currency);
    return { currency, invoiced: sumMoney(selected.map(r => r.invoice.amount)), collected: sumMoney(selected.map(r => r.collected)), outstanding: sumMoney(selected.map(r => r.outstanding)), overdue: sumMoney(selected.filter(r => r.overdue).map(r => r.outstanding)), credit: sumMoney(selected.map(r => r.credit)) };
  });
}
