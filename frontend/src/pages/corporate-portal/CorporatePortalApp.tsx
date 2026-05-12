import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CorporateApprovalsPage } from './CorporateApprovalsPage';
import { CorporateDashboardPage } from './CorporateDashboardPage';
import { CorporateNewTripPage } from './CorporateNewTripPage';
import { CorporatePortalLayout } from './CorporatePortalLayout';
import { CorporateReportsPage } from './CorporateReportsPage';
import { CorporateRequestDetailPage } from './CorporateRequestDetailPage';
import { CorporateRequestsPage } from './CorporateRequestsPage';
import { CorporateSectionPlaceholderPage } from './CorporateSectionPlaceholderPage';
import { CorporateTravelersPage } from './CorporateTravelersPage';
import { getCorporateCurrentTripCost } from '../../data/corporatePortal';
import { approveCtmTripRequest, clearCtmSession, createCtmTraveler, createCtmTripDocument, createCtmTripMessage, createCtmTripRequest, CTM_AUTH_EVENT, deactivateCtmTraveler, fetchCtmBillingInvoices, fetchCtmBillingPayments, fetchCtmBillingSummary, fetchCtmContext, fetchCtmCurrentSession, fetchCtmTravelers, fetchCtmTripRequests, hasCtmApi, loginCtm, logoutCtm, notifyCtmDataUpdated, readCtmSession, rejectCtmTripRequest, saveCtmSession, updateCtmTraveler } from '../../data/ctm';
import { ctmLegacyRoute, ctmPrimaryRoute } from '../../data/travel';
import type {
  CorporateApprovalFilter,
  CorporateApprovalStage,
  CorporateBillingSummary,
  CorporatePortalCompany,
  CorporatePortalStat,
  CorporatePortalSession,
  CorporatePortalTheme,
  CorporateRequestFilter,
  CorporateTimelineEvent,
  CorporateTravelerProfile,
  CorporateTravelerProfileInput,
  CorporateTripCreateInput,
  CorporateTripDocumentInput,
  CorporateTripInvoice,
  CorporateTripMessageInput,
  CorporateTripPayment,
  CorporateTripRequest,
} from '../../types/corporatePortal';
import { CORPORATE_PORTAL_THEME_STORAGE_KEY, readCorporatePortalTheme } from './portalTheme';

function getPortalTitle(pathname: string, company?: CorporatePortalCompany | null) {
  if (pathname.startsWith('/requests/')) return 'Request detail';
  if (pathname.startsWith('/requests')) return 'Requests';
  if (pathname.startsWith('/new-trip')) return 'New trip';
  if (pathname.startsWith('/approvals')) return 'Approvals';
  if (pathname.startsWith('/itineraries')) return 'Itineraries';
  if (pathname.startsWith('/travelers')) return 'Travelers';
  if (pathname.startsWith('/reports')) return 'Reports';
  return company?.name ?? 'Corporate portal';
}

function getPortalSubtitle(pathname: string) {
  if (pathname.startsWith('/requests/')) return 'Review cost lifecycle, approvals, traveler readiness, and DPM operational movement.';
  if (pathname.startsWith('/requests')) return 'Corporate request queue covering approvals, quotes, documents, and booked movement.';
  if (pathname.startsWith('/new-trip')) return 'Capture route, travelers, services, and budget once before handing it into the approval flow.';
  if (pathname.startsWith('/approvals')) return 'Keep travel-need and final-cost approvals in one review lane for company decision-makers.';
  if (pathname.startsWith('/itineraries')) return 'Confirmed and active travel will live here once booking output is connected.';
  if (pathname.startsWith('/travelers')) return 'Reusable traveler records will sit here with passport, visa, and readiness visibility.';
  if (pathname.startsWith('/reports')) return 'Spend, department movement, and approval bottlenecks will roll into this reporting layer.';
  return 'A centralized workspace for group travel, approvals, documents, quotes, and service coordination with DPM.';
}

function getPortalPathname(pathname: string) {
  const normalizedPathname = pathname.toLowerCase();
  if (normalizedPathname === ctmPrimaryRoute || normalizedPathname.startsWith(`${ctmPrimaryRoute}/`)) {
    return pathname.slice(ctmPrimaryRoute.length) || '/';
  }
  if (normalizedPathname === ctmLegacyRoute || normalizedPathname.startsWith(`${ctmLegacyRoute}/`)) {
    return pathname.slice(ctmLegacyRoute.length) || '/';
  }
  return pathname;
}

