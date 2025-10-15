import { addDays, differenceInCalendarDays, isSameDay, startOfDay, subHours } from 'date-fns';

export interface WeightEntry {
  date: string; // ISO8601 string
}

export interface StreakResult {
  current: number;
  best: number;
}

function normalize(date: Date, boundaryHour: number) {
  return startOfDay(subHours(date, boundaryHour));
}

export function calculateStreak(entries: WeightEntry[], boundaryHour: number): StreakResult {
  if (!entries.length) {
    return { current: 0, best: 0 };
  }

  const uniqueDays = new Map<number, Date>();
  for (const entry of entries) {
    const parsed = new Date(entry.date);
    if (Number.isNaN(parsed.getTime())) {
      continue;
    }
    const normalized = normalize(parsed, boundaryHour);
    uniqueDays.set(normalized.getTime(), normalized);
  }

  const days = Array.from(uniqueDays.values()).sort((a, b) => a.getTime() - b.getTime());
  if (!days.length) {
    return { current: 0, best: 0 };
  }

  let best = 0;
  let rolling = 0;
  let previous: Date | null = null;
  for (const day of days) {
    if (previous && differenceInCalendarDays(day, previous) === 1) {
      rolling += 1;
    } else if (previous && isSameDay(day, previous)) {
      continue;
    } else {
      rolling = 1;
    }
    previous = day;
    best = Math.max(best, rolling);
  }

  const today = normalize(new Date(), boundaryHour);
  let current = 0;
  let expected = today;
  for (let i = days.length - 1; i >= 0; i -= 1) {
    const day = days[i];
    if (isSameDay(day, expected)) {
      current += 1;
      expected = addDays(expected, -1);
    } else if (differenceInCalendarDays(expected, day) > 0) {
      break;
    }
  }

  return { current, best };
}
