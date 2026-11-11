import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDateTime } from './dateTime';

test('timestamps display zero-padded hours and Vietnamese dates in Vietnam time', () => {
  assert.equal(formatDateTime('2026-11-11T02:05:30Z'), '09:05 11/11/2026');
  assert.equal(formatDateTime('2026-12-31T18:03:00Z'), '01:03 01/01/2027');
  assert.equal(formatDateTime(new Date('2026-01-02T17:00:00Z')), '00:00 03/01/2026');
});

test('existing date-only and Vietnamese date strings are formatted without US month/day ambiguity', () => {
  assert.equal(formatDateTime('2026-11-05'), '00:00 05/11/2026');
  assert.equal(formatDateTime('5/11/2026'), '00:00 05/11/2026');
  assert.equal(formatDateTime('9:05 5/11/2026'), '09:05 05/11/2026');
  assert.equal(formatDateTime('09:05 05/11/2026'), '09:05 05/11/2026');
});

test('empty, invalid and free-form deadline values do not become Invalid Date', () => {
  assert.equal(formatDateTime(null), '—');
  assert.equal(formatDateTime(''), '—');
  assert.equal(formatDateTime('Cuối tuần'), 'Cuối tuần');
  assert.equal(formatDateTime('31/02/2026'), '31/02/2026');
  assert.equal(formatDateTime('29:00 11/11/2026'), '29:00 11/11/2026');
  assert.equal(formatDateTime(new Date(NaN)), '—');
});
