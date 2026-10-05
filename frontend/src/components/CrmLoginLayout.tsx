import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';

export function CrmLoginLayout({ children, corporate = false }: { children: ReactNode; corporate?: boolean }) {
  return <main className="crm-login">
    <section className="crm-login-story" aria-label="DPM travel operations">
      <div className="crm-login-story-content">
        <a href="/" className="crm-login-home">Destinos pelo Mundo <ArrowUpRight aria-hidden="true" size={18} /></a>
        <div><p className="crm-eyebrow">{corporate ? 'BUSINESS TRAVEL, THOUGHTFULLY MANAGED' : 'THE PEOPLE BEHIND THE JOURNEY'}</p><h1>{corporate ? 'Your people.' : 'Every detail.'}<br /><em>{corporate ? 'Going places.' : 'Every journey.'}</em></h1><p className="crm-login-intro">{corporate ? 'A considered space to plan your team’s journeys, coordinate approvals and keep every traveller ready.' : 'A thoughtful space to turn your clients’ plans into exceptional travel experiences.'}</p></div>
        <p className="crm-login-signature">DPM · {corporate ? 'Corporate travel' : 'Travel operations'}</p>
      </div>
    </section>
    <section className="crm-login-form-area" aria-label={corporate ? 'Company sign in' : 'Staff sign in'}>{children}<p className="crm-login-footnote">Destinos pelo Mundo · {corporate ? 'Company workspace' : 'Staff workspace'}</p></section>
  </main>;
}
