export default async function handler(req, res) {
  const { symbol, interval, from, to } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: 'Symbol is required' });
  }

  try {
    const apiUrl = new URL('https://api-prod-v21.strike.money/v2/api/equity/priceticks');
    const params = new URLSearchParams({
      candleInterval: interval || '1d',
      from: from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      to: to || new Date().toISOString(),
      securities: `EQ:${symbol}`
    });

    apiUrl.search = params.toString();

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.STRIKE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching price ticks:', error);
    res.status(500).json({ 
      error: 'Failed to fetch price data',
      details: error.message 
    });
  }
}
