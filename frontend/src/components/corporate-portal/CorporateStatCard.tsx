import { AlertTriangle, BadgeDollarSign, CheckCheck, Users } from 'lucide-react';
import type { CorporatePortalStat, CorporatePortalTheme } from '../../types/corporatePortal';
import { corporatePortalThemeStyles } from '../../pages/corporate-portal/portalTheme';

const statIcons = {
  gold: BadgeDollarSign,
  emerald: CheckCheck,
  sky: Users,
  amber: AlertTriangle,
} as const;

export function CorporateStatCard({
  stat,
  theme,
  onClick,
}: {
  stat: CorporatePortalStat;
  theme: CorporatePortalTheme;
  onClick?: (statId: CorporatePortalStat['id']) => void;
}) {
  const Icon = statIcons[stat.tone];
  const styles = corporatePortalThemeStyles[theme];
  const iconTone =
    stat.tone === 'gold'
      ? 'text-[#f3d08b]'
      : stat.tone === 'emerald'
        ? 'text-emerald-300'
        : stat.tone === 'sky'
          ? 'text-sky-300'
          : 'text-amber-300';

  const content = (
    <>
      <div className="mb-2 flex items-center justify-between">
        <Icon className={`h-5 w-5 ${iconTone}`} />
      </div>
      <div className="text-xl font-semibold">{stat.value}</div>
      <div className={`mt-1 text-sm ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{stat.label}</div>
      <div className={`mt-0.5 text-[11px] leading-5 ${styles.muted}`}>{stat.hint}</div>
    </>
  );

  if (!onClick) {
    return <div className={`rounded-xl border p-3 ${styles.surface}`}>{content}</div>;
  }

  return (
    <button type="button" onClick={() => onClick(stat.id)} className={`rounded-xl border p-3 text-left transition ${styles.surface}`}>
      {content}
    </button>
  );
}
