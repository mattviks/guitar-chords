export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query' });

  const apiKey = process.env.SCRAPER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Missing SCRAPER_API_KEY' });

  const searchUrl = `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(q)}`;
  const scraperUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(searchUrl)}&render=false`;

  try {
    const response = await fetch(scraperUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();

    // UG search results are also in a JS store blob
    const match = html.match(/window\.UGAPP\.store\.page\s*=\s*(\{.+?\});\s*<\/script>/s)
                || html.match(/class="js-store"[^>]*data-content="([^"]+)"/);

    if (!match) return res.status(422).json({ error: 'Could not parse search results' });

    let data;
    try {
      const raw = match[1].includes('&quot;')
        ? match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')
        : match[1];
      data = JSON.parse(raw);
    } catch {
      return res.status(422).json({ error: 'Failed to parse search data' });
    }

    const results = data?.data?.results || data?.store?.page?.data?.results || [];

    const tabs = results
      .filter(r => r.type === 'Chords' || r.type === 'Tab' || r.type === 'Bass Tabs' || r.type === 'Ukulele Chords')
      .slice(0, 12)
      .map(r => ({
        song:   r.song_name || '',
        artist: r.artist_name || '',
        type:   r.type || '',
        rating: r.rating ? parseFloat(r.rating).toFixed(1) : null,
        votes:  r.votes || null,
        url:    r.tab_url || '',
      }))
      .filter(r => r.url);

    return res.status(200).json(tabs);
  } catch (err) {
    return res.status(500).json({ error: `Server error: ${err.message}` });
  }
}
