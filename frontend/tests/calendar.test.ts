import assert from 'node:assert/strict';
import test from 'node:test';
import { calendarEvents, travelRange, validDay } from '../src/modules/crm/calendar/calendarEvents.ts';
import type { CrmLead, CrmTripItinerary, CrmWorkflowReminder } from '../src/types.ts';

const lead = (id: string, dates = '', status = 'new') => ({ id, dates, status, name: `Client ${id}`, destination: 'Paris' }) as CrmLead;
const task = (overrides = {}) => ({ id: 't1', leadId: '1', title: 'Confirm hotel', leadName: 'Client 1', status: 'pending', dueAt: '2026-10-05T10:00:00+02:00', ...overrides }) as CrmWorkflowReminder;

test('calendar accepts precise dates and rejects impossible, ambiguous or reversed dates', () => {
  assert.equal(validDay('2026-02-30'), null);
  assert.equal(validDay('2028-02-29'), '2028-02-29');
  assert.equal(travelRange('October, flexible'), null);
  assert.equal(travelRange('10/05/2026'), null);
  assert.equal(travelRange('2026-10-08 - 2026-10-03'), null);
  assert.deepEqual(travelRange('2026-10-30 - 2026-11-03'), ['2026-10-30', '2026-11-03']);
  assert.deepEqual(travelRange('15 Oct 2026'), ['2026-10-15', '2026-10-15']);
  assert.deepEqual(travelRange('12 Jun - 18 Jun 2026'), ['2026-06-12', '2026-06-18']);
  assert.deepEqual(travelRange('12 Out 2026 - 18 Out 2026'), ['2026-10-12', '2026-10-18']);
  assert.equal(travelRange('30 Dec - 03 Jan 2026'), null);
});

test('itinerary dates take precedence without duplicating a request; flexible requests stay unscheduled', () => {
  const plan = { id: 'p1', leadId: '1', startDate: '2026-10-07', endDate: '2026-10-12' } as CrmTripItinerary;
  const result = calendarEvents([lead('1', '2026-10-01'), lead('2', 'Flexible'), lead('3', '2026-10-09', 'lost')], [plan], []);
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].start, '2026-10-07');
  assert.equal(result.events[0].end, '2026-10-12');
  assert.deepEqual(result.unscheduled.map(item => item.id), ['2']);
});

test('open deadlines and waiting follow-ups are separate; completed work and invalid dates are excluded', () => {
  const result = calendarEvents([lead('1'), lead('2', '', 'completed')], [], [
    task({ status: 'waiting', followUpAt: '2026-10-06T09:30:00+02:00' }),
    task({ id: 'done', status: 'completed' }), task({ id: 'invalid', dueAt: 'invalid' }), task({ id: 'closed', leadId: '2' }),
  ]);
  assert.deepEqual(result.events.map(item => item.kind), ['task', 'followup']);
  assert.equal(result.events[1].at, '2026-10-06T09:30:00+02:00');
  assert.equal(result.events[0].title, 'Confirm hotel');
});
