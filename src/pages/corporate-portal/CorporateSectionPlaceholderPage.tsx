import { ArrowRight } from 'lucide-react';
import type { CorporatePortalTheme } from '../../types/corporatePortal';
import { corporatePortalThemeStyles } from './portalTheme';

export function CorporateSectionPlaceholderPage({
  title,
  description,
  bullets,
  actionLabel,
  onAction,
  theme,
}: {
  title: string;
  description: string;
  bullets: string[];
  actionLabel: string;
  onAction: () => void;
  theme: CorporatePortalTheme;
}) {
  const styles = corporatePortalThemeStyles[theme];

  return (
    <section className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <div className={`rounded-xl border p-6 shadow-2xl ${styles.panel}`}>
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className={`mt-3 max-w-2xl text-sm leading-7 ${styles.soft}`}>{description}</p>
        <div className="mt-6 grid gap-3">
          {bullets.map((bullet) => (
            <div key={bullet} className={`rounded-xl border px-4 py-3 text-sm ${styles.surface}`}>
              {bullet}
            </div>
          ))}
        </div>
      </div>

      <aside className={`rounded-xl border p-6 shadow-2xl ${styles.panel}`}>
        <div className="text-sm uppercase tracking-[0.24em] text-[#d9b46f]">Next layer</div>
        <div className="mt-3 text-xl font-semibold">This section is staged after the request and approval loop.</div>
        <p className={`mt-3 text-sm leading-7 ${styles.muted}`}>
          We already have the shell in place, so the next build can connect this area to the CTM backend without reshaping the portal.
        </p>

        <button
          type="button"
          onClick={onAction}
          className={`mt-6 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold ${styles.buttonPrimary}`}
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </button>
      </aside>
    </section>
  );
}
