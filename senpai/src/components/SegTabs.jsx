export default function SegTabs({ tabs, active, onChange, scroll = false }) {
  return (
    <div className={scroll ? 'hscroll' : ''} style={{ display: 'flex', gap: 22, padding: scroll ? '0 20px' : 0, borderBottom: '1px solid var(--line)' }}>
      {tabs.map(t => {
        const k = typeof t === 'string' ? t : t.key;
        const label = typeof t === 'string' ? t : t.label;
        const on = k === active;
        return (
          <div key={k} className="tap" onClick={() => onChange(k)} style={{ position: 'relative', padding: '12px 0', flexShrink: 0 }}>
            <span style={{ fontSize: 14.5, fontWeight: on ? 700 : 600, color: on ? 'var(--txt)' : 'var(--txt-faint)', transition: 'color .15s' }}>{label}</span>
            {on && <div style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 2.5, borderRadius: 2, background: 'var(--accent)' }} />}
          </div>
        );
      })}
    </div>
  );
}
