import { useState, useRef, useEffect, useCallback } from 'react';
import Head from 'next/head';

// ─── Chord transposition logic ───────────────────────────────────────────────
const SHARP_NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT_NOTES  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const CHORD_REGEX = /\b([A-G][b#]?)(m(?:aj)?7?|maj7?|m?7|dim7?|aug|sus[24]?|add9|6|9|11|13|\/[A-G][b#]?)?\b/g;

function transposeChord(chord, semitones) {
  return chord.replace(CHORD_REGEX, (match, root, suffix = '') => {
    const sharpIdx = SHARP_NOTES.indexOf(root);
    const flatIdx  = FLAT_NOTES.indexOf(root);
    const idx = sharpIdx !== -1 ? sharpIdx : flatIdx;
    if (idx === -1) return match;
    const newIdx = ((idx + semitones) % 12 + 12) % 12;
    const useFlat = flatIdx !== -1 && sharpIdx === -1;
    return (useFlat ? FLAT_NOTES : SHARP_NOTES)[newIdx] + suffix;
  });
}

function isChordLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  // A chord line: mostly chord tokens with spaces, very little other text
  const withoutChords = trimmed.replace(CHORD_REGEX, '').replace(/\s+/g, '');
  return withoutChords.length < trimmed.replace(/\s+/g, '').length * 0.35;
}

function isSectionLabel(line) {
  return /^\s*\[(verse|chorus|bridge|intro|outro|pre-chorus|interlude|solo|hook|refrain|coda)[^\]]*\]/i.test(line);
}

function decodeHtml(str) {
  return str
    .replace(/&#0*39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

// ─── Chord diagram data (basic open/barre chords) ────────────────────────────
const CHORD_DIAGRAMS = {
  'C':  { frets: [-1,3,2,0,1,0], fingers: [0,3,2,0,1,0] },
  'D':  { frets: [-1,-1,0,2,3,2], fingers: [0,0,0,1,3,2] },
  'E':  { frets: [0,2,2,1,0,0], fingers: [0,2,3,1,0,0] },
  'Em': { frets: [0,2,2,0,0,0], fingers: [0,2,3,0,0,0] },
  'F':  { frets: [1,1,2,3,3,1], fingers: [1,1,2,3,4,1], barre: 1 },
  'G':  { frets: [3,2,0,0,0,3], fingers: [2,1,0,0,0,3] },
  'Am': { frets: [-1,0,2,2,1,0], fingers: [0,0,2,3,1,0] },
  'A':  { frets: [-1,0,2,2,2,0], fingers: [0,0,1,2,3,0] },
  'Dm': { frets: [-1,-1,0,2,3,1], fingers: [0,0,0,2,3,1] },
  'B':  { frets: [-1,2,4,4,4,2], fingers: [0,1,3,3,3,1], barre: 2 },
  'Bm': { frets: [-1,2,4,4,3,2], fingers: [0,1,3,4,2,1], barre: 2 },
  'Cm': { frets: [-1,3,5,5,4,3], fingers: [0,1,3,4,2,1], barre: 3 },
};

function ChordDiagram({ chordName }) {
  const base = chordName.replace(/\/.*$/, '');
  const data = CHORD_DIAGRAMS[base];
  if (!data) return <div className="cd-unavail">No diagram for {chordName}</div>;
  const { frets, barre } = data;
  const validFrets = frets.filter(f => f > 0);
  const minFret = barre || (validFrets.length ? Math.min(...validFrets) : 1);
  const maxFret = validFrets.length ? Math.max(...validFrets) : 4;
  const displayMin = Math.max(1, barre ? barre : minFret);
  const rows = 4;
  const cols = 6;
  const dotR = 7;
  const cellW = 24, cellH = 22;
  const offsetX = 28, offsetY = 28;
  const w = offsetX + cols * cellW + 10;
  const h = offsetY + rows * cellH + 20;

  return (
    <div className="cd-wrap">
      <div className="cd-name">{chordName}</div>
      <svg width={w} height={h} style={{display:'block'}}>
        {/* Nut or fret number */}
        {displayMin === 1
          ? <rect x={offsetX} y={offsetY - 4} width={(cols-1)*cellW} height={4} fill="var(--text)" rx={1}/>
          : <text x={offsetX - 6} y={offsetY + cellH/2} textAnchor="end" fontSize={9} fill="var(--text-dim)">{displayMin}fr</text>
        }
        {/* Vertical strings */}
        {Array.from({length: cols}).map((_,i) => (
          <line key={i} x1={offsetX+i*cellW} y1={offsetY} x2={offsetX+i*cellW} y2={offsetY+rows*cellH} stroke="var(--border2)" strokeWidth={1}/>
        ))}
        {/* Horizontal frets */}
        {Array.from({length: rows+1}).map((_,i) => (
          <line key={i} x1={offsetX} y1={offsetY+i*cellH} x2={offsetX+(cols-1)*cellW} y2={offsetY+i*cellH} stroke="var(--border2)" strokeWidth={i===0?2:1}/>
        ))}
        {/* Dots */}
        {frets.map((f, strIdx) => {
          const x = offsetX + (cols - 1 - strIdx) * cellW;
          if (f === -1) return <text key={strIdx} x={x} y={offsetY - 10} textAnchor="middle" fontSize={10} fill="var(--text-dim)">✕</text>;
          if (f === 0)  return <circle key={strIdx} cx={x} cy={offsetY - 10} r={4} fill="none" stroke="var(--text-dim)" strokeWidth={1}/>;
          const fretRow = f - displayMin + 1;
          if (fretRow < 1 || fretRow > rows) return null;
          return <circle key={strIdx} cx={x} cy={offsetY + (fretRow - 0.5) * cellH} r={dotR} fill="var(--accent)"/>;
        })}
        {/* Barre indicator */}
        {barre && barre >= displayMin && (
          <rect x={offsetX} y={offsetY+(barre-displayMin)*cellH+cellH*0.15} width={(cols-1)*cellW} height={cellH*0.7} rx={cellH*0.35} fill="var(--accent)" opacity={0.5}/>
        )}
      </svg>
    </div>
  );
}

// ─── Saved tabs local storage helpers ────────────────────────────────────────
function getSaved() {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('tr_saved') || '[]'); } catch { return []; }
}
function setSaved(tabs) {
  localStorage.setItem('tr_saved', JSON.stringify(tabs));
}

