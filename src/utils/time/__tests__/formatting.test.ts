import { describe, expect, it } from 'vitest';
import {
  formatCountdown,
  formatLocalKickoff,
  formatLocalTime,
  formatLocalWeekday,
  formatUserClock,
  localHourOf,
} from '@/utils/time';

/*
 * Correct local times are the product's core promise (CLAUDE.md: Time-Zone
 * Handling). These tests pin the DST-boundary and date-line behaviour that
 * breaks user trust when it regresses — a fixed-offset implementation would
 * pass in one season and fail in the other.
 */
describe('formatLocalTime across the Sydney DST boundary', () => {
  it('renders 17:10 UTC as 4:10am during AEDT (UTC+11, January)', () => {
    expect(formatLocalTime('2026-01-15T17:10:00.000Z', 'Australia/Sydney')).toBe('4:10am');
  });

  it('renders the same 17:10 UTC instant as 3:10am after DST ends (UTC+10, April)', () => {
    expect(formatLocalTime('2026-04-10T17:10:00.000Z', 'Australia/Sydney')).toBe('3:10am');
  });
});

describe('formatUserClock zone abbreviation tracks DST, proving IANA zones over fixed offsets', () => {
  it('labels a January instant AEDT', () => {
    expect(formatUserClock(Date.parse('2026-01-15T10:42:00.000Z'), 'Australia/Sydney')).toBe(
      '21:42 AEDT',
    );
  });

  it('labels a June instant AEST', () => {
    expect(formatUserClock(Date.parse('2026-06-13T11:42:00.000Z'), 'Australia/Sydney')).toBe(
      '21:42 AEST',
    );
  });
});

describe('date-line handling — an evening UTC fixture lands on the next civil day in NZ', () => {
  it('rolls the weekday forward across the date line', () => {
    expect(formatLocalWeekday('2026-06-13T15:30:00.000Z', 'Pacific/Auckland')).toBe('Sunday');
    expect(formatLocalTime('2026-06-13T15:30:00.000Z', 'Pacific/Auckland')).toBe('3:30am');
  });

  it('keeps the same instant on Saturday for a London user', () => {
    expect(formatLocalWeekday('2026-06-13T15:30:00.000Z', 'Europe/London')).toBe('Saturday');
  });
});

describe('formatLocalKickoff composes the local-time-first copy voice', () => {
  it('reads as "time your time weekday"', () => {
    expect(formatLocalKickoff('2026-06-13T18:10:00.000Z', 'Australia/Sydney')).toBe(
      '4:10am your time Sunday',
    );
  });
});

describe('formatCountdown never advertises a match already underway', () => {
  it('formats hours and minutes ahead', () => {
    const now = Date.parse('2026-06-13T10:00:00.000Z');
    expect(formatCountdown(now, '2026-06-13T16:20:00.000Z')).toBe('in 6h 20m');
  });

  it('formats short countdowns in minutes only', () => {
    const now = Date.parse('2026-06-13T10:00:00.000Z');
    expect(formatCountdown(now, '2026-06-13T10:25:00.000Z')).toBe('in 25m');
  });

  it('collapses past start times to "now" — a notification about the past is a broken promise', () => {
    const now = Date.parse('2026-06-13T10:00:00.000Z');
    expect(formatCountdown(now, '2026-06-13T09:00:00.000Z')).toBe('now');
  });
});

describe('localHourOf feeds order-of-play segmentation in the user clock, not the venue clock', () => {
  it('maps a 09:00 UTC start to 7pm in Sydney winter', () => {
    expect(localHourOf('2026-06-14T09:00:00.000Z', 'Australia/Sydney')).toBe(19);
  });

  it('maps the same start to morning in London', () => {
    expect(localHourOf('2026-06-14T09:00:00.000Z', 'Europe/London')).toBe(10);
  });
});
