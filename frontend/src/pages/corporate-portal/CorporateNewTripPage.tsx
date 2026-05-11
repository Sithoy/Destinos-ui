import { AlertCircle, CalendarDays, Minus, PlusSquare } from 'lucide-react';
import { useMemo, useState } from 'react';
import { corporateCostBands, corporateDepartments, corporateServiceCatalog } from '../../data/corporatePortal';
import type { CorporatePortalTheme, CorporateTravelerProfile, CorporateTripCreateInput } from '../../types/corporatePortal';
import { corporatePortalThemeStyles } from './portalTheme';

const initialTravelers = [{ profileId: undefined as string | number | undefined, name: '', email: '', department: corporateDepartments[0] }];

function todayLocalIso() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function addDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatReadableDate(value: string) {
  if (!value) return 'No date selected';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

function RequiredMark() {
  return <span className="text-[#d9b46f]">*</span>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="mt-2 flex items-start gap-1.5 text-xs text-rose-200">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function CorporateNewTripPage({
  onCreateTrip,
  savedTravelers,
  theme,
}: {
  onCreateTrip: (input: CorporateTripCreateInput) => Promise<void>;
  savedTravelers: CorporateTravelerProfile[];
  theme: CorporatePortalTheme;
}) {
  const [department, setDepartment] = useState(corporateDepartments[0]);
  const [origin, setOrigin] = useState('Maputo');
  const [destination, setDestination] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [purpose, setPurpose] = useState('');
  const [budgetBand, setBudgetBand] = useState<'lt1k' | '1k_5k' | 'gt5k'>('1k_5k');
  const [services, setServices] = useState<CorporateTripCreateInput['services']>(['Flight', 'Hotel']);
  const [travelers, setTravelers] = useState(initialTravelers);
  const [showErrors, setShowErrors] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const styles = corporatePortalThemeStyles[theme];
  const minTravelDate = todayLocalIso();
  const optionClass = theme === 'dark' ? 'bg-[#07111f]' : 'bg-white';
  const fieldBase = `h-11 w-full rounded-lg border px-3 text-sm outline-none ${styles.input}`;
  const textareaBase = `w-full rounded-lg border px-3 py-3 text-sm outline-none ${styles.input}`;
  const sectionRule = theme === 'dark' ? 'border-white/10 text-white/55' : 'border-slate-200 text-slate-500';
  const quickDates = [
    { label: 'Tomorrow', value: addDaysIso(1) },
    { label: 'Next week', value: addDaysIso(7) },
    { label: '+30 days', value: addDaysIso(30) },
  ];

  const fieldErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    if (!origin.trim()) errors.origin = 'Origin is required.';
    if (!destination.trim()) errors.destination = 'Destination is required.';
    if (!departureDate) errors.departureDate = 'Departure date is required.';
    if (departureDate && departureDate < minTravelDate) errors.departureDate = 'Departure date cannot be in the past.';
    if (!purpose.trim()) errors.purpose = 'Business purpose is required.';
    if (services.length === 0) errors.services = 'Select at least one service.';
    travelers.forEach((traveler, index) => {
      if (!traveler.name.trim()) errors[`traveler-${index}-name`] = 'Traveler name is required.';
      if (!traveler.email.trim()) errors[`traveler-${index}-email`] = 'Traveler email is required.';
      if (traveler.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(traveler.email.trim())) {
        errors[`traveler-${index}-email`] = 'Enter a valid email address.';
      }
    });
    return errors;
  }, [departureDate, destination, minTravelDate, origin, purpose, services.length, travelers]);

  const canSubmit = useMemo(() => Object.keys(fieldErrors).length === 0, [fieldErrors]);
  const markTouched = (field: string) => setTouched((current) => ({ ...current, [field]: true }));
  const visibleError = (field: string) => (showErrors || touched[field] ? fieldErrors[field] : '');
  const errorClass = (field: string) => (visibleError(field) ? 'border-rose-400/50 ring-1 ring-rose-400/25' : '');

  const toggleService = (service: (typeof corporateServiceCatalog)[number]) => {
    markTouched('services');
    setServices((current) => (current.includes(service) ? current.filter((item) => item !== service) : [...current, service]));
  };

  const updateTraveler = (index: number, field: 'name' | 'email' | 'department', value: string) => {
    setTravelers((current) => current.map((traveler, travelerIndex) => (travelerIndex === index ? { ...traveler, [field]: value } : traveler)));
  };

  const addTraveler = () => {
    setTravelers((current) => [...current, { profileId: undefined, name: '', email: '', department }]);
  };

  const removeTraveler = (index: number) => {
    setTravelers((current) => (current.length === 1 ? current : current.filter((_, travelerIndex) => travelerIndex !== index)));
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      setShowErrors(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateTrip({
        department,
        origin,
        destination,
        departureDate,
        purpose,
        budgetBand,
        services,
        travelers: travelers.map((traveler) => ({
          name: traveler.name.trim(),
          email: traveler.email.trim(),
          department: traveler.department,
        })),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableTravelerProfiles = useMemo(() => {
    const selectedIds = new Set(travelers.map((traveler) => String(traveler.profileId ?? '')).filter(Boolean));
    return savedTravelers.filter((traveler) => traveler.isActive && !selectedIds.has(String(traveler.id)));
  }, [savedTravelers, travelers]);

  const addTravelerFromProfile = (profile: CorporateTravelerProfile) => {
    setTravelers((current) => [
      ...current,
      {
        profileId: profile.id,
        name: profile.name,
        email: profile.email,
        department: profile.department,
      },
    ]);
  };

  return (
    <section className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[1.18fr_0.82fr]">
      <div className={`rounded-xl border p-5 shadow-2xl ${styles.panel}`}>
        <div className="mb-5">
          <h2 className="text-2xl font-semibold">Create a new corporate travel request</h2>
          <p className={`mt-2 max-w-2xl text-sm leading-6 ${styles.muted}`}>
            Capture the request once, attach the travelers, and send it into the approval workflow with a clean DPM brief.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <div className={`mb-3 border-b pb-2 text-xs font-semibold uppercase tracking-[0.14em] ${sectionRule}`}>
              Request details
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                <div className={`mb-1.5 ${styles.muted}`}>Department</div>
                <select value={department} onChange={(event) => setDepartment(event.target.value)} className={fieldBase}>
                  {corporateDepartments.map((item) => (
                    <option key={item} value={item} className={optionClass}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                <div className={`mb-1.5 ${styles.muted}`}>Budget band</div>
                <select value={budgetBand} onChange={(event) => setBudgetBand(event.target.value as 'lt1k' | '1k_5k' | 'gt5k')} className={fieldBase}>
                  {corporateCostBands.map((item) => (
                    <option key={item.key} value={item.key} className={optionClass}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                <div className={`mb-1.5 ${styles.muted}`}>Origin <RequiredMark /></div>
                <input value={origin} onBlur={() => markTouched('origin')} onChange={(event) => setOrigin(event.target.value)} className={`${fieldBase} ${errorClass('origin')}`} />
                <FieldError message={visibleError('origin')} />
              </label>

              <label className="text-sm">
                <div className={`mb-1.5 ${styles.muted}`}>Destination <RequiredMark /></div>
                <input value={destination} onBlur={() => markTouched('destination')} onChange={(event) => setDestination(event.target.value)} className={`${fieldBase} ${errorClass('destination')}`} placeholder="Johannesburg, Dubai, Cape Town..." />
                <FieldError message={visibleError('destination')} />
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
              <div>
                <label className="text-sm">
                  <div className={`mb-1.5 flex items-center justify-between gap-3 ${styles.muted}`}>
                    <span>Departure date <RequiredMark /></span>
                    <span className="inline-flex items-center gap-1 text-xs">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatReadableDate(departureDate)}
                    </span>
                  </div>
                  <input type="date" min={minTravelDate} value={departureDate} onBlur={() => markTouched('departureDate')} onChange={(event) => setDepartureDate(event.target.value)} className={`${fieldBase} ${errorClass('departureDate')} [color-scheme:dark]`} />
                </label>
                <FieldError message={visibleError('departureDate')} />
              </div>
              <div>
                <div className={`mb-1.5 text-sm ${styles.muted}`}>Quick date</div>
                <div className="flex flex-wrap gap-2">
                  {quickDates.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        setDepartureDate(item.value);
                        markTouched('departureDate');
                      }}
                      className={`h-11 rounded-lg border px-3 text-sm transition ${departureDate === item.value ? 'border-[#d9b46f]/45 bg-[#d9b46f]/10 text-[#d9b46f]' : styles.buttonGhost}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className={`mt-2 text-xs ${styles.muted}`}>Earliest allowed: {formatReadableDate(minTravelDate)}.</div>
              </div>
            </div>
          </div>

          <div>
            <div className={`mb-3 border-b pb-2 text-xs font-semibold uppercase tracking-[0.14em] ${sectionRule}`}>
              Purpose and services
            </div>
            <label className="block text-sm">
              <div className={`mb-1.5 ${styles.muted}`}>Business purpose <RequiredMark /></div>
              <textarea
                value={purpose}
                onBlur={() => markTouched('purpose')}
                onChange={(event) => setPurpose(event.target.value)}
                rows={4}
                className={`${textareaBase} resize-none ${errorClass('purpose')}`}
                placeholder="Describe the business need, meeting, training, negotiation, or project objective."
              />
              <FieldError message={visibleError('purpose')} />
            </label>

            <div className="mt-4">
              <div className="mb-2 text-sm font-medium">Services needed <RequiredMark /></div>
              <div className="flex flex-wrap gap-2">
                {corporateServiceCatalog.map((service) => {
                  const checked = services.includes(service);
                  return (
                    <button
                      key={service}
                      type="button"
                      onClick={() => toggleService(service)}
                      className={`inline-flex h-10 items-center rounded-lg border px-3 text-sm transition ${
                        checked ? 'border-[#d9b46f]/45 bg-[#d9b46f]/10 text-[#d9b46f]' : styles.buttonGhost
                      }`}
                    >
                      {service}
                    </button>
                  );
                })}
              </div>
              <FieldError message={visibleError('services')} />
            </div>
          </div>

          <div>
            <div className={`mb-3 flex flex-wrap items-center justify-between gap-3 border-b pb-2 ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#d9b46f]">Travelers</div>
                <div className={`mt-1 text-xs ${styles.muted}`}>Reuse saved profiles or add traveler details manually.</div>
              </div>
              <button type="button" onClick={addTraveler} className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold ${styles.buttonGhost}`}>
                <PlusSquare className="h-4 w-4" />
                Add traveler
              </button>
            </div>

            {availableTravelerProfiles.length > 0 ? (
              <div className="mb-4">
                <div className={`mb-2 text-xs ${styles.muted}`}>Saved profiles</div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {availableTravelerProfiles.slice(0, 8).map((profile) => (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => addTravelerFromProfile(profile)}
                      className={`min-w-[190px] rounded-lg border px-3 py-2 text-left text-sm transition ${theme === 'dark' ? 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08]' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                    >
                      <div className="truncate font-medium">{profile.name}</div>
                      <div className={`mt-1 truncate text-xs ${styles.muted}`}>{profile.department} - {profile.email}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              {travelers.map((traveler, index) => (
                <div key={`traveler-${index}`} className={`rounded-lg border px-3 py-3 ${styles.surface}`}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">
                      Traveler {index + 1}
                      {traveler.profileId ? <span className={`ml-2 text-xs font-normal ${styles.muted}`}>Saved profile</span> : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTraveler(index)}
                      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs ${styles.buttonGhost}`}
                    >
                      <Minus className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1fr_1fr_0.85fr]">
                    <div>
                      <input
                        value={traveler.name}
                        onBlur={() => markTouched(`traveler-${index}-name`)}
                        onChange={(event) => updateTraveler(index, 'name', event.target.value)}
                        className={`${fieldBase} ${errorClass(`traveler-${index}-name`)}`}
                        placeholder="Full name *"
                      />
                      <FieldError message={visibleError(`traveler-${index}-name`)} />
                    </div>
                    <div>
                      <input
                        value={traveler.email}
                        onBlur={() => markTouched(`traveler-${index}-email`)}
                        onChange={(event) => updateTraveler(index, 'email', event.target.value)}
                        className={`${fieldBase} ${errorClass(`traveler-${index}-email`)}`}
                        placeholder="Email *"
                      />
                      <FieldError message={visibleError(`traveler-${index}-email`)} />
                    </div>
                    <select
                      value={traveler.department}
                      onChange={(event) => updateTraveler(index, 'department', event.target.value)}
                      className={fieldBase}
                    >
                      {corporateDepartments.map((item) => (
                        <option key={item} value={item} className={optionClass}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {showErrors && !canSubmit ? (
          <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            Fill destination, departure date, purpose, at least one service, and complete every traveler row before submitting.
          </div>
        ) : null}
      </div>

      <aside className="grid gap-4">
        <div className={`rounded-xl border p-5 shadow-2xl ${styles.panel}`}>
          <div className="text-lg font-semibold">Approval path</div>
          <div className="mt-4 space-y-3">
            {corporateCostBands.map((item) => (
              <div
                key={item.key}
                className={`rounded-2xl border px-4 py-3 ${
                  item.key === budgetBand ? 'border-[#d9b46f]/35 bg-[#d9b46f]/10' : theme === 'dark' ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="font-medium">{item.label}</div>
                <div className={`mt-1 text-sm ${styles.muted}`}>{item.approval}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={`rounded-xl border p-5 shadow-2xl ${styles.panel}`}>
          <div className="text-lg font-semibold">Submission summary</div>
          <div className="mt-4 space-y-3 text-sm">
            <div className={`rounded-xl border px-4 py-3 ${styles.surface}`}>
              <div className={styles.muted}>Route</div>
              <div className="mt-1 font-medium">
                {`${origin || 'Origin'} - ${destination || 'Destination'}`}
              </div>
            </div>
            <div className={`rounded-xl border px-4 py-3 ${styles.surface}`}>
              <div className={styles.muted}>Travelers</div>
              <div className="mt-1 font-medium">{travelers.length}</div>
            </div>
            <div className={`rounded-xl border px-4 py-3 ${styles.surface}`}>
              <div className={styles.muted}>Services</div>
              <div className="mt-1 font-medium">{services.length ? services.join(', ') : 'Select at least one service'}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !canSubmit}
            className={`mt-5 w-full rounded-lg px-4 py-3 text-sm font-semibold ${styles.buttonPrimary} disabled:cursor-not-allowed disabled:opacity-55`}
          >
            {isSubmitting ? 'Submitting...' : 'Submit request for approval'}
          </button>
          {!canSubmit ? (
            <div className={`mt-3 text-xs ${styles.muted}`}>Complete the required fields marked with <RequiredMark /> to submit.</div>
          ) : null}
        </div>
      </aside>
    </section>
  );
}
