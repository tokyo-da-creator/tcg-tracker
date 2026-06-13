import { ANIME, ACTIVITY, NOTIFS, REVIEWS, byId, userBy, ME } from '../data.js';
import Art from '../components/Art.jsx';
import Avatar from '../components/Avatar.jsx';
import Button from '../components/Button.jsx';
import Poster from '../components/Poster.jsx';
import Progress from '../components/Progress.jsx';
import ScoreBadge from '../components/ScoreBadge.jsx';
import SectionHeader from '../components/SectionHeader.jsx';
import Icon from '../icons.jsx';
import { fmt } from '../data.js';

const watching = ANIME.filter(a => a.status === 'watching');
const trending = [...ANIME].sort((a, b) => b.members - a.members);
const seasonal = ANIME.filter(a => a.year >= 2023);
const recs = ANIME.filter(a => ['mob', 'vio', 'osi', 'apd', 'jjs'].includes(a.id));

function HomeTopBar({ nav, unread }) {
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '50px 18px 10px', background: 'linear-gradient(to bottom, rgba(8,8,10,0.92) 70%, rgba(8,8,10,0))', backdropFilter: 'blur(12px)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 23, fontWeight: 900, letterSpacing: -0.6 }}>Senpai</span>
        <span style={{ width: 7, height: 7, borderRadius: 2, background: 'var(--accent)', display: 'inline-block', transform: 'translateY(-2px)' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div className="tap" onClick={() => nav.push('notifications')} style={{ position: 'relative', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ink-2)', border: '1px solid var(--line)', color: 'var(--txt)' }}>
          <Icon name="bell" size={20} />
          {unread > 0 && <span style={{ position: 'absolute', top: 8, right: 9, width: 9, height: 9, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--ink-0)' }} />}
        </div>
        <div className="tap" onClick={() => nav.setTab('profile')}><Avatar user={ME} size={40} /></div>
      </div>
    </div>
  );
}

function Hero({ anime, nav }) {
  const resume = (
    <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
      <Button variant="light" icon="play" onClick={() => nav.push('detail', { id: anime.id })}>Resume EP {anime.progress + 1}</Button>
      <div className="tap" onClick={() => nav.push('detail', { id: anime.id })} style={{ width: 46, height: 46, borderRadius: 13, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
        <Icon name="plus" size={22} color="#fff" />
      </div>
    </div>
  );

  return (
    <div style={{ padding: '2px 18px 8px' }}>
      <div className="tap" onClick={() => nav.push('detail', { id: anime.id })} style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}>
        <div style={{ position: 'relative', aspectRatio: '5 / 4' }}>
          <Art seed={anime.id + '-banner'} animeId={anime.id} useBanner hue={anime.hue} label="Key visual" dim={0.32} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,8,10,0.96) 2%, rgba(8,8,10,0.2) 48%, transparent 80%)' }} />
          <div style={{ position: 'absolute', top: 14, left: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, color: '#fff', background: 'var(--accent)', padding: '4px 8px', borderRadius: 6, fontWeight: 600 }}>CONTINUE</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.4)', padding: '4px 8px', borderRadius: 6, backdropFilter: 'blur(6px)' }}>EP {anime.progress} / {anime.episodes}</span>
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0 18px 16px' }}>
            <div style={{ display: 'flex', gap: 7, marginBottom: 9 }}>
              {anime.genres.slice(0, 3).map((g, idx, arr) => <span key={g} style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.78)' }}>{g}{idx < arr.length - 1 ? ' ·' : ''}</span>)}
            </div>
            <div style={{ fontSize: 27, fontWeight: 900, letterSpacing: -0.8, lineHeight: 0.98, maxWidth: 280, textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>{anime.title}</div>
            <div style={{ marginTop: 12, marginBottom: 14 }}><Progress value={anime.progress} total={anime.episodes} height={5} /></div>
            {resume}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityRow({ nav }) {
  return (
    <div className="hscroll" style={{ display: 'flex', gap: 11, padding: '0 20px 4px' }}>
      {ACTIVITY.map((act, i) => {
        const u = userBy[act.user]; const a = byId[act.anime];
        return (
          <div key={i} className="tap" onClick={() => nav.push('detail', { id: a.id })} style={{ width: 220, flexShrink: 0, background: 'var(--ink-1)', border: '1px solid var(--line)', borderRadius: 16, padding: 12, display: 'flex', gap: 11 }}>
            <div style={{ width: 52, height: 70, borderRadius: 9, overflow: 'hidden', flexShrink: 0 }}>
              <Art seed={a.id} hue={a.hue} title={a.title} showTitle ratio="2 / 3" />
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Avatar user={u} size={20} />
                <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name.split(' ')[0]}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--txt-faint)', marginLeft: 'auto' }}>{act.when}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--txt-dim)', marginTop: 5, lineHeight: 1.25 }}>
                {act.verb} {act.score && <span style={{ color: 'var(--gold)', fontWeight: 700 }}>· {act.score}/10</span>}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 'auto', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReviewCard({ review, nav }) {
  const u = userBy[review.user]; const a = byId[review.anime];
  return (
    <div className="tap" onClick={() => nav.push('review', { id: review.id })} style={{ width: 290, flexShrink: 0, background: 'var(--ink-1)', border: '1px solid var(--line)', borderRadius: 18, padding: 15, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <Avatar user={u} size={34} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{u.name}</div>
          <div style={{ fontSize: 11, color: 'var(--txt-faint)' }}>reviewed {a.title}</div>
        </div>
        <div style={{ background: 'var(--accent-soft)', borderRadius: 8, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 3 }}>
          <Icon name="starFill" size={12} color="var(--gold)" />
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, color: 'var(--txt)' }}>{review.score}</span>
        </div>
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--txt-dim)', margin: '11px 0 0', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{review.body}</p>
      <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: 'var(--txt-faint)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="heart" size={15} /> {fmt(review.likes)}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="comment" size={15} /> {review.comments}</span>
      </div>
    </div>
  );
}

export default function HomeScreen({ nav }) {
  const unread = NOTIFS.filter(n => n.unread).length;
  return (
    <div className="scroll" style={{ height: '100%', paddingBottom: 96 }}>
      <HomeTopBar nav={nav} unread={unread} />

      <div style={{ animation: 'fadeUp .4s both' }}>
        <Hero anime={watching[0]} nav={nav} />
      </div>

      <div style={{ marginTop: 18 }}>
        <SectionHeader title="Continue Watching" onAction={() => nav.setTab('lists')} icon="play" />
        <div className="hscroll" style={{ display: 'flex', gap: 13, padding: '0 20px 4px' }}>
          {watching.map(a => <Poster key={a.id} anime={a} width={132} showProgress showScore={false} onClick={() => nav.push('detail', { id: a.id })} />)}
        </div>
      </div>

      <div style={{ marginTop: 26 }}>
        <SectionHeader title="Trending This Week" sub="What the community is watching" onAction={() => nav.setTab('search')} icon="flame" />
        <div className="hscroll" style={{ display: 'flex', gap: 13, padding: '0 20px 4px' }}>
          {trending.slice(0, 8).map((a, i) => <Poster key={a.id} anime={a} width={132} rank={i + 1} onClick={() => nav.push('detail', { id: a.id })} />)}
        </div>
      </div>

      <div style={{ marginTop: 26 }}>
        <SectionHeader title="Friend Activity" sub="From people you follow" onAction={() => nav.setTab('profile')} icon="fan" />
        <ActivityRow nav={nav} />
      </div>

      <div style={{ marginTop: 26 }}>
        <SectionHeader title="This Season" sub="Winter 2026 simulcasts" onAction={() => nav.setTab('search')} icon="calendar" />
        <div className="hscroll" style={{ display: 'flex', gap: 13, padding: '0 20px 4px' }}>
          {seasonal.map(a => <Poster key={a.id} anime={a} width={132} onClick={() => nav.push('detail', { id: a.id })} />)}
        </div>
      </div>

      <div style={{ marginTop: 26 }}>
        <SectionHeader title="Reviews From People You Follow" onAction={() => nav.setTab('search')} icon="quote" />
        <div className="hscroll" style={{ display: 'flex', gap: 13, padding: '0 20px 4px' }}>
          {REVIEWS.map(r => <ReviewCard key={r.id} review={r} nav={nav} />)}
        </div>
      </div>

      <div style={{ marginTop: 26 }}>
        <SectionHeader title="Because You Loved Edgerunners" sub="Personalized for you" onAction={() => nav.setTab('search')} icon="sparkle" />
        <div className="hscroll" style={{ display: 'flex', gap: 13, padding: '0 20px 4px' }}>
          {recs.map(a => <Poster key={a.id} anime={a} width={132} onClick={() => nav.push('detail', { id: a.id })} />)}
        </div>
      </div>
    </div>
  );
}
