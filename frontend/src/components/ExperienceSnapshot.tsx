import type { CrmLead } from '../types';

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function ExperienceSnapshot({ lead }: { lead: CrmLead }) {
  const snapshot = lead.experienceSnapshot;
  const copy = snapshot?.en;
  if (!snapshot?.slug || !copy) return null;
  const sections = (['itinerary', 'included', 'excluded', 'options'] as const)
    .map((key) => ({ key, items: stringList(copy[key]) }))
    .filter((section) => section.items.length > 0);
  if (!copy.title && !copy.intro && !copy.price && sections.length === 0) return null;
  const nights = typeof snapshot.nights === 'number' && Number.isFinite(snapshot.nights) ? snapshot.nights : null;
  return <details className="mt-5 rounded-xl border border-current/20 p-4 text-sm">
    <summary className="cursor-pointer font-semibold">Original inspiration{copy.title ? ` · ${copy.title}` : ''}{nights !== null ? ` · ${nights} nights` : ''}</summary>
    {copy.intro ? <p className="mt-4 leading-6">{copy.intro}</p> : null}
    {copy.price ? <p className="mt-3">Indicative price: {copy.price}</p> : null}
    {sections.map(({ key, items }) => <div key={key} className="mt-4"><h4 className="font-semibold capitalize">{key}</h4><ul className="mt-2 list-disc space-y-2 pl-5">{items.map((value, index) => <li key={index}>{value}</li>)}</ul></div>)}
    <p className="mt-4 text-xs opacity-70">Saved version: {snapshot.revision ?? 'unknown'}. This content stays unchanged when the website is edited.</p>
  </details>;
}
