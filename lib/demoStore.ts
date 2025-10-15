'use client';

export type DemoHintMode = 'light' | 'maintain' | 'active';

export interface DemoProfile {
  goalWeight: number | null;
  hintMode: DemoHintMode;
  dayBoundaryHour: number;
  height: number | null;
}

export interface DemoWeightRecord {
  id: string;
  date: string;
  weight: number;
  note?: string;
  createdAt: string;
}

interface DemoStore {
  profiles: Record<string, DemoProfile>;
  weights: Record<string, DemoWeightRecord[]>;
}

const STORAGE_KEY = 'diet-app-demo-store';

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function readStore(): DemoStore {
  if (typeof window === 'undefined') {
    return { profiles: {}, weights: {} };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { profiles: {}, weights: {} };
    }
    const parsed = JSON.parse(raw) as DemoStore;
    return {
      profiles: parsed.profiles ?? {},
      weights: parsed.weights ?? {}
    };
  } catch (error) {
    console.warn('Failed to read demo store', error);
    return { profiles: {}, weights: {} };
  }
}

function writeStore(store: DemoStore) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function sortWeights(records: DemoWeightRecord[]) {
  return [...records].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function ensureDemoProfile(userId: string) {
  if (typeof window === 'undefined') {
    return;
  }
  const store = readStore();
  if (!store.profiles[userId]) {
    store.profiles[userId] = {
      goalWeight: null,
      hintMode: 'maintain',
      dayBoundaryHour: 0,
      height: null
    };
    writeStore(store);
  }
}

export function loadDemoProfile(userId: string): DemoProfile | null {
  const store = readStore();
  return store.profiles[userId] ?? null;
}

export function saveDemoProfile(userId: string, profile: DemoProfile) {
  const store = readStore();
  store.profiles[userId] = profile;
  writeStore(store);
}

export function loadDemoWeights(userId: string): DemoWeightRecord[] {
  const store = readStore();
  return sortWeights(store.weights[userId] ?? []);
}

export function addDemoWeight(
  userId: string,
  payload: Omit<DemoWeightRecord, 'id' | 'createdAt'>
): DemoWeightRecord[] {
  const store = readStore();
  const existing = store.weights[userId] ?? [];
  const record: DemoWeightRecord = {
    ...payload,
    id: createId(),
    createdAt: new Date().toISOString()
  };
  store.weights[userId] = sortWeights([record, ...existing]);
  writeStore(store);
  return store.weights[userId];
}

export function replaceDemoWeights(userId: string, weights: DemoWeightRecord[]) {
  const store = readStore();
  store.weights[userId] = sortWeights(weights);
  writeStore(store);
}

export function loadAllDemoWeightsAscending(userId: string): DemoWeightRecord[] {
  const store = readStore();
  const records = store.weights[userId] ?? [];
  return [...records].sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
}
