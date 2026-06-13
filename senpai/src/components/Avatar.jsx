import { accentFor } from '../data.js';

export default function Avatar({ user, size = 40, ring = false }) {
  const hue = user?.hue ?? 220;
  const initials = (user?.name || user?.handle || '?').replace('@', '').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'rgba(255,255,255,0.95)', fontWeight: 700, fontSize: size * 0.36,
      background: `radial-gradient(120% 120% at 30% 20%, oklch(0.62 0.17 ${hue}) 0%, oklch(0.34 0.13 ${(hue + 40) % 360}) 100%)`,
      boxShadow: ring ? `0 0 0 2px var(--ink-0), 0 0 0 3.5px ${accentFor(hue)}` : 'inset 0 1px 1px rgba(255,255,255,0.18)',
      letterSpacing: -0.5,
    }}>{initials}</div>
  );
}
