import assert from 'node:assert/strict';
import test from 'node:test';
import { previousRange, validRange, inRange } from '../src/modules/reports/reportMath.ts';
import { cohortLeads, latestReportQuotes, quoteTotals, reportGroups } from '../src/modules/crm/reports/reportData.ts';
import { billingRows, billingTotals, invoiceDueDay } from '../src/modules/reports/billingMath.ts';
import type { CrmLead, CrmQuote, CrmWorkflowReminder } from '../src/types.ts';
import type { CorporateTripInvoice, CorporateTripPayment } from '../src/types/corporatePortal.ts';

const range = { from: '2026-10-01', to: '2026-10-06' };
test('report periods validate dates and compare equal inclusive periods across months', () => {
  assert.equal(invoiceDueDay('30 Sep 2026'), '2026-09-30');
  assert.equal(invoiceDueDay('01 Nov 2026'), '2026-11-01');
  assert.equal(invoiceDueDay('30 Feb 2026'), null);
  assert.deepEqual(previousRange(range), { from: '2026-09-25', to: '2026-09-30' });
  assert.equal(validRange({ from: '2026-02-30', to: '' }), false);
  assert.equal(validRange({ from: '2026-10-06', to: '2026-10-01' }), false);
  assert.equal(inRange(null, range), false);
  assert.equal(inRange('2026-10-06', range), true);
});
test('CRM scopes the creation cohort and reports only open work on active requests', () => {
  const leads = [{ id: 'a', createdAt: '2026-10-02', serviceKey: 'classic', ownerId: 1, status: 'new', updatedAt: '2026-09-01' }, { id: 'b', createdAt: '2026-09-02', serviceKey: 'luxury', status: 'completed' }] as CrmLead[];
  assert.deepEqual(cohortLeads(leads, range, 'classic', '1').map(l => l.id), ['a']);
  assert.equal(cohortLeads(leads, range, 'classic', 'unassigned').length, 0);
  const tasks = [{ leadId: 'a', status: 'completed', dueAt: '2026-10-01' }, { leadId: 'b', status: 'pending', dueAt: '2026-10-01' }] as CrmWorkflowReminder[];
  assert.equal(reportGroups(leads, tasks, new Date('2026-10-06')).overdue.length, 0);
  assert.equal(reportGroups(leads, tasks, new Date('2026-10-06')).stale.length, 1);
});
test('latest quote versions are never double counted or revived after rejection; margin respects access', () => {
  const leads = [{ id: 'a' }, { id: 'b' }] as CrmLead[];
  const quotes = [{ leadId: 'a', version: 1, status: 'sent', currency: 'USD', subtotalSell: '100', margin: '20' }, { leadId: 'a', version: 2, status: 'rejected', currency: 'USD', subtotalSell: '200' }, { leadId: 'b', version: 1, status: 'draft', currency: 'MZN', subtotalSell: '300', margin: '50' }] as CrmQuote[];
  const latest = latestReportQuotes(quotes, leads);
  assert.equal(latest.length, 1);
  assert.deepEqual(quoteTotals(latest, false), [{ currency: 'MZN', count: 1, value: 300, margin: null }]);
  assert.equal(quoteTotals(latest, true)[0].margin, 50);
});
test('billing separates currencies, excludes drafts and failed payments, and does not net credits against debt', () => {
  const invoices = [{ id: 'a', amount: 100, currency: 'USD', status: 'sent', issuedAt: '2026-10-01', dueDate: '2026-10-02' }, { id: 'b', amount: 100, currency: 'USD', status: 'sent', issuedAt: '2026-10-01', dueDate: '2026-10-02' }, { id: 'c', amount: 500, currency: 'MZN', status: 'sent', issuedAt: '2026-10-01', dueDate: '2026-10-20' }, { id: 'd', amount: 999, currency: 'USD', status: 'draft', issuedAt: '2026-10-01' }] as CorporateTripInvoice[];
  const payments = [{ invoiceId: 'a', amount: 150, currency: 'USD', status: 'received' }, { invoiceId: 'b', amount: 100, currency: 'USD', status: 'failed' }, { invoiceId: 'b', amount: 100, currency: 'MZN', status: 'reconciled' }] as CorporateTripPayment[];
  const rows = billingRows(invoices, payments, range, 'all', new Date('2026-10-06T12:00:00'));
  assert.equal(rows.length, 3);
  assert.equal(rows[1].mismatches, 1);
  assert.deepEqual(billingTotals(rows), [{ currency: 'MZN', invoiced: 500, collected: 0, outstanding: 500, overdue: 0, credit: 0 }, { currency: 'USD', invoiced: 200, collected: 150, outstanding: 100, overdue: 100, credit: 50 }]);
});
