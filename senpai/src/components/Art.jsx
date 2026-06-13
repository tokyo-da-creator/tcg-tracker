import { hash, artStyle } from '../data.js';

export default function Art({ seed, hue, label, title, ratio, radius = 0, dim = 0, style = {}, children, showTitle = false }) {
  const H = hue ?? (hash(seed || title || 'x') % 360);
  const base = artStyle(H);
  return (
    <div style={{
      position: 'relative', width: '100%', height: ratio ? undefined : '100%',
      aspectRatio: ratio, borderRadius: radius, overflow: 'hidden',
      ...base, ...style,
    }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.06,
        backgroundImage: 'repeating-linear-gradient(125deg, #fff 0 1px, transparent 1px 7px)' }} />
      <div style={{ position: 'absolute', inset: 0, opacity: 0.5, mixBlendMode: 'overlay',
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E\")" }} />
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, rgba(0,0,0,${0.55 + dim}) 0%, rgba(0,0,0,0.05) 55%, rgba(0,0,0,${dim * 0.6}) 100%)` }} />
      {showTitle && title && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
          <span style={{ fontWeight: 800, fontSize: 20, lineHeight: 1.05, textAlign: 'center', color: 'rgba(255,255,255,0.92)', textShadow: '0 2px 14px rgba(0,0,0,0.5)', letterSpacing: -0.4 }}>{title}</span>
        </div>
      )}
      {label && (
        <div style={{ position: 'absolute', top: 8, left: 8, fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: 0.8, color: 'rgba(255,255,255,0.62)', background: 'rgba(0,0,0,0.28)', padding: '2px 5px', borderRadius: 4, backdropFilter: 'blur(4px)', textTransform: 'uppercase' }}>{label}</div>
      )}
      {children}
    </div>
  );
}
