import { Bell, LogOut, Moon, Search, Sun } from 'lucide-react';
import type { CorporatePortalTheme } from '../../types/corporatePortal';
import { corporatePortalThemeStyles } from '../../pages/corporate-portal/portalTheme';

export function CorporateHeader({
  title,
  subtitle,
  descriptor,
  searchValue,
  onSearchChange,
  action,
  theme,
  onToggleTheme,
  onSignOut,
}: {
  title: string;
  subtitle: string;
  descriptor: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  action?: React.ReactNode;
  theme: CorporatePortalTheme;
  onToggleTheme: () => void;
  onSignOut: () => void;
}) {
  const styles = corporatePortalThemeStyles[theme];

  return (
    <header className={`border-b px-5 py-5 ${styles.header}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.26em] text-[#d9b46f]">{descriptor}</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
          <p className={`mt-1 text-sm ${styles.muted}`}>{subtitle}</p>
        </div>

        <div className="hidden min-w-[280px] flex-1 justify-center px-6 lg:flex">
          <label className={`flex w-full max-w-md items-center gap-2 rounded-lg border px-3 py-2 ${styles.input}`}>
            <Search className="h-4 w-4" />
            <input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search request, traveler, route or service"
              className="w-full bg-transparent text-sm outline-none placeholder:inherit"
            />
          </label>
        </div>

        <div className="flex items-center gap-2">
          {action}
          <button type="button" className={`relative inline-flex h-11 w-11 items-center justify-center rounded-lg ${styles.buttonGhost}`} aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </button>
          <button type="button" onClick={onToggleTheme} className={`inline-flex h-11 w-11 items-center justify-center rounded-lg ${styles.buttonGhost}`} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button type="button" onClick={onSignOut} className={`inline-flex h-11 items-center gap-2 rounded-lg px-3 text-sm ${styles.buttonGhost}`}>
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
