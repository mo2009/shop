'use client';

import Image from 'next/image';
import { Product } from '@/lib/types';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { FiShoppingCart, FiHeart } from 'react-icons/fi';
import Link from 'next/link';

export default function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const { has, toggle } = useWishlist();
  const liked = has(product.id);
  const hasDiscount =
    typeof product.originalPrice === 'number' && product.originalPrice > product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;

  return (
    <div className="group relative card-lift bg-dark-700/50 backdrop-blur border border-white/10 rounded-2xl overflow-hidden hover:border-primary/50">
      <Link href={`/shop/${product.id}`} aria-label={product.name}>
        <div className="relative h-64 overflow-hidden bg-dark-600">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
            className="object-cover group-hover:scale-110 transition-transform duration-500"
          />
          {!product.inStock && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white font-semibold bg-red-500/80 px-4 py-1 rounded-full text-sm">
                Out of Stock
              </span>
            </div>
          )}
          {product.color && (
            <span className="absolute top-3 left-3 bg-primary/80 text-white text-xs px-3 py-1 rounded-full backdrop-blur">
              {product.color}
            </span>
          )}
          {hasDiscount && (
            <span
              className={`absolute ${product.color ? 'top-11' : 'top-3'} left-3 bg-red-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md`}
            >
              -{discountPct}%
            </span>
          )}
        </div>
      </Link>

      <button
        onClick={e => {
          e.preventDefault();
          toggle(product.id, product.name);
        }}
        aria-label={liked ? 'Remove from wishlist' : 'Add to wishlist'}
        aria-pressed={liked}
        className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition backdrop-blur ${
          liked
            ? 'bg-red-500/90 text-white'
            : 'bg-black/40 text-white/80 hover:text-white hover:bg-black/60'
        }`}
      >
        <FiHeart size={16} fill={liked ? 'currentColor' : 'none'} />
      </button>

      <div className="p-5">
        <Link href={`/shop/${product.id}`}>
          <h3 className="text-white font-semibold text-lg mb-1 hover:text-primary transition line-clamp-1">
            {product.name}
          </h3>
        </Link>
        <p className="text-gray-400 text-sm mb-3 line-clamp-2 min-h-[2.5rem]">{product.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-secondary font-bold text-xl">{product.price} EGP</span>
            {hasDiscount && (
              <span className="text-gray-500 text-sm line-through">{product.originalPrice} EGP</span>
            )}
          </div>
          <button
            onClick={() => addToCart(product)}
            disabled={!product.inStock}
            aria-label="Add to cart"
            className="bg-primary hover:bg-primary/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition btn-shine"
          >
            <FiShoppingCart size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
