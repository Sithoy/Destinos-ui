import { PlusSquare, Save, ShieldAlert, UserRoundCheck, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { corporateDepartments } from '../../data/corporatePortal';
import type { CorporatePortalTheme, CorporateTravelerProfile, CorporateTravelerProfileInput } from '../../types/corporatePortal';
import { corporatePortalThemeStyles } from './portalTheme';

const emptyTraveler: CorporateTravelerProfileInput = {
  name: '',
  department: corporateDepartments[0],
  email: '',
  phone: '',
  nationality: 'Mozambican',
  passportNumber: '',
  passportExpiry: '',
  passportStatus: 'Missing',
  visaStatus: 'N/A',
  notes: '',
  isActive: true,
};

export function CorporateTravelersPage({
  travelers,
  search,
  theme,
  onCreateTraveler,
  onUpdateTraveler,
  onOpenRequest,
}: {
  travelers: CorporateTravelerProfile[];
  search: string;
  theme: CorporatePortalTheme;
  onCreateTraveler: (input: CorporateTravelerProfileInput) => Promise<void>;
  onUpdateTraveler: (id: string | number, input: Partial<CorporateTravelerProfileInput>) => Promise<void>;
  onOpenRequest: (tripId: string) => void;
}) {
  const styles = corporatePortalThemeStyles[theme];
  const [selectedTravelerId, setSelectedTravelerId] = useState<string | number | null>(travelers[0]?.id ?? null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<CorporateTravelerProfileInput>(emptyTraveler);
  const [isSaving, setIsSaving] = useState(false);

  const filteredTravelers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return travelers;
    return travelers.filter((traveler) =>
      [traveler.name, traveler.department, traveler.email, traveler.phone, traveler.nationality, traveler.nextTripLabel ?? '']
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [search, travelers]);

  const selectedTraveler = useMemo(
    () => filteredTravelers.find((traveler) => String(traveler.id) === String(selectedTravelerId)) ?? filteredTravelers[0] ?? null,
    [filteredTravelers, selectedTravelerId],
  );

  useEffect(() => {
    if (isCreating) {
      setForm(emptyTraveler);
      return;
    }
    if (selectedTraveler) {
      setForm({
        name: selectedTraveler.name,
        department: selectedTraveler.department,
        email: selectedTraveler.email,
        phone: selectedTraveler.phone,
        nationality: selectedTraveler.nationality,
        passportNumber: selectedTraveler.passportNumber ?? '',
        passportExpiry: selectedTraveler.passportExpiry ?? '',
        passportStatus: selectedTraveler.passportStatus,
        visaStatus: selectedTraveler.visaStatus,
        notes: selectedTraveler.notes ?? '',
        isActive: selectedTraveler.isActive,
      });
    }
  }, [isCreating, selectedTraveler]);

  const stats = useMemo(() => {
    const passportAttention = travelers.filter((traveler) => traveler.passportStatus !== 'OK').length;
    const visaAttention = travelers.filter((traveler) => traveler.visaStatus === 'Required' || traveler.visaStatus === 'Pending').length;
    const upcomingTrips = travelers.filter((traveler) => traveler.nextTripId).length;
    return { passportAttention, visaAttention, upcomingTrips };
  }, [travelers]);

  const handleChange = <K extends keyof CorporateTravelerProfileInput>(key: K, value: CorporateTravelerProfileInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (isCreating) {
        await onCreateTraveler(form);
        setIsCreating(false);
      } else if (selectedTraveler) {
        await onUpdateTraveler(selectedTraveler.id, form);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-3">
        <div className={`rounded-xl border p-4 ${styles.panel}`}>
          <div className={`text-sm ${styles.muted}`}>Traveler records</div>
          <div className="mt-2 text-3xl font-semibold">{travelers.length}</div>
          <div className={`mt-2 text-sm ${styles.muted}`}>Reusable company profiles by department.</div>
        </div>
        <div className={`rounded-xl border p-4 ${styles.panel}`}>
          <div className={`text-sm ${styles.muted}`}>Passport attention</div>
          <div className="mt-2 text-3xl font-semibold">{stats.passportAttention}</div>
          <div className={`mt-2 text-sm ${styles.muted}`}>Missing or expired before upcoming travel.</div>
        </div>
        <div className={`rounded-xl border p-4 ${styles.panel}`}>
          <div className={`text-sm ${styles.muted}`}>Visa attention</div>
          <div className="mt-2 text-3xl font-semibold">{stats.visaAttention}</div>
          <div className={`mt-2 text-sm ${styles.muted}`}>{stats.upcomingTrips} travelers already tied to upcoming movement.</div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className={`rounded-xl border ${styles.panel}`}>
          <div className="flex items-center justify-between gap-3 border-b border-inherit px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold">Travelers directory</h2>
              <p className={`mt-1 text-sm ${styles.muted}`}>Department ownership, readiness, and next-trip visibility in one queue.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsCreating(true);
                setSelectedTravelerId(null);
              }}
              className={`inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium ${styles.buttonPrimary}`}
            >
              <PlusSquare className="h-4 w-4" />
              New traveler
            </button>
          </div>

          <div className="divide-y divide-white/10">
            {filteredTravelers.length === 0 ? (
              <div className="p-10 text-center">
                <Users className={`mx-auto h-10 w-10 ${styles.muted}`} />
                <div className="mt-4 text-lg font-semibold">No travelers match this view</div>
                <p className={`mt-2 text-sm ${styles.muted}`}>Try another search or create the first company traveler profile.</p>
              </div>
            ) : (
              filteredTravelers.map((traveler) => {
                const active = !isCreating && String(traveler.id) === String(selectedTraveler?.id);
                const passportAlert = traveler.passportStatus !== 'OK';
                const visaAlert = traveler.visaStatus === 'Required' || traveler.visaStatus === 'Pending';
                return (
                  <button
                    key={traveler.id}
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setSelectedTravelerId(traveler.id);
                    }}
                    className={`grid w-full gap-3 px-5 py-4 text-left transition ${active ? styles.panelSoft : 'hover:bg-white/[0.03]'}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold">{traveler.name}</span>
                          {!traveler.isActive ? (
                            <span className={`rounded-full px-2 py-0.5 text-[11px] ${styles.buttonGhost}`}>Inactive</span>
                          ) : null}
                        </div>
                        <div className={`mt-1 text-xs ${styles.muted}`}>{traveler.department} · {traveler.email || traveler.phone || 'Contact pending'}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] ring-1 ${passportAlert ? 'border-red-400/25 bg-red-500/12 text-red-200 ring-red-400/20' : 'border-emerald-400/25 bg-emerald-500/12 text-emerald-200 ring-emerald-400/20'}`}>
                          Passport {traveler.passportStatus}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] ring-1 ${visaAlert ? 'border-amber-400/25 bg-amber-500/12 text-amber-100 ring-amber-400/20' : styles.buttonGhost}`}>
                          Visa {traveler.visaStatus}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <span className={styles.muted}>{traveler.tripCount} linked trips</span>
                      <span className={styles.muted}>
                        {traveler.nextTripId ? `Next: ${traveler.nextTripLabel ?? traveler.nextTripId} ${traveler.nextTripDate ? `· ${traveler.nextTripDate}` : ''}` : 'No upcoming trip linked'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="grid gap-4">
          <div className={`rounded-xl border p-5 ${styles.panel}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{isCreating ? 'Create traveler profile' : 'Traveler profile'}</h2>
                <p className={`mt-1 text-sm ${styles.muted}`}>Keep one reliable company record and reuse it during request creation.</p>
              </div>
              {!isCreating && selectedTraveler ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className={`rounded-full px-2.5 py-1 ${styles.buttonGhost}`}>{selectedTraveler.department}</span>
                  <span className={`rounded-full px-2.5 py-1 ${selectedTraveler.isActive ? 'bg-emerald-500/12 text-emerald-200' : styles.buttonGhost}`}>
                    {selectedTraveler.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                <div className={`mb-2 ${styles.muted}`}>Full name</div>
                <input value={form.name} onChange={(event) => handleChange('name', event.target.value)} className={`h-11 w-full rounded-lg border px-3 outline-none ${styles.input}`} />
              </label>
              <label className="text-sm">
                <div className={`mb-2 ${styles.muted}`}>Department</div>
                <select value={form.department} onChange={(event) => handleChange('department', event.target.value)} className={`h-11 w-full rounded-lg border px-3 outline-none ${styles.input}`}>
                  {corporateDepartments.map((item) => (
                    <option key={item} value={item} className="bg-[#07111f]">
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <div className={`mb-2 ${styles.muted}`}>Email</div>
                <input value={form.email} onChange={(event) => handleChange('email', event.target.value)} className={`h-11 w-full rounded-lg border px-3 outline-none ${styles.input}`} />
              </label>
              <label className="text-sm">
                <div className={`mb-2 ${styles.muted}`}>Phone</div>
                <input value={form.phone} onChange={(event) => handleChange('phone', event.target.value)} className={`h-11 w-full rounded-lg border px-3 outline-none ${styles.input}`} />
              </label>
              <label className="text-sm">
                <div className={`mb-2 ${styles.muted}`}>Nationality</div>
                <input value={form.nationality} onChange={(event) => handleChange('nationality', event.target.value)} className={`h-11 w-full rounded-lg border px-3 outline-none ${styles.input}`} />
              </label>
              <label className="text-sm">
                <div className={`mb-2 ${styles.muted}`}>Passport number</div>
                <input value={form.passportNumber ?? ''} onChange={(event) => handleChange('passportNumber', event.target.value)} className={`h-11 w-full rounded-lg border px-3 outline-none ${styles.input}`} />
              </label>
              <label className="text-sm">
                <div className={`mb-2 ${styles.muted}`}>Passport expiry</div>
                <input type="date" value={form.passportExpiry ?? ''} onChange={(event) => handleChange('passportExpiry', event.target.value)} className={`h-11 w-full rounded-lg border px-3 outline-none ${styles.input} [color-scheme:dark]`} />
              </label>
              <label className="text-sm">
                <div className={`mb-2 ${styles.muted}`}>Passport readiness</div>
                <select value={form.passportStatus} onChange={(event) => handleChange('passportStatus', event.target.value as CorporateTravelerProfileInput['passportStatus'])} className={`h-11 w-full rounded-lg border px-3 outline-none ${styles.input}`}>
                  <option value="OK" className="bg-[#07111f]">OK</option>
                  <option value="Missing" className="bg-[#07111f]">Missing</option>
                  <option value="Expired" className="bg-[#07111f]">Expired</option>
                </select>
              </label>
              <label className="text-sm">
                <div className={`mb-2 ${styles.muted}`}>Visa readiness</div>
                <select value={form.visaStatus} onChange={(event) => handleChange('visaStatus', event.target.value as CorporateTravelerProfileInput['visaStatus'])} className={`h-11 w-full rounded-lg border px-3 outline-none ${styles.input}`}>
                  <option value="N/A" className="bg-[#07111f]">N/A</option>
                  <option value="OK" className="bg-[#07111f]">OK</option>
                  <option value="Required" className="bg-[#07111f]">Required</option>
                  <option value="Pending" className="bg-[#07111f]">Pending</option>
                </select>
              </label>
            </div>

            <label className="mt-4 block text-sm">
              <div className={`mb-2 ${styles.muted}`}>Notes</div>
              <textarea rows={4} value={form.notes ?? ''} onChange={(event) => handleChange('notes', event.target.value)} className={`w-full rounded-lg border px-3 py-3 outline-none ${styles.input}`} placeholder="Traveler preferences, document caveats, or coordination notes." />
            </label>

            <label className="mt-4 flex items-center gap-3 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(event) => handleChange('isActive', event.target.checked)} className="h-4 w-4 accent-[#d9b46f]" />
              <span className={styles.soft}>Keep this traveler active for quick future selection</span>
            </label>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              {!isCreating && selectedTraveler?.nextTripId ? (
                <button type="button" onClick={() => onOpenRequest(selectedTraveler.nextTripId!)} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${styles.buttonGhost}`}>
                  <UserRoundCheck className="h-4 w-4" />
                  Open next linked request
                </button>
              ) : <span className={`text-sm ${styles.muted}`}>Save once, reuse from New Trip whenever this traveler travels again.</span>}
              <button type="button" onClick={handleSave} disabled={isSaving || !form.name.trim()} className={`inline-flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-medium ${styles.buttonPrimary} disabled:opacity-50`}>
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : isCreating ? 'Create traveler' : 'Save changes'}
              </button>
            </div>
          </div>

          <div className={`rounded-xl border p-5 ${styles.panel}`}>
            <div className="flex items-center gap-3">
              <ShieldAlert className={`h-5 w-5 ${styles.muted}`} />
              <div className="font-semibold">Readiness focus</div>
            </div>
            <div className="mt-4 grid gap-3 text-sm">
              <div className={`rounded-lg border px-4 py-3 ${styles.panelSoft}`}>
                <div className="font-medium">Passport and visa coverage</div>
                <p className={`mt-2 leading-6 ${styles.muted}`}>Use this directory to clean traveler records before requests hit final approval and booking.</p>
              </div>
              <div className={`rounded-lg border px-4 py-3 ${styles.panelSoft}`}>
                <div className="font-medium">Department ownership</div>
                <p className={`mt-2 leading-6 ${styles.muted}`}>Keeping department ownership on the profile helps route approvals and spot repeat travel patterns faster.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
