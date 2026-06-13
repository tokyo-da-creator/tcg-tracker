import { useState } from 'react';
import { REVIEWS, DISCUSSIONS, reviewBy, byId, userBy, ME, fmt } from '../data.js';
import Art from '../components/Art.jsx';
import Avatar from '../components/Avatar.jsx';
import StarRating from '../components/StarRating.jsx';
import Icon from '../icons.jsx';

const COMMENTS = [
  { user: '@miyu', when: '1d', body: "This is exactly how I felt but couldn’t put into words. Ep 19 specifically.", likes: 48, replies: [
    { user: '@kaito', when: '22h', body: 'The mirror lotus scene lives in my head rent free.', likes: 12 },
  ] },
  { user: '@8bitghost', when: '1d', body: 'Hard agree on the direction. Madhouse cooked.', likes: 31, replies: [] },
  { user: '@nadeshiko', when: '20h', body: 'Adding this to my rewatch list immediately.', likes: 9, replies: [] },
];

function TopBar({ nav, title }) {
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 30, background: 'linear-gradient(to bottom, var(--ink-0) 80%, transparent)', padding: '52px 14px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
      <div className="tap" onClick={() => nav.pop()} style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--ink-2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="chevL" size={22} color="var(--txt)" /></div>
      <span style={{ fontSize: 16, fontWeight: 800, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
      <div className="tap" style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--ink-2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="share" size={18} color="var(--txt)" /></div>
    </div>
  );
}

function ActionBtn({ icon, label, active, color, onClick }) {
  return (
    <div className="tap" onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 6, color: active ? (color || 'var(--accent)') : 'var(--txt-dim)' }}>
      <Icon name={icon} size={19} /><span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
    </div>
  );
}

function Comment({ c, depth = 0 }) {
  const u = userBy[c.user] || ME;
  const [liked, setLiked] = useState(false);
  return (
    <div style={{ display: 'flex', gap: 11, marginTop: 16, marginLeft: depth * 34 }}>
      <Avatar user={u} size={depth ? 28 : 34} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700 }}>{u.name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--txt-faint)' }}>{c.when}</span>
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--txt-dim)', margin: '4px 0 0' }}>{c.body}</p>
        <div style={{ display: 'flex', gap: 18, marginTop: 8 }}>
          <div className="tap" onClick={() => setLiked(l => !l)} style={{ display: 'flex', alignItems: 'center', gap: 5, color: liked ? 'var(--accent)' : 'var(--txt-faint)' }}>
            <Icon name={liked ? 'heartFill' : 'heart'} size={15} /><span style={{ fontSize: 12, fontWeight: 600 }}>{c.likes + (liked ? 1 : 0)}</span>
          </div>
          <span className="tap" style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt-faint)' }}>Reply</span>
        </div>
        {c.replies && c.replies.map((r, i) => <Comment key={i} c={r} depth={depth + 1} />)}
      </div>
    </div>
  );
}

function Composer({ list, setList }) {
  const [val, setVal] = useState('');
  const send = () => { if (!val.trim()) return; setList([{ user: '@kaito', when: 'now', body: val.trim(), likes: 0, replies: [] }, ...list]); setVal(''); };
  return (
    <div style={{ position: 'sticky', bottom: 0, zIndex: 20, padding: '10px 16px 28px', background: 'linear-gradient(to top, var(--ink-0) 70%, transparent)', display: 'flex', alignItems: 'center', gap: 10 }}>
      <Avatar user={ME} size={32} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--ink-2)', border: '1px solid var(--line-2)', borderRadius: 22, padding: '0 6px 0 15px', height: 44 }}>
        <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Add a comment…" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--txt)', fontSize: 14.5, fontFamily: 'var(--font-sans)' }} />
        <div className="tap" onClick={send} style={{ width: 34, height: 34, borderRadius: '50%', background: val.trim() ? 'var(--accent)' : 'var(--ink-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' }}><Icon name="send" size={16} color="#fff" /></div>
      </div>
    </div>
  );
}

