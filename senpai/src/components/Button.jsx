import Icon from '../icons.jsx';

export default function Button({ children, onClick, variant = 'primary', icon, full = false, size = 'md' }) {
  const lg = size === 'lg';
  const styles = {
    primary: { background: 'var(--accent)', color: '#fff', border: '1px solid transparent', boxShadow: '0 6px 18px rgba(255,59,48,0.32)' },
    light: { background: 'var(--txt)', color: '#000', border: '1px solid transparent' },
    ghost: { background: 'var(--ink-3)', color: 'var(--txt)', border: '1px solid var(--line-2)' },
    outline: { background: 'transparent', color: 'var(--txt)', border: '1px solid var(--line-2)' },
  }[variant] || {};
  return (
    <button className="tap" onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
      width: full ? '100%' : undefined, padding: lg ? '15px 22px' : '11px 18px',
      borderRadius: 14, fontFamily: 'var(--font-sans)', fontSize: lg ? 16 : 14.5, fontWeight: 700,
      cursor: 'pointer', letterSpacing: -0.2, whiteSpace: 'nowrap', ...styles,
    }}>
      {icon && <Icon name={icon} size={lg ? 20 : 18} />}
      {children}
    </button>
  );
}
