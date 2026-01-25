// API Keys with fallbacks
const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_KEY || 'd5qufi9r01qhn30i0psgd5qufi9r01qhn30i0pt0';
const ALPHA_KEY = import.meta.env.VITE_ALPHA_VANTAGE_KEY || '6ZSQH79GKCMMCCVF';
const TWELVE_DATA_KEY = import.meta.env.VITE_TWELVE_DATA_KEY || '0e94f45d1f31458c999a2e65b72ed369';

/**
 * Universal Fetch Engine - Optimized for Vercel
 * Uses multiple CORS proxies with fallback + direct fetch
 */
export const universalFetcher = async (rawUrl: string) => {
  let finalUrl = rawUrl.trim();

  // Attach API keys based on domain
  if (finalUrl.includes('finnhub.io') && !finalUrl.includes('token=')) {
    finalUrl += `${finalUrl.includes('?') ? '&' : '?'}token=${FINNHUB_KEY}`;
  } else if (finalUrl.includes('alphavantage.co') && !finalUrl.includes('apikey=')) {
    finalUrl += `${finalUrl.includes('?') ? '&' : '?'}apikey=${ALPHA_KEY}`;
  } else if (finalUrl.includes('twelvedata.com') && !finalUrl.includes('apikey=')) {
    finalUrl += `${finalUrl.includes('?') ? '&' : '?'}apikey=${TWELVE_DATA_KEY}`;
  }

  // Try direct fetch first (fastest), then fallback to CORS proxies
  const fetchStrategies = [
    // Strategy 1: Direct fetch (works for CORS-enabled APIs)
    async () => {
      const response = await fetch(finalUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    },
    
    // Strategy 2: corsproxy.io (fastest proxy)
    async () => {
      const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(finalUrl)}`;
      const response = await fetch(proxiedUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    },
    
    // Strategy 3: allorigins (backup)
    async () => {
      const proxiedUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(finalUrl)}`;
      const response = await fetch(proxiedUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const outerData = await response.json();
      return JSON.parse(outerData.contents);
    }
  ];

  let lastError: Error | null = null;

  // Try each strategy with timeout
  for (const strategy of fetchStrategies) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

      const dataPromise = strategy();
      const data = await Promise.race([
        dataPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 8000)
        )
      ]);

      clearTimeout(timeoutId);

      // Check for API errors
      if (data.Note || data.Information || data.status === "error" || data.code === 429) {
        throw new Error(data.Note || data.Information || data.message || "API rate limit reached");
      }

      // Transform data and return
      return transformApiData(data);
    } catch (error: any) {
      lastError = error;
      console.warn(`Fetch strategy failed: ${error.message}`);
      continue;
    }
  }

  throw lastError || new Error("All fetch strategies failed");
};

/**
 * Transform API responses to unified format
 */
function transformApiData(data: any): any {
  // Transform Finnhub News Array
  if (Array.isArray(data) && data.length > 0 && data[0].headline) {
    return data.slice(0, 15).map((item: any) => ({
      headline: item.headline || 'No Headline',
      source: item.source || 'Unknown',
      date: item.datetime ? new Date(item.datetime * 1000).toLocaleDateString() : 'N/A',
      summary: item.summary || '',
      url: item.url || '#'
    }));
  }

  // Transform Twelve Data Time Series (CRITICAL FIX)
  if (data.values && Array.isArray(data.values)) {
    const transformed = {
      values: data.values.map((item: any) => ({
        datetime: item.datetime,
        open: parseFloat(item.open),
        high: parseFloat(item.high),
        low: parseFloat(item.low),
        close: parseFloat(item.close),
        volume: parseInt(item.volume, 10)
      })).reverse(),
      meta: data.meta // Preserve metadata
    };
    return transformed;
  }

  // Transform Alpha Vantage Time Series
  if (data["Time Series (Daily)"]) {
    const rawSeries = data["Time Series (Daily)"];
    return Object.entries(rawSeries).map(([date, values]: [string, any]) => ({
      time: date,
      open: parseFloat(values["1. open"]),
      high: parseFloat(values["2. high"]),
      low: parseFloat(values["3. low"]),
      close: parseFloat(values["4. close"]),
      volume: parseFloat(values["5. volume"]),
    })).reverse();
  }

  // Transform Finnhub Candles
  if (data.t && Array.isArray(data.t)) {
    return data.t.map((timestamp: number, index: number) => ({
      time: new Date(timestamp * 1000).toISOString().split('T')[0],
      open: data.o[index],
      high: data.h[index],
      low: data.l[index],
      close: data.c[index],
      volume: data.v[index],
    }));
  }

  return data;
}

// Specific service helpers
export const getAlphaVantageData = async (symbol: string) => {
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol.toUpperCase()}`;
  return await universalFetcher(url);
};

export const getTwelveData = async (symbol: string) => {
  const url = `https://api.twelvedata.com/time_series?symbol=${symbol.toUpperCase()}&interval=1day&outputsize=30`;
  return await universalFetcher(url);
};

export const getFinnhubData = async (symbol: string) => {
  const url = `https://finnhub.io/api/v1/quote?symbol=${symbol.toUpperCase()}`;
  return await universalFetcher(url);
};