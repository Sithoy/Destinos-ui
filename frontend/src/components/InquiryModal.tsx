import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { X, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { submitPublicInquiry } from '../data/crm';
import { intakePayload, newIntakeDraft } from '../data/intake';
import type { TravelExperience } from '../data/experiences';
import type { IntakeDraft } from '../data/intake';
import type { InquiryKind } from '../types';
import { ctmPrimaryRoute } from '../data/travel';
import { useModalFocus } from './useModalFocus';
import { intakeCopy } from './intakeCopy';

export function InquiryModal({ kind, experience, initialDestination = '', onClose }: { experience?: TravelExperience; kind: InquiryKind | null; initialDestination?: string; onClose: () => void }) {
  return kind ? <IntakeForm key={`${kind}:${initialDestination}`} kind={kind} experience={experience} initialDestination={initialDestination} onClose={onClose} /> : null;
}

function IntakeForm({ kind, experience, initialDestination, onClose }: { experience?: TravelExperience; kind: InquiryKind; initialDestination: string; onClose: () => void }) {
  const { i18n } = useTranslation();
  const c = intakeCopy[i18n.resolvedLanguage?.startsWith('pt') ? 'pt' : 'en'];
  const [draft, setDraft] = useState(() => ({ ...newIntakeDraft(initialDestination), departure: experience?.departure || '' }));
  const pt = i18n.language.startsWith('pt');
  const experienceCopy = experience && (pt ? experience.pt : experience.en);
  const [nights, setNights] = useState(String(experience?.nights || ''));
  const [hotel, setHotel] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [step, setStep] = useState(1);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<'network' | 'contact' | 'required' | ''>('');
  const [receipt, setReceipt] = useState('');
  const inFlight = useRef(false);
  const submission = useRef<{ payload: string; id: string } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const dialog = useModalFocus(true, () => { if (!inFlight.current) onClose(); });
  const corporate = kind === 'corporate';
  const trip = !corporate || draft.branch === 'trip';
  const set = <K extends keyof IntakeDraft>(key: K, value: IntakeDraft[K]) => setDraft(prev => ({ ...prev, [key]: value }));
  useEffect(() => { heading.current?.focus(); }, [step, receipt]);
  const input = 'mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 disabled:bg-slate-100 disabled:text-slate-500';
  const button = `inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold disabled:opacity-60 ${kind === 'classic' ? 'bg-[#fe8500] text-[#35180f]' : 'bg-[#d4af37] text-[#241f1b]'}`;
  const summary = trip ? [
    experienceCopy && `${experienceCopy.title} / ${pt ? 'Noites' : 'Nights'}: ${nights || c.optional}`,
    experience && hotel && `Hotel: ${pt ? hotel.replace('stars', 'estrelas') : hotel}`,
    experience && options.length > 0 && options.join(' / '),
    `${c.destination}: ${draft.inspire ? (corporate ? c.optional : c.inspire) : draft.destination || c.optional}`,
    `${c.dates}: ${draft.flexible ? c.flexible : draft.dates || c.optional}`,
    `${corporate ? c.party : c.adults}: ${draft.adults || c.optional}${!corporate ? ` · ${c.children}: ${draft.children || c.optional}` : ''}`,
    corporate && `${c.company}: ${draft.company}`,
    draft.departure && `${c.departure}: ${draft.departure}`,
    draft.budget && `${c.budget}: ${draft.budget}`,
    kind === 'luxury' && draft.occasion && `${c.occasion}: ${draft.occasion}`,
  ].filter(Boolean) : [c.branches[draft.branch], draft.company, draft.branch === 'management' ? c.frequencies[['', 'Occasionally', 'Monthly', 'Weekly'].indexOf(draft.frequency)] : ''].filter(Boolean);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 1) {
      if (corporate && !draft.company.trim()) { setError('required'); return; }
      setError(''); setStep(2); return;
    }
    if (inFlight.current || receipt) return;
    if (!draft.name.trim()) { setError('required'); return; }
    const contact = draft.method === 'email' ? draft.email.trim() : draft.phone.trim();
    if (!contact || (draft.method !== 'email' && contact.replace(/\D/g, '').length < 6)) { setError('contact'); return; }
    inFlight.current = true; setSending(true); setError('');
    const base = intakePayload(kind, draft);
    const payload = experience ? { ...base, experienceRevision: experience.revision, notes: [base.notes, `Requested nights: ${nights || 'Undecided'}`, `Hotel category: ${hotel || 'Undecided'}`, `Optional experiences: ${options.join(' / ') || 'None selected'}`].filter(Boolean).join('\n') } : base;
    const serialized = JSON.stringify(payload);
    if (submission.current?.payload !== serialized) submission.current = { payload: serialized, id: crypto.randomUUID() };
    try {
      const result = await submitPublicInquiry(payload, submission.current.id);
      if (!result.received || !result.id) throw new Error('Receipt missing');
      setReceipt(result.id);
    } catch { setError('network'); }
    finally { inFlight.current = false; setSending(false); }
  }
  return <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="intake-title" className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/75 px-3 py-5 backdrop-blur-sm sm:py-8">
    <div className="mx-auto w-full max-w-2xl rounded-3xl bg-[#fffdf9] p-5 text-slate-900 shadow-2xl sm:p-8">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#796022]">{kind === 'classic' ? 'DPM Classic' : `Prestige ${corporate ? 'Corporate' : 'Luxury'}`}</p><h2 ref={heading} tabIndex={-1} id="intake-title" className="mt-3 font-serif text-3xl leading-tight focus:outline-none">{receipt ? c.success : step === 1 ? c.titles[kind] : c.contactStep}</h2></div><button type="button" onClick={onClose} disabled={sending} aria-label={c.close} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 disabled:opacity-50"><X aria-hidden="true" className="h-5 w-5" /></button></div>
      {receipt ? <div className="mt-6" role="status"><CheckCircle2 aria-hidden="true" className="h-9 w-9 text-emerald-700" /><p className="mt-4 leading-7 text-slate-600">{c.nextSteps}</p><p className="mt-5 text-sm">{c.reference}: <span className="break-all font-mono">{receipt}</span></p><div className="mt-5 rounded-xl bg-stone-100 p-4 text-sm leading-7"><strong>{c.summary}</strong>{summary.map((line, index) => <p key={index} className="break-words">{line}</p>)}<p className="break-words">{draft.name} · {draft.method === 'email' ? draft.email : draft.phone} ({c[draft.method]})</p></div><button onClick={onClose} className={`${button} mt-6`}>{c.close}</button></div> : <>
        <ol aria-label={c.summary} className="my-6 flex gap-4 border-b border-stone-200 pb-4 text-sm"><li aria-current={step === 1 ? 'step' : undefined} className={step === 1 ? 'font-semibold' : 'text-slate-500'}>1 · {corporate ? c.companyStep : c.trip}</li><li aria-current={step === 2 ? 'step' : undefined} className={step === 2 ? 'font-semibold' : 'text-slate-500'}>2 · {c.contactStep}</li></ol>
        <form onSubmit={submit}>
          <fieldset disabled={sending} className="grid gap-5">
            {step === 1 ? <>
              <p className="text-sm leading-6 text-slate-600">{c.intro}</p>
              {experience && experienceCopy && <div className="rounded-2xl border border-[#efdccc] bg-[#fff3e7] p-5">
                <p className="text-xs uppercase tracking-widest text-[#984b00]">{pt ? 'A sua inspiração' : 'Your inspiration'}</p><h3 className="mt-2 font-serif text-2xl">{experienceCopy.title}</h3><p className="mt-2 text-sm">{experience.nights} {pt ? 'noites sugeridas — ajuste ao seu ritmo.' : 'suggested nights — adapt them to your pace.'}</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2"><label>{pt ? 'Quantas noites?' : 'How many nights?'}<input className={input} type="number" min="1" max="365" value={nights} onChange={e => setNights(e.target.value)} /></label><label>{pt ? 'Categoria de hotel' : 'Hotel category'}<select className={input} value={hotel} onChange={e => setHotel(e.target.value)}><option value="">{c.optional}</option>{['3', '4', '5'].map(value => <option key={value} value={`${value} stars`}>{value} {pt ? 'estrelas' : 'stars'}</option>)}<option value="Boutique">Boutique</option></select></label></div>
                <fieldset className="mt-5"><legend className="text-sm font-semibold">{pt ? 'Gostaria de acrescentar?' : 'Would you like to add?'}</legend>{experienceCopy.options.map(option => <label key={option} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={options.includes(option)} onChange={e => setOptions(previous => e.target.checked ? [...previous, option] : previous.filter(value => value !== option))} />{option}</label>)}</fieldset>
              </div>}
              {corporate && <><label>{c.branch}<select className={input} value={draft.branch} onChange={e => set('branch', e.target.value as IntakeDraft['branch'])}>{(['trip', 'management', 'support'] as const).map(value => <option key={value} value={value}>{c.branches[value]}</option>)}</select></label><label>{c.company}<input className={input} autoComplete="organization" maxLength={180} required value={draft.company} onChange={e => set('company', e.target.value)} /></label></>}
              {kind === 'luxury' && <label>{c.occasion} {c.optionalLabel}<textarea className={`${input} min-h-24`} maxLength={1500} placeholder={c.occasionHint} value={draft.occasion} onChange={e => set('occasion', e.target.value)} /></label>}
              {corporate && draft.branch === 'support' && <div className="rounded-xl bg-slate-100 p-4 text-sm leading-7"><p>{c.support}</p><Link to={ctmPrimaryRoute} onClick={onClose} className="mt-2 inline-flex min-h-11 items-center font-semibold underline">{c.portal}<ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" /></Link></div>}
              {corporate && draft.branch === 'management' && <label>{c.frequency}<select className={input} value={draft.frequency} onChange={e => set('frequency', e.target.value)}>{c.frequencies.map((text, index) => <option key={index} value={['', 'Occasionally', 'Monthly', 'Weekly'][index]}>{text}</option>)}</select></label>}
              {trip && <>
                <div><label>{c.destination}<input className={input} maxLength={180} disabled={draft.inspire} value={draft.destination} onChange={e => set('destination', e.target.value)} /></label><label className="mt-2 flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={draft.inspire} onChange={e => set('inspire', e.target.checked)} />{corporate ? c.optional : c.inspire}</label></div>
                <div><label>{c.dates}<input className={input} maxLength={140} placeholder={c.dateHint} disabled={draft.flexible} value={draft.dates} onChange={e => set('dates', e.target.value)} /></label><label className="mt-2 flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={draft.flexible} onChange={e => set('flexible', e.target.checked)} />{c.flexible}</label></div>
                <div className="grid gap-4 sm:grid-cols-2"><label>{corporate ? c.party : c.adults} {c.optionalLabel}<input className={input} type="number" min="1" max="999" step="1" value={draft.adults} onChange={e => set('adults', e.target.value)} /></label>{!corporate && <label>{c.children} {c.optionalLabel}<input className={input} type="number" min="0" max="999" step="1" value={draft.children} onChange={e => set('children', e.target.value)} /></label>}</div>
                <details className="rounded-xl border border-stone-200 p-4"><summary className="cursor-pointer py-2 text-sm font-medium">{c.more}</summary><div className="mt-3 grid gap-4"><label>{c.departure} {c.optionalLabel}<input className={input} maxLength={120} value={draft.departure} onChange={e => set('departure', e.target.value)} /></label>
                {!corporate && <label>{c.budget} {c.optionalLabel}<select className={input} value={draft.budget} onChange={e => set('budget', e.target.value)}><option value="">{c.budgetUnknown}</option>{(kind === 'luxury' ? ['USD 3,000–6,000', 'USD 6,000–10,000', 'USD 10,000+'] : ['< USD 1,500', 'USD 1,500–3,000', 'USD 3,000–6,000', 'USD 6,000+']).map(value => <option key={value}>{value}</option>)}</select></label>}</div></details>
              </>}
              <label>{corporate && draft.branch === 'management' ? c.challenges : kind === 'luxury' ? c.preferences : c.notes} {c.optionalLabel}<textarea className={`${input} min-h-24`} maxLength={3000} value={draft.notes} onChange={e => set('notes', e.target.value)} /></label>
            </> : <>
              <div className="rounded-xl bg-stone-100 p-4 text-sm leading-7"><strong>{c.summary}</strong>{summary.map((line, index) => <p key={index} className="break-words">{line}</p>)}</div>
              <label>{c.name}<input className={input} required autoComplete="name" maxLength={180} value={draft.name} onChange={e => set('name', e.target.value)} /></label>
              <label>{c.method}<select className={input} value={draft.method} onChange={e => set('method', e.target.value as IntakeDraft['method'])}>{(['whatsapp', 'email', 'phone'] as const).map(value => <option key={value} value={value}>{c[value]}</option>)}</select></label>
              <p className="text-sm text-slate-600">{c.contactHint}</p>
              {draft.method === 'email' ? <label>{c.email}<input className={input} type="email" required autoComplete="email" maxLength={254} value={draft.email} onChange={e => set('email', e.target.value)} /></label> : <label>{c[draft.method]}<input className={input} type="tel" required autoComplete="tel" maxLength={80} placeholder="+258 …" value={draft.phone} onChange={e => set('phone', e.target.value)} /></label>}
              <p className="text-xs leading-6 text-slate-500">{c.privacy}</p>
            </>}
          </fieldset>
          {error && <div role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error === 'network' ? c.error : error === 'contact' ? c.contactError : c.required}{error === 'network' && <a href="mailto:contact@dpmundo.com" className="mt-2 block underline">contact@dpmundo.com</a>}</div>}
          <div className="mt-7 flex flex-wrap justify-between gap-3">{step === 2 && <button type="button" disabled={sending} onClick={() => { setStep(1); setError(''); }} className="min-h-12 rounded-full border border-slate-300 px-6">{c.back}</button>}<button type="submit" disabled={sending} className={`${button} ml-auto`}>{sending ? c.sending : step === 1 ? c.next : c.send}<ArrowRight aria-hidden="true" className="h-4 w-4" /></button></div>
        </form>
      </>}
    </div>
  </div>;
}
