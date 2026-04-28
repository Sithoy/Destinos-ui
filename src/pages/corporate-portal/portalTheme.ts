import type { CorporatePortalTheme } from '../../types/corporatePortal';

export const CORPORATE_PORTAL_THEME_STORAGE_KEY = 'dpm.corporatePortal.theme';

export const corporatePortalThemeStyles = {
  dark: {
    shell: 'bg-[#07111d] text-white',
    sidebar: 'border-white/10 bg-[#07111d]',
    header: 'border-white/10 bg-[#081321]',
    panel: 'border-white/10 bg-[#0d1828]',
    panelSoft: 'border-white/10 bg-[#111c2c]',
    surface: 'border-white/10 bg-black/20',
    input: 'border-white/10 bg-black/20 text-white placeholder:text-white/35',
    buttonGhost: 'bg-white/8 text-white/75 hover:bg-white/12 hover:text-white',
    buttonPrimary: 'bg-[#d9b46f] text-[#07111f] hover:bg-[#e1bf7e]',
    buttonSecondary: 'border-white/10 bg-black/20 text-white hover:bg-white/10',
    muted: 'text-white/58',
    soft: 'text-white/76',
    brandTheme: 'light' as const,
    etios: 'bg-[#2b323a] text-white ring-white/10 hover:bg-[#252c33]',
  },
  light: {
    shell: 'bg-[#f4f6f8] text-slate-950',
    sidebar: 'border-slate-200 bg-white',
    header: 'border-slate-200 bg-white',
    panel: 'border-slate-200 bg-white',
    panelSoft: 'border-slate-200 bg-slate-50',
    surface: 'border-slate-200 bg-slate-50',
    input: 'border-slate-300 bg-white text-slate-950 placeholder:text-slate-500',
    buttonGhost: 'bg-slate-100 text-slate-800 hover:bg-slate-200 hover:text-slate-950',
    buttonPrimary: 'bg-slate-950 text-white hover:bg-slate-800',
    buttonSecondary: 'border-slate-200 bg-white text-slate-900 hover:bg-slate-100',
    muted: 'text-slate-600',
    soft: 'text-slate-800',
    brandTheme: 'dark' as const,
    etios: 'bg-[#2b323a] text-white ring-slate-950/10 hover:bg-[#252c33]',
  },
} as const;

export function readCorporatePortalTheme(): CorporatePortalTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.localStorage.getItem(CORPORATE_PORTAL_THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
}
