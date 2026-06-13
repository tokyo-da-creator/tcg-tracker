import { useState } from 'react';
import { ANIME, CHARACTERS, ME, USERS, userBy, accentFor, fmt } from '../data.js';
import Art from '../components/Art.jsx';
import Avatar from '../components/Avatar.jsx';
import Button from '../components/Button.jsx';
import Poster from '../components/Poster.jsx';
import SegTabs from '../components/SegTabs.jsx';
import Stat from '../components/Stat.jsx';
import Icon from '../icons.jsx';

const favAnime = ANIME.filter(a => a.fav);
const favChars = CHARACTERS.slice(0, 6);

const GENRE_BARS = [
  { g: 'Action', pct: 92, n: 148 }, { g: 'Drama', pct: 78, n: 121 }, { g: 'Fantasy', pct: 64, n: 98 },
  { g: 'Supernatural', pct: 52, n: 76 }, { g: 'Comedy', pct: 41, n: 63 }, { g: 'Sci-Fi', pct: 33, n: 49 },
];
const RADAR = [['Action', 92], ['Drama', 80], ['Fantasy', 70], ['Comedy', 48], ['Romance', 38], ['Sci-Fi', 60]];
const RATING_DIST = [2, 1, 3, 5, 9, 14, 22, 31, 18, 6];
const SEASONS_DATA = [['Win', 38], ['Spr', 64], ['Sum', 52], ['Fall', 88]];
const BADGES = [
  { name: 'Completionist', icon: 'checkCircle', hue: 168 }, { name: 'Marathoner', icon: 'flame', hue: 18 },
  { name: 'Critic', icon: 'quote', hue: 268 }, { name: 'Early Adopter', icon: 'sparkle', hue: 48 },
  { name: 'Night Owl', icon: 'clock', hue: 230 }, { name: 'Seasonal Hunter', icon: 'calendar', hue: 312 },
];

function Radar({ data, accent }) {
  const cx = 110, cy = 104, R = 80, n = data.length;
  const pt = (i, r) => { const ang = (Math.PI * 2 * i) / n - Math.PI / 2; return [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]; };
  const rings = [0.25, 0.5, 0.75, 1];
  const poly = data.map((d, i) => pt(i, R * d[1] / 100).join(',')).join(' ');
  return (
    <svg width="220" height="208" viewBox="0 0 220 208" style={{ display: 'block', margin: '0 auto' }}>
      {rings.map((r, ri) => (
        <polygon key={ri} points={data.map((_, i) => pt(i, R * r).join(',')).join(' ')} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="1" />
      ))}
      {data.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />; })}
      <polygon points={poly} fill={accent} fillOpacity="0.22" stroke={accent} strokeWidth="2" strokeLinejoin="round" />
      {data.map((d, i) => { const [x, y] = pt(i, R * d[1] / 100); return <circle key={i} cx={x} cy={y} r="3" fill={accent} />; })}
      {data.map((d, i) => { const [x, y] = pt(i, R + 16); return <text key={i} x={x} y={y + 3} textAnchor="middle" fill="rgba(235,235,245,0.6)" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">{d[0]}</text>; })}
    </svg>
  );
}

function Ring({ pct, accent }) {
  const r = 38, c = 2 * Math.PI * r;
  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="9" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={accent} strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset 1s ease' }} />
      <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fill="var(--txt)" fontSize="22" fontWeight="800">{pct}%</text>
    </svg>
  );
}

function StatCard({ children, label, icon }) {
  return (
    <div style={{ background: 'var(--ink-1)', border: '1px solid var(--line)', borderRadius: 18, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
        {icon && <Icon name={icon} size={15} color="var(--accent)" />}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 0.8, color: 'var(--txt-faint)', textTransform: 'uppercase' }}>{label}</span>
      </div>
      {children}
    </div>
  );
}

