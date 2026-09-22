import type { CrmLead } from '../types';

export function ExperienceSnapshot({ lead }: { lead: CrmLead }) {
  const snapshot = lead.experienceSnapshot;
  if (!snapshot?.slug || !snapshot.en) return null;
  const copy = snapshot.en;
  return <details className="mt-5 rounded-xl border border-current/20 p-4 text-sm">
    <summary className="cursor-pointer font-semibold">Original inspiration · {copy.title} · {snapshot.nights} nights</summary>
    <p className="mt-4 leading-6">{copy.intro}</p>
    <p className="mt-3">Indicative price: {copy.price}</p>
    {(['itinerary', 'included', 'excluded', 'options'] as const).map(key => <div key={key} className="mt-4"><h4 className="font-semibold capitalize">{key}</h4><ul className="mt-2 list-disc space-y-2 pl-5">{copy[key].map((value, index) => <li key={index}>{value}</li>)}</ul></div>)}
    <p className="mt-4 text-xs opacity-70">Saved version: {snapshot.revision}. This content stays unchanged when the website is edited.</p>
  </details>;
}
