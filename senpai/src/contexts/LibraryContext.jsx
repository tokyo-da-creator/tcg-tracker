import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { ANIME } from '../data.js';

const LibraryContext = createContext(null);
export const useLibrary = () => useContext(LibraryContext);

// Seed catalog from local data.js
const INIT_CATALOG = Object.fromEntries(ANIME.map(a => [a.id, a]));

// Seed user tracking data from local data.js
const INIT_USERDATA = Object.fromEntries(
  ANIME.filter(a => a.status || a.fav || a.myScore).map(a => [a.id, {
    status: a.status || null,
    progress: a.progress || 0,
    myScore: a.myScore || null,
    fav: !!a.fav,
  }])
);

export function LibraryProvider({ children }) {
  const [catalog, setCatalog] = useState(INIT_CATALOG);
  const [userdata, setUserdata] = useState(INIT_USERDATA);

  const addAnime = useCallback((anime) => {
    setCatalog(c => c[anime.id] ? c : { ...c, [anime.id]: anime });
  }, []);

  const setStatus = useCallback((id, status) => {
    setUserdata(u => ({ ...u, [id]: { ...u[id], status, progress: u[id]?.progress || 0 } }));
  }, []);

  const removeStatus = useCallback((id) => {
    setUserdata(u => { const n = { ...u }; if (n[id]) n[id] = { ...n[id], status: null }; return n; });
  }, []);

  const setProgress = useCallback((id, progress) => {
    setUserdata(u => ({ ...u, [id]: { ...u[id], progress } }));
  }, []);

  const setScore = useCallback((id, myScore) => {
    setUserdata(u => ({ ...u, [id]: { ...u[id], myScore } }));
  }, []);

  const toggleFav = useCallback((id) => {
    setUserdata(u => ({ ...u, [id]: { ...u[id], fav: !u[id]?.fav } }));
  }, []);

  const getAnime = useCallback((id) => {
    const base = catalog[id];
    if (!base) return null;
    const ud = userdata[id] || {};
    return { ...base, ...ud };
  }, [catalog, userdata]);

  const getLibrary = useCallback((statusFilter) => {
    return Object.values(catalog)
      .map(a => ({ ...a, ...(userdata[a.id] || {}) }))
      .filter(a => statusFilter ? a.status === statusFilter : !!a.status);
  }, [catalog, userdata]);

  const countByStatus = useCallback((statusKey) => {
    return Object.values(userdata).filter(ud => ud.status === statusKey).length;
  }, [userdata]);

  const value = useMemo(() => ({
    catalog, userdata, addAnime, setStatus, removeStatus,
    setProgress, setScore, toggleFav, getAnime, getLibrary, countByStatus,
  }), [catalog, userdata, addAnime, setStatus, removeStatus, setProgress, setScore, toggleFav, getAnime, getLibrary, countByStatus]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}