// ─── UG Search ───────────────────────────────────────────────────────────────
async function searchUG(query) {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Home() {
  const [view, setView]           = useState('home'); // home | tab | saved
  const [url, setUrl]             = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [tab, setTab]             = useState(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [fontSize, setFontSize]   = useState(14);
  const [transpose, setTranspose] = useState(0);
  const [savedTabs, setSavedTabs] = useState([]);
  const [isSaved, setIsSaved]     = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(2);
  const [showChords, setShowChords] = useState(false);
  const [hoveredChord, setHoveredChord] = useState(null);
  const [chordPos, setChordPos]   = useState({x:0,y:0});
  const [colorChords, setColorChords] = useState(true);
  const [theme, setTheme]         = useState('dark');
  const [recentTabs, setRecentTabs] = useState([]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [maxWidth, setMaxWidth]   = useState('900px');
  const [capo, setCapo]           = useState(0);

  const inputRef     = useRef(null);
  const scrollRef    = useRef(null);
  const autoScrollRef = useRef(null);
  const tabTopRef    = useRef(null);

  // Load persisted data
  useEffect(() => {
    setSavedTabs(getSaved());
    try {
      const r = JSON.parse(localStorage.getItem('tr_recent') || '[]');
      setRecentTabs(r);
    } catch {}
    try {
      const t = localStorage.getItem('tr_theme');
      if (t) setTheme(t);
    } catch {}
  }, []);

  // Scroll-to-top visibility
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll) {
      autoScrollRef.current = setInterval(() => {
        window.scrollBy(0, scrollSpeed * 0.5);
      }, 16);
    } else {
      clearInterval(autoScrollRef.current);
    }
    return () => clearInterval(autoScrollRef.current);
  }, [autoScroll, scrollSpeed]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && tab) resetToHome();
      if (e.key === ' ' && e.target === document.body && tab) {
        e.preventDefault();
        setAutoScroll(a => !a);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tab]);

  function addToRecent(meta, url) {
    const entry = { song: meta.song, artist: meta.artist, url, ts: Date.now() };
    setRecentTabs(prev => {
      const filtered = prev.filter(r => r.url !== url).slice(0, 8);
      const next = [entry, ...filtered];
      localStorage.setItem('tr_recent', JSON.stringify(next));
      return next;
    });
  }

  async function fetchTab(urlToFetch) {
    const target = urlToFetch || url.trim();
    if (!target) return;
    setLoading(true);
    setError(null);
    setTab(null);
    setTranspose(0);
    setCapo(0);
    setAutoScroll(false);
    try {
      const res = await fetch('/api/fetch-tab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
      } else {
        const decoded = { ...data, content: decodeHtml(data.content) };
        setTab(decoded);
        setCurrentUrl(target);
        setView('tab');
        setIsSaved(getSaved().some(s => s.url === target));
        addToRecent(data.meta, target);
        setTimeout(() => tabTopRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    // If it's a UG URL, fetch directly
    if (url.includes('ultimate-guitar.com')) {
      fetchTab();
      return;
    }
    // Otherwise treat as search
    if (!url.trim()) return;
    doSearch(url.trim());
  }

  async function doSearch(q) {
    setSearchLoading(true);
    setSearchResults([]);
    setError(null);
    try {
      const results = await searchUG(q);
      setSearchResults(results);
    } catch {
      setError('Search failed. Try pasting a direct UG URL instead.');
    } finally {
      setSearchLoading(false);
    }
  }

  function handleSearchBarSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    doSearch(searchQuery.trim());
  }

  function resetToHome() {
    setTab(null);
    setError(null);
    setUrl('');
    setSearchResults([]);
    setSearchQuery('');
    setView('home');
    setAutoScroll(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function toggleSave() {
    const saved = getSaved();
    if (isSaved) {
      const next = saved.filter(s => s.url !== currentUrl);
      setSaved(next);
      setSavedTabs(next);
      setIsSaved(false);
    } else {
      const entry = {
        url: currentUrl,
        song: tab.meta.song,
        artist: tab.meta.artist,
        type: tab.meta.type,
        key: tab.meta.key,
        ts: Date.now(),
      };
      const next = [entry, ...saved];
      setSaved(next);
      setSavedTabs(next);
      setIsSaved(true);
    }
  }

  function removeSaved(url) {
    const next = getSaved().filter(s => s.url !== url);
    setSaved(next);
    setSavedTabs(next);
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('tr_theme', next);
  }

  // Render tab content with chord colouring, section labels, transposition
  function renderTabContent(content) {
    const lines = content.split('\n');
    return lines.map((line, i) => {
      const isSection = isSectionLabel(line);
      const isChord = !isSection && isChordLine(line);

      if (isSection) {
        const label = line.trim().replace(/^\[|\]$/g, '');
        return (
          <div key={i} className="tab-section-label">
            <span className="section-badge">{label}</span>
          </div>
        );
      }

      if (isChord && colorChords) {
        const transposedLine = transpose !== 0 ? transposeChord(line, transpose) : line;
        // Split line into chord tokens and spaces, wrap chords
        const parts = [];
        let last = 0;
        let m;
        const re = /\b([A-G][b#]?(?:m(?:aj)?7?|maj7?|m?7|dim7?|aug|sus[24]?|add9|6|9|11|13)?(?:\/[A-G][b#]?)?)\b/g;
        while ((m = re.exec(transposedLine)) !== null) {
          if (m.index > last) parts.push(<span key={`s${last}`}>{transposedLine.slice(last, m.index)}</span>);
          const ch = m[1];
          parts.push(
            <span
              key={`c${m.index}`}
              className="chord-token"
              onMouseEnter={(e) => {
                setHoveredChord(ch);
                setChordPos({ x: e.clientX, y: e.clientY });
              }}
              onMouseLeave={() => setHoveredChord(null)}
            >{ch}</span>
          );
          last = m.index + m[0].length;
        }
        if (last < transposedLine.length) parts.push(<span key={`s${last}`}>{transposedLine.slice(last)}</span>);
        return <div key={i} className="tab-line chord-line">{parts}{'\n'}</div>;
      }

      const displayLine = (isChord && transpose !== 0) ? transposeChord(line, transpose) : line;
      return <div key={i} className="tab-line">{displayLine}{'\n'}</div>;
    });
  }

  const effectiveTranspose = transpose + capo;

  return (
    <>
      <Head>
        <title>{tab ? `${tab.meta.song} — ${tab.meta.artist}` : 'Tab Reader'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=JetBrains+Mono:wght@400;500&family=Manrope:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:           ${theme === 'dark' ? '#0d0d0d' : '#f5f2ee'};
          --bg2:          ${theme === 'dark' ? '#111' : '#ede9e3'};
          --surface:      ${theme === 'dark' ? '#161616' : '#fff'};
          --surface2:     ${theme === 'dark' ? '#1c1c1c' : '#f0ece6'};
          --surface3:     ${theme === 'dark' ? '#222' : '#e8e3db'};
          --border:       ${theme === 'dark' ? '#282828' : '#d8d2c8'};
          --border2:      ${theme === 'dark' ? '#333' : '#ccc6bb'};
          --text:         ${theme === 'dark' ? '#e9e6e0' : '#1a1814'};
          --text-dim:     ${theme === 'dark' ? '#888' : '#6b6660'};
          --text-dimmer:  ${theme === 'dark' ? '#555' : '#999'};
          --accent:       #c4974a;
          --accent-hover: #d4a85a;
          --accent-dim:   rgba(196,151,74,0.13);
          --accent-border:rgba(196,151,74,0.28);
          --chord-color:  #7eb8d4;
          --section-color:#a07cdb;
          --red:          #d95f5f;
          --green:        #5fa88c;
          --mono:         'JetBrains Mono', monospace;
          --serif:        'Cormorant Garamond', Georgia, serif;
          --sans:         'Manrope', system-ui, sans-serif;
          --radius:       8px;
          --max-w:        ${maxWidth};
        }

        html { scroll-behavior: smooth; }
        body {
          background: var(--bg);
          color: var(--text);
          font-family: var(--sans);
          min-height: 100vh;
          -webkit-font-smoothing: antialiased;
          transition: background 0.2s, color 0.2s;
        }
        ::selection { background: var(--accent-dim); }

        /* ── Layout ── */
        .page {
          max-width: var(--max-w);
          margin: 0 auto;
          padding: 0 28px;
        }

        /* ── Top nav ── */
        .topnav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 0 22px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 44px;
          gap: 16px;
        }
        .topnav-left {
          display: flex;
          align-items: baseline;
          gap: 14px;
          cursor: pointer;
        }
        .logo {
          font-family: var(--serif);
          font-size: 32px;
          font-weight: 400;
          font-style: italic;
          letter-spacing: -0.5px;
          color: var(--text);
          user-select: none;
        }
        .logo-badge {
          font-family: var(--mono);
          font-size: 10px;
          color: var(--accent);
          background: var(--accent-dim);
          border: 1px solid var(--accent-border);
          padding: 2px 7px;
          border-radius: 3px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .topnav-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .nav-btn {
          background: none;
          border: 1px solid var(--border);
          color: var(--text-dim);
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 6px 12px;
          border-radius: 5px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .nav-btn:hover { border-color: var(--accent); color: var(--accent); }
        .nav-btn.active { background: var(--accent-dim); border-color: var(--accent-border); color: var(--accent); }
        .nav-btn.icon-btn { padding: 6px 10px; font-size: 14px; }

        /* ── Search / URL input ── */
        .search-section { margin-bottom: 48px; }
        .search-eyebrow {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-dimmer);
          margin-bottom: 10px;
        }
        .search-row {
          display: flex;
          gap: 8px;
        }
        .search-input {
          flex: 1;
          background: var(--surface);
          border: 1px solid var(--border2);
          color: var(--text);
          font-family: var(--mono);
          font-size: 13px;
          padding: 13px 18px;
          border-radius: var(--radius);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .search-input::placeholder { color: var(--text-dimmer); }
        .search-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-dim); }
        .search-btn-main {
          background: var(--accent);
          color: #0d0d0d;
          border: none;
          font-family: var(--sans);
          font-weight: 600;
          font-size: 13px;
          padding: 13px 24px;
          border-radius: var(--radius);
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s, transform 0.1s;
          letter-spacing: 0.01em;
        }
        .search-btn-main:hover:not(:disabled) { background: var(--accent-hover); }
        .search-btn-main:active:not(:disabled) { transform: scale(0.98); }
        .search-btn-main:disabled { opacity: 0.4; cursor: not-allowed; }

        /* ── Search results ── */
        .search-results { margin-bottom: 48px; }
        .search-results-title {
          font-family: var(--mono);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-dimmer);
          margin-bottom: 14px;
        }
        .result-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          margin-bottom: 8px;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
          gap: 12px;
        }
        .result-item:hover { border-color: var(--accent-border); background: var(--surface2); }
        .result-song { font-weight: 500; font-size: 14px; }
        .result-artist { font-size: 12px; color: var(--text-dim); margin-top: 2px; }
        .result-meta { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }
        .result-badge {
          font-family: var(--mono);
          font-size: 10px;
          padding: 2px 7px;
          border-radius: 3px;
          background: var(--surface2);
          border: 1px solid var(--border);
          color: var(--text-dim);
        }
        .result-rating { font-family: var(--mono); font-size: 11px; color: var(--accent); }

        /* ── Recent & Saved cards ── */
        .section-title {
          font-family: var(--mono);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-dimmer);
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 10px;
          margin-bottom: 44px;
        }
        .tab-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 16px;
          cursor: pointer;
          transition: border-color 0.15s, transform 0.1s;
          position: relative;
        }
        .tab-card:hover { border-color: var(--accent-border); transform: translateY(-1px); }
        .tab-card-song { font-weight: 500; font-size: 14px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tab-card-artist { font-size: 12px; color: var(--text-dim); }
        .tab-card-meta { font-family: var(--mono); font-size: 10px; color: var(--text-dimmer); margin-top: 8px; }
        .tab-card-del {
          position: absolute; top: 10px; right: 10px;
          background: none; border: none; color: var(--text-dimmer);
          cursor: pointer; font-size: 14px; padding: 2px 4px;
          border-radius: 3px; transition: color 0.15s;
          line-height: 1;
        }
        .tab-card-del:hover { color: var(--red); }

        /* ── Loading ── */
        .loading-wrap { text-align: center; padding: 80px 0; color: var(--text-dim); }
        .spinner {
          width: 28px; height: 28px;
          border: 2px solid var(--border2);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          margin: 0 auto 16px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-wrap p { font-family: var(--mono); font-size: 11px; letter-spacing: 0.06em; }

        /* ── Error ── */
        .error-box {
          background: rgba(217,95,95,0.07);
          border: 1px solid rgba(217,95,95,0.22);
          border-radius: var(--radius);
          padding: 14px 18px;
          color: #e8a0a0;
          font-size: 13px;
          line-height: 1.5;
          margin-bottom: 24px;
        }
        .error-label {
          color: var(--red);
          font-family: var(--mono);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          display: block;
          margin-bottom: 5px;
        }

        /* ── Tab view header ── */
        .tab-header { margin-bottom: 28px; padding-bottom: 24px; border-bottom: 1px solid var(--border); }
        .tab-back {
          font-family: var(--mono);
          font-size: 10px;
          color: var(--text-dimmer);
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: color 0.15s;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .tab-back:hover { color: var(--accent); }
        .tab-title {
          font-family: var(--serif);
          font-size: clamp(30px, 6vw, 52px);
          font-weight: 400;
          line-height: 1.05;
          margin-bottom: 6px;
          letter-spacing: -0.3px;
        }
        .tab-artist { font-size: 15px; color: var(--text-dim); font-weight: 300; margin-bottom: 18px; }
        .tab-meta-row { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 18px; }
        .meta-pill {
          font-family: var(--mono);
          font-size: 10px;
          background: var(--surface2);
          border: 1px solid var(--border);
          color: var(--text-dim);
          padding: 4px 10px;
          border-radius: 4px;
          letter-spacing: 0.04em;
        }
        .meta-pill b { color: var(--text); font-weight: 500; margin-left: 3px; }

        /* ── Tab action bar ── */
        .tab-actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          padding: 12px 0;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          margin-bottom: 20px;
        }
        .action-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .action-sep { width: 1px; height: 22px; background: var(--border); margin: 0 4px; }
        .action-label {
          font-family: var(--mono);
          font-size: 10px;
          color: var(--text-dimmer);
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .ctrl-btn {
          background: var(--surface2);
          border: 1px solid var(--border);
          color: var(--text-dim);
          font-family: var(--mono);
          font-size: 13px;
          width: 28px; height: 28px;
          border-radius: 4px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: border-color 0.15s, color 0.15s, background 0.15s;
          line-height: 1;
          flex-shrink: 0;
        }
        .ctrl-btn:hover { border-color: var(--accent); color: var(--accent); }
        .ctrl-btn.active { background: var(--accent-dim); border-color: var(--accent-border); color: var(--accent); }
        .ctrl-val {
          font-family: var(--mono);
          font-size: 11px;
          color: var(--text-dim);
          min-width: 28px;
          text-align: center;
        }
        .ctrl-val.highlight { color: var(--accent); }
        .save-btn {
          background: none;
          border: 1px solid var(--border);
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          color: var(--text-dim);
          transition: all 0.15s;
          white-space: nowrap;
          height: 28px;
          display: flex; align-items: center; gap: 5px;
        }
        .save-btn:hover { border-color: var(--accent); color: var(--accent); }
        .save-btn.saved { background: var(--accent-dim); border-color: var(--accent-border); color: var(--accent); }

        /* ── Scroll speed slider ── */
        .speed-slider {
          -webkit-appearance: none;
          width: 80px; height: 3px;
          background: var(--border2);
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }
        .speed-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 13px; height: 13px;
          border-radius: 50%;
          background: var(--accent);
          cursor: pointer;
        }

        /* ── Tab content ── */
        .tab-content-wrap {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 28px 32px;
          overflow-x: auto;
          margin-bottom: 60px;
        }
        .tab-content {
          font-family: var(--mono);
          font-size: 14px;
          line-height: 1.85;
          color: var(--text);
          white-space: pre;
          overflow-x: auto;
        }
        .tab-line { display: block; }
        .tab-section-label {
          display: block;
          padding: 14px 0 4px;
        }
        .section-badge {
          font-family: var(--sans);
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--section-color);
          background: rgba(160,124,219,0.1);
          border: 1px solid rgba(160,124,219,0.25);
          padding: 3px 10px;
          border-radius: 3px;
        }
        .chord-line { color: var(--text); }
        .chord-token {
          color: var(--chord-color);
          font-weight: 500;
          cursor: help;
          transition: color 0.1s;
        }
        .chord-token:hover { color: var(--accent); }

        /* ── Chord diagram tooltip ── */
        .chord-tooltip {
          position: fixed;
          z-index: 1000;
          background: var(--surface2);
          border: 1px solid var(--border2);
          border-radius: var(--radius);
          padding: 12px;
          pointer-events: none;
          box-shadow: 0 8px 24px rgba(0,0,0,0.35);
        }
        .cd-wrap { text-align: center; }
        .cd-name { font-family: var(--mono); font-size: 12px; color: var(--accent); margin-bottom: 6px; font-weight: 500; }
        .cd-unavail { font-family: var(--mono); font-size: 11px; color: var(--text-dimmer); padding: 8px; }

        /* ── Scroll to top ── */
        .scroll-top {
          position: fixed;
          bottom: 28px; right: 28px;
          background: var(--surface2);
          border: 1px solid var(--border2);
          color: var(--text-dim);
          width: 38px; height: 38px;
          border-radius: 50%;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
          transition: all 0.2s;
          z-index: 100;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        }
        .scroll-top:hover { border-color: var(--accent); color: var(--accent); }

        /* ── Saved view ── */
        .saved-page-title {
          font-family: var(--serif);
          font-size: 36px;
          font-style: italic;
          font-weight: 400;
          margin-bottom: 28px;
        }
        .empty-state {
          text-align: center;
          padding: 60px 0;
          color: var(--text-dimmer);
          font-family: var(--mono);
          font-size: 12px;
          letter-spacing: 0.04em;
        }
        .empty-state .em-icon { font-size: 36px; margin-bottom: 12px; opacity: 0.4; }

        /* ── Width toggle ── */
        .width-options { display: flex; gap: 4px; }
        .width-opt {
          background: var(--surface2); border: 1px solid var(--border);
          color: var(--text-dim); font-family: var(--mono); font-size: 9px;
          padding: 4px 7px; border-radius: 3px; cursor: pointer;
          transition: all 0.15s; text-transform: uppercase; letter-spacing: 0.05em;
        }
        .width-opt.active { background: var(--accent-dim); border-color: var(--accent-border); color: var(--accent); }

        /* ── Footer ── */
        .footer {
          border-top: 1px solid var(--border);
          padding: 20px 0 28px;
          font-family: var(--mono);
          font-size: 10px;
          color: var(--text-dimmer);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .footer-shortcuts { display: flex; gap: 14px; }
        .shortcut-key {
          display: inline-flex; align-items: center;
          background: var(--surface2); border: 1px solid var(--border);
          padding: 2px 6px; border-radius: 3px; font-size: 9px;
          margin-right: 4px;
        }

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .page { padding: 0 16px; }
          .topnav { padding: 16px 0; margin-bottom: 28px; }
          .logo { font-size: 26px; }
          .tab-actions { gap: 6px; }
          .tab-content-wrap { padding: 18px 14px; }
          .card-grid { grid-template-columns: 1fr 1fr; }
          .footer-shortcuts { display: none; }
        }
      `}</style>

      {/* Chord diagram tooltip */}
      {hoveredChord && (
        <div className="chord-tooltip" style={{
          left: Math.min(chordPos.x + 14, window.innerWidth - 160),
          top: chordPos.y - 20,
        }}>
          <ChordDiagram chordName={hoveredChord} />
        </div>
      )}

      {/* Scroll to top */}
      {showScrollTop && (
        <button className="scroll-top" onClick={() => window.scrollTo({top:0,behavior:'smooth'})} title="Back to top">↑</button>
      )}

      <div className="page" ref={tabTopRef}>
        {/* ── Top nav ── */}
        <nav className="topnav">
          <div className="topnav-left" onClick={resetToHome}>
            <span className="logo">Tab Reader</span>
            <span className="logo-badge">UG</span>
          </div>
          <div className="topnav-right">
            {view === 'tab' && (
              <div className="width-options">
                {['700px','900px','1100px'].map(w => (
                  <button key={w} className={`width-opt${maxWidth===w?' active':''}`} onClick={() => setMaxWidth(w)}>
                    {w === '700px' ? 'S' : w === '900px' ? 'M' : 'L'}
                  </button>
                ))}
              </div>
            )}
            <button className={`nav-btn${view==='saved'?' active':''}`} onClick={() => setView(v => v==='saved'?'home':'saved')}>
              ★ Saved {savedTabs.length > 0 && `(${savedTabs.length})`}
            </button>
            <button className="nav-btn icon-btn" onClick={toggleTheme} title="Toggle theme">
              {theme === 'dark' ? '☀' : '●'}
            </button>
          </div>
        </nav>

        {/* ── Saved view ── */}
        {view === 'saved' && (
          <div>
            <h2 className="saved-page-title">Saved Tabs</h2>
            {savedTabs.length === 0 ? (
              <div className="empty-state">
                <div className="em-icon">♪</div>
                No saved tabs yet. Open a tab and click Save.
              </div>
            ) : (
              <div className="card-grid">
                {savedTabs.map(t => (
                  <div key={t.url} className="tab-card" onClick={() => { setView('home'); fetchTab(t.url); }}>
                    <button className="tab-card-del" onClick={e => { e.stopPropagation(); removeSaved(t.url); }} title="Remove">✕</button>
                    <div className="tab-card-song">{t.song}</div>
                    <div className="tab-card-artist">{t.artist}</div>
                    <div className="tab-card-meta">{t.type}{t.key ? ` · ${t.key}` : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Home view ── */}
        {view !== 'saved' && !tab && (
          <div>
            <div className="search-section">
              <div className="search-eyebrow">Paste a URL or search by song / artist</div>
              <form className="search-row" onSubmit={handleSearchSubmit}>
                <input
                  ref={inputRef}
                  className="search-input"
                  type="text"
                  placeholder="e.g. Radiohead Creep  or  https://tabs.ultimate-guitar.com/..."
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
                <button className="search-btn-main" type="submit" disabled={loading || !url.trim()}>
                  {loading ? 'Loading…' : searchLoading ? 'Searching…' : 'Go'}
                </button>
              </form>
            </div>

            {error && (
              <div className="error-box">
                <span className="error-label">Error</span>
                {error}
              </div>
            )}

            {loading && (
              <div className="loading-wrap">
                <div className="spinner" />
                <p>Fetching tab data…</p>
              </div>
            )}

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="search-results">
                <div className="search-results-title">Results for "{url}"</div>
                {searchResults.map((r, i) => (
                  <div key={i} className="result-item" onClick={() => fetchTab(r.url)}>
                    <div>
                      <div className="result-song">{r.song}</div>
                      <div className="result-artist">{r.artist}</div>
                    </div>
                    <div className="result-meta">
                      {r.type && <span className="result-badge">{r.type}</span>}
                      {r.rating && <span className="result-rating">★ {r.rating}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recently viewed */}
            {recentTabs.length > 0 && searchResults.length === 0 && (
              <div>
                <div className="section-title">Recently viewed</div>
                <div className="card-grid">
                  {recentTabs.map((t, i) => (
                    <div key={i} className="tab-card" onClick={() => fetchTab(t.url)}>
                      <div className="tab-card-song">{t.song}</div>
                      <div className="tab-card-artist">{t.artist}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Saved tabs preview on home */}
            {savedTabs.length > 0 && searchResults.length === 0 && (
              <div>
                <div className="section-title">
                  <span>Saved tabs</span>
                  <button className="nav-btn" onClick={() => setView('saved')}>View all</button>
                </div>
                <div className="card-grid">
                  {savedTabs.slice(0, 4).map(t => (
                    <div key={t.url} className="tab-card" onClick={() => fetchTab(t.url)}>
                      <div className="tab-card-song">{t.song}</div>
                      <div className="tab-card-artist">{t.artist}</div>
                      <div className="tab-card-meta">{t.type}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab view ── */}
        {view === 'tab' && tab && (
          <div>
            <div className="tab-header">
              <button className="tab-back" onClick={resetToHome}>← New search</button>
              <h2 className="tab-title">{tab.meta.song}</h2>
              <p className="tab-artist">{tab.meta.artist}</p>
              <div className="tab-meta-row">
                {tab.meta.type     && <span className="meta-pill">type<b>{tab.meta.type}</b></span>}
                {tab.meta.tuning   && <span className="meta-pill">tuning<b>{tab.meta.tuning}</b></span>}
                {tab.meta.capo > 0 && <span className="meta-pill">capo<b>fret {tab.meta.capo}</b></span>}
                {tab.meta.key      && <span className="meta-pill">key<b>{tab.meta.key}</b></span>}
                {tab.meta.difficulty && <span className="meta-pill">difficulty<b>{tab.meta.difficulty}</b></span>}
                {tab.meta.rating   && <span className="meta-pill">rating<b>{tab.meta.rating.toFixed(1)} ({tab.meta.votes?.toLocaleString()})</b></span>}
              </div>
            </div>

            {/* ── Control bar ── */}
            <div className="tab-actions">
              {/* Font size */}
              <div className="action-group">
                <span className="action-label">Size</span>
                <button className="ctrl-btn" onClick={() => setFontSize(s => Math.max(10,s-1))}>−</button>
                <span className="ctrl-val">{fontSize}</span>
                <button className="ctrl-btn" onClick={() => setFontSize(s => Math.min(22,s+1))}>+</button>
              </div>

              <div className="action-sep"/>

              {/* Transpose */}
              <div className="action-group">
                <span className="action-label">Transpose</span>
                <button className="ctrl-btn" onClick={() => setTranspose(t => t-1)}>−</button>
                <span className={`ctrl-val${transpose!==0?' highlight':''}`}>{transpose>0?'+':''}{transpose}</span>
                <button className="ctrl-btn" onClick={() => setTranspose(t => t+1)}>+</button>
                {transpose !== 0 && <button className="ctrl-btn" style={{fontSize:9,width:36,letterSpacing:'0.04em'}} onClick={() => setTranspose(0)}>reset</button>}
              </div>

              <div className="action-sep"/>

              {/* Capo */}
              <div className="action-group">
                <span className="action-label">Capo</span>
                <button className="ctrl-btn" onClick={() => setCapo(c => Math.max(0,c-1))}>−</button>
                <span className={`ctrl-val${capo!==0?' highlight':''}`}>{capo===0?'—':`fr ${capo}`}</span>
                <button className="ctrl-btn" onClick={() => setCapo(c => Math.min(12,c+1))}>+</button>
              </div>

              <div className="action-sep"/>

              {/* Auto-scroll */}
              <div className="action-group">
                <button className={`ctrl-btn${autoScroll?' active':''}`} onClick={() => setAutoScroll(a=>!a)} title="Auto-scroll (Space)">
                  {autoScroll ? '⏸' : '▶'}
                </button>
                <input
                  type="range" min={1} max={8} value={scrollSpeed}
                  onChange={e => setScrollSpeed(Number(e.target.value))}
                  className="speed-slider"
                  title={`Scroll speed: ${scrollSpeed}`}
                />
              </div>

              <div className="action-sep"/>

              {/* Chord colour toggle */}
              <div className="action-group">
                <button className={`ctrl-btn${colorChords?' active':''}`} onClick={() => setColorChords(c=>!c)} title="Highlight chords">
                  ♩
                </button>
              </div>

              <div className="action-sep"/>

              {/* Save */}
              <button className={`save-btn${isSaved?' saved':''}`} onClick={toggleSave}>
                {isSaved ? '★ Saved' : '☆ Save'}
              </button>
            </div>

            {/* ── Tab content ── */}
            <div className="tab-content-wrap" ref={scrollRef}>
              <div className="tab-content" style={{ fontSize: `${fontSize}px` }}>
                {renderTabContent(tab.content)}
              </div>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <footer className="footer">
          <span>tab-reader · personal use only</span>
          {view === 'tab' && (
            <div className="footer-shortcuts">
              <span><span className="shortcut-key">Space</span> auto-scroll</span>
              <span><span className="shortcut-key">Esc</span> home</span>
            </div>
          )}
        </footer>
      </div>
    </>
  );
}
