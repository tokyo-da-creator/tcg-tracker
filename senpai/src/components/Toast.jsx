import { useState, useCallback, createContext, useContext } from 'react';
import Icon from '../icons.jsx';

export const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

const TYPE_ICON = { success: 'check', error: 'x', save: 'bookmarkFill', heart: 'heartFill', star: 'starFill', info: 'sparkle' };
const TYPE_COLOR = { success: 'var(--accent)', error: '#ff453a', save: 'var(--gold)', heart: 'var(--accent)', star: 'var(--gold)', info: 'oklch(0.66 0.17 268)' };

function ToastItem({ msg, type }) {
  const icon = TYPE_ICON[type] || 'check';
  const color = TYPE_COLOR[type] || 'var(--accent)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px 11px 12px', borderRadius: 14, background: 'rgba(28,28,32,0.96)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.45)', backdropFilter: 'blur(18px)', animation: 'toastIn .28s cubic-bezier(.2,.8,.25,1) both', maxWidth: 320 }}>
      <div style={{ width: 28, height: 28, borderRadius: 9, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name={icon} size={15} color={color} />
      </div>
      <span style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.3, color: 'var(--txt)' }}>{msg}</span>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const showToast = useCallback((msg, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t.slice(-2), { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2600);
  }, []);
  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div style={{ position: 'fixed', bottom: 110, left: 0, right: 0, zIndex: 998, display: 'flex', flexDirection: 'column-reverse', alignItems: 'center', gap: 8, pointerEvents: 'none', padding: '0 24px' }}>
        {toasts.map(t => <ToastItem key={t.id} msg={t.msg} type={t.type} />)}
      </div>
    </ToastContext.Provider>
  );
}