function buildCtmRoute(pathname = '/') {
  if (pathname === '/') return ctmPrimaryRoute;
  return `${ctmPrimaryRoute}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

function buildPortalStats(requests: CorporateTripRequest[], billingSummary?: CorporateBillingSummary | null): CorporatePortalStat[] {
  const currency = billingSummary?.currency ?? 'USD';
  const controlledSpend = billingSummary?.totalInvoiced ?? requests.reduce((sum, trip) => sum + getCorporateCurrentTripCost(trip), 0);
  const spendHint = billingSummary
    ? `${billingSummary.paidCount} paid · ${currency} ${billingSummary.outstandingBalance.toLocaleString('en-US')} outstanding`
    : 'Budget range -> quote -> final cost';
  return [
    { id: 'spend', label: 'Controlled spend', value: `${currency} ${controlledSpend.toLocaleString('en-US')}`, hint: spendHint, tone: 'gold' },
    { id: 'travelers', label: 'Travelers managed', value: String(requests.reduce((sum, trip) => sum + trip.travelers.length, 0)), hint: 'Across current group requests', tone: 'sky' },
    { id: 'pendingApprovals', label: 'Pending approvals', value: String(requests.filter((trip) => trip.approvals.some((approval) => approval.status === 'Pending')).length), hint: 'Need and cost approvals', tone: 'emerald' },
    {
      id: 'documentAlerts',
      label: 'Document alerts',
      value: String(requests.reduce((sum, trip) => sum + trip.travelers.filter((traveler) => traveler.readiness.passport === 'Missing' || traveler.readiness.visa === 'Required').length, 0)),
      hint: 'Passport or visa action needed',
      tone: 'amber',
    },
  ];
}

function buildActivityTimeline(requests: CorporateTripRequest[]): CorporateTimelineEvent[] {
  return requests.flatMap((trip) => trip.timeline.map((event) => ({ ...event, meta: event.meta || `${trip.id} activity` })))
    .slice()
    .reverse()
    .slice(0, 6);
}

export function CorporatePortalApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [requests, setRequests] = useState<CorporateTripRequest[]>([]);
  const [company, setCompany] = useState<CorporatePortalCompany | null>(null);
  const [travelers, setTravelers] = useState<CorporateTravelerProfile[]>([]);
  const [billingSummary, setBillingSummary] = useState<CorporateBillingSummary | null>(null);
  const [billingInvoices, setBillingInvoices] = useState<CorporateTripInvoice[]>([]);
  const [billingPayments, setBillingPayments] = useState<CorporateTripPayment[]>([]);
  const [ctmSession, setCtmSession] = useState<CorporatePortalSession | null>(() => readCtmSession());
  const [theme, setTheme] = useState<CorporatePortalTheme>(() => readCorporatePortalTheme());
  const [requestFilter, setRequestFilter] = useState<CorporateRequestFilter>('all');
  const [approvalFilter, setApprovalFilter] = useState<CorporateApprovalFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [loginCompanyCode, setLoginCompanyCode] = useState('');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const pathname = location.pathname;
  const portalPathname = getPortalPathname(pathname);
  const canonicalPathname = buildCtmRoute(portalPathname);

  useEffect(() => {
    const refreshSession = () => setCtmSession(readCtmSession());
    window.addEventListener(CTM_AUTH_EVENT, refreshSession);
    window.addEventListener('storage', refreshSession);
    return () => {
      window.removeEventListener(CTM_AUTH_EVENT, refreshSession);
      window.removeEventListener('storage', refreshSession);
    };
  }, []);

  useEffect(() => {
    const session = readCtmSession();
    if (!hasCtmApi() || !session?.token) return;

    fetchCtmCurrentSession(session)
      .then((nextSession) => {
        if (!nextSession) {
          clearCtmSession();
          setCtmSession(null);
          return;
        }
        saveCtmSession(nextSession);
        setCtmSession(nextSession);
      })
      .catch(() => {
        clearCtmSession();
        setCtmSession(null);
      });
  }, [ctmSession?.token]);

  useEffect(() => {
    if (!hasCtmApi()) {
      setError('CTM API URL is not configured.');
      setIsLoading(false);
      return;
    }
    if (!ctmSession?.token) {
      setIsLoading(false);
      return;
    }
    let active = true;
    async function loadPortal() {
      setIsLoading(true);
      setError('');
      try {
        const [context, nextRequests, nextTravelers, nextBillingSummary, nextBillingInvoices, nextBillingPayments] = await Promise.all([
          fetchCtmContext(ctmSession),
          fetchCtmTripRequests(ctmSession),
          fetchCtmTravelers(ctmSession),
          fetchCtmBillingSummary(ctmSession),
          fetchCtmBillingInvoices(ctmSession),
          fetchCtmBillingPayments(ctmSession),
        ]);
        if (!active) return;
        setCompany(context.company);
        setRequests(nextRequests);
        setTravelers(nextTravelers);
        setBillingSummary(nextBillingSummary);
        setBillingInvoices(nextBillingInvoices);
        setBillingPayments(nextBillingPayments);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'Could not load CTM data.');
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadPortal();
    return () => {
      active = false;
    };
  }, [ctmSession]);

  const searchedRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return requests;
    return requests.filter((trip) =>
      [trip.id, trip.requestedBy, trip.department, trip.route, trip.destination, trip.services.join(' '), trip.travelers.map((traveler) => traveler.name).join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [requests, search]);

  const filteredRequests = useMemo(() => {
    return searchedRequests.filter((trip) => {
      if (requestFilter === 'active') return trip.approvals.some((approval) => approval.status === 'Pending');
      if (requestFilter === 'documents') return trip.status === 'Needs documents';
      if (requestFilter === 'booked') return trip.status === 'Booked' || trip.status === 'Completed';
      return true;
    });
  }, [requestFilter, searchedRequests]);

  const filteredApprovalRequests = useMemo(() => {
    return searchedRequests.filter((trip) => {
      const pendingStages = trip.approvals.filter((approval) => approval.status === 'Pending');
      if (approvalFilter === 'travelNeed') return pendingStages.some((approval) => approval.stage === 'Travel need');
      if (approvalFilter === 'briefing') return pendingStages.some((approval) => approval.stage === 'Briefing');
      if (approvalFilter === 'finalCost') return pendingStages.some((approval) => approval.stage === 'Final cost');
      return pendingStages.length > 0;
    });
  }, [approvalFilter, searchedRequests]);

  const selectedRequestId = portalPathname.startsWith('/requests/') ? portalPathname.replace('/requests/', '') : null;
  const selectedTrip = selectedRequestId ? requests.find((trip) => trip.id === selectedRequestId) ?? filteredRequests[0] ?? requests[0] ?? null : filteredRequests[0] ?? requests[0] ?? null;
  const portalStats = useMemo(() => buildPortalStats(requests, billingSummary), [requests, billingSummary]);
  const portalTimeline = useMemo(() => buildActivityTimeline(requests), [requests]);

  const openRequest = (tripId: string) => navigate(buildCtmRoute(`/requests/${tripId}`));
  const openNewTrip = () => navigate(buildCtmRoute('/new-trip'));
  const openApprovals = () => {
    setRequestFilter('all');
    setApprovalFilter('all');
    navigate(buildCtmRoute('/approvals'));
  };
  const openRequests = () => {
    setRequestFilter('all');
    navigate(buildCtmRoute('/requests'));
  };
  const activateRequestFilter = (filter: CorporateRequestFilter) => {
    setRequestFilter(filter);
    navigate(buildCtmRoute('/requests'));
  };
  const activateApprovalFilter = (filter: CorporateApprovalFilter) => {
    setApprovalFilter(filter);
    navigate(buildCtmRoute('/approvals'));
  };
  const handleDashboardStatClick = (statId: CorporatePortalStat['id']) => {
    if (statId === 'pendingApprovals') {
      setApprovalFilter('all');
      navigate(buildCtmRoute('/approvals'));
      return;
    }
    if (statId === 'documentAlerts') {
      activateRequestFilter('documents');
      return;
    }
    if (statId === 'travelers') {
      setRequestFilter('active');
      navigate(buildCtmRoute('/requests'));
      return;
    }
    setRequestFilter('all');
    navigate(buildCtmRoute('/requests'));
  };
  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(CORPORATE_PORTAL_THEME_STORAGE_KEY, next);
      }
      return next;
    });
  };
  const signOut = async () => {
    await logoutCtm(ctmSession);
    setCtmSession(null);
    setCompany(null);
    setRequests([]);
    setTravelers([]);
    setBillingSummary(null);
    setBillingInvoices([]);
    setBillingPayments([]);
  };

  const submitLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoggingIn(true);
    setError('');
    try {
      const session = await loginCtm(loginIdentifier, loginPassword, loginCompanyCode);
      setCtmSession(session);
      setLoginPassword('');
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Could not sign in to CTM.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const createTrip = async (input: CorporateTripCreateInput) => {
    try {
      const newTrip = await createCtmTripRequest(input, ctmSession);
      setRequests((current) => [newTrip, ...current]);
      setError('');
      navigate(buildCtmRoute(`/requests/${newTrip.id}`));
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not create trip request.');
    }
  };

  const createTraveler = async (input: CorporateTravelerProfileInput) => {
    try {
      const traveler = await createCtmTraveler(input, ctmSession);
      setTravelers((current) => [traveler, ...current]);
      setError('');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not create traveler profile.');
      throw createError;
    }
  };

  const saveTraveler = async (id: string | number, input: Partial<CorporateTravelerProfileInput>) => {
    try {
      const traveler = await updateCtmTraveler(id, input, ctmSession);
      setTravelers((current) => current.map((item) => (String(item.id) === String(id) ? traveler : item)));
      setError('');
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Could not update traveler profile.');
      throw updateError;
    }
  };

  const deactivateTraveler = async (id: string | number) => {
    try {
      await deactivateCtmTraveler(id, ctmSession);
      setTravelers((current) => current.map((item) => (String(item.id) === String(id) ? { ...item, isActive: false } : item)));
      setError('');
    } catch (deactivateError) {
      setError(deactivateError instanceof Error ? deactivateError.message : 'Could not deactivate traveler profile.');
      throw deactivateError;
    }
  };

  const createTripDocument = async (tripId: string, input: CorporateTripDocumentInput) => {
    try {
      const document = await createCtmTripDocument(tripId, input, ctmSession);
      setRequests((current) => current.map((trip) => (
        trip.id === tripId ? { ...trip, documents: [document, ...(trip.documents ?? [])] } : trip
      )));
      setError('');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not create document.');
      throw createError;
    }
  };

  const createTripMessage = async (tripId: string, input: CorporateTripMessageInput) => {
    try {
      const message = await createCtmTripMessage(tripId, input, ctmSession);
      setRequests((current) => current.map((trip) => (
        trip.id === tripId ? { ...trip, messages: [...(trip.messages ?? []), message] } : trip
      )));
      setError('');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not send message.');
      throw createError;
    }
  };

  const updateApprovalDecision = async (tripId: string, stage: CorporateApprovalStage, decision: 'Approved' | 'Rejected') => {
    try {
      const updatedTrip = decision === 'Approved' ? await approveCtmTripRequest(tripId, stage, ctmSession) : await rejectCtmTripRequest(tripId, stage, ctmSession);
      setRequests((current) => current.map((trip) => (trip.id === tripId ? updatedTrip : trip)));
      notifyCtmDataUpdated();
      setError('');
    } catch (approvalError) {
      setError(approvalError instanceof Error ? approvalError.message : 'Could not update approval.');
      throw approvalError;
    }
  };

  if (!hasCtmApi()) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#07111d] px-4 text-white">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d1828] p-6 shadow-2xl">
          <h1 className="text-2xl font-semibold">CTM backend required</h1>
          <p className="mt-2 text-sm leading-6 text-white/60">
            Corporate Travel Management now runs from the Django backend. Set `VITE_CRM_API_URL` to the backend API before using the CTM workspace.
          </p>
        </div>
      </main>
    );
  }

  if (!ctmSession) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#07111d] px-4 text-white">
        <form onSubmit={submitLogin} className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1828] p-6 shadow-2xl">
          <h1 className="text-2xl font-semibold">CTM Sign In</h1>
          <p className="mt-2 text-sm leading-6 text-white/60">
            Use your Company ID and portal account to manage requests, approvals, and traveler readiness.
          </p>
          <label className="mt-6 block text-sm font-medium text-white/75">
            Company ID
            <input
              value={loginCompanyCode}
              onChange={(event) => setLoginCompanyCode(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-white/8 px-3 text-sm uppercase text-white outline-none placeholder:text-white/35 focus:border-[#d4af37]"
              placeholder="DPMCOMPANY"
              autoComplete="organization"
              required
            />
          </label>
          <label className="mt-4 block text-sm font-medium text-white/75">
            Username or email
            <input
              value={loginIdentifier}
              onChange={(event) => setLoginIdentifier(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-white/8 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#d4af37]"
              placeholder="travel.desk@company.com"
              autoComplete="username"
              required
            />
          </label>
          <label className="mt-4 block text-sm font-medium text-white/75">
            Password
            <input
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-white/8 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#d4af37]"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {error ? <div className="mt-4 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div> : null}
          <button
            type="submit"
            disabled={isLoggingIn}
            className="mt-6 h-11 w-full rounded-lg bg-[#d4af37] px-4 text-sm font-semibold text-[#241f1b] transition hover:bg-[#e0bc4e] disabled:opacity-55"
          >
            {isLoggingIn ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#07111d] px-4 text-white">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d1828] p-6 text-sm text-white/70 shadow-2xl">
          Loading CTM workspace...
        </div>
      </main>
    );
  }

  const screen = portalPathname.startsWith('/requests/')
    ? (
      <CorporateRequestDetailPage
        trip={selectedTrip}
        theme={theme}
        onCreateDocument={createTripDocument}
        onCreateMessage={createTripMessage}
        onApprove={(tripId, stage) => updateApprovalDecision(tripId, stage, 'Approved')}
        onReject={(tripId, stage) => updateApprovalDecision(tripId, stage, 'Rejected')}
      />
    )
    : portalPathname.startsWith('/requests')
      ? <CorporateRequestsPage allRequests={searchedRequests} requests={filteredRequests} selectedRequestId={selectedRequestId} onOpenRequest={openRequest} theme={theme} activeFilter={requestFilter} onFilterChange={activateRequestFilter} onOpenApprovals={openApprovals} />
      : portalPathname.startsWith('/new-trip')
        ? <CorporateNewTripPage onCreateTrip={createTrip} savedTravelers={travelers} theme={theme} />
      : portalPathname.startsWith('/approvals')
          ? <CorporateApprovalsPage requests={filteredApprovalRequests} allRequests={searchedRequests} onOpenRequest={openRequest} onApprove={(tripId, stage) => updateApprovalDecision(tripId, stage, 'Approved')} onReject={(tripId, stage) => updateApprovalDecision(tripId, stage, 'Rejected')} theme={theme} activeFilter={approvalFilter} onFilterChange={activateApprovalFilter} onOpenRequests={openRequests} />
        : portalPathname.startsWith('/itineraries')
          ? <CorporateSectionPlaceholderPage title="Itineraries" description="Confirmed trips, service breakdowns, and downloadable travel packs will live in this view once the booking side of CTM is connected." bullets={['Upcoming trips with hotel, transfer, and flight breakdowns', 'Live trip status for active company travelers', 'Downloadable itinerary packs and support notes']} actionLabel="Review booked request" onAction={() => openRequest('DPM-2419')} theme={theme} />
          : portalPathname.startsWith('/travelers')
            ? <CorporateTravelersPage travelers={travelers} search={search} theme={theme} onCreateTraveler={createTraveler} onUpdateTraveler={saveTraveler} onDeactivateTraveler={deactivateTraveler} onOpenRequest={openRequest} />
          : portalPathname.startsWith('/reports')
              ? <CorporateReportsPage summary={billingSummary} invoices={billingInvoices} payments={billingPayments} theme={theme} onOpenRequest={openRequest} />
          : <CorporateDashboardPage requests={requests} stats={portalStats} activityTimeline={portalTimeline} onOpenRequest={openRequest} onOpenApprovals={openApprovals} onOpenNewTrip={openNewTrip} onStatClick={handleDashboardStatClick} theme={theme} />;

  return (
    <CorporatePortalLayout
      pathname={canonicalPathname}
      title={getPortalTitle(portalPathname, company)}
      subtitle={getPortalSubtitle(portalPathname)}
      descriptor={company?.descriptor ?? 'Corporate Travel Platform'}
      searchValue={search}
      onSearchChange={setSearch}
      theme={theme}
      onToggleTheme={toggleTheme}
      onSignOut={signOut}
    >
      {error ? (
        <div className={`mb-4 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm ${theme === 'dark' ? 'text-red-100' : 'text-red-700'}`}>
          {error}
        </div>
      ) : null}
      {screen}
    </CorporatePortalLayout>
  );
}
