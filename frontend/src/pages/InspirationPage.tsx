import { useExperiences } from '../data/useExperiences';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ContentStatus, ExperienceCard } from '../components/ExperienceDiscovery';
import { SmartImage } from '../components/ui';
import type { TravelExperience } from '../data/experiences';

const regions = ['Europa', 'África', 'Ásia', 'Médio Oriente', 'Américas'];
const styles = ['Romance', 'Família', 'Cultura', 'Praia', 'Aventura', 'Compras', 'Iconic Trips'];
const english: Record<string, string> = { Europa: 'Europe', África: 'Africa', Ásia: 'Asia', 'Médio Oriente': 'Middle East', Américas: 'Americas', Família: 'Family', Cultura: 'Culture', Praia: 'Beach', Aventura: 'Adventure', Compras: 'Shopping' };
const cta = 'inline-flex min-h-12 items-center justify-center rounded-full bg-[#fe8500] px-7 py-3 font-semibold text-[#35180f] hover:bg-[#ff9b2e]';

export function InspirationPage({ slug, onCustomise }: { slug: string; onCustomise: (item: TravelExperience) => void }) {
  const { i18n } = useTranslation();
  const pt = i18n.language.startsWith('pt');
  const { items, status, retry } = useExperiences();
  const [region, setRegion] = useState('');
  const [style, setStyle] = useState('');
  const item = items.find(value => value.slug === slug);
  const copy = item && (pt ? item.pt : item.en);
  useEffect(() => {
    document.title = `${copy?.title || (pt ? 'Inspiração' : 'Inspiration')} | Destinos pelo Mundo`;
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', `https://www.dpmundo.com/inspiracao${slug ? `/${encodeURIComponent(slug)}` : ''}`);
    if (copy) document.querySelector('meta[name="description"]')?.setAttribute('content', copy.intro);
    window.scrollTo(0, 0);
  }, [copy, slug, pt]);
  if (status !== 'ready') return <main id="main-content" className="mx-auto min-h-[60vh] max-w-7xl p-8"><ContentStatus status={status} retry={retry} pt={pt} /></main>;
  if (slug && (!item || !copy)) return <main id="main-content" className="mx-auto min-h-[60vh] max-w-7xl p-8"><h1 className="font-serif text-4xl">{pt ? 'Esta viagem não está disponível.' : 'This journey is unavailable.'}</h1><Link className="mt-6 block underline" to="/inspiracao">{pt ? 'Explorar outras viagens' : 'Explore other journeys'}</Link></main>;
  if (item && copy) return <main id="main-content" className="bg-[#fff9f2] text-[#102337]">
    <section className="relative isolate flex min-h-[620px] items-end overflow-hidden bg-slate-800 text-white">
      <SmartImage priority src={item.detail_hero || item.hero} alt={copy.destination} className="absolute inset-0 -z-20 h-full w-full object-cover object-center" /><div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
      <div className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8"><Link to="/inspiracao" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">← {pt ? 'Todas as viagens' : 'All journeys'}</Link><p className="mt-8 text-xs uppercase tracking-[0.2em]">{copy.destination} · {pt ? 'Experiência DPM' : 'DPM Experience'}</p><h1 className="mt-4 font-serif text-6xl sm:text-8xl">{copy.title}</h1><p className="mt-5 text-lg">{copy.highlights.join(' · ')}</p><p className="mt-3">{item.nights} {pt ? 'noites sugeridas · À sua medida' : 'suggested nights · Tailored to you'}</p><button onClick={() => onCustomise(item)} className={`${cta} mt-6`}>{pt ? 'Personalizar esta viagem' : 'Personalise this journey'}</button></div>
    </section>
    <div className="mx-auto grid max-w-7xl gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0"><p className="max-w-2xl font-serif text-3xl leading-snug">{copy.intro}</p><p className="mt-6 leading-7 text-slate-600">{copy.suited}</p>
        <h2 className="mt-14 font-serif text-4xl">{pt ? 'Um itinerário para imaginar' : 'Imagine your itinerary'}</h2><p className="mt-3 text-sm leading-7 text-slate-600">{pt ? 'Um ponto de partida. Ajustamos cada dia aos seus interesses e às disponibilidades.' : 'A starting point. We adapt each day to your interests and availability.'}</p>
        <ol className="mt-8 border-t border-[#e9d9c8]">{copy.itinerary.map((day, index) => <li key={index} className="grid grid-cols-[3rem_1fr] gap-4 border-b border-[#e9d9c8] py-6"><span className="font-serif text-3xl text-[#984b00]">{String(index + 1).padStart(2, '0')}</span><p className="leading-7">{day}</p></li>)}</ol>
        <div className="mt-12 grid gap-8 sm:grid-cols-2">{(['included', 'excluded'] as const).map(key => <section key={key}><h2 className="font-serif text-2xl">{key === 'included' ? (pt ? 'A base da sua proposta' : 'Your proposal starts here') : (pt ? 'A confirmar separadamente' : 'To confirm separately')}</h2><ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-7 text-slate-600">{copy[key].map(value => <li key={value}>{value}</li>)}</ul></section>)}</div>
        <section className="mt-12 rounded-2xl bg-[#ffe3bf] p-7"><p className="text-xs uppercase tracking-widest text-[#984b00]">{pt ? 'Um toque seu' : 'Make it yours'}</p><h2 className="mt-3 font-serif text-3xl">{pt ? 'E se acrescentássemos…' : 'What if we added…'}</h2><ul className="mt-5 space-y-3">{copy.options.map(option => <li key={option}>+ {option}</li>)}</ul><button onClick={() => onCustomise(item)} className={`${cta} mt-7`}>{pt ? 'Personalizar esta viagem' : 'Personalise this journey'} →</button></section>
        {item.gallery.length > 0 && <div className="mt-12 grid gap-4 sm:grid-cols-2">{item.gallery.map((url, index) => <SmartImage key={url} src={url} alt={`${copy.destination} — ${pt ? 'inspiração' : 'inspiration'} ${index + 1}`} className="aspect-[4/3] w-full object-cover" />)}</div>}
        <section className="mt-10"><h2 className="font-serif text-2xl">{pt ? 'Antes de partir' : 'Before you travel'}</h2><p className="mt-4 text-sm leading-7 text-slate-600">{copy.travelInfo}</p></section>
      </div>
      <aside className="self-start rounded-2xl border border-[#e9d9c8] bg-white p-7 lg:sticky lg:top-28"><p className="text-xs uppercase tracking-widest text-[#984b00]">{pt ? 'A sua próxima história' : 'Your next story'}</p><h2 className="mt-4 font-serif text-3xl">{copy.price}</h2><p className="mt-4 text-sm leading-7 text-slate-600">{pt ? 'O valor depende das datas, dos voos, do hotel e das experiências que escolher. Receba uma proposta personalizada.' : 'The price depends on your dates, flights, hotel and chosen experiences. Receive a personalised proposal.'}</p><button onClick={() => onCustomise(item)} className={`${cta} mt-6 w-full`}>{pt ? 'Personalizar esta viagem' : 'Personalise this journey'}</button><p className="mt-5 text-xs leading-6 text-slate-500">{pt ? 'Viagem sugerida. O pedido não constitui uma reserva. Serviços e disponibilidade serão confirmados na proposta.' : 'Suggested journey. An enquiry is not a booking. Services and availability will be confirmed in your proposal.'}</p></aside>
    </div>
  </main>;
  const filtered = items.filter(value => (!region || value.region === region) && (!style || value.styles.includes(style)));
  return <main id="main-content" className="min-h-[70vh] bg-[#fff9f2] text-[#102337]"><div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
    <p className="text-xs uppercase tracking-[0.2em] text-[#984b00]">{pt ? 'Um pouco de inspiração' : 'A little inspiration'}</p><h1 className="mt-5 max-w-3xl font-serif text-5xl sm:text-7xl">{pt ? 'Onde começa a sua próxima história?' : 'Where does your next story begin?'}</h1><p className="mt-6 max-w-xl leading-8 text-slate-600">{pt ? 'Viagens que todos reconhecemos. Experiências que podemos tornar suas. Escolha uma ideia; desenhamos o resto consigo.' : 'Journeys we all recognise. Experiences we can make your own. Choose an idea; we will design the rest together.'}</p>
    <div className="my-8 grid grid-cols-2 gap-3 border-y border-[#e9d9c8] py-6 md:my-10 md:grid-cols-1 md:gap-4">
      {[{ key: 'region', values: regions, selected: region, set: setRegion, label: pt ? 'Região' : 'Region' }, { key: 'style', values: styles, selected: style, set: setStyle, label: pt ? 'Estilo de viagem' : 'Travel style' }].map(group => <div key={group.key} className="min-w-0">
        <label className="block text-xs font-medium text-slate-600 md:hidden" htmlFor={`filter-${group.key}`}>{group.label}</label>
        <select id={`filter-${group.key}`} value={group.selected} onChange={event => group.set(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[#dfd1c0] bg-white px-3 text-sm text-[#102337] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#984b00] md:hidden">
          {['', ...group.values].map(value => <option key={value} value={value}>{value ? (pt ? value : english[value] || value) : (pt ? 'Todos' : 'All')}</option>)}
        </select>
        <fieldset className="hidden md:block"><legend className="mb-3 text-xs uppercase tracking-wider text-slate-500">{group.label}</legend><div className="flex flex-wrap gap-2">{['', ...group.values].map(value => <button key={value} type="button" aria-pressed={group.selected === value} onClick={() => group.set(value)} className={`min-h-11 rounded-full border px-4 text-sm ${group.selected === value ? 'border-[#fe8500] bg-[#fe8500] text-[#35180f]' : 'border-[#e0d5c7] bg-white'}`}>{value ? (pt ? value : english[value] || value) : (pt ? 'Todos' : 'All')}</button>)}</div></fieldset>
      </div>)}
      {(region || style) && <button className="col-span-2 min-h-11 justify-self-start text-sm text-[#984b00] underline underline-offset-4 md:col-span-1" onClick={() => { setRegion(''); setStyle(''); }}>{pt ? 'Limpar filtros' : 'Clear filters'}</button>}
    </div>
    <p role="status" className="mb-6 text-sm text-slate-600">{filtered.length} {pt ? (filtered.length === 1 ? 'viagem para descobrir' : 'viagens para descobrir') : (filtered.length === 1 ? 'journey to discover' : 'journeys to discover')}</p><div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(value => <ExperienceCard key={value.slug} item={value} pt={pt} />)}</div>
    {!filtered.length && <div className="py-12"><p>{pt ? 'Ainda não temos uma viagem publicada nesta combinação. Explore todas as ideias ou fale connosco para criar a sua.' : 'No published journeys match these filters yet. Explore all ideas or contact us to create yours.'}</p></div>}
  </div></main>;
}
