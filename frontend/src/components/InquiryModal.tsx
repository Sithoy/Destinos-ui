import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { createCrmLeadRecord, updateCrmLeadRecord } from '../data/crm';
import { inquiryLabelKeys } from '../data/travel';
import type { InquiryKind } from '../types';
import { Badge, Button } from './ui';

type TripTypeOption = 'leisure' | 'luxury' | 'honeymoon' | 'family' | 'corporate' | 'group' | 'other';
type BudgetOption = 'notSure' | 'under1500' | '1500to3000' | '3000to6000' | '6000plus' | 'corporate';

const tripTypeOptionsByKind: Record<InquiryKind, TripTypeOption[]> = {
  classic: ['leisure', 'family', 'group', 'other'],
  luxury: ['luxury', 'honeymoon', 'family', 'other'],
  corporate: ['corporate', 'group', 'other'],
};

const budgetOptionsByKind: Record<InquiryKind, BudgetOption[]> = {
  classic: ['notSure', 'under1500', '1500to3000', '3000to6000'],
  luxury: ['notSure', '3000to6000', '6000plus'],
  corporate: ['corporate', 'notSure', '3000to6000', '6000plus'],
};

const formProfiles: Record<
  InquiryKind,
  {
    titleKey: string;
    introKey: string;
    nameLabelKey: string;
    destinationLabelKey: string;
    travelWindowLabelKey: string;
    travelersLabelKey: string;
    notesLabelKey: string;
    defaultTripType: TripTypeOption;
    defaultBudget: BudgetOption;
  }
> = {
  classic: {
    titleKey: 'inquiry.profiles.classic.title',
    introKey: 'inquiry.profiles.classic.intro',
    nameLabelKey: 'inquiry.fields.name',
    destinationLabelKey: 'inquiry.fields.destination',
    travelWindowLabelKey: 'inquiry.fields.travelWindow',
    travelersLabelKey: 'inquiry.fields.travelers',
    notesLabelKey: 'inquiry.fields.notes',
    defaultTripType: 'leisure',
    defaultBudget: 'notSure',
  },
  luxury: {
    titleKey: 'inquiry.profiles.luxury.title',
    introKey: 'inquiry.profiles.luxury.intro',
    nameLabelKey: 'inquiry.fields.name',
    destinationLabelKey: 'inquiry.fields.luxuryDestination',
    travelWindowLabelKey: 'inquiry.fields.travelWindow',
    travelersLabelKey: 'inquiry.fields.guests',
    notesLabelKey: 'inquiry.fields.luxuryNotes',
    defaultTripType: 'luxury',
    defaultBudget: '6000plus',
  },
  corporate: {
    titleKey: 'inquiry.profiles.corporate.title',
    introKey: 'inquiry.profiles.corporate.intro',
    nameLabelKey: 'inquiry.fields.corporateName',
    destinationLabelKey: 'inquiry.fields.businessDestination',
    travelWindowLabelKey: 'inquiry.fields.travelWindow',
    travelersLabelKey: 'inquiry.fields.teamSize',
    notesLabelKey: 'inquiry.fields.corporateNotes',
    defaultTripType: 'corporate',
    defaultBudget: 'corporate',
  },
};

