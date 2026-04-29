'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Product } from '@/lib/types';
import { useCart } from '@/context/CartContext';
import Image from 'next/image';
import Link from 'next/link';
import { FiShoppingCart, FiArrowLeft } from 'react-icons/fi';

export default function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    async function fetch() {
      try {
        const snap = await getDoc(doc(db, 'products', id as string));
        if (snap.exists()) setProduct({ id: snap.id, ...snap.data() } as Product);
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    fetch();
  }, [id]);

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-20"><div className="bg-dark-700/50 rounded-2xl h-96 animate-pulse" /></div>;
  if (!product) return <div className="max-w-7xl mx-auto px-4 py-20 text-center"><p className="text-gray-400">Product not found.</p></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <Link href="/shop" className="inline-flex items-center gap-2 text-gray-400 hover:text-primary mb-8 transition">
        <FiArrowLeft /> Back to Shop
      </Link>
      <div className="grid md:grid-cols-2 gap-12">
        <div className="relative h-[400px] bg-dark-700 rounded-2xl overflow-hidden">
          <Image src={product.image} alt={product.name} fill className="object-cover" />
        </div>
        <div>
          {product.color && <span className="inline-block bg-primary/10 text-primary text-sm px-3 py-1 rounded-full mb-4">{product.color}</span>}
          <h1 className="text-3xl font-bold text-white mb-4">{product.name}</h1>
          <p className="text-gray-400 mb-6 leading-relaxed">{product.description}</p>
          <p className="text-secondary font-bold text-3xl mb-8">{product.price} EGP</p>
          <button onClick={() => addToCart(product)} disabled={!product.inStock}
            className="bg-primary hover:bg-primary/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-semibold transition flex items-center gap-2">
            <FiShoppingCart /> {product.inStock ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      </div>
    </div>
  );
}
