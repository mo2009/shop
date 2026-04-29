'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Product } from '@/lib/types';
import ProductCard from '@/components/ProductCard';

interface Category {
  id: string;
  name: string;
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch products and categories in parallel
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

  const filtered = filter === 'all' ? products : products.filter(p => p.category === filter);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">Shop</h1>
      <p className="text-gray-400 mb-8">Browse our NFC cards and digital services</p>

      {/* Filter buttons */}
      <div className="flex flex-wrap gap-3 mb-8">
        {/* "All" button */}
        <button
          onClick={() => setFilter('all')}
          className={`px-5 py-2 rounded-xl text-sm font-medium transition ${
            filter === 'all'
              ? 'bg-primary text-white'
              : 'bg-dark-700 text-gray-400 hover:text-white border border-white/10'
          }`}
        >
          All
        </button>

        {/* Dynamic category buttons from Firestore */}
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.name)}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition ${
              filter === cat.name
                ? 'bg-primary text-white'
                : 'bg-dark-700 text-gray-400 hover:text-white border border-white/10'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Products grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-dark-700/50 rounded-2xl h-80 animate-pulse" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      ) : (
        <p className="text-gray-400 text-center py-20">No products found.</p>
      )}
    </div>
  );
}