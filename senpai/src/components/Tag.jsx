export default function Tag({ children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 11px', borderRadius: 8,
      background: 'var(--ink-2)', border: '1px solid var(--line)', fontSize: 12.5, fontWeight: 500,
      color: 'var(--txt-dim)' }}>{children}</span>
  );
}
