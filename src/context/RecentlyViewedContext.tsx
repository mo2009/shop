'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

type RecentlyViewedContextType = {
  ids: string[];
  add: (id: string) => void;
  clear: () => void;
};

const RecentlyViewedContext = createContext<RecentlyViewedContextType>({
  ids: [],
  add: () => {},
  clear: () => {},
});

const STORAGE_KEY = 'recently-viewed';
const MAX = 8;

export const RecentlyViewedProvider = ({ children }: { children: ReactNode }) => {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setIds(parsed.slice(0, MAX));
      }
    } catch {}
  }, []);

  const add = useCallback((id: string) => {
    setIds(prev => {
      const next = [id, ...prev.filter(p => p !== id)].slice(0, MAX);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setIds([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  return (
    <RecentlyViewedContext.Provider value={{ ids, add, clear }}>
      {children}
    </RecentlyViewedContext.Provider>
  );
};

export const useRecentlyViewed = () => useContext(RecentlyViewedContext);
