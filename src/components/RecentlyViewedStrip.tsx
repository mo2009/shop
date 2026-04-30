'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Product } from '@/lib/types';
import { useRecentlyViewed } from '@/context/RecentlyViewedContext';
import ProductCard from './ProductCard';

export default function RecentlyViewedStrip({ excludeId }: { excludeId?: string }) {
  const { ids } = useRecentlyViewed();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (ids.length === 0) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'products'));
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
        const map = new Map(all.map(p => [p.id, p]));
        const ordered = ids
          .map(id => map.get(id))
          .filter((p): p is Product => !!p && p.id !== excludeId);
        if (!cancelled) setProducts(ordered.slice(0, 4));
      } catch {
        if (!cancelled) setProducts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ids, excludeId]);

  if (products.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="text-2xl font-bold text-white mb-6">Recently viewed</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map(p => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
