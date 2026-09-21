import { MapPin, Monitor, X } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createCrmLeadRecord, updateCrmLeadRecord } from '../data/crm';
import { Button } from '../components/ui';
import { PrestigeExperience } from './PrestigeExperience';

type MeetingFormState = 'idle' | 'sending' | 'sent' | 'error';

export function CorporatePage() {
  const { t } = useTranslation();
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [meetingFormState, setMeetingFormState] = useState<MeetingFormState>('idle');
  const [meetingFormError, setMeetingFormError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);
  sendingRef.current = meetingFormState === 'sending';

  useEffect(() => {
    if (!showMeetingForm) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not([type="hidden"]):not([tabindex="-1"]), select, textarea, a[href]') || []);
    focusable()[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !sendingRef.current) setShowMeetingForm(false);
      if (event.key !== 'Tab') return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, [showMeetingForm]);

  const closeMeetingForm = () => {
    if (meetingFormState === 'sending') return;
    setShowMeetingForm(false);
    setMeetingFormError('');
  };

  async function submitMeetingForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const fieldValue = (field: string) => data.get(field)?.toString().trim() || '';

    const company = fieldValue('company');
    const contactName = fieldValue('contactName');
    const email = fieldValue('email');
    const phone = fieldValue('phone');
    const meetingType = fieldValue('meetingType');
    const preferredDate = fieldValue('preferredDate');
    const preferredTime = fieldValue('preferredTime');
    const topic = fieldValue('topic');
    const notes = fieldValue('notes');
    const honey = fieldValue('_honey');

    if (honey) {
      setMeetingFormState('sent');
      form.reset();
      return;
    }

    if (!email && !phone) {
      setMeetingFormError(t('corporate.meeting.validation.contactRequired'));
      return;
    }

    setMeetingFormState('sending');
    setMeetingFormError('');
    let leadId = '';

    const message = [
      `${t('corporate.meeting.email.company')}: ${company}`,
      `${t('corporate.meeting.email.contactName')}: ${contactName}`,
      `${t('corporate.meeting.email.email')}: ${email}`,
      `${t('corporate.meeting.email.phone')}: ${phone}`,
      `${t('corporate.meeting.email.meetingType')}: ${meetingType}`,
      `${t('corporate.meeting.email.preferredDate')}: ${preferredDate}`,
      `${t('corporate.meeting.email.preferredTime')}: ${preferredTime}`,
      `${t('corporate.meeting.email.topic')}: ${topic}`,
      '',
      `${t('corporate.meeting.email.notes')}:`,
      notes,
    ].filter(Boolean).join('\n');

    try {
      const lead = await createCrmLeadRecord({
        service: 'Prestige Corporate meeting',
        serviceKey: 'corporate',
        name: company || contactName,
        contact: [email, phone].filter(Boolean).join(' / '),
        email,
        whatsapp: phone,
        preferredContact: email ? 'Email' : 'Phone',
        requestedServices: topic,
        tripType: 'Corporate consultation',
        departureCity: '',
        destination: '',
        dates: preferredDate,
        travelers: '',
        budget: 'Corporate',
        urgency: preferredDate || 'Flexible timing',
        priority: 'normal',
        notes: message,
      });
      leadId = lead.id;

      const response = await fetch('https://formsubmit.co/ajax/contact@dpmundo.com', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          _subject: t('corporate.meeting.email.subject', { company: company || contactName }),
          _template: 'table',
          _captcha: 'false',
          _replyto: email,
          company,
          contactName,
          email,
          phone,
          meetingType,
          preferredDate,
          preferredTime,
          topic,
          notes,
          message,
        }),
      });

      if (!response.ok) throw new Error('Meeting request failed');

      setMeetingFormState('sent');
      void updateCrmLeadRecord(leadId, { emailStatus: 'sent' });
      form.reset();
    } catch {
      if (leadId) void updateCrmLeadRecord(leadId, { emailStatus: 'failed' });
      setMeetingFormState('error');
    }
  }

  return (
    <div className="min-h-screen bg-[rgb(5,17,36)] text-white">
      <PrestigeExperience kind="corporate" onEnquire={() => {
        setMeetingFormState('idle');
        setMeetingFormError('');
        setShowMeetingForm(true);
      }} />

      {showMeetingForm ? (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/75 px-3 pb-6 pt-4 backdrop-blur-sm sm:px-4 sm:pb-10 sm:pt-8"
          role="dialog"
          ref={dialogRef}
          aria-modal="true"
          aria-labelledby="corporate-meeting-title"
        >
          <div className="relative w-full max-w-2xl rounded-[28px] bg-white p-5 text-slate-900 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-5">
              <div>
                <div className="inline-flex rounded-full bg-[#d4af37]/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#7a5a08]">
                  {t('corporate.meeting.eyebrow')}
                </div>
                <h2 id="corporate-meeting-title" className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {t('corporate.meeting.title')}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{t('corporate.meeting.text')}</p>
              </div>
              <button
                type="button"
                onClick={closeMeetingForm}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                aria-label={t('corporate.meeting.close')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form className="mt-7 grid gap-5" onSubmit={submitMeetingForm}>
              <input type="text" name="_honey" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
              <div className="grid gap-5 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  {t('corporate.meeting.fields.company')}
                  <input name="company" className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#d4af37]" required />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  {t('corporate.meeting.fields.contactName')}
                  <input name="contactName" className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#d4af37]" required />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  {t('corporate.meeting.fields.email')}
                  <input name="email" type="email" className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#d4af37]" />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  {t('corporate.meeting.fields.phone')}
                  <input name="phone" type="tel" className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#d4af37]" />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  {t('corporate.meeting.fields.meetingType')}
                  <select name="meetingType" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#d4af37]" defaultValue="virtual">
                    <option value="virtual">{t('corporate.meeting.options.virtual')}</option>
                    <option value="inPerson">{t('corporate.meeting.options.inPerson')}</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  {t('corporate.meeting.fields.topic')}
                  <select name="topic" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#d4af37]" defaultValue="corporateSupport">
                    <option value="corporateSupport">{t('corporate.meeting.topics.corporateSupport')}</option>
                    <option value="executiveTeamTravel">{t('corporate.meeting.topics.executiveTeamTravel')}</option>
                    <option value="policyApprovals">{t('corporate.meeting.topics.policyApprovals')}</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  {t('corporate.meeting.fields.preferredDate')}
                  <input name="preferredDate" type="date" className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#d4af37]" />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  {t('corporate.meeting.fields.preferredTime')}
                  <input name="preferredTime" type="time" className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#d4af37]" />
                </label>
              </div>

              <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-[#9b7415]" />
                  {t('corporate.meeting.hints.virtual')}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#9b7415]" />
                  {t('corporate.meeting.hints.inPerson')}
                </div>
              </div>

              <label className="text-sm font-medium text-slate-700">
                {t('corporate.meeting.fields.notes')}
                <textarea name="notes" className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#d4af37]" />
              </label>

              {meetingFormState === 'sent' ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
                  {t('corporate.meeting.success')}
                </div>
              ) : null}
              {meetingFormError || meetingFormState === 'error' ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                  {meetingFormError || t('corporate.meeting.error')}
                </div>
              ) : null}

              <div className="grid gap-3 sm:flex sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full rounded-full border border-slate-200 px-6 text-slate-700 hover:bg-slate-50 sm:w-auto"
                  onClick={closeMeetingForm}
                  disabled={meetingFormState === 'sending'}
                >
                  {t('corporate.meeting.cancel')}
                </Button>
                <Button type="submit" className="w-full rounded-full bg-[#d4af37] px-7 text-[#241f1b] hover:bg-[#e0bc4e] sm:w-auto" disabled={meetingFormState === 'sending'}>
                  {meetingFormState === 'sending' ? t('corporate.meeting.sending') : t('corporate.meeting.submit')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

    </div>
  );
}
