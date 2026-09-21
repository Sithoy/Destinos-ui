import assert from 'node:assert/strict';
import test from 'node:test';
import { intakePayload, newIntakeDraft } from '../src/data/intake.ts';

test('switching corporate branches excludes stale trip details', () => {
  const draft = { ...newIntakeDraft('Paris'), company: 'Example', name: 'Contact', dates: 'October', adults: '4', budget: 'USD 6,000+', departure: 'Maputo', branch: 'management' as const, frequency: 'Monthly', method: 'email' as const, email: ' contact@example.com ', phone: '+258840000000' };
  const payload = intakePayload('corporate', draft);
  assert.equal(payload.destination, '');
  assert.equal(payload.dates, '');
  assert.equal(payload.travelers, '');
  assert.equal(payload.budget, '');
  assert.equal(payload.departureCity, '');
  assert.equal(payload.email, 'contact@example.com');
  assert.equal(payload.whatsapp, '');
  assert.match(payload.notes, /Company: Example/);
  assert.match(payload.notes, /Travel frequency: Monthly/);
});

test('undecided dates and destination do not send disabled stale values', () => {
  const payload = intakePayload('classic', { ...newIntakeDraft('Paris'), dates: 'October', inspire: true, flexible: true, adults: '2', children: '1' });
  assert.equal(payload.destination, '');
  assert.equal(payload.dates, '');
  assert.equal(payload.travelers, '2 adults, 1 children');
  assert.match(payload.notes, /inspiration requested/);
  assert.match(payload.notes, /Dates: to be decided/);
});

test('luxury starts without budget assumptions and preserves personal interests', () => {
  const draft = newIntakeDraft('Private villas');
  assert.equal(draft.budget, '');
  const payload = intakePayload('luxury', { ...draft, occasion: 'Anniversary', method: 'phone', phone: '+258840000000', email: 'stale@example.com' });
  assert.equal(payload.destination, 'Private villas');
  assert.equal(payload.preferredContact, 'Phone');
  assert.equal(payload.email, '');
  assert.equal(payload.contact, '+258840000000');
  assert.match(payload.notes, /Anniversary/);
});

test('existing client support is routed distinctly', () => {
  const payload = intakePayload('corporate', { ...newIntakeDraft(), branch: 'support', company: 'Example', notes: 'Help accessing CTM' });
  assert.equal(payload.serviceKey, 'corporate');
  assert.equal(payload.requestedServices, 'Corporate support');
  assert.match(payload.notes, /Help accessing CTM/);
});
