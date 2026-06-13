import Icon from '../icons.jsx';

export default function SectionHeader({ title, sub, action = 'See all', onAction, accent, icon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 20px', marginBottom: 13 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {icon && <Icon name={icon} size={16} color={accent || 'var(--accent)'} />}
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: -0.4, color: 'var(--txt)' }}>{title}</h3>
        </div>
        {sub && <div style={{ fontSize: 12.5, color: 'var(--txt-faint)', marginTop: 2 }}>{sub}</div>}
      </div>
      {onAction && (
        <div className="tap" onClick={onAction} style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt-dim)', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          {action}<Icon name="chevR" size={14} />
        </div>
      )}
    </div>
  );
}
