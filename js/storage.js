import { createBuild, normalizeBuild, normalizeItemCategories } from './model.js';
import { DEFAULT_CATEGORY_GROUPS } from './categories.js';

export const STORAGE_KEY = 'bikeBuildTracker:v1';
export const CURRENT_VERSION = 1;

export function migrate(raw) {
  if (!raw || typeof raw !== 'object') {
    return freshState();
  }
  const data = { ...raw };
  if (!Array.isArray(data.builds)) data.builds = [];
  data.builds = data.builds.map((b) => {
    const normalized = normalizeBuild(b);
    normalizeItemCategories(normalized.items, DEFAULT_CATEGORY_GROUPS);
    return normalized;
  });
  if (typeof data.activeBuildId !== 'string') data.activeBuildId = '';
  if (!data.builds.some((b) => b.id === data.activeBuildId)) {
    data.activeBuildId = data.builds[0] ? data.builds[0].id : '';
  }
  if (data.version !== CURRENT_VERSION) {
    data.version = CURRENT_VERSION;
  }
  return data;
}

export function freshState() {
  const build = createBuild({ name: 'My Build' });
  return {
    version: CURRENT_VERSION,
    activeBuildId: build.id,
    builds: [build],
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshState();
    return migrate(JSON.parse(raw));
  } catch (err) {
    console.error('Failed to load stored data:', err);
    return freshState();
  }
}

export function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save data:', err);
    throw err;
  }
}

export function reset() {
  localStorage.removeItem(STORAGE_KEY);
}
