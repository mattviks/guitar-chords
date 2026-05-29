import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';

// ─── Chord transposition ──────────────────────────────────────────────────────
const SHARP_NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT_NOTES  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const CHORD_REGEX = /\b([A-G][b#]?)(m(?:aj)?7?|maj7?|m?7|dim7?|aug|sus[24]?|add9|6|9|11|13|\/[A-G][b#]?)?\b/g;

function transposeChord(chord, semitones) {
  return chord.replace(CHORD_REGEX, (match, root, suffix = '') => {
    const si = SHARP_NOTES.indexOf(root), fi = FLAT_NOTES.indexOf(root);
    const idx = si !== -1 ? si : fi;
    if (idx === -1) return match;
    const ni = ((idx + semitones) % 12 + 12) % 12;
    return (fi !== -1 && si === -1 ? FLAT_NOTES : SHARP_NOTES)[ni] + suffix;
  });
}

function isChordLine(line) {
  const t = line.trim();
  if (!t) return false;
  const withoutChords = t.replace(CHORD_REGEX, '').replace(/\s+/g, '');
  return withoutChords.length < t.replace(/\s+/g, '').length * 0.35;
}

function isSectionLabel(line) {
  return /^\s*\[(verse|chorus|bridge|intro|outro|pre-chorus|interlude|solo|hook|refrain|coda)[^\]]*\]/i.test(line);
}

function decodeHtml(str) {
  return str
    .replace(/&#0*39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c, 10)));
}

// Extract unique chords from tab content
function extractChords(content) {
  const seen = new Set();
  const chords = [];
  const lines = content.split('\n');
  for (const line of lines) {
    if (!isChordLine(line) || isSectionLabel(line)) continue;
    let m;
    const re = /\b([A-G][b#]?(?:m(?:aj)?7?|maj7?|m?7|dim7?|aug|sus[24]?|add9|6|9|11|13)?(?:\/[A-G][b#]?)?)\b/g;
    while ((m = re.exec(line)) !== null) {
      if (!seen.has(m[1])) { seen.add(m[1]); chords.push(m[1]); }
    }
  }
  return chords;
}

// ─── Chord diagrams ───────────────────────────────────────────────────────────
const CHORD_DIAGRAMS = {
  'C':  { frets: [-1,3,2,0,1,0] },
  'D':  { frets: [-1,-1,0,2,3,2] },
  'E':  { frets: [0,2,2,1,0,0] },
  'Em': { frets: [0,2,2,0,0,0] },
  'F':  { frets: [1,1,2,3,3,1], barre: 1 },
  'G':  { frets: [3,2,0,0,0,3] },
  'Am': { frets: [-1,0,2,2,1,0] },
  'A':  { frets: [-1,0,2,2,2,0] },
  'Dm': { frets: [-1,-1,0,2,3,1] },
  'B':  { frets: [-1,2,4,4,4,2], barre: 2 },
  'Bm': { frets: [-1,2,4,4,3,2], barre: 2 },
  'Cm': { frets: [-1,3,5,5,4,3], barre: 3 },
  'Gm': { frets: [3,5,5,3,3,3], barre: 3 },
  'Fm': { frets: [1,3,3,1,1,1], barre: 1 },
  'Bb': { frets: [-1,1,3,3,3,1], barre: 1 },
  'Eb': { frets: [-1,-1,1,3,4,3] },
  'Ab': { frets: [-1,-1,1,1,1,4] },
};

function ChordDiagram({ chordName, size = 'normal' }) {
  const base = chordName.replace(/\/.*$/, '');
  const data = CHORD_DIAGRAMS[base];
  if (!data) return <div className="cd-unavail">–</div>;
  const { frets, barre } = data;
  const validFrets = frets.filter(f => f > 0);
  const displayMin = Math.max(1, barre || (validFrets.length ? Math.min(...validFrets) : 1));
  const rows = 4, cols = 6, dotR = size === 'small' ? 5 : 7;
  const cellW = size === 'small' ? 16 : 24, cellH = size === 'small' ? 15 : 22;
  const offsetX = size === 'small' ? 18 : 28, offsetY = size === 'small' ? 20 : 28;
  const w = offsetX + (cols - 1) * cellW + 10;
  const h = offsetY + rows * cellH + 10;

  return (
    <div className="cd-wrap">
      <div className="cd-name">{chordName}</div>
      <svg width={w} height={h} style={{ display: 'block' }}>
        {displayMin === 1
          ? <rect x={offsetX} y={offsetY - 3} width={(cols-1)*cellW} height={3} fill="var(--text)" rx={1}/>
          : <text x={offsetX-4} y={offsetY+cellH/2} textAnchor="end" fontSize={8} fill="var(--text-dim)">{displayMin}fr</text>
        }
        {Array.from({length: cols}).map((_,i) => (
          <line key={i} x1={offsetX+i*cellW} y1={offsetY} x2={offsetX+i*cellW} y2={offsetY+rows*cellH} stroke="var(--border2)" strokeWidth={1}/>
        ))}
        {Array.from({length: rows+1}).map((_,i) => (
          <line key={i} x1={offsetX} y1={offsetY+i*cellH} x2={offsetX+(cols-1)*cellW} y2={offsetY+i*cellH} stroke="var(--border2)" strokeWidth={i===0?2:1}/>
        ))}
        {frets.map((f, si) => {
          const x = offsetX + (cols - 1 - si) * cellW;
          if (f === -1) return <text key={si} x={x} y={offsetY-8} textAnchor="middle" fontSize={8} fill="var(--text-dim)">✕</text>;
          if (f === 0)  return <circle key={si} cx={x} cy={offsetY-8} r={3} fill="none" stroke="var(--text-dim)" strokeWidth={1}/>;
          const fr = f - displayMin + 1;
          if (fr < 1 || fr > rows) return null;
          return <circle key={si} cx={x} cy={offsetY+(fr-0.5)*cellH} r={dotR} fill="var(--accent)"/>;
        })}
        {barre && barre >= displayMin && (
          <rect x={offsetX} y={offsetY+(barre-displayMin)*cellH+cellH*0.15} width={(cols-1)*cellW} height={cellH*0.7} rx={cellH*0.35} fill="var(--accent)" opacity={0.45}/>
        )}
      </svg>
    </div>
  );
}

// ─── Storage helpers ──────────────────────────────────────────────────────────
const safe = (fn, fallback) => { try { return fn(); } catch { return fallback; } };
const getSaved   = () => safe(() => JSON.parse(localStorage.getItem('tr_saved')  || '[]'), []);
const setSavedLS = (t) => safe(() => localStorage.setItem('tr_saved', JSON.stringify(t)), null);
const getRecent  = () => safe(() => JSON.parse(localStorage.getItem('tr_recent') || '[]'), []);

// ─── PDF generation (client-side, print-based) ───────────────────────────────
function printPDF(tab, transpose, capo) {
  const totalSemitones = transpose + capo;
  const content = totalSemitones !== 0
    ? tab.content.split('\n').map(line =>
        isChordLine(line) && !isSectionLabel(line) ? transposeChord(line, totalSemitones) : line
      ).join('\n')
    : tab.content;

  const chords = extractChords(content);
  const chordDiagramsHtml = chords.map(ch => {
    const base = ch.replace(/\/.*$/, '');
    const data = CHORD_DIAGRAMS[base];
    if (!data) return '';
    const { frets, barre } = data;
    const validFrets = frets.filter(f => f > 0);
    const displayMin = Math.max(1, barre || (validFrets.length ? Math.min(...validFrets) : 1));
    const rows = 4, cols = 6, cellW = 18, cellH = 14, offsetX = 16, offsetY = 22, dotR = 5;
    const w = offsetX + (cols-1)*cellW + 8, h = offsetY + rows*cellH + 8;
    let svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">`;
    if (displayMin === 1) {
      svg += `<rect x="${offsetX}" y="${offsetY-3}" width="${(cols-1)*cellW}" height="3" fill="#111" rx="1"/>`;
    } else {
      svg += `<text x="${offsetX-3}" y="${offsetY+cellH/2}" text-anchor="end" font-size="7" fill="#888">${displayMin}fr</text>`;
    }
    for (let i = 0; i < cols; i++) svg += `<line x1="${offsetX+i*cellW}" y1="${offsetY}" x2="${offsetX+i*cellW}" y2="${offsetY+rows*cellH}" stroke="#ccc" stroke-width="1"/>`;
    for (let i = 0; i <= rows; i++) svg += `<line x1="${offsetX}" y1="${offsetY+i*cellH}" x2="${offsetX+(cols-1)*cellW}" y2="${offsetY+i*cellH}" stroke="#ccc" stroke-width="${i===0?2:1}"/>`;
    frets.forEach((f, si) => {
      const x = offsetX + (cols-1-si)*cellW;
      if (f === -1) { svg += `<text x="${x}" y="${offsetY-6}" text-anchor="middle" font-size="8" fill="#aaa">✕</text>`; }
      else if (f === 0) { svg += `<circle cx="${x}" cy="${offsetY-7}" r="3" fill="none" stroke="#aaa" stroke-width="1"/>`; }
      else {
        const fr = f - displayMin + 1;
        if (fr >= 1 && fr <= rows) svg += `<circle cx="${x}" cy="${offsetY+(fr-0.5)*cellH}" r="${dotR}" fill="#c4974a"/>`;
      }
    });
    if (barre && barre >= displayMin) {
      svg += `<rect x="${offsetX}" y="${offsetY+(barre-displayMin)*cellH+cellH*0.15}" width="${(cols-1)*cellW}" height="${cellH*0.7}" rx="${cellH*0.35}" fill="#c4974a" opacity="0.4"/>`;
    }
    svg += '</svg>';
    return `<div class="chord-card"><div class="chord-label">${ch}</div>${svg}</div>`;
  }).join('');

  const escapedContent = content
    .split('\n')
    .map(line => {
      if (isSectionLabel(line)) {
        const label = line.trim().replace(/^\[|\]$/g, '');
        return `<div class="section-label">${label}</div>`;
      }
      if (isChordLine(line)) return `<div class="chord-line">${line || ' '}</div>`;
      return `<div class="lyric-line">${line || ' '}</div>`;
    })
    .join('');

  const metaParts = [
    tab.meta.type, tab.meta.key ? `Key: ${tab.meta.key}` : null,
    tab.meta.tuning ? `Tuning: ${tab.meta.tuning}` : null,
    tab.meta.capo > 0 ? `Capo: fret ${tab.meta.capo}` : null,
    (transpose + capo) !== 0 ? `Transposed: ${transpose + capo > 0 ? '+' : ''}${transpose + capo}` : null,
  ].filter(Boolean).join(' · ');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>${tab.meta.song} – ${tab.meta.artist}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Manrope:wght@400;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Manrope', sans-serif; color: #111; background: #fff; padding: 24px 28px; font-size: 12px; }
    h1 { font-size: 26px; font-weight: 600; letter-spacing: -0.3px; margin-bottom: 2px; }
    .artist { font-size: 14px; color: #666; margin-bottom: 8px; }
    .meta { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #888; margin-bottom: 16px; }
    .chords-section { margin-bottom: 20px; border-top: 1px solid #eee; padding-top: 14px; }
    .chords-title { font-family: 'JetBrains Mono', monospace; font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #aaa; margin-bottom: 10px; }
    .chord-grid { display: flex; flex-wrap: wrap; gap: 10px; }
    .chord-card { text-align: center; }
    .chord-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 500; color: #c4974a; margin-bottom: 3px; }
    .tab-section { border-top: 1px solid #eee; padding-top: 14px; }
    .tab-title-small { font-family: 'JetBrains Mono', monospace; font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #aaa; margin-bottom: 10px; }
    .tab-body { font-family: 'JetBrains Mono', monospace; font-size: 11px; line-height: 1.75; white-space: pre; }
    .chord-line { color: #2980b9; font-weight: 500; }
    .lyric-line { color: #111; }
    .section-label { display: inline-block; background: #f0eaf8; color: #7c4dbe; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; padding: 2px 8px; border-radius: 3px; margin: 10px 0 4px; font-family: 'Manrope', sans-serif; }
    @media print { body { padding: 12px 16px; } }
  </style></head><body>
  <h1>${tab.meta.song}</h1>
  <div class="artist">${tab.meta.artist}</div>
  <div class="meta">${metaParts}</div>
  ${chords.length > 0 ? `<div class="chords-section"><div class="chords-title">Chord diagrams</div><div class="chord-grid">${chordDiagramsHtml}</div></div>` : ''}
  <div class="tab-section">
    <div class="tab-title-small">Tab / Chords</div>
    <div class="tab-body">${escapedContent}</div>
  </div>
  <script>window.onload = () => { window.print(); }<\/script>
  </body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) alert('Please allow popups to download the PDF.');
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Home() {
  const [view, setView]               = useState('home');
  const [url, setUrl]                 = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [tab, setTab]                 = useState(null);
  const [currentUrl, setCurrentUrl]   = useState('');
  const [fontSize, setFontSize]       = useState(14);
  const [transpose, setTranspose]     = useState(0);
  const [capo, setCapo]               = useState(0);
  const [savedTabs, setSavedTabs]     = useState([]);
  const [isSaved, setIsSaved]         = useState(false);
  const [autoScroll, setAutoScroll]   = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(3); // 1–10, maps to px/frame
  const [hoveredChord, setHoveredChord] = useState(null);
  const [chordPos, setChordPos]       = useState({ x: 0, y: 0 });
  const [colorChords, setColorChords] = useState(true);
  const [theme, setTheme]             = useState('dark');
  const [recentTabs, setRecentTabs]   = useState([]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [maxWidth, setMaxWidth]       = useState('900px');

  const inputRef       = useRef(null);
  const autoScrollRef  = useRef(null);
  const tabContentRef  = useRef(null); // scroll target: only this div scrolls
  const tabTopRef      = useRef(null);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  // Load persisted data
  useEffect(() => {
    setSavedTabs(getSaved());
    setRecentTabs(getRecent());
    const t = safe(() => localStorage.getItem('tr_theme'), null);
    if (t) setTheme(t);
    const fs = safe(() => localStorage.getItem('tr_fontsize'), null);
    if (fs) setFontSize(Number(fs));
  }, []);

  // Scroll-to-top visibility — based on tab content div scroll
  useEffect(() => {
    const el = tabContentRef.current;
    if (!el) return;
    const onScroll = () => setShowScrollTop(el.scrollTop > 300);
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [tab]);

  // Auto-scroll: scrolls ONLY the tab content container
  useEffect(() => {
    const el = tabContentRef.current;
    if (!el) return;
    if (autoScroll) {
      // Speed scale: 1 = ~0.3px/frame, 10 = ~3px/frame
      const pxPerFrame = scrollSpeed * 0.3;
      autoScrollRef.current = setInterval(() => {
        el.scrollBy(0, pxPerFrame);
        // Stop at bottom
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
          setAutoScroll(false);
        }
      }, 16);
    } else {
      clearInterval(autoScrollRef.current);
    }
    return () => clearInterval(autoScrollRef.current);
  }, [autoScroll, scrollSpeed, tab]);

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
    const prev = getRecent();
    const next = [entry, ...prev.filter(r => r.url !== url)].slice(0, 9);
    safe(() => localStorage.setItem('tr_recent', JSON.stringify(next)), null);
    setRecentTabs(next);
  }

  async function fetchTab(urlToFetch) {
    const target = urlToFetch || url.trim();
    if (!target) return;
    setLoading(true); setError(null); setTab(null);
    setTranspose(0); setCapo(0); setAutoScroll(false);
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
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleMainSubmit(e) {
    e.preventDefault();
    if (!url.trim()) return;
    if (url.includes('ultimate-guitar.com')) { fetchTab(); return; }
    setSearchLoading(true); setSearchResults([]); setError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(url.trim())}`);
      if (!res.ok) throw new Error();
      setSearchResults(await res.json());
    } catch {
      setError('Search failed. Try pasting a direct UG URL.');
    } finally {
      setSearchLoading(false);
    }
  }

  function resetToHome() {
    setTab(null); setError(null); setUrl('');
    setSearchResults([]); setView('home'); setAutoScroll(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function toggleSave() {
    const saved = getSaved();
    if (isSaved) {
      const next = saved.filter(s => s.url !== currentUrl);
      setSavedLS(next); setSavedTabs(next); setIsSaved(false);
    } else {
      const entry = { url: currentUrl, song: tab.meta.song, artist: tab.meta.artist, type: tab.meta.type, key: tab.meta.key, ts: Date.now() };
      const next = [entry, ...saved];
      setSavedLS(next); setSavedTabs(next); setIsSaved(true);
    }
  }
  function setSavedLS(tabs) { setSavedLS2(tabs); setSavedTabs(tabs); }
  function setSavedLS2(tabs) { safe(() => localStorage.setItem('tr_saved', JSON.stringify(tabs)), null); }

  function removeSaved(u) {
    const next = getSaved().filter(s => s.url !== u);
    setSavedLS2(next); setSavedTabs(next);
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    safe(() => localStorage.setItem('tr_theme', next), null);
  }

  function changeFontSize(delta) {
    setFontSize(s => {
      const n = Math.min(22, Math.max(10, s + delta));
      safe(() => localStorage.setItem('tr_fontsize', n), null);
      return n;
    });
  }

  // Render tab content
  function renderTabContent(content) {
    const totalSemitones = transpose + capo;
    return content.split('\n').map((line, i) => {
      const isSection = isSectionLabel(line);
      const isChord = !isSection && isChordLine(line);
      if (isSection) {
        const label = line.trim().replace(/^\[|\]$/g, '');
        return <div key={i} className="tab-section-label"><span className="section-badge">{label}</span></div>;
      }
      if (isChord && colorChords) {
        const tLine = totalSemitones !== 0 ? transposeChord(line, totalSemitones) : line;
        const parts = [];
        let last = 0, m;
        const re = /\b([A-G][b#]?(?:m(?:aj)?7?|maj7?|m?7|dim7?|aug|sus[24]?|add9|6|9|11|13)?(?:\/[A-G][b#]?)?)\b/g;
        while ((m = re.exec(tLine)) !== null) {
          if (m.index > last) parts.push(<span key={`s${last}`}>{tLine.slice(last, m.index)}</span>);
          const ch = m[1];
          parts.push(
            <span key={`c${m.index}`} className="chord-token"
              onMouseEnter={e => { setHoveredChord(ch); setChordPos({ x: e.clientX, y: e.clientY }); }}
              onMouseLeave={() => setHoveredChord(null)}
              onTouchStart={e => { setHoveredChord(ch === hoveredChord ? null : ch); setChordPos({ x: e.touches[0].clientX, y: e.touches[0].clientY }); }}
            >{ch}</span>
          );
          last = m.index + m[0].length;
        }
        if (last < tLine.length) parts.push(<span key={`s${last}`}>{tLine.slice(last)}</span>);
        return <div key={i} className="tab-line chord-line">{parts}{'\n'}</div>;
      }
      const displayLine = (isChord && (transpose + capo) !== 0) ? transposeChord(line, transpose + capo) : line;
      return <div key={i} className="tab-line">{displayLine}{'\n'}</div>;
    });
  }

  const isDark = theme === 'dark';

  return (
    <>
      <Head>
        <title>{tab ? `${tab.meta.song} — ${tab.meta.artist}` : 'Tab Reader'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content={isDark ? '#0d0d0d' : '#f5f2ee'} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content={isDark ? 'black-translucent' : 'default'} />
        <meta name="apple-mobile-web-app-title" content="Tab Reader" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=JetBrains+Mono:wght@400;500&family=Manrope:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg:           ${isDark ? '#0d0d0d' : '#f5f2ee'};
          --surface:      ${isDark ? '#161616' : '#ffffff'};
          --surface2:     ${isDark ? '#1c1c1c' : '#f0ece6'};
          --surface3:     ${isDark ? '#222' : '#e8e3db'};
          --border:       ${isDark ? '#282828' : '#d8d2c8'};
          --border2:      ${isDark ? '#333' : '#ccc6bb'};
          --text:         ${isDark ? '#e9e6e0' : '#1a1814'};
          --text-dim:     ${isDark ? '#888' : '#6b6660'};
          --text-dimmer:  ${isDark ? '#555' : '#aaa'};
          --accent:       #c4974a;
          --accent-hover: #d4a85a;
          --accent-dim:   rgba(196,151,74,0.13);
          --accent-border:rgba(196,151,74,0.28);
          --chord-color:  ${isDark ? '#7eb8d4' : '#2980b9'};
          --section-bg:   rgba(160,124,219,0.1);
          --section-color:#a07cdb;
          --red:          #d95f5f;
          --mono:         'JetBrains Mono', monospace;
          --serif:        'Cormorant Garamond', Georgia, serif;
          --sans:         'Manrope', system-ui, sans-serif;
          --r:            8px;
          --nav-h:        56px;
          --ctrl-h:       52px;
        }

        html, body {
          height: 100%;
          background: var(--bg);
          color: var(--text);
          font-family: var(--sans);
          -webkit-font-smoothing: antialiased;
          overflow: hidden; /* we control scroll ourselves in tab view */
          transition: background 0.2s, color 0.2s;
        }
        /* In home/saved view restore normal scroll */
        body.scrollable { overflow: auto; }
        ::selection { background: var(--accent-dim); }

        /* ── App shell: full-height column layout ── */
        .app-shell {
          display: flex;
          flex-direction: column;
          height: 100dvh; /* dynamic viewport height — safe on mobile */
          max-width: ${maxWidth};
          margin: 0 auto;
          padding: 0 env(safe-area-inset-right, 0px) 0 env(safe-area-inset-left, 0px);
        }

        /* ── Top nav ── */
        .topnav {
          flex-shrink: 0;
          height: var(--nav-h);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          border-bottom: 1px solid var(--border);
          gap: 10px;
          background: var(--bg);
        }
        .logo-wrap { display: flex; align-items: baseline; gap: 10px; cursor: pointer; flex-shrink: 0; }
        .logo { font-family: var(--serif); font-size: 26px; font-weight: 400; font-style: italic; letter-spacing: -0.3px; }
        .logo-badge { font-family: var(--mono); font-size: 9px; color: var(--accent); background: var(--accent-dim); border: 1px solid var(--accent-border); padding: 2px 6px; border-radius: 3px; letter-spacing: 0.06em; text-transform: uppercase; }
        .nav-right { display: flex; align-items: center; gap: 6px; }
        .nav-btn { background: none; border: 1px solid var(--border); color: var(--text-dim); font-family: var(--mono); font-size: 10px; letter-spacing: 0.05em; text-transform: uppercase; padding: 5px 10px; border-radius: 5px; cursor: pointer; transition: all 0.15s; white-space: nowrap; height: 30px; display: flex; align-items: center; }
        .nav-btn:hover { border-color: var(--accent); color: var(--accent); }
        .nav-btn.active { background: var(--accent-dim); border-color: var(--accent-border); color: var(--accent); }
        .nav-icon-btn { padding: 5px 9px; font-size: 15px; }

        /* ── Scrollable body area ── */
        .app-body {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }

        /* ── Home / Saved padding ── */
        .home-content { padding: 24px 16px 40px; }

        /* ── Search ── */
        .search-section { margin-bottom: 32px; }
        .search-eyebrow { font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-dimmer); margin-bottom: 8px; }
        .search-row { display: flex; gap: 8px; }
        .search-input { flex: 1; background: var(--surface); border: 1px solid var(--border2); color: var(--text); font-family: var(--mono); font-size: 13px; padding: 12px 14px; border-radius: var(--r); outline: none; transition: border-color 0.15s, box-shadow 0.15s; min-width: 0; }
        .search-input::placeholder { color: var(--text-dimmer); }
        .search-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-dim); }
        .search-go { background: var(--accent); color: #0d0d0d; border: none; font-family: var(--sans); font-weight: 600; font-size: 13px; padding: 12px 20px; border-radius: var(--r); cursor: pointer; white-space: nowrap; transition: background 0.15s; flex-shrink: 0; }
        .search-go:hover:not(:disabled) { background: var(--accent-hover); }
        .search-go:disabled { opacity: 0.4; cursor: not-allowed; }

        /* ── Results ── */
        .results-label { font-family: var(--mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-dimmer); margin-bottom: 10px; }
        .result-item { display: flex; align-items: center; justify-content: space-between; padding: 13px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); margin-bottom: 7px; cursor: pointer; transition: border-color 0.15s; gap: 10px; }
        .result-item:hover, .result-item:active { border-color: var(--accent-border); }
        .result-song { font-weight: 500; font-size: 14px; }
        .result-artist { font-size: 12px; color: var(--text-dim); margin-top: 2px; }
        .result-meta { display: flex; gap: 6px; flex-shrink: 0; align-items: center; }
        .result-badge { font-family: var(--mono); font-size: 9px; padding: 2px 6px; border-radius: 3px; background: var(--surface2); border: 1px solid var(--border); color: var(--text-dim); }
        .result-rating { font-family: var(--mono); font-size: 11px; color: var(--accent); }

        /* ── Card grid ── */
        .section-hd { font-family: var(--mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-dimmer); margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
        .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; margin-bottom: 32px; }
        .tab-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 14px; cursor: pointer; transition: border-color 0.15s; position: relative; }
        .tab-card:hover, .tab-card:active { border-color: var(--accent-border); }
        .tc-song { font-weight: 500; font-size: 13px; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tc-artist { font-size: 11px; color: var(--text-dim); }
        .tc-meta { font-family: var(--mono); font-size: 9px; color: var(--text-dimmer); margin-top: 6px; }
        .tc-del { position: absolute; top: 8px; right: 8px; background: none; border: none; color: var(--text-dimmer); cursor: pointer; font-size: 13px; padding: 2px 4px; border-radius: 3px; transition: color 0.15s; line-height: 1; }
        .tc-del:hover { color: var(--red); }

        /* ── Loading / Error ── */
        .loading-wrap { text-align: center; padding: 60px 0; color: var(--text-dim); }
        .spinner { width: 26px; height: 26px; border: 2px solid var(--border2); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite; margin: 0 auto 14px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-wrap p { font-family: var(--mono); font-size: 11px; letter-spacing: 0.05em; }
        .error-box { background: rgba(217,95,95,0.07); border: 1px solid rgba(217,95,95,0.22); border-radius: var(--r); padding: 13px 16px; color: #e8a0a0; font-size: 13px; line-height: 1.5; margin-bottom: 20px; }
        .error-label { color: var(--red); font-family: var(--mono); font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; display: block; margin-bottom: 4px; }
        .empty-state { text-align: center; padding: 50px 0; color: var(--text-dimmer); font-family: var(--mono); font-size: 11px; letter-spacing: 0.04em; }
        .empty-icon { font-size: 30px; margin-bottom: 10px; opacity: 0.35; }

        /* ── Tab view header (not sticky) ── */
        .tab-header { padding: 16px 16px 12px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
        .tab-back { font-family: var(--mono); font-size: 10px; color: var(--text-dimmer); cursor: pointer; background: none; border: none; padding: 0; margin-bottom: 10px; display: flex; align-items: center; gap: 5px; transition: color 0.15s; letter-spacing: 0.05em; text-transform: uppercase; }
        .tab-back:hover { color: var(--accent); }
        .tab-title { font-family: var(--serif); font-size: clamp(24px, 6vw, 44px); font-weight: 400; line-height: 1.05; margin-bottom: 4px; }
        .tab-artist { font-size: 14px; color: var(--text-dim); font-weight: 300; margin-bottom: 12px; }
        .tab-meta-row { display: flex; flex-wrap: wrap; gap: 5px; }
        .meta-pill { font-family: var(--mono); font-size: 9px; background: var(--surface2); border: 1px solid var(--border); color: var(--text-dim); padding: 3px 8px; border-radius: 3px; letter-spacing: 0.04em; }
        .meta-pill b { color: var(--text); font-weight: 500; margin-left: 2px; }

        /* ── STICKY control bar ── */
        .tab-controls {
          flex-shrink: 0;
          position: sticky;
          top: 0;
          z-index: 20;
          background: var(--bg);
          border-bottom: 1px solid var(--border);
          padding: 0 10px;
          height: var(--ctrl-h);
          display: flex;
          align-items: center;
          gap: 4px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .tab-controls::-webkit-scrollbar { display: none; }
        .ctrl-sep { width: 1px; height: 20px; background: var(--border); flex-shrink: 0; margin: 0 2px; }
        .ctrl-grp { display: flex; align-items: center; gap: 3px; flex-shrink: 0; }
        .ctrl-lbl { font-family: var(--mono); font-size: 9px; color: var(--text-dimmer); text-transform: uppercase; letter-spacing: 0.06em; white-space: nowrap; }
        .ctrl-btn { background: var(--surface2); border: 1px solid var(--border); color: var(--text-dim); font-family: var(--mono); font-size: 13px; width: 30px; height: 30px; border-radius: 5px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: border-color 0.15s, color 0.15s, background 0.15s; flex-shrink: 0; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
        .ctrl-btn:hover, .ctrl-btn:active { border-color: var(--accent); color: var(--accent); }
        .ctrl-btn.on { background: var(--accent-dim); border-color: var(--accent-border); color: var(--accent); }
        .ctrl-val { font-family: var(--mono); font-size: 11px; color: var(--text-dim); min-width: 24px; text-align: center; flex-shrink: 0; }
        .ctrl-val.hi { color: var(--accent); }
        .ctrl-btn.sm { font-size: 9px; letter-spacing: 0.04em; width: auto; padding: 0 7px; }
        .save-btn { background: none; border: 1px solid var(--border); font-family: var(--mono); font-size: 9px; letter-spacing: 0.05em; text-transform: uppercase; padding: 0 10px; border-radius: 5px; cursor: pointer; color: var(--text-dim); transition: all 0.15s; height: 30px; display: flex; align-items: center; gap: 4px; flex-shrink: 0; white-space: nowrap; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
        .save-btn:hover, .save-btn:active { border-color: var(--accent); color: var(--accent); }
        .save-btn.saved { background: var(--accent-dim); border-color: var(--accent-border); color: var(--accent); }
        .pdf-btn { background: none; border: 1px solid var(--border); font-family: var(--mono); font-size: 9px; letter-spacing: 0.05em; text-transform: uppercase; padding: 0 10px; border-radius: 5px; cursor: pointer; color: var(--text-dim); transition: all 0.15s; height: 30px; display: flex; align-items: center; gap: 4px; flex-shrink: 0; white-space: nowrap; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
        .pdf-btn:hover, .pdf-btn:active { border-color: var(--section-color); color: var(--section-color); }

        /* Speed slider */
        .speed-slider { -webkit-appearance: none; width: 70px; height: 3px; background: var(--border2); border-radius: 2px; outline: none; cursor: pointer; flex-shrink: 0; }
        .speed-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: var(--accent); cursor: pointer; }
        .speed-slider::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: var(--accent); border: none; cursor: pointer; }

        /* Width selector */
        .w-opts { display: flex; gap: 3px; flex-shrink: 0; }
        .w-opt { background: var(--surface2); border: 1px solid var(--border); color: var(--text-dim); font-family: var(--mono); font-size: 9px; padding: 3px 7px; border-radius: 3px; cursor: pointer; transition: all 0.15s; letter-spacing: 0.04em; }
        .w-opt.on { background: var(--accent-dim); border-color: var(--accent-border); color: var(--accent); }

        /* ── Tab content area (this div scrolls) ── */
        .tab-scroll {
          flex: 1;
          overflow-y: auto;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          padding: 20px 16px 40px;
          padding-bottom: calc(40px + env(safe-area-inset-bottom, 0px));
        }
        .tab-body { font-family: var(--mono); font-size: 14px; line-height: 1.85; color: var(--text); white-space: pre; }
        .tab-line { display: block; }
        .tab-section-label { display: block; padding: 12px 0 3px; }
        .section-badge { font-family: var(--sans); font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: var(--section-color); background: var(--section-bg); border: 1px solid rgba(160,124,219,0.25); padding: 2px 9px; border-radius: 3px; }
        .chord-token { color: var(--chord-color); font-weight: 500; cursor: help; transition: color 0.1s; -webkit-tap-highlight-color: transparent; }
        .chord-token:hover { color: var(--accent); }

        /* scroll-to-top inside the tab scroll area */
        .scroll-top-btn {
          position: fixed;
          bottom: calc(20px + env(safe-area-inset-bottom, 0px));
          right: 16px;
          background: var(--surface2);
          border: 1px solid var(--border2);
          color: var(--text-dim);
          width: 36px; height: 36px;
          border-radius: 50%;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
          z-index: 50;
          box-shadow: 0 3px 10px rgba(0,0,0,0.3);
          transition: all 0.2s;
          -webkit-tap-highlight-color: transparent;
        }
        .scroll-top-btn:hover { border-color: var(--accent); color: var(--accent); }

        /* ── Chord tooltip ── */
        .chord-tooltip {
          position: fixed;
          z-index: 200;
          background: var(--surface2);
          border: 1px solid var(--border2);
          border-radius: var(--r);
          padding: 10px;
          pointer-events: none;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
        .cd-wrap { text-align: center; }
        .cd-name { font-family: var(--mono); font-size: 11px; color: var(--accent); margin-bottom: 4px; font-weight: 500; }
        .cd-unavail { font-family: var(--mono); font-size: 10px; color: var(--text-dimmer); padding: 6px 4px; }

        /* ── Footer ── */
        .footer { flex-shrink: 0; border-top: 1px solid var(--border); padding: 12px 16px; font-family: var(--mono); font-size: 9px; color: var(--text-dimmer); display: flex; justify-content: space-between; align-items: center; padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px)); background: var(--bg); }
        .kbds { display: flex; gap: 12px; }
        .kbd { background: var(--surface2); border: 1px solid var(--border); padding: 1px 5px; border-radius: 3px; font-size: 8px; margin-right: 3px; }

        /* ── Responsive tweaks ── */
        @media (max-width: 480px) {
          .logo { font-size: 22px; }
          .tab-title { font-size: 22px; }
          .speed-slider { width: 55px; }
        }
      `}</style>

      {/* Chord tooltip */}
      {hoveredChord && (
        <div className="chord-tooltip" style={{
          left: Math.min(chordPos.x + 12, (typeof window !== 'undefined' ? window.innerWidth : 400) - 150),
          top: Math.max(8, chordPos.y - 160),
        }}>
          <ChordDiagram chordName={hoveredChord} size="small" />
        </div>
      )}

      {/* Scroll to top (only in tab view) */}
      {view === 'tab' && showScrollTop && (
        <button className="scroll-top-btn" onClick={() => tabContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}>↑</button>
      )}

      <div className="app-shell">
        {/* ── Top nav ── */}
        <nav className="topnav">
          <div className="logo-wrap" onClick={resetToHome}>
            <span className="logo">Tab Reader</span>
            <span className="logo-badge">UG</span>
          </div>
          <div className="nav-right">
            {view === 'tab' && (
              <div className="w-opts">
                {[['S','700px'],['M','900px'],['L','1100px']].map(([l,w]) => (
                  <button key={w} className={`w-opt${maxWidth===w?' on':''}`} onClick={() => setMaxWidth(w)}>{l}</button>
                ))}
              </div>
            )}
            <button className={`nav-btn${view==='saved'?' active':''}`} onClick={() => setView(v => v==='saved'?'home':'saved')}>
              ★{savedTabs.length > 0 ? ` ${savedTabs.length}` : ''}
            </button>
            <button className="nav-btn nav-icon-btn" onClick={toggleTheme}>{isDark ? '☀' : '●'}</button>
          </div>
        </nav>

        {/* ── Saved view ── */}
        {view === 'saved' && (
          <div className="app-body home-content">
            <div style={{ fontFamily: 'var(--serif)', fontSize: 32, fontStyle: 'italic', marginBottom: 20 }}>Saved Tabs</div>
            {savedTabs.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">♪</div>No saved tabs yet.</div>
            ) : (
              <div className="card-grid">
                {savedTabs.map(t => (
                  <div key={t.url} className="tab-card" onClick={() => { setView('home'); fetchTab(t.url); }}>
                    <button className="tc-del" onClick={e => { e.stopPropagation(); removeSaved(t.url); }}>✕</button>
                    <div className="tc-song">{t.song}</div>
                    <div className="tc-artist">{t.artist}</div>
                    <div className="tc-meta">{t.type}{t.key ? ` · ${t.key}` : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Home view ── */}
        {view === 'home' && (
          <div className="app-body home-content">
            <div className="search-section">
              <div className="search-eyebrow">Paste a URL or search by song / artist</div>
              <form className="search-row" onSubmit={handleMainSubmit}>
                <input
                  ref={inputRef}
                  className="search-input"
                  type="text"
                  placeholder="Radiohead Creep  or  https://tabs.ultimate-guitar.com/…"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
                <button className="search-go" type="submit" disabled={loading || searchLoading || !url.trim()}>
                  {loading ? '…' : searchLoading ? '…' : 'Go'}
                </button>
              </form>
            </div>

            {error && <div className="error-box"><span className="error-label">Error</span>{error}</div>}
            {loading && <div className="loading-wrap"><div className="spinner"/><p>Fetching tab data…</p></div>}

            {searchResults.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div className="results-label">Results for "{url}"</div>
                {searchResults.map((r, i) => (
                  <div key={i} className="result-item" onClick={() => fetchTab(r.url)}>
                    <div><div className="result-song">{r.song}</div><div className="result-artist">{r.artist}</div></div>
                    <div className="result-meta">
                      {r.type && <span className="result-badge">{r.type}</span>}
                      {r.rating && <span className="result-rating">★ {r.rating}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {recentTabs.length > 0 && searchResults.length === 0 && (
              <div>
                <div className="section-hd"><span>Recently viewed</span></div>
                <div className="card-grid">
                  {recentTabs.map((t, i) => (
                    <div key={i} className="tab-card" onClick={() => fetchTab(t.url)}>
                      <div className="tc-song">{t.song}</div>
                      <div className="tc-artist">{t.artist}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {savedTabs.length > 0 && searchResults.length === 0 && (
              <div>
                <div className="section-hd">
                  <span>Saved tabs</span>
                  <button className="nav-btn" onClick={() => setView('saved')}>View all</button>
                </div>
                <div className="card-grid">
                  {savedTabs.slice(0, 4).map(t => (
                    <div key={t.url} className="tab-card" onClick={() => fetchTab(t.url)}>
                      <div className="tc-song">{t.song}</div>
                      <div className="tc-artist">{t.artist}</div>
                      <div className="tc-meta">{t.type}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab view ── */}
        {view === 'tab' && tab && (
          <>
            {/* Song header — not sticky, scrolls away */}
            <div className="tab-header">
              <button className="tab-back" onClick={resetToHome}>← New search</button>
              <h2 className="tab-title">{tab.meta.song}</h2>
              <p className="tab-artist">{tab.meta.artist}</p>
              <div className="tab-meta-row">
                {tab.meta.type      && <span className="meta-pill">type<b>{tab.meta.type}</b></span>}
                {tab.meta.tuning    && <span className="meta-pill">tuning<b>{tab.meta.tuning}</b></span>}
                {tab.meta.capo > 0  && <span className="meta-pill">capo<b>fret {tab.meta.capo}</b></span>}
                {tab.meta.key       && <span className="meta-pill">key<b>{tab.meta.key}</b></span>}
                {tab.meta.difficulty && <span className="meta-pill">difficulty<b>{tab.meta.difficulty}</b></span>}
                {tab.meta.rating    && <span className="meta-pill">rating<b>{tab.meta.rating.toFixed(1)} ({tab.meta.votes?.toLocaleString()})</b></span>}
              </div>
            </div>

            {/* ── STICKY control bar ── */}
            <div className="tab-controls">
              {/* Font size */}
              <div className="ctrl-grp">
                <span className="ctrl-lbl">Sz</span>
                <button className="ctrl-btn" onClick={() => changeFontSize(-1)}>−</button>
                <span className="ctrl-val">{fontSize}</span>
                <button className="ctrl-btn" onClick={() => changeFontSize(1)}>+</button>
              </div>

              <div className="ctrl-sep"/>

              {/* Transpose */}
              <div className="ctrl-grp">
                <span className="ctrl-lbl">♯♭</span>
                <button className="ctrl-btn" onClick={() => setTranspose(t => t - 1)}>−</button>
                <span className={`ctrl-val${transpose !== 0 ? ' hi' : ''}`}>{transpose > 0 ? '+' : ''}{transpose}</span>
                <button className="ctrl-btn" onClick={() => setTranspose(t => t + 1)}>+</button>
                {transpose !== 0 && <button className="ctrl-btn sm" onClick={() => setTranspose(0)}>rst</button>}
              </div>

              <div className="ctrl-sep"/>

              {/* Capo */}
              <div className="ctrl-grp">
                <span className="ctrl-lbl">Capo</span>
                <button className="ctrl-btn" onClick={() => setCapo(c => Math.max(0, c - 1))}>−</button>
                <span className={`ctrl-val${capo !== 0 ? ' hi' : ''}`}>{capo === 0 ? '—' : capo}</span>
                <button className="ctrl-btn" onClick={() => setCapo(c => Math.min(12, c + 1))}>+</button>
              </div>

              <div className="ctrl-sep"/>

              {/* Auto-scroll — play/pause + speed slider (1–10, finer granularity) */}
              <div className="ctrl-grp">
                <button
                  className={`ctrl-btn${autoScroll ? ' on' : ''}`}
                  onClick={() => setAutoScroll(a => !a)}
                  title="Auto-scroll (Space)"
                  style={{ fontSize: 11 }}
                >
                  {autoScroll ? '⏸' : '▶'}
                </button>
                <input
                  type="range" min={1} max={10} step={1} value={scrollSpeed}
                  onChange={e => setScrollSpeed(Number(e.target.value))}
                  className="speed-slider"
                  title={`Speed: ${scrollSpeed}`}
                />
                <span className="ctrl-val" style={{ fontSize: 9, minWidth: 16 }}>{scrollSpeed}</span>
              </div>

              <div className="ctrl-sep"/>

              {/* Chord colour */}
              <button className={`ctrl-btn${colorChords ? ' on' : ''}`} onClick={() => setColorChords(c => !c)} title="Highlight chords" style={{ fontSize: 11 }}>♩</button>

              <div className="ctrl-sep"/>

              {/* Save */}
              <button className={`save-btn${isSaved ? ' saved' : ''}`} onClick={toggleSave}>
                {isSaved ? '★ Saved' : '☆ Save'}
              </button>

              {/* PDF */}
              <button className="pdf-btn" onClick={() => printPDF(tab, transpose, capo)} title="Download PDF">
                ↓ PDF
              </button>
            </div>

            {/* ── Scrollable tab content ── */}
            <div className="tab-scroll" ref={tabContentRef}>
              <div className="tab-body" style={{ fontSize: `${fontSize}px` }}>
                {renderTabContent(tab.content)}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <footer className="footer">
          <span>tab-reader · personal use</span>
          {view === 'tab' && (
            <div className="kbds">
              <span><span className="kbd">Space</span>scroll</span>
              <span><span className="kbd">Esc</span>home</span>
            </div>
          )}
        </footer>
      </div>
    </>
  );
}
