const API_KEY = process.env.REACT_APP_ALPHA_VANTAGE_KEY;

export const getAlphaVantageData = async (symbol: string) => {
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${API_KEY}`;
  
  try {
    const response = await fetch(url);
    const json = await response.json();

    // 1. Check for Rate Limits (25 requests/day)
    if (json.Note) {
      alert("Alpha Vantage Limit Reached! (25/day)");
      return null;
    }

    // 2. Transform the messy "Time Series (Daily)" object into a clean Array
    const rawSeries = json["Time Series (Daily)"];
    if (!rawSeries) return null;

    const formattedData = Object.entries(rawSeries).map(([date, values]: [string, any]) => ({
      time: date,
      open: parseFloat(values["1. open"]),
      high: parseFloat(values["2. high"]),
      low: parseFloat(values["3. low"]),
      close: parseFloat(values["4. close"]),
      volume: parseFloat(values["5. volume"]),
    })).reverse(); // Oldest to newest for the chart

    return formattedData;
  } catch (error) {
    console.error("API Error:", error);
    return null;
  }
};