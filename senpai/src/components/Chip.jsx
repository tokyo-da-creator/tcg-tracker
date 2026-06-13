import Icon from '../icons.jsx';

export default function Chip({ children, active = false, onClick, accent = false, icon, size = 'md' }) {
  const sm = size === 'sm';
  return (
    <div className="tap" onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
      padding: sm ? '5px 10px' : '8px 14px', borderRadius: 999,
      fontSize: sm ? 12 : 13.5, fontWeight: 600, whiteSpace: 'nowrap',
      background: active ? (accent ? 'var(--accent)' : 'var(--txt)') : 'var(--ink-3)',
      color: active ? (accent ? '#fff' : '#000') : 'var(--txt-dim)',
      border: active ? '1px solid transparent' : '1px solid var(--line)',
      transition: 'background .15s, color .15s',
    }}>
      {icon && <Icon name={icon} size={sm ? 13 : 15} />}
      {children}
    </div>
  );
}
