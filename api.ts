// api.ts

const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_KEY;
const ALPHA_KEY = import.meta.env.VITE_ALPHA_VANTAGE_KEY;
const TWELVE_DATA_KEY = import.meta.env.VITE_TWELVE_DATA_KEY;

// simple in memory cache
const requestCache = new Map<string, { data: any; expiry: number }>();

const CACHE_TTL = 30 * 1000;

export const universalFetcher = async (rawUrl: string) => {
  let finalUrl = rawUrl.trim();

  if (finalUrl.includes('finnhub.io') && !finalUrl.includes('token=')) {
    finalUrl += `${finalUrl.includes('?') ? '&' : '?'}token=${FINNHUB_KEY}`;
  } else if (finalUrl.includes('alphavantage.co') && !finalUrl.includes('apikey=')) {
    finalUrl += `${finalUrl.includes('?') ? '&' : '?'}apikey=${ALPHA_KEY}`;
  } else if (finalUrl.includes('twelvedata.com') && !finalUrl.includes('apikey=')) {
    finalUrl += `${finalUrl.includes('?') ? '&' : '?'}apikey=${TWELVE_DATA_KEY}`;
  }

  const now = Date.now();
  const cached = requestCache.get(finalUrl);
  if (cached && cached.expiry > now) {
    return cached.data;
  }

  const response = await fetch(finalUrl);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = await response.json();

  if (data.Note || data.Information || data.status === "error") {
    throw new Error(data.Note || data.Information || "API error");
  }

  let transformed = data;

  if (Array.isArray(data) && data[0]?.headline) {
    transformed = data.slice(0, 15).map((item: any) => ({
      headline: item.headline,
      source: item.source,
      date: new Date(item.datetime * 1000).toLocaleDateString(),
      summary: item.summary,
      url: item.url
    }));
  }

  if (data.values && Array.isArray(data.values)) {
    transformed = data.values.map((v: any) => ({
      time: v.datetime,
      open: +v.open,
      high: +v.high,
      low: +v.low,
      close: +v.close,
      volume: +v.volume
    })).reverse();
  }

  requestCache.set(finalUrl, {
    data: transformed,
    expiry: now + CACHE_TTL
  });

  return transformed;
};
