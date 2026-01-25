export const transformAlphaVantage = (rawData: any) => {
  // Alpha Vantage stores data under this specific key
  const timeSeries = rawData["Time Series (Daily)"];
  if (!timeSeries) return [];

  return Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
    time: date,
    open: parseFloat(values["1. open"]),
    high: parseFloat(values["2. high"]),
    low: parseFloat(values["3. low"]),
    close: parseFloat(values["4. close"]),
    volume: parseFloat(values["5. volume"]),
  })).reverse(); // Reverse so the chart goes from left-to-right (past to present)
};