import { useState } from 'react';
import { NOTIFS, byId, userBy, accentFor } from '../data.js';
import Art from '../components/Art.jsx';
import Avatar from '../components/Avatar.jsx';
import Icon from '../icons.jsx';

const TYPE = {
  episode: { icon: 'play', hue: 168 }, follow: { icon: 'person', hue: 268 },
  like: { icon: 'heartFill', hue: 4 }, reply: { icon: 'comment', hue: 210 },
  rec: { icon: 'sparkle', hue: 312 }, premiere: { icon: 'calendar', hue: 48 },
};

function SecLabel({ children }) {
  return <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, color: 'var(--txt-faint)', textTransform: 'uppercase', padding: '16px 20px 6px' }}>{children}</div>;
}

function NotifRow({ n, nav, onRead }) {
  const meta = TYPE[n.type] || TYPE.like;
  const u = n.user ? userBy[n.user] : null;
  const a = n.anime ? byId[n.anime] : null;
  const go = () => { onRead(n.id); if (a) nav.push('detail', { id: a.id }); else if (n.type === 'follow' && u) nav.push('profileUser', { handle: u.handle }); };
  return (
    <div className="tap" onClick={go} style={{ display: 'flex', gap: 13, padding: '13px 20px', background: n.unread ? 'var(--accent-soft)' : 'transparent', position: 'relative', alignItems: 'center' }}>
      {n.unread && <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {a ? (
          <div style={{ width: 44, height: 60, borderRadius: 9, overflow: 'hidden' }}><Art seed={a.id} hue={a.hue} title={a.title} showTitle ratio="2 / 3" /></div>
        ) : <Avatar user={u} size={48} />}
        <div style={{ position: 'absolute', bottom: -3, right: -3, width: 22, height: 22, borderRadius: '50%', background: accentFor(meta.hue), border: '2.5px solid var(--ink-0)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <Icon name={meta.icon} size={11} color="#fff" />
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, lineHeight: 1.35 }}>
          {u && <span style={{ fontWeight: 700 }}>{u.name} </span>}
          <span style={{ color: u ? 'var(--txt-dim)' : 'var(--txt)', fontWeight: u ? 400 : 600 }}>{n.body}</span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--txt-faint)', marginTop: 4 }}>{n.when} ago</div>
      </div>
      {n.type === 'follow' && <div className="tap" onClick={e => { e.stopPropagation(); onRead(n.id); }} style={{ padding: '7px 13px', borderRadius: 10, background: 'var(--ink-3)', border: '1px solid var(--line-2)', fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>Follow</div>}
      {n.type === 'episode' && <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="play" size={15} color="#fff" /></div>}
    </div>
  );
}

export default function NotificationsScreen({ nav }) {
  const [filter, setFilter] = useState('all');
  const [read, setRead] = useState({});
  const markRead = id => setRead(r => ({ ...r, [id]: true }));
  const markAll = () => { const all = {}; NOTIFS.forEach(n => all[n.id] = true); setRead(all); };

  let list = NOTIFS.map(n => ({ ...n, unread: n.unread && !read[n.id] }));
  if (filter === 'episodes') list = list.filter(n => ['episode', 'premiere', 'rec'].includes(n.type));
  if (filter === 'social') list = list.filter(n => ['follow', 'like', 'reply'].includes(n.type));
  const today = list.filter(n => n.when.includes('m') || n.when.includes('h'));
  const earlier = list.filter(n => n.when.includes('d'));

  return (
    <div className="scroll" style={{ height: '100%', paddingBottom: 30 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 30, background: 'linear-gradient(to bottom, var(--ink-0) 75%, transparent)', padding: '52px 16px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="tap" onClick={() => nav.pop()} style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--ink-2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="chevL" size={22} color="var(--txt)" /></div>
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>Notifications</h1>
          <div className="tap" onClick={markAll} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent)' }}>Mark read</div>
        </div>
        <div className="hscroll" style={{ display: 'flex', gap: 9, marginTop: 14 }}>
          {[['all', 'All'], ['episodes', 'Episodes'], ['social', 'Social']].map(([k, l]) => (
            <div key={k} className="tap" onClick={() => setFilter(k)} style={{ padding: '8px 16px', borderRadius: 11, fontSize: 13.5, fontWeight: 700, background: filter === k ? 'var(--txt)' : 'var(--ink-3)', color: filter === k ? '#000' : 'var(--txt-dim)', border: '1px solid ' + (filter === k ? 'transparent' : 'var(--line)') }}>{l}</div>
          ))}
        </div>
      </div>
      <div style={{ animation: 'fadeIn .2s both' }} key={filter}>
        {today.length > 0 && <SecLabel>Today</SecLabel>}
        {today.map(n => <NotifRow key={n.id} n={n} nav={nav} onRead={markRead} />)}
        {earlier.length > 0 && <SecLabel>Earlier</SecLabel>}
        {earlier.map(n => <NotifRow key={n.id} n={n} nav={nav} onRead={markRead} />)}
        {list.length === 0 && <div style={{ textAlign: 'center', padding: '70px 20px', color: 'var(--txt-faint)' }}>Nothing here yet</div>}
      </div>
    </div>
  );
}
