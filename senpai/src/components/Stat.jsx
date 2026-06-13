export default function Stat({ value, label, accent }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: -0.5, color: accent || 'var(--txt)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: 0.6, color: 'var(--txt-faint)', textTransform: 'uppercase', marginTop: 3 }}>{label}</div>
    </div>
  );
}