const glassBtn = { width: 38, height: 38, borderRadius: '50%', background: 'rgba(20,20,24,0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const hdrBtn = { width: 44, height: 44, borderRadius: 13, background: 'var(--ink-3)', border: '1px solid var(--line-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' };

export default function ProfileScreen({ nav, handle }) {
  const isOther = handle && handle !== ME.handle;
  const user = isOther ? userBy[handle] : ME;
  const [tab, setTab] = useState('overview');
  const [following, setFollowing] = useState(false);
  const accent = 'var(--accent)';
  const u = isOther ? { ...user, bio: 'MAPPA apologist. Will defend the Vinland Saga farmland arc with my life.', followers: 4820, following: 211, animeScore: 8.1, watched: 286, episodes: 5140, daysWatched: 42.1, joined: '2022' } : ME;

  return (
    <div className="scroll" style={{ height: '100%', paddingBottom: isOther ? 30 : 96 }}>
      {/* Animated banner */}
      <div style={{ position: 'relative', height: 168 }}>
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: '-20%', backgroundColor: `oklch(0.32 0.13 ${u.hue})`,
            backgroundImage: `radial-gradient(60% 80% at 20% 20%, oklch(0.6 0.18 ${u.hue} / 0.9), transparent 60%), radial-gradient(70% 90% at 85% 70%, oklch(0.5 0.16 ${(u.hue + 60) % 360}), transparent 60%)`,
            animation: 'bannerPan 16s ease-in-out infinite alternate' }} />
          <div style={{ position: 'absolute', inset: 0, opacity: 0.06, backgroundImage: 'repeating-linear-gradient(125deg, #fff 0 1px, transparent 1px 8px)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--ink-0) 2%, transparent 60%)' }} />
        </div>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '52px 16px 0', display: 'flex', justifyContent: 'space-between', zIndex: 5 }}>
          {isOther
            ? <div className="tap" onClick={() => nav.pop()} style={glassBtn}><Icon name="chevL" size={22} color="#fff" /></div>
            : <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.7)', alignSelf: 'center' }}>JOINED {u.joined}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="tap" style={glassBtn}><Icon name="share" size={18} color="#fff" /></div>
            {!isOther && <div className="tap" style={glassBtn}><Icon name="settings" size={19} color="#fff" /></div>}
          </div>
        </div>
      </div>

      {/* Identity */}
      <div style={{ padding: '0 20px', marginTop: -40, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ borderRadius: '50%', border: '3px solid var(--ink-0)' }}><Avatar user={u} size={84} /></div>
          {isOther ? (
            <div style={{ display: 'flex', gap: 8, paddingBottom: 6 }}>
              <Button variant={following ? 'ghost' : 'primary'} onClick={() => setFollowing(f => !f)} icon={following ? 'check' : 'plus'}>{following ? 'Following' : 'Follow'}</Button>
              <div className="tap" style={hdrBtn}><Icon name="comment" size={19} color="var(--txt)" /></div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, paddingBottom: 6 }}>
              <div className="tap" style={{ padding: '10px 18px', borderRadius: 13, background: 'var(--ink-3)', border: '1px solid var(--line-2)', fontSize: 14, fontWeight: 700 }}>Edit profile</div>
            </div>
          )}
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, letterSpacing: -0.6 }}>{u.name}</h1>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 7 }}><Icon name="starFill" size={11} /> {u.animeScore} avg</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--txt-faint)', marginTop: 3 }}>{u.handle}</div>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--txt-dim)', margin: '11px 0 0' }}>{u.bio}</p>
        </div>

        {/* Follow counts */}
        <div style={{ display: 'flex', gap: 22, marginTop: 16 }}>
          <div className="tap"><span style={{ fontSize: 16, fontWeight: 800 }}>{fmt(u.followers)}</span> <span style={{ fontSize: 13.5, color: 'var(--txt-faint)' }}>Followers</span></div>
          <div className="tap"><span style={{ fontSize: 16, fontWeight: 800 }}>{u.following}</span> <span style={{ fontSize: 13.5, color: 'var(--txt-faint)' }}>Following</span></div>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, padding: '15px 6px', background: 'var(--ink-1)', border: '1px solid var(--line)', borderRadius: 18 }}>
          <Stat value={u.watched} label="Watched" />
          <div style={{ width: 1, background: 'var(--line)' }} />
          <Stat value={fmt(u.episodes)} label="Episodes" />
          <div style={{ width: 1, background: 'var(--line)' }} />
          <Stat value={u.daysWatched} label="Days" accent="var(--accent)" />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ marginTop: 20, padding: '0 20px' }}>
        <SegTabs tabs={[{ key: 'overview', label: 'Overview' }, { key: 'stats', label: 'Stats' }, { key: 'activity', label: 'Activity' }]} active={tab} onChange={setTab} />
      </div>

      {tab === 'overview' && (
        <div style={{ animation: 'fadeIn .25s both' }}>
          <div style={{ marginTop: 20 }}>
            <h3 style={{ margin: '0 20px 12px', fontSize: 17, fontWeight: 800, letterSpacing: -0.3 }}>Favorite Anime</h3>
            <div className="hscroll" style={{ display: 'flex', gap: 12, padding: '0 20px 4px' }}>
              {favAnime.map(a => <Poster key={a.id} anime={a} width={108} showScore={false} onClick={() => nav.push('detail', { id: a.id })} />)}
            </div>
          </div>
          <div style={{ marginTop: 22 }}>
            <h3 style={{ margin: '0 20px 12px', fontSize: 17, fontWeight: 800, letterSpacing: -0.3 }}>Favorite Characters</h3>
            <div className="hscroll" style={{ display: 'flex', gap: 14, padding: '0 20px 4px' }}>
              {favChars.map(c => (
                <div key={c.id} style={{ width: 76, textAlign: 'center' }}>
                  <div style={{ borderRadius: '50%', overflow: 'hidden', aspectRatio: '1', border: '1px solid var(--line)' }}><Art seed={c.id} hue={c.hue} title={c.name.split(' ')[0]} showTitle /></div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginTop: 7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 22, padding: '0 20px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 800, letterSpacing: -0.3 }}>Achievements</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 11 }}>
              {BADGES.map(b => (
                <div key={b.name} style={{ background: 'var(--ink-1)', border: '1px solid var(--line)', borderRadius: 16, padding: '15px 8px', textAlign: 'center' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 13, margin: '0 auto 9px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `radial-gradient(120% 120% at 30% 20%, ${accentFor(b.hue)}, oklch(0.3 0.12 ${b.hue}))`, color: '#fff' }}>
                    <Icon name={b.icon} size={20} color="#fff" />
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, lineHeight: 1.2 }}>{b.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'stats' && (
        <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 13, animation: 'fadeIn .25s both' }}>
          <StatCard label="Taste profile" icon="chart">
            <Radar data={RADAR} accent="#ff6a4d" />
          </StatCard>
          <div style={{ display: 'flex', gap: 13 }}>
            <div style={{ flex: 1 }}>
              <StatCard label="Completion" icon="checkCircle">
                <div style={{ display: 'flex', justifyContent: 'center' }}><Ring pct={86} accent="var(--accent)" /></div>
                <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--txt-faint)', marginTop: 6 }}>354 of 412 finished</div>
              </StatCard>
            </div>
            <div style={{ flex: 1 }}>
              <StatCard label="Seasons" icon="calendar">
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 100, gap: 8, padding: '4px 2px 0' }}>
                  {SEASONS_DATA.map(([s, v]) => (
                    <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: '100%', height: v, borderRadius: 6, background: 'linear-gradient(to top, var(--accent), var(--accent-2))' }} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--txt-faint)' }}>{s}</span>
                    </div>
                  ))}
                </div>
              </StatCard>
            </div>
          </div>
          <StatCard label="Genre breakdown" icon="grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {GENRE_BARS.map(b => (
                <div key={b.g} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, width: 92, flexShrink: 0 }}>{b.g}</span>
                  <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div style={{ width: b.pct + '%', height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, var(--accent-2), var(--accent))' }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--txt-faint)', width: 28, textAlign: 'right' }}>{b.n}</span>
                </div>
              ))}
            </div>
          </StatCard>
          <StatCard label="Your rating distribution" icon="starFill">
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 92, gap: 4 }}>
              {RATING_DIST.map((v, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: '100%', height: Math.max(4, v / 31 * 72), borderRadius: 4, background: i + 1 >= 8 ? 'var(--gold)' : 'rgba(255,255,255,0.22)' }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--txt-faint)' }}>{i + 1}</span>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--txt-faint)', marginTop: 8 }}>Mean score <strong style={{ color: 'var(--txt)' }}>{u.animeScore}</strong> · you rate higher than 72% of users</div>
          </StatCard>
        </div>
      )}

      {tab === 'activity' && (
        <div style={{ padding: '8px 20px 0', animation: 'fadeIn .25s both' }}>
          {[
            { icon: 'starFill', t: 'Rated Frieren 10/10', s: '2h ago', hue: 168 },
            { icon: 'checkCircle', t: 'Completed Cyberpunk: Edgerunners', s: '1d ago', hue: 312 },
            { icon: 'quote', t: 'Reviewed Bocchi the Rock!', s: '3d ago', hue: 350 },
            { icon: 'plusCircle', t: 'Added Solo Leveling to Plan to Watch', s: '4d ago', hue: 222 },
            { icon: 'heartFill', t: 'Favorited Violet Evergarden', s: '1w ago', hue: 230 },
          ].map((it, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `oklch(0.3 0.1 ${it.hue})`, color: accentFor(it.hue), flexShrink: 0 }}><Icon name={it.icon} size={18} /></div>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{it.t}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--txt-faint)' }}>{it.s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
