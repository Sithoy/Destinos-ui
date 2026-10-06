import { opsText } from '../locales/operations';
import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { LanguageToggle } from './LanguageToggle';

export function CrmLoginLayout({ children, corporate = false }: { children: ReactNode; corporate?: boolean }) {
  return <main className="crm-login">
    <section className="crm-login-story" aria-label={opsText("DPM travel operations")}>
      <div className="crm-login-story-content">
        <a href="/" className="crm-login-home">Destinos pelo Mundo <ArrowUpRight aria-hidden="true" size={18} /></a>
        <div><p className="crm-eyebrow">{corporate ? opsText("BUSINESS TRAVEL, THOUGHTFULLY MANAGED") : opsText("THE PEOPLE BEHIND THE JOURNEY")}</p><h1>{corporate ? opsText("Your people.") : opsText("Every detail.")}<br /><em>{corporate ? opsText("Going places.") : opsText("Every journey.")}</em></h1><p className="crm-login-intro">{corporate ? opsText("A considered space to plan your team’s journeys, coordinate approvals and keep every traveller ready.") : opsText("A thoughtful space to turn your clients’ plans into exceptional travel experiences.")}</p></div>
        <p className="crm-login-signature">DPM · {corporate ? opsText("Corporate travel") : opsText("Travel operations")}</p>
      </div>
    </section>
    <section className="crm-login-form-area" aria-label={corporate ? opsText("Company sign in") : opsText("Staff sign in")}><div className="mb-5"><LanguageToggle compact light /></div>{children}<p className="crm-login-footnote">Destinos pelo Mundo · {corporate ? opsText("Company workspace") : opsText("Staff workspace")}</p></section>
  </main>;
}
