import { useState, useMemo, useRef } from 'react';
import { ANIME, LIST_STATUS, ME } from './data.js';
import Icon from './icons.jsx';
import Avatar from './components/Avatar.jsx';
import Poster from './components/Poster.jsx';
import Sheet from './components/Sheet.jsx';
import { ToastProvider } from './components/Toast.jsx';

import HomeScreen from './screens/HomeScreen.jsx';
import SearchScreen from './screens/SearchScreen.jsx';
import ListsScreen from './screens/ListsScreen.jsx';
import ProfileScreen from './screens/ProfileScreen.jsx';
import NotificationsScreen from './screens/NotificationsScreen.jsx';
import DetailScreen from './screens/DetailScreen.jsx';
import { ReviewScreen, DiscussionScreen } from './screens/SocialScreens.jsx';
import OnboardingScreen from './screens/OnboardingScreen.jsx';

function TabBar({ active, onTab, onLog }) {
  const items = [
    { key: 'home', icon: 'home', fill: 'homeFill', label: 'Home' },
    { key: 'search', icon: 'search', fill: 'search', label: 'Discover' },
    { key: '__log', icon: 'plus', label: '' },
    { key: 'lists', icon: 'grid', fill: 'gridFill', label: 'Lists' },
    { key: 'profile', icon: 'person', fill: 'personFill', label: 'You' },
  ];
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 90, paddingBottom: 26, paddingTop: 9, background: 'linear-gradient(to top, rgba(8,8,10,0.97) 55%, rgba(8,8,10,0))', backdropFilter: 'blur(16px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 14px' }}>
        {items.map(it => {
          if (it.key === '__log') {
            return (
              <div key="log" className="tap" onClick={onLog} style={{ width: 52, height: 52, borderRadius: 18, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 22px rgba(255,59,48,0.42), inset 0 1px 1px rgba(255,255,255,0.3)', marginTop: -4 }}>
                <Icon name="plus" size={28} color="#fff" stroke={2.4} />
              </div>
            );
          }
          const on = active === it.key;
          return (
            <div key={it.key} className="tap" onClick={() => onTab(it.key)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 58, color: on ? 'var(--txt)' : 'var(--txt-faint)', transition: 'color .15s' }}>
              <Icon name={on ? it.fill : it.icon} size={25} stroke={1.8} />
              <span style={{ fontSize: 10, fontWeight: on ? 700 : 500 }}>{it.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuickLog({ open, onClose, nav }) {
  const [picked, setPicked] = useState(null);
  const sample = ANIME.filter(a => ['ddd', 'sol', 'osi', 'apd', 'jjs', 'tye'].includes(a.id));
  return (
    <Sheet open={open} onClose={onClose} title="Log an anime">
      <div style={{ padding: '6px 22px 4px', fontSize: 13.5, color: 'var(--txt-dim)' }}>Quickly add a title to a list, rate it, or jump in.</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '14px 22px 6px' }}>
        {LIST_STATUS.map(ls => (
          <div key={ls.key} className="tap" onClick={() => setPicked(ls.key)} style={{ padding: '9px 14px', borderRadius: 12, fontSize: 13.5, fontWeight: 600, border: '1px solid var(--line-2)', background: picked === ls.key ? 'var(--accent)' : 'var(--ink-3)', color: picked === ls.key ? '#fff' : 'var(--txt-dim)' }}>
            {ls.label}
          </div>
        ))}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, color: 'var(--txt-faint)', textTransform: 'uppercase', padding: '16px 22px 10px' }}>Recently searched</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, padding: '0 22px 20px' }}>
        {sample.map(a => <Poster key={a.id} anime={a} width="100%" showScore={false} onClick={() => { onClose(); nav.push('detail', { id: a.id }); }} />)}
      </div>
    </Sheet>
  );
}

export default function App() {
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [tab, setTab] = useState('home');
  const [stack, setStack] = useState([]);
  const [logOpen, setLogOpen] = useState(false);
  const keyRef = useRef(1);

  const nav = useMemo(() => ({
    push: (screen, props = {}) => setStack(s => [...s, { screen, props, key: keyRef.current++, closing: false }]),
    pop: () => setStack(s => {
      if (!s.length) return s;
      const c = [...s]; c[c.length - 1] = { ...c[c.length - 1], closing: true }; return c;
    }),
    _remove: (key) => setStack(s => s.filter(o => o.key !== key)),
    setTab: (tb) => { setStack([]); setTab(tb); },
  }), []);

  const screens = { home: HomeScreen, search: SearchScreen, lists: ListsScreen, profile: ProfileScreen };
  const TabScreen = screens[tab] || HomeScreen;

  function renderPushed(o) {
    const map = {
      detail: DetailScreen,
      notifications: NotificationsScreen,
      review: ReviewScreen,
      discussion: DiscussionScreen,
      profileUser: ProfileScreen,
    };
    const C = map[o.screen] || (() => <div style={{ padding: 80, textAlign: 'center', color: 'var(--txt-faint)' }}>{o.screen}</div>);
    return <C nav={nav} {...o.props} />;
  }

  if (!hasOnboarded) {
    return (
      <ToastProvider>
        <div className="app-frame">
          <OnboardingScreen onComplete={() => setHasOnboarded(true)} />
        </div>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className="app-frame">
        {/* Base tab screen */}
        <div style={{ position: 'absolute', inset: 0 }} key={tab}>
          <div style={{ height: '100%', animation: 'fadeIn .25s both' }}>
            <TabScreen nav={nav} />
          </div>
        </div>

        {/* Pushed nav stack */}
        {stack.map((o, i) => (
          <div key={o.key}
            onAnimationEnd={() => { if (o.closing) nav._remove(o.key); }}
            style={{ position: 'absolute', inset: 0, zIndex: 100 + i, background: 'var(--ink-0)', boxShadow: '-8px 0 40px rgba(0,0,0,0.5)', animation: o.closing ? 'slideOut .26s cubic-bezier(.4,0,.6,1) both' : 'slideIn .3s cubic-bezier(.2,.8,.25,1) both' }}>
            {renderPushed(o)}
          </div>
        ))}

        {/* Tab bar (hidden when screen is pushed) */}
        {stack.length === 0 && <TabBar active={tab} onTab={(k) => { setStack([]); setTab(k); }} onLog={() => setLogOpen(true)} />}

        <QuickLog open={logOpen} onClose={() => setLogOpen(false)} nav={nav} />
      </div>
    </ToastProvider>
  );
}
