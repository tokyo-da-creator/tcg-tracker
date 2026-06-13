import { useState } from 'react';
import { ANIME, byId, CHARACTERS, REVIEWS, DISCUSSIONS, LIST_STATUS, userBy, accentFor, fmt } from '../data.js';
import Art from '../components/Art.jsx';
import Avatar from '../components/Avatar.jsx';
import Button from '../components/Button.jsx';
import Poster from '../components/Poster.jsx';
import Progress from '../components/Progress.jsx';
import ScoreBadge from '../components/ScoreBadge.jsx';
import Sheet from '../components/Sheet.jsx';
import StarRating from '../components/StarRating.jsx';
import Tag from '../components/Tag.jsx';
import Icon from '../icons.jsx';

const iconBtn = { width: 38, height: 38, borderRadius: '50%', background: 'rgba(20,20,24,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const stepBtn = { width: 50, height: 46, borderRadius: 13, background: 'var(--ink-3)', border: '1px solid var(--line-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };

function BackBar({ nav, title, scrolled }) {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '54px 14px 10px', background: scrolled ? 'linear-gradient(to bottom, rgba(8,8,10,0.95), rgba(8,8,10,0))' : 'transparent', transition: 'background .2s' }}>
      <div className="tap" onClick={() => nav.pop()} style={iconBtn}><Icon name="chevL" size={22} color="#fff" /></div>
      <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700, opacity: scrolled ? 1 : 0, transition: 'opacity .2s', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', padding: '0 8px' }}>{title}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div className="tap" style={iconBtn}><Icon name="share" size={19} color="#fff" /></div>
        <div className="tap" style={iconBtn}><Icon name="ellipsis" size={20} color="#fff" /></div>
      </div>
    </div>
  );
}

