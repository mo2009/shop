'use client';

import Image from 'next/image';
import { Product } from '@/lib/types';
import { useCart } from '@/context/CartContext';
import { FiShoppingCart } from 'react-icons/fi';
import Link from 'next/link';

export default function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();

  return (
    <div className="group bg-dark-700/50 backdrop-blur border border-white/10 rounded-2xl overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
      <Link href={`/shop/${product.id}`}>
        <div className="relative h-64 overflow-hidden bg-dark-600">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
          />
          {!product.inStock && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white font-semibold bg-red-500/80 px-4 py-1 rounded-full text-sm">Out of Stock</span>
            </div>
          )}
          {product.color && (
            <span className="absolute top-3 left-3 bg-primary/80 text-white text-xs px-3 py-1 rounded-full">{product.color}</span>
          )}
        </div>
      </Link>
      <div className="p-5">
        <Link href={`/shop/${product.id}`}>
          <h3 className="text-white font-semibold text-lg mb-1 hover:text-primary transition">{product.name}</h3>
        </Link>
        <p className="text-gray-400 text-sm mb-3 line-clamp-2">{product.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-secondary font-bold text-xl">{product.price} EGP</span>
          <button
            onClick={() => addToCart(product)}
            disabled={!product.inStock}
            className="bg-primary hover:bg-primary/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition"
          >
            <FiShoppingCart size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
