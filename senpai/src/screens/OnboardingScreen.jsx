import { useState } from 'react';
import { ANIME, CHARACTERS, USERS, GENRES } from '../data.js';
import Art from '../components/Art.jsx';
import Avatar from '../components/Avatar.jsx';
import Icon from '../icons.jsx';

const GENRE_HUE = { Action: 18, Adventure: 138, Comedy: 48, Drama: 330, Fantasy: 268, Horror: 6, Mystery: 230, Romance: 348, 'Sci-Fi': 210, 'Slice of Life': 168, Sports: 88, Supernatural: 286, Thriller: 250, Music: 312 };

const STEPS = [
  { title: 'What genres do you love?', sub: 'Pick at least 3 to personalize your feed', min: 3 },
  { title: 'Anime you have seen?', sub: 'Select titles you have already watched', min: 1 },
  { title: 'Favorite characters?', sub: 'Choose any characters you love', min: 0 },
  { title: 'Follow some fans', sub: 'See what people with similar taste are watching', min: 0 },
];

export default function OnboardingScreen({ onComplete }) {
  const [step, setStep] = useState(0);
  const [genres, setGenres] = useState([]);
  const [animes, setAnimes] = useState([]);
  const [chars, setChars] = useState([]);
  const [follows, setFollows] = useState([]);

  const cur = STEPS[step];
  const toggle = (arr, setArr, id) => setArr(a => a.includes(id) ? a.filter(x => x !== id) : [...a, id]);

  const canContinue = step === 0 ? genres.length >= 3 : step === 1 ? animes.length >= 1 : true;

  const advance = () => {
    if (!canContinue) return;
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else onComplete();
  };

  const onboardAnime = ANIME.slice(0, 12);
  const onboardChars = CHARACTERS.slice(0, 8);
  const onboardUsers = USERS.slice(0, 5);

  const btnLabel = step === STEPS.length - 1
    ? (follows.length ? "Let's go →" : 'Skip for now →')
    : step === 0
      ? (genres.length >= 3 ? `Continue with ${genres.length} genres →` : 'Pick at least 3')
      : 'Continue →';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--ink-0)', overflow: 'hidden' }}>
      {/* Progress bar + heading */}
      <div style={{ padding: '58px 24px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 26 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? 'var(--accent)' : 'var(--ink-3)', transition: 'background .3s' }} />
          ))}
        </div>
        <h1 style={{ margin: 0, fontSize: 27, fontWeight: 900, letterSpacing: -0.8, lineHeight: 1.1 }}>{cur.title}</h1>
        <p style={{ margin: '8px 0 0', fontSize: 13.5, color: 'var(--txt-faint)', lineHeight: 1.4 }}>{cur.sub}</p>
      </div>

      {/* Scrollable content */}
      <div className="scroll" style={{ flex: 1, marginTop: 18, animation: 'fadeIn .2s both' }} key={step}>
        {step === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11, padding: '0 20px 20px' }}>
            {GENRES.map(g => {
              const on = genres.includes(g);
              return (
                <div key={g} className="tap" onClick={() => toggle(genres, setGenres, g)} style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', aspectRatio: '16 / 10', border: '2.5px solid ' + (on ? 'var(--accent)' : 'transparent'), boxSizing: 'border-box' }}>
                  <Art seed={'genre-' + g} hue={GENRE_HUE[g] || 220} dim={0.2} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', padding: '10px 12px', background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent 70%)' }}>
                    <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.3, flex: 1 }}>{g}</span>
                    {on && <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="check" size={12} color="#fff" /></div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: '0 20px 20px' }}>
            {onboardAnime.map(a => {
              const on = animes.includes(a.id);
              return (
                <div key={a.id} className="tap" onClick={() => toggle(animes, setAnimes, a.id)} style={{ position: 'relative' }}>
                  <div style={{ borderRadius: 12, overflow: 'hidden', aspectRatio: '2 / 3', border: '2.5px solid ' + (on ? 'var(--accent)' : 'transparent'), boxSizing: 'border-box' }}>
                    <Art seed={a.id} hue={a.hue} title={a.title} showTitle ratio="2 / 3" />
                  </div>
                  {on && <div style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={12} color="#fff" /></div>}
                  <div style={{ fontSize: 10.5, fontWeight: 600, marginTop: 5, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: on ? 'var(--txt)' : 'var(--txt-dim)' }}>{a.title}</div>
                </div>
              );
            })}
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, padding: '4px 20px 20px', justifyContent: 'space-around' }}>
            {onboardChars.map(c => {
              const on = chars.includes(c.id);
              return (
                <div key={c.id} className="tap" onClick={() => toggle(chars, setChars, c.id)} style={{ width: 88, textAlign: 'center' }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ borderRadius: '50%', overflow: 'hidden', aspectRatio: '1', border: '3px solid ' + (on ? 'var(--accent)' : 'var(--line)'), boxSizing: 'border-box' }}>
                      <Art seed={c.id} hue={c.hue} title={c.name.split(' ')[0]} showTitle />
                    </div>
                    {on && <div style={{ position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--ink-0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={12} color="#fff" /></div>}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, marginTop: 7, lineHeight: 1.2 }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--txt-faint)', marginTop: 1 }}>{c.series}</div>
                </div>
              );
            })}
          </div>
        )}

        {step === 3 && (
          <div style={{ padding: '0 20px 20px' }}>
            <div className="tap" onClick={() => setFollows(onboardUsers.map(u => u.handle))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '13px', borderRadius: 14, border: '1px solid var(--line-2)', marginBottom: 16, color: 'var(--accent)', fontWeight: 700, fontSize: 14 }}>
              Follow all suggested
            </div>
            {onboardUsers.map(u => {
              const on = follows.includes(u.handle);
              return (
                <div key={u.handle} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
                  <Avatar user={u} size={48} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700 }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--txt-faint)', marginTop: 2 }}>{u.handle} · {u.watched} watched</div>
                  </div>
                  <div className="tap" onClick={() => toggle(follows, setFollows, u.handle)} style={{ padding: '8px 16px', borderRadius: 11, background: on ? 'var(--ink-3)' : 'var(--accent)', color: on ? 'var(--txt)' : '#fff', border: '1px solid ' + (on ? 'var(--line-2)' : 'transparent'), fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                    {on ? 'Following' : 'Follow'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky Continue button */}
      <div style={{ padding: '14px 20px 40px', background: 'linear-gradient(to top, var(--ink-0) 65%, transparent)', flexShrink: 0 }}>
        <div className="tap" onClick={advance} style={{ textAlign: 'center', padding: '17px', borderRadius: 16, background: canContinue ? 'var(--accent)' : 'var(--ink-3)', color: canContinue ? '#fff' : 'var(--txt-faint)', fontWeight: 800, fontSize: 16, letterSpacing: -0.3, transition: 'background .2s, color .2s, box-shadow .2s', boxShadow: canContinue ? '0 8px 22px rgba(255,59,48,0.36)' : 'none' }}>
          {btnLabel}
        </div>
        {step > 0 && (
          <div className="tap" onClick={() => setStep(s => s - 1)} style={{ textAlign: 'center', padding: '10px', marginTop: 4, color: 'var(--txt-faint)', fontSize: 13.5, fontWeight: 600 }}>
            ← Back
          </div>
        )}
      </div>
    </div>
  );
}
