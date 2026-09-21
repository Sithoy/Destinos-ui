import { ArrowRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SmartImage } from '../components/ui';
import { ctmPrimaryRoute } from '../data/travel';

const copy = {
  pt: {
    luxury: {
      title: 'O extraordinário,', accent: 'à sua medida.', intro: 'Estadias com carácter, descobertas privadas e tempo para desfrutar. Uma viagem desenhada a partir do que é importante para si.',
      cta: 'Desenhar a minha viagem', explore: 'Descobrir experiências', label: 'A SUA FORMA DE VIVER O MUNDO', heading: 'Há lugares que ficam consigo.', description: 'Da tranquilidade de uma villa à energia de uma cidade, cada escolha começa com os seus interesses.',
      cards: [
        ['Estadias excepcionais', 'Villas privadas e hotéis com personalidade, escolhidos pelo ambiente, localização e conforto que procura.', 'Um terraço privado com vista para o oceano'],
        ['Tempo só para vocês', 'Luas de mel, celebrações e escapadas a dois, com espaço para descobrir ao vosso ritmo.', 'Um casal a passear numa rua histórica ao anoitecer'],
        ['Encontros com a natureza', 'Safaris e paisagens marcantes, com estadias e percursos pensados para a sua forma de explorar.', 'Uma família a observar elefantes durante um safari'],
      ],
      detailLabel: 'O CUIDADO ESTÁ NOS DETALHES', detailTitle: 'O seu tempo merece atenção.', detailText: 'Conte-nos como gosta de viajar. Combinamos estadias, deslocações e experiências num itinerário coerente, que revê connosco antes de confirmar.', details: ['Preferências e ritmo de viagem', 'Selecção de hotéis e experiências', 'Coordenação de voos e transfers privados', 'Revisão do itinerário antes da confirmação'],
      end: 'Qual é a viagem que tem em mente?', endText: 'Uma ocasião especial ou a vontade de descobrir algo novo. Comecemos pela sua ideia.',
    },
    corporate: {
      title: 'O seu negócio avança.', accent: 'Nós coordenamos a viagem.', intro: 'Voos, hotéis e deslocações para executivos e equipas. Planeamento atento às agendas, aos orçamentos e às necessidades da sua empresa.',
      cta: 'Falar com a nossa equipa', explore: 'Conhecer os serviços', portal: 'Já é cliente? Aceder ao CTM', label: 'CADA VIAGEM TEM UM OBJECTIVO', heading: 'Uma equipa de viagem ao lado da sua.', description: 'Um ponto de contacto para coordenar os detalhes que ligam a partida ao compromisso seguinte.',
      cards: [
        ['Viagens executivas', 'Itinerários organizados em torno das reuniões, com voos, alojamento e transfers coordenados.'],
        ['Conferências e eventos', 'Planeamento das deslocações e estadias para que os participantes cheguem preparados.'],
        ['Equipas em movimento', 'Coordenação de vários viajantes, diferentes origens e agendas partilhadas.'],
        ['Informação para decidir', 'Propostas claras para comparar opções e acompanhar os pedidos de viagem da empresa.'],
      ],
      detailLabel: 'CLAREZA EM CADA ETAPA', detailTitle: 'Antes da partida, todos alinhados.', detailText: 'Partilhamos as opções para revisão e coordenamos a viagem de acordo com as decisões da sua empresa.', details: ['Partilhe a agenda, os viajantes e o orçamento', 'Receba uma proposta para revisão', 'Confirme as opções com os responsáveis', 'Acompanhe os detalhes e os pedidos no CTM'],
      portalTitle: 'As viagens da empresa, num só lugar.', portalText: 'O portal CTM reúne pedidos, aprovações e itinerários para os utilizadores autorizados da sua empresa. Fale connosco para organizar o acesso da sua equipa.',
      end: 'Vamos conhecer as necessidades da sua empresa.', endText: 'Conte-nos quem viaja, com que frequência e o que precisa de coordenar. A data da conversa pode ficar para depois.',
    },
  },
  en: {
    luxury: {
      title: 'The extraordinary,', accent: 'made personal.', intro: 'Stays with character, private discoveries, and time to enjoy them. A journey designed around what matters to you.',
      cta: 'Design my journey', explore: 'Explore the experiences', label: 'YOUR WAY TO EXPERIENCE THE WORLD', heading: 'Some places stay with you.', description: 'From the quiet of a private villa to the energy of a city, every choice begins with your interests.',
      cards: [
        ['Exceptional stays', 'Private villas and distinctive hotels, chosen for the setting, location, and comfort you enjoy.', 'A private terrace overlooking the ocean'],
        ['Time for two', 'Honeymoons, celebrations, and escapes together, with room to discover at your own pace.', 'A couple walking through a historic city at dusk'],
        ['Closer to nature', 'Safaris and remarkable landscapes, with stays and routes shaped around how you like to explore.', 'A family watching elephants on safari'],
      ],
      detailLabel: 'CARE IN EVERY DETAIL', detailTitle: 'Your time deserves attention.', detailText: 'Tell us how you like to travel. We bring stays, transfers, and experiences together in an itinerary you review with us before confirming.', details: ['Your preferences and travel pace', 'Hotel and experience selection', 'Flight and private transfer coordination', 'Itinerary review before confirmation'],
      end: 'What journey do you have in mind?', endText: 'A special occasion or the desire to discover somewhere new. Let’s start with your idea.',
    },
    corporate: {
      title: 'Your business moves forward.', accent: 'We coordinate the journey.', intro: 'Flights, hotels, and transfers for executives and teams. Thoughtful planning around your schedules, budgets, and company requirements.',
      cta: 'Talk to our team', explore: 'Explore our services', portal: 'Already a client? Access CTM', label: 'EVERY JOURNEY HAS A PURPOSE', heading: 'A travel team alongside yours.', description: 'One point of contact to coordinate the details between departure and your next commitment.',
      cards: [
        ['Executive travel', 'Itineraries built around meetings, with coordinated flights, accommodation, and transfers.'],
        ['Conferences and events', 'Travel and accommodation planning that helps participants arrive prepared.'],
        ['Teams on the move', 'Coordination for multiple travellers, different departure points, and shared schedules.'],
        ['Information for decisions', 'Clear proposals to compare options and keep track of company travel requests.'],
      ],
      detailLabel: 'CLARITY AT EVERY STEP', detailTitle: 'Aligned before departure.', detailText: 'We share the options for review and coordinate travel around your company’s decisions.', details: ['Share schedules, travellers, and budget', 'Receive a proposal for review', 'Confirm options with your decision-makers', 'Follow details and requests in CTM'],
      portalTitle: 'Company travel, in one place.', portalText: 'The CTM portal brings requests, approvals, and itineraries together for your company’s authorised users. Talk to us about setting up access for your team.',
      end: 'Let’s understand your company’s travel.', endText: 'Tell us who travels, how often, and what needs coordinating. We can arrange a time to talk afterwards.',
    },
  },
};
const images = ['/images/dpm-luxury-terrace.webp', '/images/dpm-city-romance.webp', '/images/dpm-family-safari.webp'];
const goldButton = 'inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#d4af37] px-7 py-3 text-sm font-semibold text-[#241f1b] transition hover:bg-[#e0bc4e]';

