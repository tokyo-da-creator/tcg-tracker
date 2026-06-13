import { useState, useEffect } from 'react';

export default function Sheet({ open, onClose, children, title }) {
  const [mounted, setMounted] = useState(open);
  useEffect(() => { if (open) setMounted(true); }, [open]);
  if (!mounted) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} onAnimationEnd={() => { if (!open) setMounted(false); }}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)',
          animation: open ? 'fadeIn .25s ease both' : 'fadeIn .2s reverse both' }} />
      <div style={{ position: 'relative', background: 'var(--ink-2)', borderTopLeftRadius: 28, borderTopRightRadius: 28,
        border: '1px solid var(--line)', borderBottom: 'none', paddingBottom: 34,
        animation: open ? 'sheetUp .32s cubic-bezier(.2,.9,.3,1) both' : 'sheetUp .25s reverse both',
        maxHeight: '82%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
          <div style={{ width: 38, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.22)' }} />
        </div>
        {title && <div style={{ padding: '14px 22px 4px', fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>{title}</div>}
        <div className="scroll" style={{ overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}