function RatingDist({ hue }) {
  const dist = [4, 7, 13, 26, 50];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
      {[5, 4, 3, 2, 1].map((s, i) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--txt-faint)', width: 8 }}>{s}</span>
          <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ width: dist[4 - i] + '%', height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${accentFor(hue)}, var(--accent))` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: -0.4 }}>{children}</h3>;
}

export default function DetailScreen({ nav, id }) {
  const a = byId[id] || ANIME[0];
  const [scrolled, setScrolled] = useState(false);
  const [status, setStatus] = useState(a.status || null);
  const [fav, setFav] = useState(!!a.fav);
  const [myScore, setMyScore] = useState(a.myScore ? Math.round(a.myScore / 2) : 0);
  const [prog, setProg] = useState(a.progress || 0);
  const [expanded, setExpanded] = useState(false);
  const [statusSheet, setStatusSheet] = useState(false);

  const chars = CHARACTERS.filter(c => c.anime.includes(a.title.split(':')[0].split(' ')[0]) || c.anime === a.title).slice(0, 6);
  const charset = chars.length ? chars : CHARACTERS.slice(0, 6);
  const similar = ANIME.filter(x => x.id !== a.id && x.genres.some(g => a.genres.includes(g))).slice(0, 8);
  const review = REVIEWS.find(r => r.anime === a.id) || REVIEWS[0];
  const disc = DISCUSSIONS.find(d => d.anime === a.id) || DISCUSSIONS[0];
  const curStatus = LIST_STATUS.find(s => s.key === status);

  return (
    <div className="scroll" onScroll={e => setScrolled(e.target.scrollTop > 220)} style={{ height: '100%', paddingBottom: 40 }}>
      {/* Hero */}
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'relative', aspectRatio: '4 / 5' }}>
          <Art seed={a.id + '-banner'} hue={a.hue} label="Key visual" dim={0.36} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--ink-0) 2%, rgba(8,8,10,0.45) 38%, rgba(8,8,10,0.15) 65%, rgba(8,8,10,0.4) 100%)' }} />
        </div>
        <BackBar nav={nav} title={a.title} scrolled={scrolled} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0 20px 4px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 9 }}>
            {a.genres.map((g, idx, arr) => <span key={g} style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.82)' }}>{g}{idx < arr.length - 1 ? ' ·' : ''}</span>)}
          </div>
          <h1 style={{ margin: 0, fontSize: 33, fontWeight: 900, letterSpacing: -1.1, lineHeight: 0.96, maxWidth: 320, textShadow: '0 2px 24px rgba(0,0,0,0.5)' }}>{a.title}</h1>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 7, fontStyle: 'italic' }}>{a.alt}</div>
        </div>
      </div>

      {/* Meta strip */}
      <div className="hscroll" style={{ display: 'flex', gap: 0, margin: '18px 0 4px', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        {[[a.format, 'Format'], [a.episodes + ' eps', 'Episodes'], [a.season + ' ' + a.year, 'Aired'], [a.studio, 'Studio']].map(([v, l], i, arr) => (
          <div key={l} style={{ padding: '13px 18px', borderRight: i < arr.length - 1 ? '1px solid var(--line)' : 'none', flexShrink: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{v}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 0.8, color: 'var(--txt-faint)', textTransform: 'uppercase', marginTop: 3 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '14px 20px 0' }}>
        {/* Primary actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Button full size="lg" variant={status ? 'ghost' : 'primary'} icon={curStatus ? 'check' : 'plus'} onClick={() => setStatusSheet(true)}>
              {curStatus ? curStatus.label : 'Add to List'}
            </Button>
          </div>
          <div className="tap" onClick={() => setFav(f => !f)} style={{ width: 54, borderRadius: 14, background: fav ? 'var(--accent-soft)' : 'var(--ink-3)', border: '1px solid ' + (fav ? 'var(--accent)' : 'var(--line-2)'), display: 'flex', alignItems: 'center', justifyContent: 'center', color: fav ? 'var(--accent)' : 'var(--txt)' }}>
            <Icon name={fav ? 'heartFill' : 'heart'} size={22} />
          </div>
          <div className="tap" style={{ width: 54, borderRadius: 14, background: 'var(--ink-3)', border: '1px solid var(--line-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--txt)' }}>
            <Icon name="play" size={20} />
          </div>
        </div>

        {/* Community rating */}
        <div style={{ display: 'flex', gap: 16, marginTop: 20, alignItems: 'center', background: 'var(--ink-1)', border: '1px solid var(--line)', borderRadius: 18, padding: 16 }}>
          <div style={{ textAlign: 'center', paddingRight: 14, borderRight: '1px solid var(--line)' }}>
            <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: -1, lineHeight: 1, color: 'var(--gold)' }}>{a.score.toFixed(2)}</div>
            <div style={{ display: 'flex', gap: 1, justifyContent: 'center', margin: '5px 0 3px' }}>
              {[0,1,2,3,4].map(i => <Icon key={i} name="starFill" size={11} color={i < Math.round(a.score/2) ? 'var(--gold)' : 'rgba(255,255,255,0.16)'} />)}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--txt-faint)' }}>{fmt(a.members)} RATINGS</div>
          </div>
          <RatingDist hue={a.hue} />
        </div>

        {/* Your rating */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, background: 'var(--ink-1)', border: '1px solid var(--line)', borderRadius: 18, padding: '14px 16px' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Your rating</div>
            <div style={{ fontSize: 11.5, color: 'var(--txt-faint)', marginTop: 1 }}>{myScore ? `You rated this ${myScore * 2}/10` : 'Tap to rate'}</div>
          </div>
          <StarRating value={myScore} onChange={setMyScore} size={26} />
        </div>

        {/* Episode tracker */}
        {(status === 'watching' || status === 'completed' || status === 'hold') && (
          <div style={{ marginTop: 12, background: 'var(--ink-1)', border: '1px solid var(--line)', borderRadius: 18, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Episode progress</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--txt-dim)' }}>{prog} / {a.episodes}</div>
            </div>
            <Progress value={prog} total={a.episodes} height={6} />
            <div style={{ display: 'flex', gap: 10, marginTop: 13 }}>
              <div className="tap" onClick={() => setProg(p => Math.max(0, p - 1))} style={stepBtn}><Icon name="x" size={16} color="var(--txt-dim)" /></div>
              <div className="tap" onClick={() => setProg(p => Math.min(a.episodes, p + 1))} style={{ ...stepBtn, flex: 1, background: 'var(--accent)', color: '#fff', gap: 7, width: 'auto' }}>
                <Icon name="plus" size={17} color="#fff" /> <span style={{ fontSize: 13.5, fontWeight: 700 }}>Watched EP {Math.min(a.episodes, prog + 1)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Synopsis */}
        <div style={{ marginTop: 24 }}>
          <SectionTitle>Synopsis</SectionTitle>
          <p style={{ fontSize: 14.5, lineHeight: 1.62, color: 'var(--txt-dim)', margin: '10px 0 0', display: expanded ? 'block' : '-webkit-box', WebkitLineClamp: expanded ? 'none' : 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.synopsis}</p>
          <div className="tap" onClick={() => setExpanded(e => !e)} style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginTop: 7 }}>{expanded ? 'Show less' : 'Read more'}</div>
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          {a.tags.map(tg => <Tag key={tg}>{tg}</Tag>)}
        </div>

        {/* Trailer */}
        <div className="tap" style={{ marginTop: 18, position: 'relative', borderRadius: 16, overflow: 'hidden', aspectRatio: '16 / 9', border: '1px solid var(--line)' }}>
          <Art seed={a.id + '-trailer'} hue={a.hue} dim={0.4} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="play" size={24} color="#fff" />
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 12, left: 14, fontSize: 13, fontWeight: 700, textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>Watch trailer · PV 2</div>
        </div>
      </div>

      {/* Characters */}
      <div style={{ marginTop: 26 }}>
        <div style={{ padding: '0 20px' }}><SectionTitle>Characters</SectionTitle></div>
        <div className="hscroll" style={{ display: 'flex', gap: 13, padding: '12px 20px 4px' }}>
          {charset.map(c => (
            <div key={c.id} style={{ width: 84, flexShrink: 0 }}>
              <div style={{ borderRadius: 14, overflow: 'hidden', aspectRatio: '1', border: '1px solid var(--line)' }}>
                <Art seed={c.id} hue={c.hue} title={c.name} showTitle />
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 7, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
              <div style={{ fontSize: 10.5, color: 'var(--txt-faint)' }}>{c.role}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top review */}
      <div style={{ marginTop: 22, padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <SectionTitle>Top Review</SectionTitle>
          <div className="tap" onClick={() => nav.push('review', { id: review.id })} style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt-dim)' }}>All reviews ›</div>
        </div>
        <div className="tap" onClick={() => nav.push('review', { id: review.id })} style={{ marginTop: 11, background: 'var(--ink-1)', border: '1px solid var(--line)', borderRadius: 18, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar user={userBy[review.user]} size={36} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{userBy[review.user]?.name}</div>
              <div style={{ fontSize: 11, color: 'var(--txt-faint)' }}>{review.when} ago</div>
            </div>
            <div style={{ background: 'var(--accent-soft)', borderRadius: 9, padding: '5px 9px', display: 'flex', gap: 3, alignItems: 'center' }}>
              <Icon name="starFill" size={13} color="var(--gold)" /><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13 }}>{review.score}</span>
            </div>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--txt-dim)', margin: '12px 0 0', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{review.body}</p>
          <div style={{ display: 'flex', gap: 18, marginTop: 12, fontSize: 12.5, color: 'var(--txt-faint)' }}>
            <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}><Icon name="heart" size={15} />{fmt(review.likes)}</span>
            <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}><Icon name="comment" size={15} />{review.comments}</span>
          </div>
        </div>
        <div className="tap" onClick={() => nav.push('review', { id: review.id, compose: true })} style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '13px', borderRadius: 14, border: '1px dashed var(--line-2)', color: 'var(--txt-dim)', fontSize: 14, fontWeight: 600 }}>
          <Icon name="quote" size={17} /> Write a review
        </div>
      </div>

      {/* Discussion */}
      <div style={{ marginTop: 22, padding: '0 20px' }}>
        <SectionTitle>Discussion</SectionTitle>
        <div className="tap" onClick={() => nav.push('discussion', { id: disc.id })} style={{ marginTop: 11, background: 'var(--ink-1)', border: '1px solid var(--line)', borderRadius: 16, padding: 15, display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="comment" size={20} color="var(--accent)" /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{disc.title}</div>
            <div style={{ fontSize: 11.5, color: 'var(--txt-faint)', marginTop: 3 }}>{disc.replies} replies · {fmt(disc.likes)} likes</div>
          </div>
          <Icon name="chevR" size={18} color="var(--txt-faint)" />
        </div>
      </div>

      {/* Similar */}
      <div style={{ marginTop: 26 }}>
        <div style={{ padding: '0 20px' }}><SectionTitle>More Like This</SectionTitle></div>
        <div className="hscroll" style={{ display: 'flex', gap: 13, padding: '12px 20px 4px' }}>
          {similar.map(x => <Poster key={x.id} anime={x} width={118} onClick={() => { nav.pop(); setTimeout(() => nav.push('detail', { id: x.id }), 80); }} />)}
        </div>
      </div>

      {/* Status sheet */}
      <Sheet open={statusSheet} onClose={() => setStatusSheet(false)} title="Add to list">
        <div style={{ padding: '8px 16px 24px' }}>
          {LIST_STATUS.map(s => (
            <div key={s.key} className="tap" onClick={() => { setStatus(s.key); setStatusSheet(false); }} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 12px', borderRadius: 14, background: status === s.key ? 'var(--ink-3)' : 'transparent' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: accentFor(s.hue) }} />
              <span style={{ fontSize: 15.5, fontWeight: 600, flex: 1 }}>{s.label}</span>
              {status === s.key && <Icon name="check" size={20} color="var(--accent)" />}
            </div>
          ))}
          {status && <div className="tap" onClick={() => { setStatus(null); setStatusSheet(false); }} style={{ textAlign: 'center', padding: 14, marginTop: 6, color: 'var(--accent)', fontWeight: 700, fontSize: 14.5 }}>Remove from list</div>}
        </div>
      </Sheet>
    </div>
  );
}
