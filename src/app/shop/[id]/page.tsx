'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Product } from '@/lib/types';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import Image from 'next/image';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { FiShoppingCart, FiArrowLeft, FiHeart, FiMinus, FiPlus, FiCheck } from 'react-icons/fi';

export default function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const { addToCart } = useCart();
  const { has, toggle } = useWishlist();

  useEffect(() => {
    async function fetchAll() {
      try {
        const snap = await getDoc(doc(db, 'products', id as string));
        if (snap.exists()) {
          const p = { id: snap.id, ...snap.data() } as Product;
          setProduct(p);
          // fetch related (same category)
          const listSnap = await getDocs(collection(db, 'products'));
          const all = listSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
          const pCats = p.categories && p.categories.length > 0 ? p.categories : [p.category];
          setRelated(
            all
              .filter(x => {
                if (x.id === p.id) return false;
                const xCats = x.categories && x.categories.length > 0 ? x.categories : [x.category];
                return xCats.some(c => pCats.includes(c));
              })
              .slice(0, 4),
          );
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    fetchAll();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-12">
          <div className="skeleton h-[420px] rounded-2xl" />
          <div className="space-y-4">
            <div className="skeleton h-6 w-24" />
            <div className="skeleton h-10 w-3/4" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-5/6" />
            <div className="skeleton h-10 w-32 mt-6" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400">Product not found.</p>
        <Link href="/shop" className="text-primary hover:underline mt-4 inline-block">
          Back to shop
        </Link>
      </div>
    );
  }

  const liked = has(product.id);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <Link
        href="/shop"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-primary mb-8 transition text-sm"
      >
        <FiArrowLeft /> Back to Shop
      </Link>

      <div className="grid md:grid-cols-2 gap-12 items-start">
        <div className="animate-fade-up">
          <div className="relative aspect-square bg-dark-700 rounded-2xl overflow-hidden group">
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
              priority
            />
            {product.color && (
              <span className="absolute top-4 left-4 bg-primary/90 text-white text-xs px-3 py-1 rounded-full backdrop-blur">
                {product.color}
              </span>
            )}
          </div>
        </div>

        <div className="animate-fade-up delay-75">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">{product.name}</h1>
          <p className="text-secondary font-bold text-3xl mb-6">{product.price} EGP</p>
          <p className="text-gray-400 mb-8 leading-relaxed whitespace-pre-wrap">{product.description}</p>

          <div className="flex items-center gap-3 mb-6">
            <span className="text-gray-400 text-sm">Quantity</span>
            <div className="inline-flex items-center bg-white/5 border border-white/10 rounded-xl">
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-l-xl transition"
              >
                <FiMinus size={14} />
              </button>
              <span className="w-10 text-center text-white font-medium">{qty}</span>
              <button
                onClick={() => setQty(q => q + 1)}
                aria-label="Increase quantity"
                className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-r-xl transition"
              >
                <FiPlus size={14} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                for (let i = 0; i < qty; i++) addToCart(product);
              }}
              disabled={!product.inStock}
              className="bg-primary hover:bg-primary/90 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-7 py-3 rounded-xl font-semibold transition flex items-center gap-2 btn-shine"
            >
              <FiShoppingCart /> {product.inStock ? 'Add to Cart' : 'Out of Stock'}
            </button>
            <button
              onClick={() => toggle(product.id, product.name)}
              aria-pressed={liked}
              className={`px-5 py-3 rounded-xl font-medium transition flex items-center gap-2 border ${
                liked
                  ? 'border-red-500/50 bg-red-500/10 text-red-300'
                  : 'border-white/15 text-gray-200 hover:border-white/30'
              }`}
            >
              <FiHeart fill={liked ? 'currentColor' : 'none'} size={16} />
              {liked ? 'Wishlisted' : 'Wishlist'}
            </button>
          </div>

          <ul className="mt-8 space-y-2 text-sm text-gray-300">
            <li className="flex items-center gap-2">
              <FiCheck className="text-primary" size={14} /> Free shipping in Cairo on orders above 500 EGP
            </li>
            <li className="flex items-center gap-2">
              <FiCheck className="text-primary" size={14} /> 7-day return policy
            </li>
            <li className="flex items-center gap-2">
              <FiCheck className="text-primary" size={14} /> No app needed — works on all modern phones
            </li>
          </ul>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="text-2xl font-bold text-white mb-6 tracking-tight">You might also like</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
