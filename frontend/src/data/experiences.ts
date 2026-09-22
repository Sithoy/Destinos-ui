export type ExperienceCopy = {
  title: string; destination: string; intro: string; suited: string; price: string; travelInfo: string;
  highlights: string[]; itinerary: string[]; included: string[]; excluded: string[]; options: string[];
};
export type TravelExperience = {
  slug: string; revision: string; featured: boolean; region: string; styles: string[];
  hero: string; detail_hero?: string; gallery: string[]; nights: number; departure: string;
  pt: ExperienceCopy; en: ExperienceCopy;
};
export async function fetchExperiences(signal?: AbortSignal): Promise<TravelExperience[]> {
  const base = import.meta.env.VITE_CRM_API_URL?.toString().trim().replace(/\/$/, '');
  if (!base) throw new Error('Content service unavailable');
  const response = await fetch(`${base}/api/public/experiences/`, { signal });
  if (!response.ok) throw new Error('Unable to load experiences');
  return response.json();
}

// A page-load seed keeps the selection steady during navigation, including React remounts.
const discoverySeed = Math.random();
export function selectFeatured(items: TravelExperience[]) {
  const candidates = items.filter(item => item.featured);
  let seed = Math.floor(discoverySeed * 2147483646) + 1;
  for (let index = candidates.length - 1; index > 0; index--) {
    seed = seed * 16807 % 2147483647;
    const other = seed % (index + 1);
    [candidates[index], candidates[other]] = [candidates[other], candidates[index]];
  }
  const selected: TravelExperience[] = [];
  while (selected.length < 3 && candidates.length) {
    const diverse = candidates.findIndex(item => selected.every(previous => previous.region !== item.region && !previous.styles.some(style => item.styles.includes(style))));
    selected.push(candidates.splice(diverse < 0 ? 0 : diverse, 1)[0]);
  }
  return selected;
}
