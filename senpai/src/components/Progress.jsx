export default function Progress({ value, total, height = 4, accent = 'var(--accent)' }) {
  const pct = total ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div style={{ height, borderRadius: 999, background: 'rgba(255,255,255,0.14)', overflow: 'hidden', width: '100%' }}>
      <div style={{ width: pct + '%', height: '100%', borderRadius: 999, background: accent, transition: 'width .4s cubic-bezier(.3,.8,.3,1)' }} />
    </div>
  );
}