export function InquiryModal({
  kind,
  onClose,
}: {
  kind: InquiryKind | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [submitState, setSubmitState] = React.useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [formError, setFormError] = React.useState('');
  const label = kind ? t(inquiryLabelKeys[kind]) : '';
  const formProfile = kind ? formProfiles[kind] : formProfiles.classic;
  const activeTripTypeOptions = kind ? tripTypeOptionsByKind[kind] : tripTypeOptionsByKind.classic;
  const activeBudgetOptions = kind ? budgetOptionsByKind[kind] : budgetOptionsByKind.classic;
  const isSending = submitState === 'sending';
  const inputClass =
    'mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#d4af37]';
  const selectClass =
    'mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#d4af37]';
  const textAreaClass =
    'mt-2 min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#d4af37]';

  React.useEffect(() => {
    if (kind) {
      setSubmitState('idle');
      setFormError('');
    }
  }, [kind]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!kind) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const fieldValue = (field: string) => data.get(field)?.toString().trim() || '';
    const optionLabel = (group: string, value: string) => t(`inquiry.options.${group}.${value}`);
    const honey = fieldValue('_honey');

    if (honey) {
      setSubmitState('sent');
      form.reset();
      return;
    }

    const name = fieldValue('name') || t('inquiry.emailFallbackName');
    const email = fieldValue('email');
    const whatsapp = fieldValue('whatsapp');
    const tripTypeValue = fieldValue('tripType') || formProfile.defaultTripType;
    const budgetValue = fieldValue('budget') || formProfile.defaultBudget;
    const preferredContact = whatsapp ? optionLabel('preferredContact', 'whatsapp') : email ? optionLabel('preferredContact', 'email') : optionLabel('preferredContact', 'either');
    const tripType = optionLabel('tripType', tripTypeValue);
    const budget = optionLabel('budget', budgetValue);
    const requestedServicesText = kind === 'luxury' ? 'Luxury trip planning' : kind === 'corporate' ? 'Corporate travel coordination' : 'Trip planning';
    const contact = [email, whatsapp].filter(Boolean).join(' / ');

    setFormError('');
    setSubmitState('idle');

    if (!email && !whatsapp) {
      setFormError(t('inquiry.validation.contactRequired'));
      return;
    }

    const destination = fieldValue('destination');
    const travelWindow = fieldValue('travelWindow');
    const travelers = fieldValue('travelers');
    const notes = fieldValue('notes');

    const details = [
      `${t('inquiry.emailBody.service')}: ${label}`,
      `${t('inquiry.emailBody.name')}: ${name}`,
      `${t('inquiry.emailBody.email')}: ${email}`,
      `${t('inquiry.emailBody.whatsapp')}: ${whatsapp}`,
      `${t('inquiry.emailBody.preferredContact')}: ${preferredContact}`,
      `${t('inquiry.emailBody.requestedServices')}: ${requestedServicesText}`,
      `${t('inquiry.emailBody.tripType')}: ${tripType}`,
      `${t('inquiry.emailBody.destination')}: ${destination}`,
      `${t('inquiry.emailBody.dates')}: ${travelWindow}`,
      `${t('inquiry.emailBody.travelers')}: ${travelers}`,
      `${t('inquiry.emailBody.budget')}: ${budget}`,
      '',
      `${t('inquiry.emailBody.notes')}:`,
      notes,
    ].filter(Boolean);
    const subject = t('inquiry.emailSubject', { service: label, name });
    const payload: Record<string, string> = {
      _subject: subject,
      _template: 'table',
      _captcha: 'false',
      service: label,
      name,
      email,
      whatsapp,
      contact,
      preferredContact,
      requestedServices: requestedServicesText,
      tripType,
      destination,
      dates: travelWindow,
      travelers,
      budget,
      priority: 'normal',
      notes,
      message: details.join('\n'),
    };
    if (email) {
      payload._replyto = email;
    }

    setSubmitState('sending');
    let leadId = '';

    try {
      const lead = await createCrmLeadRecord({
        service: label,
        serviceKey: kind,
        name,
        contact,
        email,
        whatsapp,
        preferredContact,
        requestedServices: requestedServicesText,
        tripType,
        departureCity: '',
        destination,
        dates: travelWindow,
        travelers,
        budget,
        urgency: travelWindow || 'Flexible timing',
        priority: 'normal',
        notes,
      });
      leadId = lead.id;
      const response = await fetch('https://formsubmit.co/ajax/contact@dpmundo.com', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Form submission failed');
      }

      setSubmitState('sent');
      void updateCrmLeadRecord(leadId, { emailStatus: 'sent' });
      form.reset();
    } catch {
      if (leadId) void updateCrmLeadRecord(leadId, { emailStatus: 'failed' });
      setSubmitState('error');
    }
  }

  return (
    <AnimatePresence>
      {kind ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/72 px-3 pb-6 pt-4 backdrop-blur-sm sm:px-4 sm:pb-10 sm:pt-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inquiry-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="relative my-0 w-full max-w-2xl rounded-[24px] bg-white p-5 text-slate-900 shadow-2xl sm:rounded-[28px] sm:p-6 md:p-8"
          >
            <div className="flex items-start justify-between gap-6">
              <div>
                <Badge className="rounded-full bg-[#d4af37]/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#7a5a08]">
                  {label}
                </Badge>
                <h2 id="inquiry-title" className="mt-4 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl md:text-4xl">
                  {t(formProfile.titleKey)}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
                  {t(formProfile.introKey)}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 sm:h-11 sm:w-11"
                aria-label={t('inquiry.close')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
              <input type="text" name="_honey" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
              <div className="grid gap-5 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  {t(formProfile.nameLabelKey)}
                  <input name="name" className={inputClass} placeholder={t('inquiry.placeholders.name')} required />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  {t('inquiry.fields.whatsapp')}
                  <input name="whatsapp" type="tel" className={inputClass} placeholder={t('inquiry.placeholders.whatsapp')} />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  {t('inquiry.fields.emailOptional')}
                  <input name="email" type="email" className={inputClass} placeholder={t('inquiry.placeholders.email')} />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  {t('inquiry.fields.tripType')}
                  <select name="tripType" className={selectClass} defaultValue={formProfile.defaultTripType}>
                    {activeTripTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {t(`inquiry.options.tripType.${option}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  {t(formProfile.destinationLabelKey)}
                  <input name="destination" className={inputClass} placeholder={t('inquiry.placeholders.destination')} required />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  {t(formProfile.travelWindowLabelKey)}
                  <input name="travelWindow" className={inputClass} placeholder={t('inquiry.placeholders.travelWindow')} required />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  {t(formProfile.travelersLabelKey)}
                  <input name="travelers" className={inputClass} placeholder={t('inquiry.placeholders.travelers')} required />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  {t('inquiry.fields.budget')}
                  <select name="budget" className={selectClass} defaultValue={formProfile.defaultBudget}>
                    {activeBudgetOptions.map((option) => (
                      <option key={option} value={option}>
                        {t(`inquiry.options.budget.${option}`)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="text-sm font-medium text-slate-700">
                {t(formProfile.notesLabelKey)}
                <textarea
                  name="notes"
                  className={textAreaClass}
                  placeholder={t('inquiry.placeholders.notes')}
                />
              </label>
              {submitState === 'sent' ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
                  {t('inquiry.submitSuccess')}
                </div>
              ) : null}
              {formError || submitState === 'error' ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                  {formError || t('inquiry.submitError')}
                </div>
              ) : null}
              <div className="grid gap-3 sm:flex sm:flex-wrap sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full rounded-full border border-slate-200 px-6 text-slate-700 hover:bg-slate-50 sm:w-auto"
                  onClick={onClose}
                  disabled={isSending}
                >
                  {t('inquiry.cancel')}
                </Button>
                <Button type="submit" className="w-full rounded-full bg-[#d4af37] px-7 text-[#241f1b] hover:bg-[#e0bc4e] sm:w-auto" disabled={isSending}>
                  {isSending ? t('inquiry.submitSending') : t('inquiry.submit')}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
