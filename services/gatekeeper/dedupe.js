export function createDedupe(ttlMs = 10 * 60 * 1000) {
  const seen = new Map();

  const has = (key) => {
    if (!key) return false;
    const entry = seen.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      seen.delete(key);
      return false;
    }
    return true;
  };

  const add = (key) => {
    if (!key) return;
    seen.set(key, { expiresAt: Date.now() + ttlMs });
  };

  return { has, add };
}
