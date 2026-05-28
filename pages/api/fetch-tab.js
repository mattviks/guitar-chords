export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url || !url.includes('ultimate-guitar.com')) {
    return res.status(400).json({ error: 'Please provide a valid Ultimate Guitar URL.' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.google.com/',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page: HTTP ${response.status}`);
    }

    const html = await response.text();

    // Extract the embedded JSON from window.UGAPP.store.page
    const match = html.match(/window\.UGAPP\.store\.page\s*=\s*(\{.+?\});\s*<\/script>/s);

    if (!match || !match[1]) {
      return res.status(422).json({ error: 'Could not find tab data on this page. Make sure it\'s a tab or chords page (not a search or artist page).' });
    }

    let pageData;
    try {
      pageData = JSON.parse(match[1]);
    } catch (e) {
      return res.status(422).json({ error: 'Found tab data but failed to parse it. The page structure may have changed.' });
    }

    const tabData = pageData?.data?.tab_view?.wiki_tab?.content;
    const tabMeta = pageData?.data?.tab;

    if (!tabData) {
      return res.status(422).json({ error: 'Tab content not found in page data. This URL might be a premium/pro tab.' });
    }

    // Clean up UG-specific formatting tags
    const cleanedTab = tabData
      .replace(/\[ch\](.*?)\[\/ch\]/g, '$1')       // [ch]C[/ch] -> C
      .replace(/\[tab\]([\s\S]*?)\[\/tab\]/g, '$1') // [tab]...[/tab] -> ...
      .replace(/\[verse\]([\s\S]*?)\[\/verse\]/g, '$1')
      .replace(/\[chorus\]([\s\S]*?)\[\/chorus\]/g, '$1')
      .replace(/\[bridge\]([\s\S]*?)\[\/bridge\]/g, '$1')
      .replace(/\[intro\]([\s\S]*?)\[\/intro\]/g, '$1')
      .replace(/\[outro\]([\s\S]*?)\[\/outro\]/g, '$1')
      .replace(/\[pre-chorus\]([\s\S]*?)\[\/pre-chorus\]/g, '$1')
      .replace(/\[interlude\]([\s\S]*?)\[\/interlude\]/g, '$1')
      .replace(/\[\/?[a-z_-]+\]/gi, '')              // strip any other unknown UG tags
      .trim();

    return res.status(200).json({
      content: cleanedTab,
      meta: {
        song: tabMeta?.song_name || 'Unknown Song',
        artist: tabMeta?.artist_name || 'Unknown Artist',
        type: tabMeta?.type_name || 'Tab',
        difficulty: tabMeta?.difficulty || null,
        capo: tabMeta?.capo || null,
        tuning: tabMeta?.tuning?.value || null,
        rating: tabMeta?.rating || null,
        votes: tabMeta?.votes || null,
        key: tabMeta?.tonality_name || null,
      },
    });
  } catch (err) {
    console.error('Fetch error:', err);
    return res.status(500).json({ error: `Server error: ${err.message}` });
  }
}
