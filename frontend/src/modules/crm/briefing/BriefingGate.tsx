import { useState } from 'react';
import { CheckSquare, FileText, Mail, MoreHorizontal, X } from 'lucide-react';
import type { CrmLead } from '../../../types';
import { briefingValidationSummary, emptyBriefingTemplateDraft, hasBriefingValue, type BriefingDecision, type BriefingReadiness, type BriefingTemplateDraft } from './briefingLogic';

type BriefingGateStyles = {
  panelSoft: string;
  panel: string;
  muted: string;
  input: string;
  soft: string;
  buttonGhost: string;
};

type BriefingGateProps = {
  lead: CrmLead;
  readiness: BriefingReadiness;
  styles: BriefingGateStyles;
  owner: string;
  lifecycleLabel: string;
  onNotesChange: (notes: string) => void | Promise<void>;
  onSaveValidationBrief: (summary: string) => void | Promise<void>;
  onDecision: (decision: BriefingDecision, detail?: string) => void | Promise<void>;
};

const briefingCancellationReasons = [
  'No client response',
  'Budget mismatch',
  'Dates not viable',
  'Outside DPM scope',
  'Duplicate request',
  'Client cancelled',
] as const;

export function BriefingGate({
  lead,
  readiness,
  styles,
  owner,
  lifecycleLabel,
  onNotesChange,
  onSaveValidationBrief,
  onDecision,
}: BriefingGateProps) {
  const [briefingTemplate, setBriefingTemplate] = useState<BriefingTemplateDraft>(() => emptyBriefingTemplateDraft(lead));
  const [briefingValidationPreview, setBriefingValidationPreview] = useState('');
  const [briefingCancelReason, setBriefingCancelReason] = useState<(typeof briefingCancellationReasons)[number]>(briefingCancellationReasons[0]);

  function updateBriefingTemplateField(field: keyof BriefingTemplateDraft, value: string) {
    setBriefingTemplate((current) => ({ ...current, [field]: value }));
  }

  function generateBriefingValidationPreview() {
    const summary = briefingValidationSummary(lead, briefingTemplate);
    setBriefingValidationPreview(summary);
    return summary;
  }

  async function saveBriefingValidationSummary() {
    const summary = briefingValidationPreview || generateBriefingValidationPreview();
    await onSaveValidationBrief(summary);
  }

  const isClosed = lead.status === 'lost' || lead.lifecycleStage === 'closed';
  const templateCoreFields = [
    briefingTemplate.purpose,
    briefingTemplate.successDefinition,
    briefingTemplate.travelStyle,
    briefingTemplate.pace,
    briefingTemplate.accommodationLevel,
    briefingTemplate.routePreferences,
    briefingTemplate.travelerProfile,
    briefingTemplate.budgetFlexibility,
    briefingTemplate.decisionPriority,
    briefingTemplate.servicesNeeded,
  ];
  const templateReadyCount = templateCoreFields.filter(hasBriefingValue).length;
  const templateCanApprove = templateReadyCount >= 7;
  const canApproveBriefing = readiness.canApprove && templateCanApprove;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className={`rounded-xl border p-4 ${styles.panelSoft}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-semibold">Briefing gate</div>
            <p className={`mt-1 text-sm leading-6 ${styles.muted}`}>Confirm the request is clear enough before it becomes design work.</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs ${readiness.canApprove ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
            {readiness.readyCount}/{readiness.total} ready
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {readiness.items.map((item) => (
            <div key={item.label} className={`rounded-lg border px-3 py-3 ${styles.panel}`}>
              <div className="flex items-center gap-2">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${item.ready ? 'border-emerald-400/50 text-emerald-300' : 'border-amber-400/45 text-amber-300'}`}>
                  {item.ready ? <CheckSquare className="h-3.5 w-3.5" /> : <MoreHorizontal className="h-3.5 w-3.5" />}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{item.label}</div>
                  <div className={`mt-1 line-clamp-2 text-xs ${styles.muted}`}>{item.detail}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className={`mt-4 rounded-xl border p-4 ${styles.panel}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-semibold">Pre-trip design template</div>
              <p className={`mt-1 text-sm leading-6 ${styles.muted}`}>Capture the details DPM should validate with the client before itinerary design starts.</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs ${templateCanApprove ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
              {templateReadyCount}/10 template
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm font-medium">
              Trip purpose
              <input value={briefingTemplate.purpose} onChange={(event) => updateBriefingTemplateField('purpose', event.target.value)} className={`mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`} />
            </label>
            <label className="text-sm font-medium">
              Travel style
              <input value={briefingTemplate.travelStyle} onChange={(event) => updateBriefingTemplateField('travelStyle', event.target.value)} className={`mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`} placeholder="Relaxed, luxury, adventure, family..." />
            </label>
            <label className="text-sm font-medium">
              Preferred pace
              <select value={briefingTemplate.pace} onChange={(event) => updateBriefingTemplateField('pace', event.target.value)} className={`mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`}>
                <option value="">Select pace</option>
                <option value="Slow and relaxed">Slow and relaxed</option>
                <option value="Balanced">Balanced</option>
                <option value="Active / full schedule">Active / full schedule</option>
                <option value="Flexible by city">Flexible by city</option>
              </select>
            </label>
            <label className="text-sm font-medium">
              Accommodation level
              <input value={briefingTemplate.accommodationLevel} onChange={(event) => updateBriefingTemplateField('accommodationLevel', event.target.value)} className={`mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`} placeholder="3-star, 4-star, luxury, villa..." />
            </label>
            <label className="text-sm font-medium">
              Route preferences
              <input value={briefingTemplate.routePreferences} onChange={(event) => updateBriefingTemplateField('routePreferences', event.target.value)} className={`mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`} placeholder="Cities, countries, must-visit places..." />
            </label>
            <label className="text-sm font-medium">
              Date flexibility
              <input value={briefingTemplate.dateFlexibility} onChange={(event) => updateBriefingTemplateField('dateFlexibility', event.target.value)} className={`mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`} placeholder="Fixed, flexible, best month..." />
            </label>
            <label className="text-sm font-medium">
              Traveler profile
              <input value={briefingTemplate.travelerProfile} onChange={(event) => updateBriefingTemplateField('travelerProfile', event.target.value)} className={`mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`} placeholder="Adults, children, ages, occasion..." />
            </label>
            <label className="text-sm font-medium">
              Decision priority
              <input value={briefingTemplate.decisionPriority} onChange={(event) => updateBriefingTemplateField('decisionPriority', event.target.value)} className={`mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`} placeholder="Price, comfort, experience, convenience..." />
            </label>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-sm font-medium">
              Success definition
              <textarea value={briefingTemplate.successDefinition} onChange={(event) => updateBriefingTemplateField('successDefinition', event.target.value)} className={`mt-2 min-h-24 w-full resize-y rounded-lg border px-3 py-3 text-sm leading-6 outline-none ${styles.input}`} placeholder="What should make this trip feel successful for the client?" />
            </label>
            <label className="text-sm font-medium">
              Room and special requirements
              <textarea value={`${briefingTemplate.roomPreferences}${briefingTemplate.specialRequirements ? `\n${briefingTemplate.specialRequirements}` : ''}`} onChange={(event) => {
                const [roomPreferences, ...specialLines] = event.target.value.split('\n');
                setBriefingTemplate((current) => ({ ...current, roomPreferences, specialRequirements: specialLines.join('\n') }));
              }} className={`mt-2 min-h-24 w-full resize-y rounded-lg border px-3 py-3 text-sm leading-6 outline-none ${styles.input}`} placeholder="Room type, bed setup, accessibility, diet, visa/passport notes..." />
            </label>
            <label className="text-sm font-medium">
              Budget flexibility
              <textarea value={briefingTemplate.budgetFlexibility} onChange={(event) => updateBriefingTemplateField('budgetFlexibility', event.target.value)} className={`mt-2 min-h-20 w-full resize-y rounded-lg border px-3 py-3 text-sm leading-6 outline-none ${styles.input}`} placeholder="Hard cap, flexible, comfort over price..." />
            </label>
            <label className="text-sm font-medium">
              Services needed
              <textarea value={briefingTemplate.servicesNeeded} onChange={(event) => updateBriefingTemplateField('servicesNeeded', event.target.value)} className={`mt-2 min-h-20 w-full resize-y rounded-lg border px-3 py-3 text-sm leading-6 outline-none ${styles.input}`} placeholder="Flights, hotels, transfers, experiences, visa, insurance..." />
            </label>
          </div>

          <label className="mt-3 block text-sm font-medium">
            Client validation questions
            <textarea value={briefingTemplate.validationQuestions} onChange={(event) => updateBriefingTemplateField('validationQuestions', event.target.value)} className={`mt-2 min-h-20 w-full resize-y rounded-lg border px-3 py-3 text-sm leading-6 outline-none ${styles.input}`} />
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={generateBriefingValidationPreview} className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium ${styles.buttonGhost}`}>
              <FileText className="h-4 w-4" />
              Generate validation summary
            </button>
            <button type="button" onClick={saveBriefingValidationSummary} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#d4af37] px-3 text-sm font-semibold text-[#241f1b]">
              <CheckSquare className="h-4 w-4" />
              Save validation brief
            </button>
          </div>

          {briefingValidationPreview ? (
            <textarea
              value={briefingValidationPreview}
              onChange={(event) => setBriefingValidationPreview(event.target.value)}
              className={`mt-4 min-h-56 w-full resize-y rounded-lg border px-3 py-3 text-sm leading-6 outline-none ${styles.input}`}
            />
          ) : null}
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-semibold">Briefing notes</span>
          <textarea
            value={lead.internalNotes || ''}
            onChange={(event) => onNotesChange(event.target.value)}
            className={`mt-2 min-h-32 w-full resize-y rounded-lg border px-3 py-3 text-sm leading-6 outline-none transition ${styles.input}`}
            placeholder="Call notes, missing information, client intent, constraints, decision context..."
          />
        </label>
      </div>

      <div className={`rounded-xl border p-4 ${styles.panelSoft}`}>
        <div className="font-semibold">Brief decision</div>
        <p className={`mt-2 text-sm leading-6 ${styles.soft}`}>
          {canApproveBriefing
            ? 'This request can move into Trip Design.'
            : 'Complete the core brief and request validation before assigning design work.'}
        </p>

        <div className={`mt-4 rounded-lg border p-3 ${styles.panel}`}>
          <div className={`text-xs uppercase tracking-[0.14em] ${styles.muted}`}>Current owner</div>
          <div className="mt-2 text-sm font-semibold">{owner}</div>
          <div className={`mt-1 text-xs ${styles.muted}`}>{lifecycleLabel}</div>
        </div>

        <label className="mt-4 block text-sm font-medium">
          Cancellation reason
          <select
            value={briefingCancelReason}
            onChange={(event) => setBriefingCancelReason(event.target.value as (typeof briefingCancellationReasons)[number])}
            className={`mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`}
          >
            {briefingCancellationReasons.map((reason) => (
              <option key={reason} value={reason}>{reason}</option>
            ))}
          </select>
        </label>

        <div className="mt-4 grid gap-2">
          <button
            type="button"
            onClick={() => onDecision('approved')}
            disabled={!canApproveBriefing || isClosed}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            <CheckSquare className="h-4 w-4" />
            Approve for Trip Design
          </button>
          <button
            type="button"
            onClick={() => onDecision('moreInfo')}
            disabled={isClosed}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-600 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Mail className="h-4 w-4" />
            Need More Info
          </button>
          <button
            type="button"
            onClick={() => onDecision('cancelled', briefingCancelReason)}
            disabled={isClosed}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            <X className="h-4 w-4" />
            Cancel Request
          </button>
        </div>
      </div>
    </div>
  );
}
