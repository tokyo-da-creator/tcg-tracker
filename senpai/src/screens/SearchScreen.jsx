import { useState } from 'react';
import { ANIME, CHARACTERS, GENRES, SEASONS, STUDIOS, TRENDING_SEARCHES, accentFor, fmt } from '../data.js';
import Art from '../components/Art.jsx';
import Chip from '../components/Chip.jsx';
import Poster from '../components/Poster.jsx';
import ScoreBadge from '../components/ScoreBadge.jsx';
import Sheet from '../components/Sheet.jsx';
import Icon from '../icons.jsx';

const GENRE_HUE = { Action: 18, Adventure: 138, Comedy: 48, Drama: 330, Fantasy: 268, Horror: 6, Mystery: 230, Romance: 348, 'Sci-Fi': 210, 'Slice of Life': 168, Sports: 88, Supernatural: 286, Thriller: 250, Music: 312 };

function GenreCard({ g, onClick }) {
  const hue = GENRE_HUE[g] || 220;
  return (
    <div className="tap" onClick={onClick} style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', aspectRatio: '16 / 10', border: '1px solid var(--line)' }}>
      <Art seed={'genre-' + g} hue={hue} dim={0.2} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', padding: 13, background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent 70%)' }}>
        <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.3, textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>{g}</span>
      </div>
    </div>
  );
}

function RankRow({ a, rank, onClick }) {
  return (
    <div className="tap" onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '9px 0' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: rank <= 3 ? 'var(--accent)' : 'var(--txt-faint)', width: 24, textAlign: 'center' }}>{rank}</span>
      <div style={{ width: 44, height: 60, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
        <Art seed={a.id} hue={a.hue} title={a.title} showTitle ratio="2 / 3" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</div>
        <div style={{ fontSize: 11.5, color: 'var(--txt-faint)', marginTop: 2 }}>{a.format} · {a.episodes} eps · {a.studio}</div>
      </div>
      <ScoreBadge score={a.score} />
    </div>
  );
}

function FLabel({ children }) {
  return <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, color: 'var(--txt-faint)', textTransform: 'uppercase', marginBottom: 11 }}>{children}</div>;
}

function FilterSheet({ open, onClose, sel, setSel, sort, setSort }) {
  const toggle = g => setSel(s => s.includes(g) ? s.filter(x => x !== g) : [...s, g]);
  return (
    <Sheet open={open} onClose={onClose} title="Filters">
      <div style={{ padding: '8px 22px 26px' }}>
        <FLabel>Genres</FLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {GENRES.map(g => <Chip key={g} active={sel.includes(g)} accent onClick={() => toggle(g)}>{g}</Chip>)}
        </div>
        <FLabel>Season</FLabel>
        <div className="hscroll" style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {SEASONS.map(s => <Chip key={s}>{s}</Chip>)}
        </div>
        <FLabel>Studio</FLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {STUDIOS.map(s => <Chip key={s} size="sm">{s}</Chip>)}
        </div>
        <FLabel>Sort by</FLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {['Popularity', 'Score', 'Newest', 'A–Z'].map(s => <Chip key={s} active={sort === s} onClick={() => setSort(s)}>{s}</Chip>)}
        </div>
        <div className="tap" onClick={onClose} style={{ textAlign: 'center', padding: 15, borderRadius: 14, background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 15 }}>Show results</div>
      </div>
    </Sheet>
  );
}

