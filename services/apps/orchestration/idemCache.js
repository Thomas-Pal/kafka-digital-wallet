export function createIdemCache(ttlMs = 5 * 60 * 1000) {
  const cache = new Map();

  const has = (key) => {
    if (!key) return false;
    const entry = cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      return false;
    }
    return true;
  };

  const set = (key) => {
    if (!key) return;
    cache.set(key, { expiresAt: Date.now() + ttlMs });
  };

  const cleanup = () => {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
      if (value.expiresAt <= now) cache.delete(key);
    }
  };

  return { has, set, cleanup };
}
