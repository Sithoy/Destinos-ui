import type { CorporatePortalTheme } from '../../types/corporatePortal';
import '../../styles/crm.css';
import '../../styles/ctm.css';

export const CORPORATE_PORTAL_THEME_STORAGE_KEY = 'dpm.corporatePortal.theme';

// Both operational workspaces share the same surface and control language.
const sharedStyles = {
  shell: 'crm-workspace ctm-workspace',
  sidebar: 'crm-sidebar',
  header: 'crm-header',
  panel: 'crm-panel',
  panelSoft: 'crm-panel-soft',
  surface: 'crm-panel-soft',
  input: 'crm-input',
  buttonGhost: 'crm-button-ghost',
  buttonPrimary: 'crm-primary',
  buttonSecondary: 'crm-input ctm-secondary',
  muted: 'crm-muted',
  soft: 'crm-soft-text',
  brandTheme: 'light' as const,
  etios: 'bg-[#2b323a] text-white ring-white/10 hover:bg-[#252c33]',
};

export const corporatePortalThemeStyles = { dark: sharedStyles, light: sharedStyles } as const;

export function readCorporatePortalTheme(): CorporatePortalTheme {
  if (typeof window === 'undefined') return 'light';
  return window.localStorage.getItem(CORPORATE_PORTAL_THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
}
