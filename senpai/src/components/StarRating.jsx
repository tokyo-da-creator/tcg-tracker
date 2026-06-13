import { useState } from 'react';
import Icon from '../icons.jsx';

export default function StarRating({ value = 0, onChange, size = 30, readOnly = false }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div style={{ display: 'flex', gap: 4 }} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className={readOnly ? '' : 'tap'}
          onMouseEnter={() => !readOnly && setHover(i)}
          onClick={() => !readOnly && onChange && onChange(i === value ? 0 : i)}
          style={{ color: i <= shown ? 'var(--gold)' : 'rgba(255,255,255,0.18)', transition: 'color .12s, transform .12s', transform: i <= shown && !readOnly ? 'scale(1.05)' : 'none' }}>
          <Icon name="starFill" size={size} />
        </div>
      ))}
    </div>
  );
}
