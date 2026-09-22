import { useExperiences } from '../data/useExperiences';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { selectFeatured } from '../data/experiences';
import type { TravelExperience } from '../data/experiences';
import { SmartImage } from './ui';

export function ExperienceCard({ item, pt, wide = false }: { item: TravelExperience; pt: boolean; wide?: boolean }) {
  const copy = pt ? item.pt : item.en;
  return <article className="group min-w-0">
    <Link to={`/inspiracao/${item.slug}`} className={`${wide ? 'grid items-center gap-8 md:grid-cols-[1.4fr_1fr]' : 'block'} focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#984b00]`}>
      <div className={`${wide ? 'aspect-[4/3]' : 'aspect-[4/5]'} overflow-hidden bg-stone-200`}><SmartImage src={item.hero} alt={copy.destination} className="h-full w-full object-cover transition duration-700 motion-safe:group-hover:scale-105" /></div>
      <div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#984b00]">{copy.destination}</p>
      <h3 className="mt-3 font-serif text-3xl">{copy.title}</h3>
      <p className="mt-2 text-sm text-slate-600">{pt ? 'Viagem sugerida' : 'Suggested journey'} · {item.nights} {pt ? 'noites' : 'nights'}</p>
      <p className="mt-4 text-sm leading-6 text-slate-600">{copy.highlights.join(' · ')}</p>
      {wide && <p className="mt-5 max-w-md leading-7 text-slate-600">{copy.intro}</p>}
      <span className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#984b00]">{pt ? 'Explorar viagem' : 'Explore journey'} →</span>
      </div>
    </Link>
  </article>;
}

export function ContentStatus({ status, retry, pt }: { status: string; retry: () => void; pt: boolean }) {
  return status === 'loading' ? <p role="status" className="py-10">{pt ? 'A preparar a sua inspiração…' : 'Preparing your inspiration…'}</p> : status === 'error' ? <div role="alert" className="py-10"><p>{pt ? 'Não foi possível carregar as viagens.' : 'We could not load the journeys.'}</p><button onClick={retry} className="mt-3 min-h-11 underline">{pt ? 'Tentar novamente' : 'Try again'}</button></div> : null;
}

export function ExperienceDiscovery() {
  const { i18n } = useTranslation();
  const pt = i18n.language.startsWith('pt');
  const { items, status, retry } = useExperiences();
  const featured = selectFeatured(items);
  return <section id="destinations" aria-labelledby="destinations-title" className="border-y border-[#efdccc] bg-white">
    <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#984b00]">{pt ? 'Um pouco de inspiração' : 'A little inspiration'}</p>
      <h2 id="destinations-title" className="mt-4 max-w-2xl font-serif text-4xl sm:text-5xl">{pt ? 'Onde começa a sua próxima história?' : 'Where does your next story begin?'}</h2>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-5"><p className="leading-7 text-slate-600">{pt ? 'Viagens que todos reconhecemos.' : 'Journeys we all recognise.'}<br />{pt ? 'Experiências que podemos tornar suas.' : 'Experiences we can make your own.'}</p><Link to="/inspiracao" className="inline-flex min-h-11 items-center font-semibold text-[#984b00] underline underline-offset-8">{pt ? 'Ver todas as viagens' : 'View all journeys'} →</Link></div>
      <ContentStatus status={status} retry={retry} pt={pt} />
      <div className={featured.length === 1 ? 'mt-10' : 'mt-10 grid auto-cols-[85%] grid-flow-col gap-7 overflow-x-auto pb-4 snap-x sm:auto-cols-[45%] md:auto-cols-[calc((100%-3.5rem)/3)]'}>{featured.map(item => <div key={item.slug} className="snap-start"><ExperienceCard item={item} pt={pt} wide={featured.length === 1} /></div>)}</div>
      {status === 'ready' && !featured.length && <p>{pt ? 'Novas histórias em preparação. Conte-nos a sua ideia de viagem.' : 'New stories are on their way. Tell us your travel idea.'}</p>}
    </div>
  </section>;
}
