import type { CorporateBillingSummary, CorporatePortalTheme, CorporateTripInvoice, CorporateTripPayment } from '../../types/corporatePortal';
import { corporatePortalThemeStyles } from './portalTheme';

function formatMoney(value: number, currency: string) {
  return `${currency} ${value.toLocaleString('en-US')}`;
}

function formatPaymentStatus(status: CorporateTripPayment['status']) {
  return status.replace(/_/g, ' ');
}

function formatInvoiceStatus(status: CorporateTripInvoice['status']) {
  return status.replace(/_/g, ' ');
}

function statusTone(status: CorporateTripInvoice['status'] | CorporateTripPayment['status']) {
  if (status === 'paid' || status === 'received' || status === 'reconciled') return 'text-emerald-300 bg-emerald-500/10';
  if (status === 'overdue' || status === 'failed') return 'text-rose-300 bg-rose-500/10';
  if (status === 'partially_paid') return 'text-amber-300 bg-amber-500/10';
  return 'text-sky-300 bg-sky-500/10';
}

export function CorporateReportsPage({
  summary,
  invoices,
  payments,
  theme,
  onOpenRequest,
}: {
  summary: CorporateBillingSummary | null;
  invoices: CorporateTripInvoice[];
  payments: CorporateTripPayment[];
  theme: CorporatePortalTheme;
  onOpenRequest: (tripId: string) => void;
}) {
  const styles = corporatePortalThemeStyles[theme];
  const currency = summary?.currency ?? invoices[0]?.currency ?? 'USD';
  const recentInvoices = invoices.slice(0, 6);
  const recentPayments = payments.slice(0, 6);

  return (
    <section className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="grid gap-4">
        <div className={`rounded-xl border p-4 shadow-2xl ${styles.panel}`}>
          <div className="mb-3">
            <h2 className="text-xl font-semibold">Billing summary</h2>
            <p className={`mt-1 text-sm ${styles.soft}`}>Live invoice and payment visibility from the CTM billing endpoints.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className={`rounded-xl border p-4 ${styles.surface}`}>
              <div className={`text-xs ${styles.muted}`}>Total invoiced</div>
              <div className="mt-1 text-lg font-semibold">{formatMoney(summary?.totalInvoiced ?? 0, currency)}</div>
            </div>
            <div className={`rounded-xl border p-4 ${styles.surface}`}>
              <div className={`text-xs ${styles.muted}`}>Collected</div>
              <div className="mt-1 text-lg font-semibold text-emerald-300">{formatMoney(summary?.totalCollected ?? 0, currency)}</div>
            </div>
            <div className={`rounded-xl border p-4 ${styles.surface}`}>
              <div className={`text-xs ${styles.muted}`}>Outstanding</div>
              <div className="mt-1 text-lg font-semibold text-amber-300">{formatMoney(summary?.outstandingBalance ?? 0, currency)}</div>
            </div>
            <div className={`rounded-xl border p-4 ${styles.surface}`}>
              <div className={`text-xs ${styles.muted}`}>Invoice count</div>
              <div className="mt-1 text-lg font-semibold">{summary?.invoiceCount ?? invoices.length}</div>
            </div>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <div className={`rounded-xl border px-4 py-3 text-sm ${styles.surface}`}>
              <div className={styles.muted}>Sent</div>
              <div className="mt-1 font-semibold">{summary?.sentCount ?? 0}</div>
            </div>
            <div className={`rounded-xl border px-4 py-3 text-sm ${styles.surface}`}>
              <div className={styles.muted}>Overdue</div>
              <div className="mt-1 font-semibold">{summary?.overdueCount ?? 0}</div>
            </div>
            <div className={`rounded-xl border px-4 py-3 text-sm ${styles.surface}`}>
              <div className={styles.muted}>Partially paid</div>
              <div className="mt-1 font-semibold">{summary?.partiallyPaidCount ?? 0}</div>
            </div>
            <div className={`rounded-xl border px-4 py-3 text-sm ${styles.surface}`}>
              <div className={styles.muted}>Paid</div>
              <div className="mt-1 font-semibold">{summary?.paidCount ?? 0}</div>
            </div>
          </div>
        </div>

        <div className={`rounded-xl border p-4 shadow-2xl ${styles.panel}`}>
          <div className="mb-3">
            <h3 className="text-base font-semibold">Recent invoices</h3>
            <p className={`mt-1 text-xs ${styles.muted}`}>Trip-linked invoice records now coming from the Django backend.</p>
          </div>
          <div className="space-y-3">
            {recentInvoices.length === 0 ? (
              <div className={`rounded-xl border px-4 py-4 text-sm ${styles.surface} ${styles.muted}`}>No invoices have been issued yet.</div>
            ) : (
              recentInvoices.map((invoice) => (
                <button
                  key={invoice.id}
                  type="button"
                  onClick={() => onOpenRequest(invoice.tripRequestId)}
                  className={`grid w-full gap-3 rounded-xl border px-4 py-3 text-left md:grid-cols-[1.1fr_0.7fr_0.8fr] ${styles.surface}`}
                >
                  <div>
                    <div className="text-sm font-semibold">{invoice.invoiceNumber}</div>
                    <div className={`mt-1 text-xs ${styles.muted}`}>{invoice.tripRequestId}</div>
                  </div>
                  <div>
                    <div className={`text-xs ${styles.muted}`}>Amount</div>
                    <div className="mt-1 text-sm font-medium">{formatMoney(invoice.amount, invoice.currency)}</div>
                  </div>
                  <div className="flex items-center md:justify-end">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] capitalize ${statusTone(invoice.status)}`}>
                      {formatInvoiceStatus(invoice.status)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <aside className="grid gap-4">
        <div className={`rounded-xl border p-4 shadow-2xl ${styles.panel}`}>
          <div className="mb-3">
            <h3 className="text-base font-semibold">Recent payments</h3>
            <p className={`mt-1 text-xs ${styles.muted}`}>Banking and settlement activity across active invoices.</p>
          </div>
          <div className="space-y-3">
            {recentPayments.length === 0 ? (
              <div className={`rounded-xl border px-4 py-4 text-sm ${styles.surface} ${styles.muted}`}>No payment records yet.</div>
            ) : (
              recentPayments.map((payment) => (
                <div key={payment.id} className={`rounded-xl border px-4 py-3 ${styles.surface}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{payment.reference || payment.invoiceId}</div>
                      <div className={`mt-1 text-xs ${styles.muted}`}>{payment.paymentMethod.replace(/_/g, ' ')} · {payment.recordedBy}</div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] capitalize ${statusTone(payment.status)}`}>
                      {formatPaymentStatus(payment.status)}
                    </span>
                  </div>
                  <div className="mt-3 text-sm font-medium">{formatMoney(payment.amount, payment.currency)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>
    </section>
  );
}
