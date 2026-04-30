'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Product } from '@/lib/types';
import ProductCard from '@/components/ProductCard';
import SkeletonCard from '@/components/SkeletonCard';
import { FiSearch, FiX } from 'react-icons/fi';

interface Category {
  id: string;
  name: string;
}

type SortMode = 'default' | 'price-asc' | 'price-desc' | 'name-asc';

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('default');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [productsSnap, categoriesSnap] = await Promise.all([
          getDocs(collection(db, 'products')),
          getDocs(collection(db, 'categories')),
        ]);
        setProducts(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
        setCategories(categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const priceCeiling = useMemo(
    () => products.reduce((m, p) => Math.max(m, p.price || 0), 0) || 1000,
    [products],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = products;
    if (filter !== 'all') {
      list = list.filter(p =>
        p.categories && p.categories.length > 0
          ? p.categories.includes(filter)
          : p.category === filter,
      );
    }
    if (q) {
      list = list.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.color?.toLowerCase().includes(q),
      );
    }
    if (inStockOnly) {
      list = list.filter(p => {
        const sq = typeof p.stockQuantity === 'number' ? p.stockQuantity : null;
        return sq === null ? p.inStock : sq > 0;
      });
    }
    if (maxPrice !== null) {
      list = list.filter(p => p.price <= maxPrice);
    }
    const sorted = [...list];
    if (sort === 'price-asc') sorted.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') sorted.sort((a, b) => b.price - a.price);
    else if (sort === 'name-asc') sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [products, filter, query, sort, inStockOnly, maxPrice]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="animate-fade-up">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">Shop</h1>
        <p className="text-gray-400 mb-8">Browse our NFC cards and digital services</p>
      </div>

      {/* Sticky filter + search bar */}
      <div className="sticky top-16 z-30 -mx-4 px-4 py-3 glass-strong border-b border-white/10 mb-6 animate-fade-up">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search products..."
              aria-label="Search products"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-9 py-2.5 text-white placeholder-gray-500 focus:border-primary focus:outline-none transition"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
              >
                <FiX size={16} />
              </button>
            )}
          </div>
          <div className="flex gap-2 md:w-auto">
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortMode)}
              aria-label="Sort products"
              className="flex-1 md:flex-none bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-primary focus:outline-none transition"
            >
              <option value="default">Sort: Default</option>
              <option value="price-asc">Price: Low → High</option>
              <option value="price-desc">Price: High → Low</option>
              <option value="name-asc">Name: A → Z</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-gray-300 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={e => setInStockOnly(e.target.checked)}
              className="accent-primary"
            />
            In stock only
          </label>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-xs text-gray-300">
            <span className="whitespace-nowrap">Max price</span>
            <input
              type="range"
              min={0}
              max={priceCeiling}
              step={Math.max(10, Math.round(priceCeiling / 50))}
              value={maxPrice ?? priceCeiling}
              onChange={e => {
                const v = Number(e.target.value);
                setMaxPrice(v >= priceCeiling ? null : v);
              }}
              className="accent-primary w-32 md:w-40"
              aria-label="Maximum price"
            />
            <span className="text-white font-medium tabular-nums w-16 text-right">
              {(maxPrice ?? priceCeiling)} EGP
            </span>
          </div>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
              filter === 'all'
                ? 'bg-primary text-white'
                : 'bg-white/5 text-gray-300 hover:text-white border border-white/10'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.name)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                filter === cat.name
                  ? 'bg-primary text-white'
                  : 'bg-white/5 text-gray-300 hover:text-white border border-white/10'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <>
          <p className="text-gray-500 text-sm mb-4">
            {filtered.length} {filtered.length === 1 ? 'product' : 'products'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p, i) => (
              <div key={p.id} className="animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-20 animate-fade-up">
          <p className="text-white text-lg font-semibold mb-1">No products found</p>
          <p className="text-gray-400 text-sm">Try a different search or filter.</p>
        </div>
      )}
    </div>
  );
}
