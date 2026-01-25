const cache = new Map<string, { data: any; expiry: number }>();

export function getCachedData(key: string) {
  const cached = cache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiry) {
    cache.delete(key);
    return null;
  }
  return cached.data;
}

export function setCachedData(key: string, data: any, ttlSeconds: number) {
  cache.set(key, {
    data,
    expiry: Date.now() + ttlSeconds * 1000
  });
}

export function clearCache() {
  cache.clear();
}

export function removeCachedData(key: string) {
  cache.delete(key);
}

export function getCacheSize() {
  return cache.size;
}

export function getAllCachedKeys() {
  return Array.from(cache.keys());
}