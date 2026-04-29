'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import toast from 'react-hot-toast';

interface WishlistContextType {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string, name?: string) => void;
  clear: () => void;
}

const WishlistContext = createContext<WishlistContextType>({
  ids: [],
  has: () => false,
  toggle: () => {},
  clear: () => {},
});

const LOCAL_KEY = 'motech-wishlist';

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setIds(parsed);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(ids));
    } catch {
      /* ignore */
    }
  }, [ids, hydrated]);

  const has = (id: string) => ids.includes(id);

  const toggle = (id: string, name?: string) => {
    setIds(prev => {
      if (prev.includes(id)) {
        toast.success(`${name ?? 'Item'} removed from wishlist`, { id: `wl-${id}` });
        return prev.filter(x => x !== id);
      }
      toast.success(`${name ?? 'Item'} added to wishlist`, { id: `wl-${id}` });
      return [...prev, id];
    });
  };

  const clear = () => setIds([]);

  return (
    <WishlistContext.Provider value={{ ids, has, toggle, clear }}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);
