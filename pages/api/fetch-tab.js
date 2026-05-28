export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, debug } = req.body;

  if (!url || !url.includes('ultimate-guitar.com')) {
    return res.status(400).json({ error: 'Please provide a valid Ultimate Guitar URL.' });
  }

  const apiKey = process.env.SCRAPER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server misconfiguration: missing SCRAPER_API_KEY.' });
  }

  const scraperUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}&render=false`;

  try {
    const response = await fetch(scraperUrl);

    if (!response.ok) {
      throw new Error(`ScraperAPI returned HTTP ${response.status}`);
    }

    const html = await response.text();

    // DEBUG MODE: return a snippet of raw HTML so we can inspect the structure
    if (debug) {
      // Find any script tags containing likely data blobs
      const scriptMatches = [...html.matchAll(/<script[^>]*>([\s\S]{0,300})<\/script>/gi)]
        .map(m => m[1].trim())
        .filter(s => s.length > 20)
        .slice(0, 10);

      return res.status(200).json({
        debug: true,
        htmlLength: html.length,
        htmlSnippet: html.substring(0, 2000),
        scriptSnippets: scriptMatches,
        // Try all likely patterns and report which one matches
        patternResults: {
          UGAPP_store_page: !!html.match(/window\.UGAPP\.store\.page\s*=/),
          UGAPP_store: !!html.match(/window\.UGAPP\.store\s*=/),
          js_store: !!html.match(/class="js-store"/),
          data_content: !!html.match(/data-content="/),
          initialState: !!html.match(/window\.__INITIAL_STATE__\s*=/),
          reactProps: !!html.match(/data-react-props/),
        }
      });
    }

    // Try multiple known patterns UG has used over the years
    let pageData = null;

    // Pattern 1: window.UGAPP.store.page = {...}  (classic)
    const match1 = html.match(/window\.UGAPP\.store\.page\s*=\s*(\{.+?\});\s*<\/script>/s);
    if (match1) {
      try { pageData = JSON.parse(match1[1]); } catch {}
    }

    // Pattern 2: data-content="..." on a .js-store element
    if (!pageData) {
      const match2 = html.match(/class="js-store"[^>]*data-content="([^"]+)"/);
      if (match2) {
        try { pageData = JSON.parse(match2[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')); } catch {}
      }
    }

    // Pattern 3: window.__INITIAL_STATE__ = {...}
    if (!pageData) {
      const match3 = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{.+?\});\s*(?:<\/script>|window\.)/s);
      if (match3) {
        try { pageData = JSON.parse(match3[1]); } catch {}
      }
    }

    if (!pageData) {
      return res.status(422).json({
        error: 'Could not find tab data on this page. The page structure may have changed — enable debug mode to inspect.',
      });
    }

    // Try multiple known paths to the tab content
    const tabData =
      pageData?.data?.tab_view?.wiki_tab?.content ||      // classic path
      pageData?.store?.page?.data?.tab_view?.wiki_tab?.content || // wrapped store
      pageData?.tab_view?.wiki_tab?.content;              // flat path

    const tabMeta =
      pageData?.data?.tab ||
      pageData?.store?.page?.data?.tab ||
      pageData?.tab;

    if (!tabData) {
      return res.status(422).json({
        error: 'Tab content not found in page data. This URL might be a premium/pro tab, or the data path has changed.',
      });
    }

    const cleanedTab = tabData
      .replace(/\[ch\](.*?)\[\/ch\]/g, '$1')
      .replace(/\[tab\]([\s\S]*?)\[\/tab\]/g, '$1')
      .replace(/\[verse\]([\s\S]*?)\[\/verse\]/g, '$1')
      .replace(/\[chorus\]([\s\S]*?)\[\/chorus\]/g, '$1')
      .replace(/\[bridge\]([\s\S]*?)\[\/bridge\]/g, '$1')
      .replace(/\[intro\]([\s\S]*?)\[\/intro\]/g, '$1')
      .replace(/\[outro\]([\s\S]*?)\[\/outro\]/g, '$1')
      .replace(/\[pre-chorus\]([\s\S]*?)\[\/pre-chorus\]/g, '$1')
      .replace(/\[interlude\]([\s\S]*?)\[\/interlude\]/g, '$1')
      .replace(/\[\/?[a-z_-]+\]/gi, '')
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
