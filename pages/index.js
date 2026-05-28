import { useState, useRef } from 'react';
import Head from 'next/head';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(null);
  const [fontSize, setFontSize] = useState(14);
  const inputRef = useRef(null);

  async function fetchTab(e) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setTab(null);

    try {
      const res = await fetch('/api/fetch-tab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
      } else {
        setTab(data);
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setTab(null);
    setError(null);
    setUrl('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  return (
    <>
      <Head>
        <title>Tab Reader</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #0e0e0e;
          --surface: #161616;
          --surface2: #1e1e1e;
          --border: #2a2a2a;
          --border2: #333;
          --text: #e8e6e1;
          --text-dim: #888;
          --text-dimmer: #555;
          --accent: #c8a96e;
          --accent-dim: rgba(200, 169, 110, 0.15);
          --accent-border: rgba(200, 169, 110, 0.3);
          --red: #e05c5c;
          --mono: 'IBM Plex Mono', monospace;
          --serif: 'Instrument Serif', Georgia, serif;
          --sans: 'DM Sans', system-ui, sans-serif;
        }

        html, body {
          background: var(--bg);
          color: var(--text);
          font-family: var(--sans);
          min-height: 100vh;
          -webkit-font-smoothing: antialiased;
        }

        ::selection { background: var(--accent-dim); }

        .page {
          max-width: 900px;
          margin: 0 auto;
          padding: 0 24px;
        }

        /* ── Header ── */
        .header {
          padding: 48px 0 36px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 48px;
          display: flex;
          align-items: baseline;
          gap: 16px;
        }
        .header h1 {
          font-family: var(--serif);
          font-size: clamp(28px, 5vw, 40px);
          font-weight: 400;
          font-style: italic;
          letter-spacing: -0.5px;
          color: var(--text);
        }
        .header-tag {
          font-family: var(--mono);
          font-size: 11px;
          color: var(--accent);
          background: var(--accent-dim);
          border: 1px solid var(--accent-border);
          padding: 3px 8px;
          border-radius: 3px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        /* ── Search form ── */
        .search-wrap {
          margin-bottom: 56px;
        }
        .search-label {
          font-size: 11px;
          font-family: var(--mono);
          color: var(--text-dimmer);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 10px;
          display: block;
        }
        .search-row {
          display: flex;
          gap: 10px;
          align-items: stretch;
        }
        .search-input {
          flex: 1;
          background: var(--surface);
          border: 1px solid var(--border2);
          color: var(--text);
          font-family: var(--mono);
          font-size: 13px;
          padding: 12px 16px;
          border-radius: 6px;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .search-input::placeholder { color: var(--text-dimmer); }
        .search-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-dim);
        }
        .search-btn {
          background: var(--accent);
          color: #0e0e0e;
          border: none;
          font-family: var(--sans);
          font-size: 13px;
          font-weight: 500;
          padding: 12px 22px;
          border-radius: 6px;
          cursor: pointer;
          white-space: nowrap;
          transition: opacity 0.15s, transform 0.1s;
          letter-spacing: 0.01em;
        }
        .search-btn:hover:not(:disabled) { opacity: 0.88; }
        .search-btn:active:not(:disabled) { transform: scale(0.98); }
        .search-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* ── Loading ── */
        .loading-wrap {
          text-align: center;
          padding: 80px 0;
          color: var(--text-dim);
        }
        .spinner {
          width: 28px; height: 28px;
          border: 2px solid var(--border2);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          margin: 0 auto 16px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-wrap p {
          font-family: var(--mono);
          font-size: 12px;
          letter-spacing: 0.05em;
        }

        /* ── Error ── */
        .error-box {
          background: rgba(224, 92, 92, 0.08);
          border: 1px solid rgba(224, 92, 92, 0.25);
          border-radius: 6px;
          padding: 16px 20px;
          color: #e8a0a0;
          font-size: 13.5px;
          line-height: 1.5;
          margin-bottom: 24px;
        }
        .error-box strong { color: var(--red); font-size: 11px; font-family: var(--mono); text-transform: uppercase; letter-spacing: 0.08em; display: block; margin-bottom: 6px; }

        /* ── Tab result ── */
        .tab-header {
          margin-bottom: 32px;
          padding-bottom: 28px;
          border-bottom: 1px solid var(--border);
        }
        .tab-back {
          font-family: var(--mono);
          font-size: 11px;
          color: var(--text-dimmer);
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: color 0.15s;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .tab-back:hover { color: var(--accent); }
        .tab-title {
          font-family: var(--serif);
          font-size: clamp(26px, 5vw, 44px);
          font-weight: 400;
          line-height: 1.1;
          margin-bottom: 8px;
          letter-spacing: -0.3px;
        }
        .tab-artist {
          font-size: 15px;
          color: var(--text-dim);
          font-weight: 300;
          margin-bottom: 20px;
        }
        .tab-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .meta-pill {
          font-family: var(--mono);
          font-size: 11px;
          background: var(--surface2);
          border: 1px solid var(--border);
          color: var(--text-dim);
          padding: 4px 10px;
          border-radius: 4px;
          letter-spacing: 0.04em;
        }
        .meta-pill span { color: var(--text); margin-left: 4px; }

        /* ── Font size controls ── */
        .controls {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }
        .controls-label {
          font-family: var(--mono);
          font-size: 11px;
          color: var(--text-dimmer);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .size-btn {
          background: var(--surface2);
          border: 1px solid var(--border);
          color: var(--text-dim);
          font-family: var(--mono);
          font-size: 13px;
          width: 28px; height: 28px;
          border-radius: 4px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: border-color 0.15s, color 0.15s;
          line-height: 1;
        }
        .size-btn:hover { border-color: var(--accent); color: var(--accent); }
        .size-val {
          font-family: var(--mono);
          font-size: 12px;
          color: var(--text-dim);
          min-width: 32px;
          text-align: center;
        }

        /* ── Tab content ── */
        .tab-content-wrap {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 32px;
          overflow-x: auto;
          margin-bottom: 64px;
        }
        .tab-content {
          font-family: var(--mono);
          line-height: 1.8;
          white-space: pre;
          color: var(--text);
          overflow-x: auto;
        }

        /* ── Footer ── */
        .footer {
          border-top: 1px solid var(--border);
          padding: 24px 0;
          margin-top: 40px;
          font-family: var(--mono);
          font-size: 11px;
          color: var(--text-dimmer);
          display: flex;
          justify-content: space-between;
        }

        @media (max-width: 600px) {
          .page { padding: 0 16px; }
          .header { padding: 32px 0 24px; flex-wrap: wrap; gap: 10px; }
          .search-row { flex-direction: column; }
          .tab-content-wrap { padding: 20px 16px; }
        }
      `}</style>

      <div className="page">
        <header className="header">
          <h1>Tab Reader</h1>
          <span className="header-tag">UG</span>
        </header>

        {!tab && (
          <div className="search-wrap">
            <label className="search-label" htmlFor="url-input">Ultimate Guitar URL</label>
            <form className="search-row" onSubmit={fetchTab}>
              <input
                id="url-input"
                ref={inputRef}
                className="search-input"
                type="url"
                placeholder="https://tabs.ultimate-guitar.com/tab/..."
                value={url}
                onChange={e => setUrl(e.target.value)}
                disabled={loading}
                autoFocus
              />
              <button className="search-btn" type="submit" disabled={loading || !url.trim()}>
                {loading ? 'Fetching…' : 'Fetch Tab'}
              </button>
            </form>
          </div>
        )}

        {error && (
          <div className="error-box">
            <strong>Error</strong>
            {error}
          </div>
        )}

        {loading && (
          <div className="loading-wrap">
            <div className="spinner" />
            <p>Fetching tab data…</p>
          </div>
        )}

        {tab && (
          <div>
            <div className="tab-header">
              <button className="tab-back" onClick={reset}>
                ← New search
              </button>
              <h2 className="tab-title">{tab.meta.song}</h2>
              <p className="tab-artist">{tab.meta.artist}</p>
              <div className="tab-meta">
                {tab.meta.type && (
                  <div className="meta-pill">type<span>{tab.meta.type}</span></div>
                )}
                {tab.meta.tuning && (
                  <div className="meta-pill">tuning<span>{tab.meta.tuning}</span></div>
                )}
                {tab.meta.capo > 0 && (
                  <div className="meta-pill">capo<span>fret {tab.meta.capo}</span></div>
                )}
                {tab.meta.key && (
                  <div className="meta-pill">key<span>{tab.meta.key}</span></div>
                )}
                {tab.meta.difficulty && (
                  <div className="meta-pill">difficulty<span>{tab.meta.difficulty}</span></div>
                )}
                {tab.meta.rating && (
                  <div className="meta-pill">rating<span>{tab.meta.rating.toFixed(1)} ({tab.meta.votes?.toLocaleString()})</span></div>
                )}
              </div>
            </div>

            <div className="controls">
              <span className="controls-label">Font size</span>
              <button className="size-btn" onClick={() => setFontSize(s => Math.max(10, s - 1))}>−</button>
              <span className="size-val">{fontSize}px</span>
              <button className="size-btn" onClick={() => setFontSize(s => Math.min(22, s + 1))}>+</button>
            </div>

            <div className="tab-content-wrap">
              <pre className="tab-content" style={{ fontSize: `${fontSize}px` }}>
                {tab.content}
              </pre>
            </div>
          </div>
        )}

        <footer className="footer">
          <span>tab-reader</span>
          <span>personal use only</span>
        </footer>
      </div>
    </>
  );
}
