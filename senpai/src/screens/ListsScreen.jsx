import { useState } from 'react';
import { ANIME, LIST_STATUS, byId, accentFor } from '../data.js';
import Art from '../components/Art.jsx';
import Poster from '../components/Poster.jsx';
import Progress from '../components/Progress.jsx';
import Sheet from '../components/Sheet.jsx';
import Icon from '../icons.jsx';

const CUSTOM = [
  { id: 'l1', name: 'Comfort Rewatches', count: 14, hue: 168, items: ['btr', 'sxf', 'vio', 'mob'] },
  { id: 'l2', name: 'Best Openings Ever', count: 22, hue: 312, items: ['cbe', 'jjk', 'csm', 'aot'] },
  { id: 'l3', name: 'Made Me Cry', count: 9, hue: 230, items: ['vio', 'tye', 'fmt'] },
];

function ListRow({ a, onClick }) {
  const cur = LIST_STATUS.find(s => s.key === a.status);
  return (
    <div className="tap" onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
      <div style={{ width: 46, height: 64, borderRadius: 9, overflow: 'hidden', flexShrink: 0 }}>
        <Art seed={a.id} hue={a.hue} title={a.title} showTitle ratio="2 / 3" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</div>
        <div style={{ fontSize: 11.5, color: 'var(--txt-faint)', margin: '3px 0 7px' }}>{a.format} · {a.studio}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ flex: 1, maxWidth: 130 }}><Progress value={a.progress} total={a.episodes} accent={accentFor(cur ? cur.hue : a.hue)} /></div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--txt-dim)' }}>{a.progress}/{a.episodes}</span>
        </div>
      </div>
      {a.myScore ? <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Icon name="starFill" size={13} color="var(--gold)" /><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13 }}>{a.myScore}</span></div> : <Icon name="chevR" size={16} color="var(--txt-faint)" />}
    </div>
  );
}

const hdrBtn = { width: 40, height: 40, borderRadius: '50%', background: 'var(--ink-2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center' };

export default function ListsScreen({ nav }) {
  const [status, setStatus] = useState('watching');
  const [view, setView] = useState('grid');
  const [sort, setSort] = useState('Last updated');
  const [sortOpen, setSortOpen] = useState(false);

  const counts = {};
  LIST_STATUS.forEach(s => counts[s.key] = ANIME.filter(a => a.status === s.key).length);
  let items = ANIME.filter(a => a.status === status);
  if (sort === 'Score') items = [...items].sort((a, b) => (b.myScore || 0) - (a.myScore || 0));
  if (sort === 'Title A–Z') items = [...items].sort((a, b) => a.title.localeCompare(b.title));
  if (sort === 'Progress') items = [...items].sort((a, b) => (b.progress / b.episodes) - (a.progress / a.episodes));
  const cur = LIST_STATUS.find(s => s.key === status);

  return (
    <div className="scroll" style={{ height: '100%', paddingBottom: 96 }}>
      {/* Header */}
      <div style={{ padding: '52px 20px 10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, letterSpacing: -0.8 }}>Library</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="tap" onClick={() => setView(v => v === 'grid' ? 'list' : 'grid')} style={hdrBtn}><Icon name={view === 'grid' ? 'list' : 'grid'} size={19} color="var(--txt)" /></div>
            <div className="tap" onClick={() => setSortOpen(true)} style={hdrBtn}><Icon name="filter" size={19} color="var(--txt)" /></div>
          </div>
        </div>
      </div>

      {/* Status tabs */}
      <div className="hscroll" style={{ display: 'flex', gap: 9, padding: '4px 20px 14px' }}>
        {LIST_STATUS.map(s => {
          const on = s.key === status;
          return (
            <div key={s.key} className="tap" onClick={() => setStatus(s.key)} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 12, background: on ? 'var(--ink-3)' : 'transparent', border: '1px solid ' + (on ? 'var(--line-2)' : 'transparent') }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: accentFor(s.hue) }} />
              <span style={{ fontSize: 14, fontWeight: on ? 700 : 600, color: on ? 'var(--txt)' : 'var(--txt-faint)' }}>{s.label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: on ? 'var(--txt-dim)' : 'var(--txt-faint)' }}>{counts[s.key]}</span>
            </div>
          );
        })}
      </div>

      {/* Body */}
      <div style={{ padding: '0 20px', animation: 'fadeIn .2s both' }} key={status + view}>
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '70px 30px' }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Icon name="grid" size={28} color="var(--txt-faint)" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Nothing in {cur?.label} yet</div>
            <div style={{ fontSize: 13.5, color: 'var(--txt-faint)', marginTop: 5, lineHeight: 1.4 }}>Titles you mark as {cur?.label?.toLowerCase()} will collect here.</div>
            <div className="tap" onClick={() => nav.setTab('search')} style={{ display: 'inline-flex', marginTop: 16, padding: '11px 20px', borderRadius: 13, background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 14 }}>Browse anime</div>
          </div>
        ) : view === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 13 }}>
            {items.map(a => <Poster key={a.id} anime={a} width="100%" showProgress={status === 'watching' || status === 'hold'} showScore={status !== 'watching'} onClick={() => nav.push('detail', { id: a.id })} />)}
          </div>
        ) : (
          <div>{items.map(a => <ListRow key={a.id} a={a} onClick={() => nav.push('detail', { id: a.id })} />)}</div>
        )}
      </div>

      {/* Custom lists */}
      <div style={{ marginTop: 30 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', marginBottom: 13 }}>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: -0.4 }}>Custom Lists</h3>
          <div className="tap" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent)', fontSize: 13.5, fontWeight: 700 }}><Icon name="plus" size={16} /> New</div>
        </div>
        <div className="hscroll" style={{ display: 'flex', gap: 13, padding: '0 20px 4px' }}>
          {CUSTOM.map(l => (
            <div key={l.id} className="tap" style={{ width: 188, flexShrink: 0 }}>
              <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', height: 116, border: '1px solid var(--line)', display: 'flex' }}>
                {l.items.slice(0, 4).map((id, i) => (
                  <div key={id} style={{ flex: 1, position: 'relative', borderRight: i < 3 ? '1px solid rgba(0,0,0,0.3)' : 'none' }}>
                    <Art seed={id} hue={byId[id]?.hue} style={{ height: '100%' }} />
                  </div>
                ))}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent 60%)', display: 'flex', alignItems: 'flex-end', padding: 12 }}>
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: -0.3 }}>{l.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{l.count} TITLES</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sort sheet */}
      <Sheet open={sortOpen} onClose={() => setSortOpen(false)} title="Sort & edit">
        <div style={{ padding: '8px 16px 24px' }}>
          {['Last updated', 'Score', 'Progress', 'Title A–Z'].map(s => (
            <div key={s} className="tap" onClick={() => { setSort(s); setSortOpen(false); }} style={{ display: 'flex', alignItems: 'center', padding: '14px 12px', borderRadius: 12, background: sort === s ? 'var(--ink-3)' : 'transparent' }}>
              <span style={{ flex: 1, fontSize: 15.5, fontWeight: 600 }}>{s}</span>
              {sort === s && <Icon name="check" size={20} color="var(--accent)" />}
            </div>
          ))}
          <div style={{ height: 1, background: 'var(--line)', margin: '8px 12px' }} />
          <div className="tap" style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 12px', color: 'var(--txt)' }}><Icon name="settings" size={20} color="var(--txt-dim)" /><span style={{ fontSize: 15.5, fontWeight: 600 }}>Bulk edit titles</span></div>
        </div>
      </Sheet>
    </div>
  );
}
