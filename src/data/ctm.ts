import type {
  CorporateApprovalStage,
  CorporateBillingSummary,
  CorporatePortalCompany,
  CorporatePortalSession,
  CorporatePortalUser,
  CorporateTripCreateInput,
  CorporateTripInvoice,
  CorporateTripPayment,
  CorporateTripRequest,
} from '../types/corporatePortal';

const CTM_AUTH_STORAGE_KEY = 'dpm.ctm.auth.v1';
const CTM_AUTH_EVENT = 'dpm-ctm-auth-updated';

function ctmApiBase() {
  const raw = import.meta.env.VITE_CRM_API_URL?.toString().trim();
  return raw ? raw.replace(/\/$/, '') : '';
}

export function hasCtmApi() {
  return Boolean(ctmApiBase());
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `CTM API request failed (${response.status})`;
    try {
      const body = await response.json();
      message = body.detail || body.non_field_errors?.[0] || body.error || message;
    } catch {
      // keep status-based message
    }
    throw new Error(message);
  }

  return response.status === 204 ? (undefined as T) : response.json();
}

function hasStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function notifyCtmAuthUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CTM_AUTH_EVENT));
  }
}

function authHeaders(session?: CorporatePortalSession | null): Record<string, string> {
  return session?.token ? { Authorization: `Token ${session.token}` } : {};
}

export function readCtmSession(): CorporatePortalSession | null {
  if (!hasStorage()) return null;
  try {
    const raw = window.localStorage.getItem(CTM_AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CorporatePortalSession) : null;
  } catch {
    return null;
  }
}

export function saveCtmSession(session: CorporatePortalSession) {
  if (!hasStorage()) return;
  window.localStorage.setItem(CTM_AUTH_STORAGE_KEY, JSON.stringify(session));
  notifyCtmAuthUpdated();
}

export function clearCtmSession() {
  if (!hasStorage()) return;
  window.localStorage.removeItem(CTM_AUTH_STORAGE_KEY);
  notifyCtmAuthUpdated();
}

export async function loginCtm(username: string, password: string): Promise<CorporatePortalSession> {
  const base = ctmApiBase();
  if (!base) throw new Error('CTM API URL is not configured.');

  const session = await parseApiResponse<CorporatePortalSession>(
    await fetch(`${base}/api/ctm/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }),
  );
  saveCtmSession(session);
  return session;
}

export async function logoutCtm(session: CorporatePortalSession | null) {
  const base = ctmApiBase();
  if (base && session?.token) {
    try {
      await fetch(`${base}/api/ctm/auth/logout/`, {
        method: 'POST',
        headers: authHeaders(session),
      });
    } catch {
      // local sign-out should still happen
    }
  }
  clearCtmSession();
}

export async function fetchCtmCurrentSession(session?: CorporatePortalSession | null): Promise<CorporatePortalSession | null> {
  const base = ctmApiBase();
  if (!base || !session?.token) return null;

  const next = await parseApiResponse<CorporatePortalSession>(
    await fetch(`${base}/api/ctm/auth/me/`, {
      headers: authHeaders(session),
    }),
  );
  return { ...next, token: session.token };
}

export async function fetchCtmContext(session?: CorporatePortalSession | null): Promise<{ company: CorporatePortalCompany; user: CorporatePortalUser }> {
  const base = ctmApiBase();
  if (!base) throw new Error('CTM API URL is not configured.');
  if (!session?.token) throw new Error('CTM session is required.');

  return parseApiResponse(
    await fetch(`${base}/api/ctm/context/`, {
      headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
    }),
  );
}

export async function fetchCtmTripRequests(session?: CorporatePortalSession | null): Promise<CorporateTripRequest[]> {
  const base = ctmApiBase();
  if (!base) throw new Error('CTM API URL is not configured.');
  if (!session?.token) throw new Error('CTM session is required.');

  return parseApiResponse(
    await fetch(`${base}/api/ctm/trip-requests/`, {
      headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
    }),
  );
}

export async function fetchCtmBillingSummary(session?: CorporatePortalSession | null): Promise<CorporateBillingSummary> {
  const base = ctmApiBase();
  if (!base) throw new Error('CTM API URL is not configured.');
  if (!session?.token) throw new Error('CTM session is required.');

  return parseApiResponse(
    await fetch(`${base}/api/ctm/reports/billing/summary/`, {
      headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
    }),
  );
}

export async function fetchCtmBillingInvoices(session?: CorporatePortalSession | null): Promise<CorporateTripInvoice[]> {
  const base = ctmApiBase();
  if (!base) throw new Error('CTM API URL is not configured.');
  if (!session?.token) throw new Error('CTM session is required.');

  return parseApiResponse(
    await fetch(`${base}/api/ctm/reports/billing/invoices/`, {
      headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
    }),
  );
}

export async function fetchCtmBillingPayments(session?: CorporatePortalSession | null): Promise<CorporateTripPayment[]> {
  const base = ctmApiBase();
  if (!base) throw new Error('CTM API URL is not configured.');
  if (!session?.token) throw new Error('CTM session is required.');

  return parseApiResponse(
    await fetch(`${base}/api/ctm/reports/billing/payments/`, {
      headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
    }),
  );
}

export async function createCtmTripRequest(input: CorporateTripCreateInput, session?: CorporatePortalSession | null): Promise<CorporateTripRequest> {
  const base = ctmApiBase();
  if (!base) throw new Error('CTM API URL is not configured.');
  if (!session?.token) throw new Error('CTM session is required.');

  return parseApiResponse(
    await fetch(`${base}/api/ctm/trip-requests/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
      body: JSON.stringify(input),
    }),
  );
}

async function updateApproval(referenceCode: string, stage: CorporateApprovalStage, action: 'approve' | 'reject', session?: CorporatePortalSession | null): Promise<CorporateTripRequest> {
  const base = ctmApiBase();
  if (!base) throw new Error('CTM API URL is not configured.');
  if (!session?.token) throw new Error('CTM session is required.');

  return parseApiResponse(
    await fetch(`${base}/api/ctm/trip-requests/${referenceCode}/${action}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
      body: JSON.stringify({ stage }),
    }),
  );
}

export function approveCtmTripRequest(referenceCode: string, stage: CorporateApprovalStage, session?: CorporatePortalSession | null) {
  return updateApproval(referenceCode, stage, 'approve', session);
}

export function rejectCtmTripRequest(referenceCode: string, stage: CorporateApprovalStage, session?: CorporatePortalSession | null) {
  return updateApproval(referenceCode, stage, 'reject', session);
}

export { CTM_AUTH_EVENT };
