'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/lib/types';
import { useCart } from '@/context/CartContext';
import { FiX, FiShoppingCart } from 'react-icons/fi';
import StarRating from './StarRating';

export default function QuickViewModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const { addToCart } = useCart();
  const hasDiscount =
    typeof product.originalPrice === 'number' && product.originalPrice > product.price;
  const stockLeft =
    typeof product.stockQuantity === 'number' ? product.stockQuantity : null;
  const inStock = stockLeft === null ? product.inStock : stockLeft > 0;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur z-[60] flex items-center justify-center p-4 animate-fade-up"
      onClick={onClose}
    >
      <div
        className="bg-dark-700 border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto grid md:grid-cols-2 gap-0"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative aspect-square bg-dark-600">
          <Image
            src={product.image || '/images/product-placeholder.svg'}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
        <div className="p-5 md:p-6 relative">
          <button
            onClick={onClose}
            aria-label="Close quick view"
            className="absolute top-3 right-3 text-gray-400 hover:text-white p-1"
          >
            <FiX size={20} />
          </button>
          <h3 className="text-white font-bold text-xl mb-1">{product.name}</h3>
          {!!product.reviewCount && (
            <div className="mb-3">
              <StarRating value={product.rating || 0} count={product.reviewCount} size={14} />
            </div>
          )}
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-secondary font-bold text-2xl">{product.price} EGP</span>
            {hasDiscount && (
              <span className="text-gray-500 line-through">{product.originalPrice} EGP</span>
            )}
          </div>
          <p className="text-gray-300 text-sm mb-4 whitespace-pre-wrap line-clamp-6">
            {product.description}
          </p>
          {stockLeft !== null && stockLeft > 0 && stockLeft <= 5 && (
            <p className="text-amber-400 text-xs mb-4">Only {stockLeft} left in stock</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => {
                addToCart(product);
                onClose();
              }}
              disabled={!inStock}
              className="flex-1 bg-primary hover:bg-primary/90 disabled:bg-gray-600 text-white py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition"
            >
              <FiShoppingCart /> {inStock ? 'Add to cart' : 'Out of stock'}
            </button>
            <Link
              href={`/shop/${product.id}`}
              className="border border-white/15 hover:border-primary text-white py-2.5 px-4 rounded-xl font-medium transition"
              onClick={onClose}
            >
              View details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
