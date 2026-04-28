import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CorporateHeader } from '../../components/corporate-portal/CorporateHeader';
import { CorporateSidebar } from '../../components/corporate-portal/CorporateSidebar';
import type { CorporatePortalTheme } from '../../types/corporatePortal';
import { corporatePortalThemeStyles } from './portalTheme';

export function CorporatePortalLayout({
  pathname,
  title,
  subtitle,
  descriptor,
  searchValue,
  onSearchChange,
  children,
  theme,
  onToggleTheme,
  onSignOut,
}: {
  pathname: string;
  title: string;
  subtitle: string;
  descriptor: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  children: React.ReactNode;
  theme: CorporatePortalTheme;
  onToggleTheme: () => void;
  onSignOut: () => void;
}) {
  const navigate = useNavigate();
  const styles = corporatePortalThemeStyles[theme];

  return (
    <div className={`min-h-screen ${styles.shell}`}>
      <div className="grid min-h-screen xl:grid-cols-[244px_minmax(0,1fr)]">
        <CorporateSidebar activeHref={pathname} onNavigate={navigate} theme={theme} />
        <section className="min-w-0">
          <CorporateHeader
            title={title}
            subtitle={subtitle}
            descriptor={descriptor}
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            theme={theme}
            onToggleTheme={onToggleTheme}
            onSignOut={onSignOut}
            action={
              <button
                type="button"
                onClick={() => navigate('/corporate-portal/new-trip')}
                className={`inline-flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-medium ${styles.buttonPrimary}`}
              >
                <Plus className="h-4 w-4" />
                New Trip
              </button>
            }
          />
          <div className="p-5">{children}</div>
        </section>
      </div>
    </div>
  );
}
