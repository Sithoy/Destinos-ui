import type { InquiryKind } from '../types';
export type IntakeDraft = {
  branch: 'trip' | 'management' | 'support'; company: string; frequency: string;
  destination: string; inspire: boolean; dates: string; flexible: boolean;
  adults: string; children: string; departure: string; occasion: string; notes: string; budget: string;
  name: string; method: 'whatsapp' | 'email' | 'phone'; email: string; phone: string;
};
export function newIntakeDraft(destination = ''): IntakeDraft {
  return { branch: 'trip', company: '', frequency: '', destination, inspire: false, dates: '', flexible: false, adults: '', children: '', departure: '', occasion: '', notes: '', budget: '', name: '', method: 'whatsapp', email: '', phone: '' };
}
export function intakePayload(kind: InquiryKind, d: IntakeDraft) {
  const isTrip = kind !== 'corporate' || d.branch === 'trip';
  const email = d.method === 'email' ? d.email.trim() : '';
  const phone = d.method !== 'email' ? d.phone.trim() : '';
  return {
    service: kind === 'classic' ? 'Classic travel' : kind === 'luxury' ? 'Prestige Luxury' : 'Prestige Corporate',
    serviceKey: kind, name: d.name.trim(), email, whatsapp: phone, contact: email || phone,
    preferredContact: d.method === 'email' ? 'Email' : d.method === 'phone' ? 'Phone' : 'WhatsApp',
    requestedServices: kind === 'corporate' ? `Corporate ${d.branch}` : kind === 'luxury' ? 'Luxury trip planning' : 'Trip planning',
    tripType: kind === 'corporate' ? d.branch : kind === 'luxury' ? 'Luxury' : 'Leisure',
    destination: isTrip && !d.inspire ? d.destination.trim() : '', dates: isTrip && !d.flexible ? d.dates.trim() : '',
    departureCity: isTrip ? d.departure.trim() : '',
    travelers: isTrip ? [d.adults && `${d.adults} ${kind === 'corporate' ? 'travellers' : 'adults'}`, kind !== 'corporate' && d.children && `${d.children} children`].filter(Boolean).join(', ') : '',
    budget: isTrip ? d.budget : '', urgency: 'Flexible timing',
    notes: [kind === 'corporate' && `Company: ${d.company.trim()}`, kind === 'corporate' && `Request: ${d.branch}`, kind === 'corporate' && d.branch === 'management' && `Travel frequency: ${d.frequency || 'To be decided'}`, kind === 'luxury' && d.occasion.trim() && `Occasion / interests: ${d.occasion.trim()}`, isTrip && d.inspire && 'Destination: inspiration requested', isTrip && d.flexible && 'Dates: to be decided', d.notes.trim()].filter(Boolean).join('\n'),
  };
}
