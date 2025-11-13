'use client';

const STORAGE_PREFIX = 'church-crm:';

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function buildKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

export function getItem<T>(key: string, defaultValue: T): T {
  const storage = getStorage();
  if (!storage) return defaultValue;

  const namespacedKey = buildKey(key);
  const raw = storage.getItem(namespacedKey);
  if (raw === null) return defaultValue;

  try {
    return JSON.parse(raw) as T;
  } catch {
    // Corrupted or incompatible data; reset to default
    storage.removeItem(namespacedKey);
    return defaultValue;
  }
}

export function setItem<T>(key: string, value: T): void {
  const storage = getStorage();
  if (!storage) return;

  const namespacedKey = buildKey(key);
  try {
    storage.setItem(namespacedKey, JSON.stringify(value));
  } catch {
    // Quota exceeded or serialization error; fail silently
  }
}

export function removeItem(key: string): void {
  const storage = getStorage();
  if (!storage) return;

  const namespacedKey = buildKey(key);
  try {
    storage.removeItem(namespacedKey);
  } catch {
    // Ignore
  }
}

/**
 * Clears ONLY church-crm keys, not entire localStorage.
 */
export function clearAllAppData(): void {
  const storage = getStorage();
  if (!storage) return;

  const prefix = STORAGE_PREFIX;
  const keysToRemove: string[] = [];

  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k && k.startsWith(prefix)) {
      keysToRemove.push(k);
    }
  }

  for (const k of keysToRemove) {
    storage.removeItem(k);
  }
}
