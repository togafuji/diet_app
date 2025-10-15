import { describe, expect, it } from 'vitest';
import { calculateStreak } from '../lib/streak';

describe('calculateStreak', () => {
  it('counts current and best streak with boundary hour', () => {
    const base = new Date('2024-02-01T09:00:00Z');
    const entries = [
      { date: new Date(base).toISOString() },
      { date: new Date(base.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString() },
      { date: new Date(base.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { date: new Date(base.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString() }
    ];

    const result = calculateStreak(entries, 3);
    expect(result.current).toBeGreaterThanOrEqual(3);
    expect(result.best).toBeGreaterThanOrEqual(3);
  });
});
