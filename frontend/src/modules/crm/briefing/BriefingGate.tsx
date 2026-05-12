import { useState } from 'react';
import { CheckSquare, FileText, Mail, MoreHorizontal, Send, X } from 'lucide-react';
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

  async function submitBriefingDecision() {
    if (isCorporate) {
      const summary = briefingValidationPreview || generateBriefingValidationPreview();
      await onSaveValidationBrief(summary);
      await onDecision('approved', summary);
      return;
    }
    await onDecision('approved');
  }

  const isClosed = lead.status === 'lost' || lead.lifecycleStage === 'closed';
  const isCorporate = lead.serviceKey === 'corporate';
  const templateCoreFields = isCorporate
    ? [
        briefingTemplate.purpose,
        briefingTemplate.successDefinition,
        briefingTemplate.routePreferences,
        briefingTemplate.dateFlexibility,
        briefingTemplate.travelerProfile,
        briefingTemplate.flightRequirements,
        briefingTemplate.accommodationRequirements,
        briefingTemplate.groundTransport,
        briefingTemplate.visaDocuments,
        briefingTemplate.billingRequirements,
        briefingTemplate.approvalRequirements,
        briefingTemplate.quoteOutput,
      ]
    : [
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
  const templateTotal = templateCoreFields.length;
  const templateCanApprove = templateReadyCount >= (isCorporate ? 10 : 7);
  const intakeReady = isCorporate
    ? readiness.items.filter((item) => item.label !== 'Corporate brief saved').every((item) => item.ready)
    : readiness.canApprove;
  const canApproveBriefing = intakeReady && templateCanApprove;

  return (
    <div className={isCorporate ? 'grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]' : 'grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]'}>
        <aside className={`order-2 rounded-xl border p-4 ${styles.panelSoft}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">{isCorporate ? 'Corporate briefing gate' : 'Briefing gate'}</div>
              <p className={`mt-1 text-sm leading-6 ${styles.muted}`}>
                  {isCorporate
                    ? 'Confirm the movement, traveler, policy, approval, and billing details before itinerary design.'
                    : 'Confirm the request is clear enough before it becomes design work.'}
                </p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs ${intakeReady ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
              {readiness.readyCount}/{readiness.total} ready
            </span>
          </div>

          {isCorporate ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {readiness.items.map((item) => (
                <span key={item.label} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${item.ready ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : 'border-amber-400/30 bg-amber-500/10 text-amber-200'}`}>
                  {item.ready ? <CheckSquare className="h-3.5 w-3.5" /> : <MoreHorizontal className="h-3.5 w-3.5" />}
                  {item.label}
                </span>
              ))}
            </div>
          ) : (
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
          )}

          <div className={`mt-4 rounded-xl border p-4 ${styles.panel}`}>
            <div className="font-semibold">Brief summary</div>
            <p className={`mt-2 text-sm leading-6 ${styles.soft}`}>
              {briefingValidationPreview || 'Generate the validation summary after completing the template. This is the version the trip owner will approve before Trip Design starts.'}
            </p>
            <div className="mt-4 grid gap-2">
              <button type="button" onClick={generateBriefingValidationPreview} className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium ${styles.buttonGhost}`}>
                <FileText className="h-4 w-4" />
                Generate summary
              </button>
              <button type="button" onClick={saveBriefingValidationSummary} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#d4af37] px-3 text-sm font-semibold text-[#241f1b]">
                <CheckSquare className="h-4 w-4" />
                {isCorporate ? 'Save corporate brief' : 'Save validation brief'}
              </button>
            </div>
            {briefingValidationPreview ? (
              <textarea
                value={briefingValidationPreview}
                onChange={(event) => setBriefingValidationPreview(event.target.value)}
                className={`mt-4 min-h-64 w-full resize-y rounded-lg border px-3 py-3 text-sm leading-6 outline-none ${styles.input}`}
              />
            ) : null}
          </div>

          <div className={`mt-4 rounded-xl border p-4 ${styles.panelSoft}`}>
            <div className="font-semibold">{isCorporate ? 'Owner validation' : 'Brief decision'}</div>
            <p className={`mt-2 text-sm leading-6 ${styles.soft}`}>
              {canApproveBriefing
                ? isCorporate ? 'Send the completed brief to the corporate trip owner. Trip Design unlocks only after CTM approval.' : 'This request can move into Trip Design.'
                : isCorporate ? 'Complete the required intake and quote-prep fields before sending this to the trip owner.' : 'Complete the core brief and request validation before assigning design work.'}
            </p>

            <div className={`mt-4 rounded-lg border p-3 ${styles.panel}`}>
              <div className={`text-xs uppercase tracking-[0.14em] ${styles.muted}`}>{isCorporate ? 'DPM coordinator' : 'Current owner'}</div>
              <div className="mt-2 text-sm font-semibold">{owner}</div>
              <div className={`mt-1 text-xs ${styles.muted}`}>{isCorporate ? 'Decision owner: corporate trip owner in CTM' : lifecycleLabel}</div>
            </div>

            {!isCorporate ? (
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
            ) : null}

            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={submitBriefingDecision}
                disabled={!canApproveBriefing || isClosed}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
              >
                {isCorporate ? <Send className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
                {isCorporate ? 'Submit to Trip Owner' : 'Approve for Trip Design'}
              </button>
              <button
                type="button"
                onClick={() => onDecision('moreInfo')}
                disabled={isClosed}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-600 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Mail className="h-4 w-4" />
                {isCorporate ? 'Request Missing Info' : 'Need More Info'}
              </button>
              {!isCorporate ? (
              <button
                type="button"
                onClick={() => onDecision('cancelled', briefingCancelReason)}
                disabled={isClosed}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
              >
                <X className="h-4 w-4" />
                Cancel Request
              </button>
              ) : null}
            </div>
          </div>
        </aside>

        <section className="order-1 min-w-0">
        <div className={`rounded-xl border p-4 ${styles.panel}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-semibold">{isCorporate ? 'Corporate travel brief template' : 'Pre-trip design template'}</div>
              <p className={`mt-1 text-sm leading-6 ${styles.muted}`}>
                {isCorporate
                  ? 'Capture the details DPM should validate with the company before itinerary research starts.'
                  : 'Capture the details DPM should validate with the client before itinerary design starts.'}
              </p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs ${templateCanApprove ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
              {templateReadyCount}/{templateTotal} template
            </span>
          </div>

          {isCorporate ? (
            <div className="mt-4 grid gap-4">
              <div className={`rounded-lg border p-3 ${styles.panelSoft}`}>
                <div className="text-sm font-semibold">Movement definition</div>
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <label className="text-sm font-medium">
                    Business purpose / meeting objective
                    <input value={briefingTemplate.purpose} onChange={(event) => updateBriefingTemplateField('purpose', event.target.value)} className={`mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`} placeholder="Board meeting, site visit, conference, project support..." />
                  </label>
                  <label className="text-sm font-medium">
                    Cities / route / movement plan
                    <input value={briefingTemplate.routePreferences} onChange={(event) => updateBriefingTemplateField('routePreferences', event.target.value)} className={`mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`} placeholder="Maputo -> Johannesburg -> Cape Town -> Maputo" />
                  </label>
                  <label className="text-sm font-medium">
                    Dates and flexibility
                    <input value={briefingTemplate.dateFlexibility} onChange={(event) => updateBriefingTemplateField('dateFlexibility', event.target.value)} className={`mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`} placeholder="Fixed dates, earliest departure, latest return..." />
                  </label>
                  <label className="text-sm font-medium md:col-span-2">
                    Traveler manifest / departments
                    <input value={briefingTemplate.travelerProfile} onChange={(event) => updateBriefingTemplateField('travelerProfile', event.target.value)} className={`mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`} placeholder="Names, departments, seniority, passport readiness, special roles..." />
                  </label>
                  <label className="text-sm font-medium">
                    Schedule pressure
                    <select value={briefingTemplate.pace} onChange={(event) => updateBriefingTemplateField('pace', event.target.value)} className={`mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`}>
                      <option value="">Select schedule pressure</option>
                      <option value="Fixed meeting schedule">Fixed meeting schedule</option>
                      <option value="Some flexibility">Some flexibility</option>
                      <option value="Urgent / critical movement">Urgent / critical movement</option>
                      <option value="Multiple city dependencies">Multiple city dependencies</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium md:col-span-2 xl:col-span-3">
                    Success criteria
                    <textarea value={briefingTemplate.successDefinition} onChange={(event) => updateBriefingTemplateField('successDefinition', event.target.value)} className={`mt-2 min-h-20 w-full resize-y rounded-lg border px-3 py-3 text-sm leading-6 outline-none ${styles.input}`} placeholder="Arrival timing, meeting attendance, policy compliance, traveler convenience, risk constraints..." />
                  </label>
                </div>
              </div>

              <div className={`rounded-lg border p-3 ${styles.panelSoft}`}>
                <div className="text-sm font-semibold">Quote input requirements</div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="text-sm font-medium">
                    Flights
                    <textarea value={briefingTemplate.flightRequirements} onChange={(event) => updateBriefingTemplateField('flightRequirements', event.target.value)} className={`mt-2 min-h-24 w-full resize-y rounded-lg border px-3 py-3 text-sm leading-6 outline-none ${styles.input}`} placeholder="Preferred airlines, airports, departure windows, fare flexibility, baggage, seat class..." />
                  </label>
                  <label className="text-sm font-medium">
                    Hotels / accommodation
                    <textarea value={briefingTemplate.accommodationRequirements} onChange={(event) => updateBriefingTemplateField('accommodationRequirements', event.target.value)} className={`mt-2 min-h-24 w-full resize-y rounded-lg border px-3 py-3 text-sm leading-6 outline-none ${styles.input}`} placeholder="Hotel category, exact area, office proximity, room type, breakfast, check-in/out..." />
                  </label>
                  <label className="text-sm font-medium">
                    Ground transport
                    <textarea value={briefingTemplate.groundTransport} onChange={(event) => updateBriefingTemplateField('groundTransport', event.target.value)} className={`mt-2 min-h-20 w-full resize-y rounded-lg border px-3 py-3 text-sm leading-6 outline-none ${styles.input}`} placeholder="Airport transfers, office shuttle, car with driver, security, meet-and-greet..." />
                  </label>
                  <label className="text-sm font-medium">
                    Visa / documents / risk
                    <textarea value={briefingTemplate.visaDocuments} onChange={(event) => updateBriefingTemplateField('visaDocuments', event.target.value)} className={`mt-2 min-h-20 w-full resize-y rounded-lg border px-3 py-3 text-sm leading-6 outline-none ${styles.input}`} placeholder="Passport validity, visa needs, invitation letters, insurance, medical/accessibility notes..." />
                  </label>
                  <label className="text-sm font-medium md:col-span-2">
                    DPM services in scope
                    <textarea value={briefingTemplate.servicesNeeded} onChange={(event) => updateBriefingTemplateField('servicesNeeded', event.target.value)} className={`mt-2 min-h-20 w-full resize-y rounded-lg border px-3 py-3 text-sm leading-6 outline-none ${styles.input}`} placeholder="Flights, hotels, transfers, visa support, assistance, reporting, emergency support..." />
                  </label>
                </div>
              </div>

              <div className={`rounded-lg border p-3 ${styles.panelSoft}`}>
                <div className="text-sm font-semibold">Commercial controls</div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="text-sm font-medium">
                    Budget / policy
                    <textarea value={briefingTemplate.budgetFlexibility} onChange={(event) => updateBriefingTemplateField('budgetFlexibility', event.target.value)} className={`mt-2 min-h-20 w-full resize-y rounded-lg border px-3 py-3 text-sm leading-6 outline-none ${styles.input}`} placeholder="Budget cap, travel class, hotel cap, preferred suppliers, flexibility..." />
                  </label>
                  <label className="text-sm font-medium">
                    Billing / invoice requirements
                    <textarea value={briefingTemplate.billingRequirements} onChange={(event) => updateBriefingTemplateField('billingRequirements', event.target.value)} className={`mt-2 min-h-20 w-full resize-y rounded-lg border px-3 py-3 text-sm leading-6 outline-none ${styles.input}`} placeholder="Cost center, PO, billing entity, tax details, invoice recipient, payment terms..." />
                  </label>
                  <label className="text-sm font-medium">
                    Approval requirements
                    <textarea value={briefingTemplate.approvalRequirements} onChange={(event) => updateBriefingTemplateField('approvalRequirements', event.target.value)} className={`mt-2 min-h-20 w-full resize-y rounded-lg border px-3 py-3 text-sm leading-6 outline-none ${styles.input}`} placeholder="Travel owner, finance approver, approval deadline, CTM approval channel..." />
                  </label>
                  <label className="text-sm font-medium">
                    Quote output expected
                    <textarea value={briefingTemplate.quoteOutput} onChange={(event) => updateBriefingTemplateField('quoteOutput', event.target.value)} className={`mt-2 min-h-20 w-full resize-y rounded-lg border px-3 py-3 text-sm leading-6 outline-none ${styles.input}`} placeholder="Line items, currencies, taxes, validity, alternatives, assumptions, exclusions..." />
                  </label>
                  <label className="text-sm font-medium md:col-span-2">
                    Assumptions / exclusions
                    <textarea value={briefingTemplate.assumptionsExclusions} onChange={(event) => updateBriefingTemplateField('assumptionsExclusions', event.target.value)} className={`mt-2 min-h-20 w-full resize-y rounded-lg border px-3 py-3 text-sm leading-6 outline-none ${styles.input}`} placeholder="What DPM should not quote yet, unknowns, supplier assumptions, client-side dependencies..." />
                  </label>
                </div>
              </div>

              <label className="block text-sm font-medium">
                Company validation questions
                <textarea value={briefingTemplate.validationQuestions} onChange={(event) => updateBriefingTemplateField('validationQuestions', event.target.value)} className={`mt-2 min-h-20 w-full resize-y rounded-lg border px-3 py-3 text-sm leading-6 outline-none ${styles.input}`} />
              </label>
            </div>
          ) : (
            <>
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
            </>
          )}

        </div>

        </section>
    </div>
  );
}
