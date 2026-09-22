import test from 'node:test';
import assert from 'node:assert/strict';
import { selectFeatured } from '../src/data/experiences.ts';
import type { TravelExperience } from '../src/data/experiences.ts';

test('discovery returns up to three distinct published candidates without changing the collection', () => {
  const items = Array.from({ length: 8 }, (_, index) => ({ slug: String(index), featured: index !== 7, region: String(index % 3), styles: [String(index % 3)] }) as TravelExperience);
  const before = JSON.stringify(items);
  const result = selectFeatured(items);
  assert.equal(result.length, 3);
  assert.equal(new Set(result.map(item => item.slug)).size, 3);
  assert.equal(new Set(result.map(item => item.region)).size, 3);
  assert.ok(result.every(item => item.featured));
  assert.deepEqual(selectFeatured(items), result);
  assert.equal(JSON.stringify(items), before);
});

test('small collections never repeat a card to fill empty slots', () => {
  const item = { slug: 'paris', featured: true, region: 'Europa', styles: [] } as unknown as TravelExperience;
  assert.deepEqual(selectFeatured([item]), [item]);
  assert.deepEqual(selectFeatured([]), []);
});
