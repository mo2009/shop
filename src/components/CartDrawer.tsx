'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';
import { FiX, FiMinus, FiPlus, FiTrash2, FiShoppingBag } from 'react-icons/fi';
import { useCart } from '@/context/CartContext';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function CartDrawer({ open, onClose }: Props) {
  const { items, updateQuantity, removeFromCart, total, itemCount } = useCart();

  // Close on Escape + lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-[60] ${open ? '' : 'pointer-events-none'}`}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <aside
        role="dialog"
        aria-label="Shopping cart"
        aria-modal="true"
        className={`absolute top-0 right-0 h-full w-full sm:w-[420px] glass-strong shadow-2xl flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <FiShoppingBag className="text-primary" />
            <h2 className="text-white font-semibold">Your Cart</h2>
            <span className="text-gray-400 text-sm">({itemCount})</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close cart"
            className="text-gray-300 hover:text-white transition p-1"
          >
            <FiX size={22} />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <FiShoppingBag size={34} className="text-gray-500" />
            </div>
            <p className="text-white font-semibold mb-1">Your cart is empty</p>
            <p className="text-gray-400 text-sm mb-6">Add items to see them here.</p>
            <Link
              href="/shop"
              onClick={onClose}
              className="bg-primary hover:bg-primary/80 text-white px-6 py-2.5 rounded-xl font-medium transition"
            >
              Browse Shop
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {items.map(item => (
                <li
                  key={item.product.id}
                  className="bg-white/5 border border-white/10 rounded-xl p-3 flex gap-3"
                >
                  <Link
                    href={`/shop/${item.product.id}`}
                    onClick={onClose}
                    className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-dark-700"
                  >
                    <Image src={item.product.image} alt={item.product.name} fill className="object-cover" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/shop/${item.product.id}`}
                      onClick={onClose}
                      className="block text-white text-sm font-medium truncate hover:text-primary transition"
                    >
                      {item.product.name}
                    </Link>
                    <p className="text-secondary font-semibold text-sm">
                      {item.product.price * item.quantity} EGP
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        aria-label="Decrease quantity"
                        className="bg-white/10 text-white w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/20 transition"
                      >
                        <FiMinus size={12} />
                      </button>
                      <span className="text-white text-sm w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        aria-label="Increase quantity"
                        className="bg-white/10 text-white w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/20 transition"
                      >
                        <FiPlus size={12} />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        aria-label="Remove item"
                        className="ml-auto text-red-400 hover:text-red-300 transition p-1"
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <footer className="border-t border-white/10 px-5 py-4 space-y-3">
              <div className="flex items-center justify-between text-white">
                <span className="text-gray-400">Subtotal</span>
                <span className="font-semibold">{total} EGP</span>
              </div>
              <p className="text-xs text-gray-500">Shipping calculated at checkout.</p>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/cart"
                  onClick={onClose}
                  className="text-center border border-white/15 hover:border-white/30 text-gray-200 py-2.5 rounded-xl text-sm font-medium transition"
                >
                  View cart
                </Link>
                <Link
                  href="/checkout"
                  onClick={onClose}
                  className="text-center bg-primary hover:bg-primary/80 text-white py-2.5 rounded-xl text-sm font-semibold transition btn-shine"
                >
                  Checkout
                </Link>
              </div>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
