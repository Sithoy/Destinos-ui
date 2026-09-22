import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';

export function CrmLoginLayout({ children }: { children: ReactNode }) {
  return <main className="crm-login">
    <section className="crm-login-story" aria-label="DPM travel operations">
      <div className="crm-login-story-content">
        <a href="/" className="crm-login-home">Destinos pelo Mundo <ArrowUpRight aria-hidden="true" size={18} /></a>
        <div><p className="crm-eyebrow">THE PEOPLE BEHIND THE JOURNEY</p><h1>Every detail.<br /><em>Every journey.</em></h1><p className="crm-login-intro">A thoughtful space to turn your clients’ plans into exceptional travel experiences.</p></div>
        <p className="crm-login-signature">DPM · Travel operations</p>
      </div>
    </section>
    <section className="crm-login-form-area" aria-label="Staff sign in">{children}<p className="crm-login-footnote">Destinos pelo Mundo · Staff workspace</p></section>
  </main>;
}
