import type { CorporatePortalTheme, CorporateTripStatus } from '../../types/corporatePortal';

export function TripStatusBadge({ status, theme }: { status: CorporateTripStatus; theme: CorporatePortalTheme }) {
  const tone =
    status === 'Booked' || status === 'Completed'
      ? 'border-emerald-400/20 bg-emerald-500/12 text-emerald-200'
      : status === 'Needs documents'
        ? 'border-amber-400/20 bg-amber-500/12 text-amber-200'
        : status === 'Rejected'
          ? 'border-rose-400/20 bg-rose-500/12 text-rose-200'
          : status === 'Quote ready' || status === 'Final approval'
            ? 'border-violet-400/20 bg-violet-500/12 text-violet-200'
            : theme === 'dark'
              ? 'border-sky-400/20 bg-sky-500/12 text-sky-200'
              : 'border-sky-200 bg-sky-50 text-sky-800';

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>{status}</span>;
}
