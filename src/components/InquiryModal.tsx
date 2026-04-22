import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { inquiryLabelKeys } from '../data/travel';
import type { InquiryKind } from '../types';
import { Badge, Button } from './ui';
export function InquiryModal({
  kind,
  onClose,
}: {
  kind: InquiryKind | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const label = kind ? t(inquiryLabelKeys[kind]) : '';
  const inputClass =
    'mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#d4af37]';
  const textAreaClass =
    'mt-2 min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#d4af37]';

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const name = data.get('name')?.toString().trim() || t('inquiry.emailFallbackName');
    const details = [
      `${t('inquiry.emailBody.service')}: ${label}`,
      `${t('inquiry.emailBody.name')}: ${name}`,
      `${t('inquiry.emailBody.contact')}: ${data.get('contact') || ''}`,
      `${t('inquiry.emailBody.destination')}: ${data.get('destination') || ''}`,
      `${t('inquiry.emailBody.dates')}: ${data.get('dates') || ''}`,
      `${t('inquiry.emailBody.travelers')}: ${data.get('travelers') || ''}`,
      `${t('inquiry.emailBody.budget')}: ${data.get('budget') || ''}`,
      '',
      `${t('inquiry.emailBody.notes')}:`,
      data.get('notes') || '',
    ];

    const subject = encodeURIComponent(t('inquiry.emailSubject', { service: label, name }));
    const body = encodeURIComponent(details.join('\n'));
    window.location.href = `mailto:contact@dpmundo.com?subject=${subject}&body=${body}`;
  }

  return (
    <AnimatePresence>
      {kind ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/72 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-4 sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inquiry-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-3xl rounded-[24px] bg-white p-5 text-slate-900 shadow-2xl sm:rounded-[28px] sm:p-6 md:p-8"
          >
            <div className="flex items-start justify-between gap-6">
              <div>
                <Badge className="rounded-full bg-[#d4af37]/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#7a5a08]">
                  {label}
                </Badge>
                <h2 id="inquiry-title" className="mt-4 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl md:text-4xl">
                  {t('inquiry.title')}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
                  {t('inquiry.intro')}
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
              <div className="grid gap-5 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  {t('inquiry.fields.name')}
                  <input name="name" className={inputClass} placeholder={t('inquiry.placeholders.name')} required />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  {t('inquiry.fields.contact')}
                  <input name="contact" className={inputClass} placeholder={t('inquiry.placeholders.contact')} required />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  {t('inquiry.fields.destination')}
                  <input name="destination" className={inputClass} placeholder={t('inquiry.placeholders.destination')} />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  {t('inquiry.fields.dates')}
                  <input name="dates" className={inputClass} placeholder={t('inquiry.placeholders.dates')} />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  {t('inquiry.fields.travelers')}
                  <input name="travelers" className={inputClass} placeholder={t('inquiry.placeholders.travelers')} />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  {t('inquiry.fields.budget')}
                  <input name="budget" className={inputClass} placeholder={t('inquiry.placeholders.budget')} />
                </label>
              </div>
              <label className="text-sm font-medium text-slate-700">
                {t('inquiry.fields.notes')}
                <textarea
                  name="notes"
                  className={textAreaClass}
                  placeholder={t('inquiry.placeholders.notes')}
                />
              </label>
              <div className="grid gap-3 sm:flex sm:flex-wrap sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full rounded-full border border-slate-200 px-6 text-slate-700 hover:bg-slate-50 sm:w-auto"
                  onClick={onClose}
                >
                  {t('inquiry.cancel')}
                </Button>
                <Button type="submit" className="w-full rounded-full bg-[#d4af37] px-7 text-[#241f1b] hover:bg-[#e0bc4e] sm:w-auto">
                  {t('inquiry.submit')}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