export function ReviewScreen({ nav, id }) {
  const review = reviewBy[id] || REVIEWS[0];
  const u = userBy[review.user];
  const a = byId[review.anime];
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [list, setList] = useState(COMMENTS);
  return (
    <div className="scroll" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <TopBar nav={nav} title="Review" />
      <div style={{ flex: 1 }}>
        <div className="tap" onClick={() => { nav.pop(); setTimeout(() => nav.push('detail', { id: a.id }), 80); }} style={{ margin: '0 20px', position: 'relative', borderRadius: 16, overflow: 'hidden', height: 96, border: '1px solid var(--line)' }}>
          <Art seed={a.id + '-banner'} animeId={a.id} useBanner hue={a.hue} dim={0.3} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.6), transparent)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.3 }}>{a.title}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{a.studio} · {a.year}</div>
            </div>
            <Icon name="chevR" size={20} color="rgba(255,255,255,0.7)" />
          </div>
        </div>

        <div style={{ padding: '18px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div className="tap" onClick={() => nav.push('profileUser', { handle: u.handle })}><Avatar user={u} size={44} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{u.name}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--txt-faint)' }}>{u.handle} · {review.when} ago</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 14 }}>
            <StarRating value={Math.round(review.score / 2)} readOnly size={20} />
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, color: 'var(--gold)' }}>{review.score}/10</span>
          </div>
          <p style={{ fontSize: 15.5, lineHeight: 1.65, color: 'var(--txt)', margin: '14px 0 0' }}>{review.body}</p>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', margin: '16px 0 0', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
            <ActionBtn icon={liked ? 'heartFill' : 'heart'} label={fmt(review.likes + (liked ? 1 : 0))} active={liked} onClick={() => setLiked(l => !l)} />
            <ActionBtn icon="comment" label={list.length} />
            <ActionBtn icon={saved ? 'bookmarkFill' : 'bookmark'} label="Save" active={saved} color="var(--gold)" onClick={() => setSaved(s => !s)} />
            <ActionBtn icon="share" label="Share" />
          </div>
        </div>

        <div style={{ padding: '4px 20px 0' }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginTop: 14 }}>{list.length} Comments</div>
          {list.map((c, i) => <Comment key={i} c={c} />)}
        </div>
      </div>
      <Composer list={list} setList={setList} />
    </div>
  );
}

export function DiscussionScreen({ nav, id }) {
  const disc = DISCUSSIONS.find(x => x.id === id) || DISCUSSIONS[0];
  const u = userBy[disc.user];
  const a = byId[disc.anime];
  const [liked, setLiked] = useState(false);
  const [list, setList] = useState(COMMENTS);
  return (
    <div className="scroll" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <TopBar nav={nav} title="Discussion" />
      <div style={{ flex: 1 }}>
        <div style={{ padding: '4px 20px 0' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '4px 9px', borderRadius: 7, textTransform: 'uppercase', letterSpacing: 0.5 }}>{a.title}</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1.12, margin: '12px 0 0' }}>{disc.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
            <Avatar user={u} size={36} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{u.name}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--txt-faint)' }}>{disc.when} ago</div>
            </div>
          </div>
          <p style={{ fontSize: 15.5, lineHeight: 1.65, color: 'var(--txt)', margin: '14px 0 0' }}>{disc.body}</p>
          <div style={{ display: 'flex', gap: 10, padding: '16px 0', margin: '16px 0 0', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
            <div className="tap" onClick={() => setLiked(l => !l)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 11, background: liked ? 'var(--accent-soft)' : 'var(--ink-3)', color: liked ? 'var(--accent)' : 'var(--txt-dim)', border: '1px solid var(--line)' }}>
              <Icon name={liked ? 'heartFill' : 'arrowUp'} size={17} /><span style={{ fontSize: 13.5, fontWeight: 700 }}>{fmt(disc.likes + (liked ? 1 : 0))}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 11, background: 'var(--ink-3)', color: 'var(--txt-dim)', border: '1px solid var(--line)' }}>
              <Icon name="comment" size={17} /><span style={{ fontSize: 13.5, fontWeight: 700 }}>{disc.replies}</span>
            </div>
            <div className="tap" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 11, background: 'var(--ink-3)', color: 'var(--txt-dim)', border: '1px solid var(--line)' }}><Icon name="bookmark" size={16} /></div>
          </div>
        </div>
        <div style={{ padding: '4px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>{list.length} Replies</span>
            <span style={{ fontSize: 12.5, color: 'var(--txt-faint)', display: 'flex', alignItems: 'center', gap: 4 }}>Top<Icon name="chevD" size={14} /></span>
          </div>
          {list.map((c, i) => <Comment key={i} c={c} />)}
        </div>
      </div>
      <Composer list={list} setList={setList} />
    </div>
  );
}