export function PrestigeExperience({ kind, onEnquire }: { kind: 'luxury' | 'corporate'; onEnquire: () => void }) {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage?.startsWith('pt') ? 'pt' : 'en';
  const c = copy[lang][kind];
  const business = kind === 'corporate';
  const corp = copy[lang].corporate;
  return <main id="main-content" className={business ? 'bg-[#f5f6f7] text-[#102337]' : 'bg-[#fbf7ef] text-[#302a22]'}>
    <section className={`relative isolate overflow-hidden text-white ${business ? 'bg-[#071b30]' : 'bg-[#302a22]'}`}>
      <div className="mx-auto grid max-w-7xl lg:min-h-[680px] lg:grid-cols-2">
        <div className="flex flex-col justify-center px-5 py-16 sm:px-8 sm:py-20 lg:pr-12">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#ecd792]">Prestige {business ? 'Corporate' : 'Luxury'}</p>
          <h1 className={`mt-6 leading-[1.08] tracking-tight ${business ? 'text-[clamp(2.2rem,3.5vw,3.5rem)] font-medium' : 'text-[clamp(2.4rem,4.6vw,4.5rem)] font-serif'}`}>{c.title}<span className={`mt-3 block ${business ? 'text-[#e6d296]' : 'italic text-[#ecd792]'}`}>{c.accent}</span></h1>
          <p className="mt-7 max-w-lg text-base leading-8 text-white/80">{c.intro}</p>
          <div className="mt-8 flex flex-wrap items-center gap-5"><button onClick={onEnquire} className={goldButton}>{c.cta}<ArrowRight aria-hidden="true" className="h-4 w-4" /></button><a href="#prestige-experiences" className="py-3 text-sm underline underline-offset-8">{c.explore}</a></div>
          {business && <Link to={ctmPrimaryRoute} className="mt-6 w-fit py-2 text-sm text-white/75 underline underline-offset-4">{corp.portal}</Link>}
        </div>
        <div className="relative min-h-[380px] sm:min-h-[480px] lg:min-h-full"><SmartImage priority src={business ? '/images/dpm-corporate-lounge.webp' : images[0]} alt={business ? (lang === 'pt' ? 'Lounge executivo de aeroporto à luz do amanhecer' : 'Executive airport lounge at sunrise') : copy[lang].luxury.cards[0][2]} className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent" /></div>
      </div>
    </section>
    <section id="prestige-experiences" className="mx-auto max-w-7xl scroll-mt-32 px-5 py-16 sm:px-8 sm:py-24">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#796022]">{c.label}</p><h2 className={`mt-4 max-w-2xl text-4xl leading-tight sm:text-5xl ${business ? '' : 'font-serif'}`}>{c.heading}</h2><p className="mt-5 max-w-xl leading-7 text-slate-600">{c.description}</p>
      <div className={`mt-10 grid gap-8 ${business ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
        {c.cards.map(([title, text, alt], index) => <article key={title} className={business ? 'border-t border-[#cbd3db] pt-6' : ''}>
          {!business && <div className="aspect-[4/5] overflow-hidden"><SmartImage src={images[index]} alt={alt || title} className="h-full w-full object-cover" /></div>}
          {business && <span className="text-sm font-semibold text-[#796022]">0{index + 1}</span>}
          <h3 className={`mt-5 text-2xl ${business ? 'font-medium' : 'font-serif'}`}>{title}</h3><p className="mt-3 max-w-lg text-sm leading-7 text-slate-600">{text}</p>
          {!business && <button onClick={onEnquire} aria-label={`${c.cta}: ${title}`} className="mt-4 inline-flex min-h-11 items-center gap-3 text-sm font-semibold text-[#796022]">{c.cta}<ArrowRight aria-hidden="true" className="h-4 w-4" /></button>}
        </article>)}
      </div>
    </section>
    <section className={business ? 'bg-[#e7edf0]' : 'bg-[#eee6d8]'}><div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 md:grid-cols-2"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#796022]">{c.detailLabel}</p><h2 className={`mt-4 text-4xl leading-tight ${business ? '' : 'font-serif'}`}>{c.detailTitle}</h2><p className="mt-5 max-w-lg leading-8 text-slate-600">{c.detailText}</p></div><ul className="flex flex-col justify-center divide-y divide-[#b8ad98]/40">{c.details.map(item => <li key={item} className="flex items-start gap-4 py-5"><Check aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-[#796022]" /><span>{item}</span></li>)}</ul></div></section>
    {business && <section className="mx-auto grid max-w-7xl gap-6 px-5 py-16 sm:px-8 md:grid-cols-2"><h2 className="text-3xl leading-tight">{corp.portalTitle}</h2><div><p className="leading-8 text-slate-600">{corp.portalText}</p><Link to={ctmPrimaryRoute} className="mt-5 inline-flex min-h-11 items-center gap-3 font-semibold text-[#665019]">{corp.portal}<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link></div></section>}
    <section className={`px-5 py-16 text-center text-white sm:px-8 sm:py-20 ${business ? 'bg-[#071b30]' : 'bg-[#302a22]'}`}><h2 className={`mx-auto max-w-2xl text-4xl leading-tight ${business ? '' : 'font-serif'}`}>{c.end}</h2><p className="mx-auto mt-5 max-w-xl leading-8 text-white/75">{c.endText}</p><button onClick={onEnquire} className={`${goldButton} mt-8`}>{c.cta}<ArrowRight aria-hidden="true" className="h-4 w-4" /></button></section>
  </main>;
}