export default function SearchScreen({ nav }) {
  const [q, setQ] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sel, setSel] = useState([]);
  const [sort, setSort] = useState('Popularity');

  const ranked = [...ANIME].sort((a, b) => b.score - a.score);
  let results = ANIME;
  if (q) results = results.filter(a => (a.title + a.alt + a.genres.join() + a.studio).toLowerCase().includes(q.toLowerCase()));
  if (sel.length) results = results.filter(a => a.genres.some(g => sel.includes(g)));

  const searching = q.length > 0 || sel.length > 0;

  return (
    <div className="scroll" style={{ height: '100%', paddingBottom: 96 }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, padding: '52px 18px 12px', background: 'linear-gradient(to bottom, var(--ink-0) 70%, transparent)' }}>
        <h1 style={{ margin: '0 0 14px', fontSize: 30, fontWeight: 900, letterSpacing: -0.8 }}>Discover</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 9, background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: '0 13px', height: 46 }}>
            <Icon name="search" size={19} color="var(--txt-faint)" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search anime, characters, studios" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--txt)', fontSize: 15, fontFamily: 'var(--font-sans)' }} />
            {q ? <div className="tap" onClick={() => setQ('')}><Icon name="x" size={18} color="var(--txt-faint)" /></div> : <Icon name="mic" size={19} color="var(--accent)" />}
          </div>
          <div className="tap" onClick={() => setFilterOpen(true)} style={{ width: 46, height: 46, borderRadius: 14, background: sel.length ? 'var(--accent)' : 'var(--ink-2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', color: sel.length ? '#fff' : 'var(--txt)' }}>
            <Icon name="filter" size={20} />
            {sel.length > 0 && <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 9, background: 'var(--txt)', color: '#000', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--ink-0)' }}>{sel.length}</span>}
          </div>
        </div>
      </div>

      {searching ? (
        <div style={{ padding: '4px 18px 0', animation: 'fadeIn .25s both' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 2px 14px' }}>
            <span style={{ fontSize: 13, color: 'var(--txt-dim)' }}>{results.length} result{results.length !== 1 ? 's' : ''}{sel.length ? ' · ' + sel.join(', ') : ''}</span>
            <span style={{ fontSize: 13, color: 'var(--txt-faint)', display: 'flex', alignItems: 'center', gap: 4 }}>{sort}<Icon name="chevD" size={14} /></span>
          </div>
          {results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--txt-faint)' }}>
              <Icon name="search" size={40} color="var(--txt-faint)" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 15 }}>No results for "{q}"</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 13 }}>
              {results.map(a => <Poster key={a.id} anime={a} width="100%" onClick={() => nav.push('detail', { id: a.id })} />)}
            </div>
          )}
        </div>
      ) : (
        <div style={{ animation: 'fadeIn .25s both' }}>
          {/* Trending searches */}
          <div style={{ padding: '6px 20px 0' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, color: 'var(--txt-faint)', textTransform: 'uppercase', marginBottom: 6 }}>Trending searches</div>
            {TRENDING_SEARCHES.map((s, i) => (
              <div key={s} className="tap" onClick={() => setQ(s.split(' ')[0])} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i < TRENDING_SEARCHES.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)', width: 16 }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: 14.5, fontWeight: 500 }}>{s}</span>
                <Icon name="arrowUp" size={15} color="var(--txt-faint)" />
              </div>
            ))}
          </div>

          {/* Genre grid */}
          <div style={{ padding: '24px 20px 0' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 19, fontWeight: 800, letterSpacing: -0.4 }}>Browse by Genre</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
              {GENRES.slice(0, 8).map(g => <GenreCard key={g} g={g} onClick={() => setSel([g])} />)}
            </div>
          </div>

          {/* Popular characters */}
          <div style={{ marginTop: 26 }}>
            <h3 style={{ margin: '0 20px 12px', fontSize: 19, fontWeight: 800, letterSpacing: -0.4 }}>Popular Characters</h3>
            <div className="hscroll" style={{ display: 'flex', gap: 14, padding: '0 20px 4px' }}>
              {CHARACTERS.map(c => (
                <div key={c.id} style={{ width: 78, flexShrink: 0, textAlign: 'center' }}>
                  <div style={{ borderRadius: '50%', overflow: 'hidden', aspectRatio: '1', border: '1px solid var(--line)' }}>
                    <Art seed={c.id} hue={c.hue} title={c.name.split(' ')[0]} showTitle />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginTop: 7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--txt-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}><Icon name="heartFill" size={9} color="var(--accent)" />{fmt(c.likes)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top ranked */}
          <div style={{ padding: '26px 20px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: -0.4 }}>Top Ranked</h3>
              <span style={{ fontSize: 12.5, color: 'var(--txt-faint)' }}>All-time</span>
            </div>
            {ranked.slice(0, 8).map((a, i) => <RankRow key={a.id} a={a} rank={i + 1} onClick={() => nav.push('detail', { id: a.id })} />)}
          </div>
        </div>
      )}

      <FilterSheet open={filterOpen} onClose={() => setFilterOpen(false)} sel={sel} setSel={setSel} sort={sort} setSort={setSort} />
    </div>
  );
}
