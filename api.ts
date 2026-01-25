// API Keys with fallbacks
const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_KEY || 'd5qufi9r01qhn30i0psgd5qufi9r01qhn30i0pt0';
const ALPHA_KEY = import.meta.env.VITE_ALPHA_VANTAGE_KEY || '6ZSQH79GKCMMCCVF';
const TWELVE_DATA_KEY = import.meta.env.VITE_TWELVE_DATA_KEY || '0e94f45d1f31458c999a2e65b72ed369';

/**
 * Universal Fetch Engine - Handles CORS, API Keys, and Data Transformation
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

  // Use AllOrigins proxy to bypass CORS
  const proxiedUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(finalUrl)}`;

  try {
    const response = await fetch(proxiedUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    
    const outerData = await response.json();
    const data = JSON.parse(outerData.contents);

    // Check for API errors
    if (data.Note || data.Information || data.status === "error" || data.code === 429) {
      throw new Error(data.Note || data.Information || data.message || "API rate limit reached");
    }

    // Transform Coinbase Exchange Rates - FLATTEN the nested structure
    if (finalUrl.includes('coinbase.com') && data.data) {
      // Return a flattened structure that's easier to work with
      return {
        currency: data.data.currency,
        ...data.data.rates // Spread rates directly into the root
      };
    }

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

    // Transform Twelve Data Time Series
    if (data.values && Array.isArray(data.values)) {
      return data.values.map((item: any) => ({
        time: item.datetime,
        open: parseFloat(item.open),
        high: parseFloat(item.high),
        low: parseFloat(item.low),
        close: parseFloat(item.close),
        volume: parseInt(item.volume, 10)
      })).reverse();
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
  } catch (error: any) {
    console.error("Fetch Error:", error);
    throw new Error(error.message || "Failed to fetch data");
  }
};

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

export const getCoinbaseRates = async (currency: string) => {
  const url = `https://api.coinbase.com/v2/exchange-rates?currency=${currency.toUpperCase()}`;
  return await universalFetcher(url);
};