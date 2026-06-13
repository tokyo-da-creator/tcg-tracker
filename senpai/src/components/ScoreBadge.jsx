import Icon from '../icons.jsx';

export default function ScoreBadge({ score, size = 'sm', star = true }) {
  const small = size === 'sm';
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: small ? 3 : 4,
      fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: small ? 11 : 13,
      color: 'var(--txt)', lineHeight: 1 }}>
      {star && <Icon name="starFill" size={small ? 11 : 14} color="var(--gold)" />}
      {score?.toFixed ? score.toFixed(2) : score}
    </div>
  );
}
