'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { CartItem, Product } from '@/lib/types';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;

  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType>({} as CartContextType);

const LOCAL_KEY = 'motech-cart';

const readLocalCart = (): CartItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
};

const writeLocalCart = (items: CartItem[]) => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
};

const mergeCarts = (a: CartItem[], b: CartItem[]): CartItem[] => {
  const map = new Map<string, CartItem>();
  for (const item of a) {
    map.set(item.product.id, { ...item });
  }
  for (const item of b) {
    const existing = map.get(item.product.id);
    if (existing) {
      map.set(item.product.id, {
        ...existing,
        quantity: existing.quantity + item.quantity,
      });
    } else {
      map.set(item.product.id, { ...item });
    }
  }
  return Array.from(map.values());
};

const serializeItems = (items: CartItem[]) =>
  JSON.stringify(
    items.map(i => ({ id: i.product.id, q: i.quantity })).sort((a, b) => a.id.localeCompare(b.id)),
  );

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  // 'idle' before we know the user state, 'loading' while we fetch/merge the
  // signed-in cart, 'ready' when we are safe to sync local changes up.
  const [syncState, setSyncState] = useState<'idle' | 'loading' | 'ready'>('idle');
  const attemptedUid = useRef<string | null | undefined>(undefined);
  const syncedUid = useRef<string | null>(null);
  const lastSyncedSig = useRef<string>('');
  const skipNextSnapshot = useRef(false);

  // Load guest cart from localStorage on first mount.
  useEffect(() => {
    setItems(readLocalCart());
    setHydrated(true);
  }, []);

  // Persist to localStorage whenever items change — keeps a fallback copy
  // and preserves the guest cart across reloads when signed out.
  useEffect(() => {
    if (!hydrated) return;
    writeLocalCart(items);
  }, [items, hydrated]);

  // Reconcile with Firestore whenever the signed-in user changes.
  useEffect(() => {
    if (!hydrated || authLoading) return;
    const uid = user?.uid ?? null;
    if (attemptedUid.current === uid) return;
    attemptedUid.current = uid;

    // Signed out → leave the local (guest) cart alone.
    if (!uid) {
      syncedUid.current = null;
      setSyncState('idle');
      return;
    }

    let cancelled = false;
    setSyncState('loading');

    (async () => {
      try {
        const ref = doc(db, 'carts', uid);
        const snap = await getDoc(ref);
        const remote: CartItem[] = snap.exists()
          ? ((snap.data()?.items as CartItem[]) ?? [])
          : [];
        const local = readLocalCart();
        const merged = mergeCarts(remote, local);
        if (cancelled) return;

        syncedUid.current = uid;
        lastSyncedSig.current = serializeItems(merged);
        skipNextSnapshot.current = true;
        setItems(merged);

        // Only write back if we actually added anything from the local cart.
        if (serializeItems(merged) !== serializeItems(remote)) {
          await setDoc(ref, { items: merged, updatedAt: new Date() }, { merge: true });
        }
        if (!cancelled) setSyncState('ready');
      } catch (err) {
        console.error('Failed to restore cart for user:', err);
        if (!cancelled) setSyncState('ready'); // still allow local use
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, hydrated]);

  // While signed in and ready, push local changes up to Firestore (debounced).
  useEffect(() => {
    if (syncState !== 'ready') return;
    const uid = user?.uid;
    if (!uid || syncedUid.current !== uid) return;

    const sig = serializeItems(items);
    if (sig === lastSyncedSig.current) return;

    const handle = setTimeout(() => {
      lastSyncedSig.current = sig;
      skipNextSnapshot.current = true;
      setDoc(
        doc(db, 'carts', uid),
        { items, updatedAt: new Date() },
        { merge: true },
      ).catch(err => console.error('Failed to sync cart:', err));
    }, 300);
    return () => clearTimeout(handle);
  }, [items, user, syncState]);

  // Live updates from other devices — reflect Firestore changes locally.
  useEffect(() => {
    if (syncState !== 'ready') return;
    const uid = user?.uid;
    if (!uid || syncedUid.current !== uid) return;

    const unsub = onSnapshot(doc(db, 'carts', uid), snap => {
      if (!snap.exists()) return;
      if (skipNextSnapshot.current) {
        skipNextSnapshot.current = false;
        return;
      }
      const remote = (snap.data()?.items as CartItem[]) ?? [];
      const sig = serializeItems(remote);
      if (sig === lastSyncedSig.current) return;
      lastSyncedSig.current = sig;
      setItems(remote);
    });
    return () => unsub();
  }, [user, syncState]);

  const addToCart = (product: Product) => {
    let alreadyInCart = false;
    setItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        alreadyInCart = true;
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast.success(alreadyInCart ? 'Quantity updated' : 'Added to cart', {
      id: `cart-${product.id}`,
    });
  };

  const removeFromCart = (productId: string) => {
    setItems(prev => prev.filter(item => item.product.id !== productId));
    toast.success('Removed from cart', { id: `cart-remove-${productId}` });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item,
      ),
    );
  };

  const clearCart = () => setItems([]);

  const total = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, total, itemCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
