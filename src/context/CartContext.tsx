'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const lastSyncedUid = useRef<string | null>(null);

  // Load guest cart from localStorage on first mount.
  useEffect(() => {
    setItems(readLocalCart());
    setHydrated(true);
  }, []);

  // Always persist to localStorage once hydrated — keeps guest cart across reloads.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, hydrated]);

  // When the signed-in user changes, merge the local cart with the stored
  // Firestore cart and use that as the authoritative cart.
  useEffect(() => {
    if (!hydrated) return;
    const uid = user?.uid ?? null;
    if (uid === lastSyncedUid.current) return;
    lastSyncedUid.current = uid;

    if (!uid) return; // signed out — keep whatever is in local cart

    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'carts', uid));
        const remote: CartItem[] = snap.exists()
          ? ((snap.data()?.items as CartItem[]) ?? [])
          : [];
        const local = readLocalCart();
        const merged = mergeCarts(remote, local);
        if (cancelled) return;
        setItems(merged);
        await setDoc(
          doc(db, 'carts', uid),
          { items: merged, updatedAt: new Date() },
          { merge: true },
        );
      } catch (err) {
        console.error('Failed to restore cart for user:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, hydrated]);

  // While signed in, keep Firestore copy in sync with local state.
  useEffect(() => {
    if (!hydrated) return;
    const uid = user?.uid;
    if (!uid) return;
    if (lastSyncedUid.current !== uid) return; // initial merge hasn't happened yet
    const handle = setTimeout(() => {
      setDoc(
        doc(db, 'carts', uid),
        { items, updatedAt: new Date() },
        { merge: true },
      ).catch(err => console.error('Failed to sync cart:', err));
    }, 300);
    return () => clearTimeout(handle);
  }, [items, user, hydrated]);

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
