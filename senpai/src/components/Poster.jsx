import Art from './Art.jsx';
import ScoreBadge from './ScoreBadge.jsx';
import Progress from './Progress.jsx';
import Icon from '../icons.jsx';

export default function Poster({ anime, width = 132, onClick, showProgress = false, showScore = true, rank, label }) {
  return (
    <div className="tap" onClick={onClick} style={{ width, flexShrink: 0 }}>
      <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 22px rgba(0,0,0,0.4)', border: '1px solid var(--line)' }}>
        <Art seed={anime.id} hue={anime.hue} title={anime.title} showTitle label={label} ratio="2 / 3" dim={0.12} />
        {showScore && (
          <div style={{ position: 'absolute', top: 7, right: 7, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', borderRadius: 7, padding: '3px 6px' }}>
            <ScoreBadge score={anime.score} />
          </div>
        )}
        {typeof rank === 'number' && (
          <div style={{ position: 'absolute', top: 7, left: 7, width: 22, height: 22, borderRadius: 7, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, color: '#fff' }}>{rank}</div>
        )}
        {showProgress && anime.progress != null && (
          <div style={{ position: 'absolute', left: 8, right: 8, bottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'rgba(255,255,255,0.85)', marginBottom: 4 }}>
              <span>EP {anime.progress}</span><span>/ {anime.episodes}</span>
            </div>
            <Progress value={anime.progress} total={anime.episodes} />
          </div>
        )}
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2, color: 'var(--txt)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{anime.title}</div>
        <div style={{ fontSize: 11, color: 'var(--txt-faint)', marginTop: 2 }}>{anime.studio} · {anime.year}</div>
      </div>
    </div>
  );
}
