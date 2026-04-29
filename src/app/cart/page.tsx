'use client';

import { useCart } from '@/context/CartContext';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { FiTrash2, FiMinus, FiPlus, FiShoppingBag, FiAlertTriangle, FiArrowRight } from 'react-icons/fi';

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, clearCart, total, itemCount } = useCart();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClearCart = () => {
    clearCart();
    setShowConfirm(false);
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center animate-fade-up">
        <div className="relative w-40 h-40 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl animate-pulse-soft" />
          <div className="relative w-full h-full rounded-full glass flex items-center justify-center">
            <FiShoppingBag size={60} className="text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Your cart is empty</h1>
        <p className="text-gray-400 mb-8">Add some products to get started. Your future self will thank you.</p>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl font-semibold transition btn-shine"
        >
          Browse Shop <FiArrowRight />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-strong rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-scale-in">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-red-400/10 p-2 rounded-lg">
                <FiAlertTriangle size={20} className="text-red-400" />
              </div>
              <h2 className="text-white font-semibold text-lg">Clear Cart?</h2>
            </div>
            <p className="text-gray-400 text-sm mb-6">
              Are you sure you want to remove all {itemCount} items from your cart? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white py-2.5 rounded-xl text-sm font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleClearCart}
                className="flex-1 bg-red-500 hover:bg-red-400 text-white py-2.5 rounded-xl text-sm font-medium transition"
              >
                Yes, Clear Cart
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8 animate-fade-up">
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
          Shopping Cart <span className="text-gray-500 font-normal text-lg">({itemCount} items)</span>
        </h1>
        <button
          onClick={() => setShowConfirm(true)}
          className="flex items-center gap-2 text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-300/50 hover:bg-red-400/10 px-4 py-2 rounded-xl text-sm font-medium transition"
        >
          <FiTrash2 size={15} />
          <span className="hidden sm:inline">Clear Cart</span>
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item, i) => (
            <div
              key={item.product.id}
              className="glass border border-white/10 rounded-2xl p-4 flex gap-4 animate-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <Link
                href={`/shop/${item.product.id}`}
                className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-dark-700"
              >
                <Image src={item.product.image} alt={item.product.name} fill className="object-cover" />
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/shop/${item.product.id}`}
                  className="text-white font-semibold hover:text-primary transition block truncate"
                >
                  {item.product.name}
                </Link>
                <p className="text-secondary font-bold">{item.product.price * item.quantity} EGP</p>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    aria-label="Decrease quantity"
                    className="bg-white/10 text-white w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/20 transition"
                  >
                    <FiMinus size={14} />
                  </button>
                  <span className="text-white font-medium w-6 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    aria-label="Increase quantity"
                    className="bg-white/10 text-white w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/20 transition"
                  >
                    <FiPlus size={14} />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    aria-label="Remove item"
                    className="ml-auto text-red-400 hover:text-red-300 transition p-1"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="glass border border-white/10 rounded-2xl p-6 h-fit lg:sticky lg:top-24 animate-fade-up delay-75">
          <h2 className="text-white font-semibold text-lg mb-4">Order Summary</h2>
          <div className="space-y-3 mb-6">
            {items.map(item => (
              <div key={item.product.id} className="flex justify-between text-sm">
                <span className="text-gray-400 truncate pr-3">
                  {item.product.name} <span className="text-gray-500">x{item.quantity}</span>
                </span>
                <span className="text-white whitespace-nowrap">{item.product.price * item.quantity} EGP</span>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-4 mb-2 flex justify-between">
            <span className="text-gray-400 text-sm">Subtotal</span>
            <span className="text-white text-sm">{total} EGP</span>
          </div>
          <div className="flex justify-between mb-6">
            <span className="text-gray-400 text-sm">Shipping</span>
            <span className="text-gray-500 text-sm">Calculated at checkout</span>
          </div>
          <div className="border-t border-white/10 pt-4 mb-6 flex justify-between">
            <span className="text-white font-semibold">Total</span>
            <span className="text-secondary font-bold text-xl">{total} EGP</span>
          </div>
          <Link
            href="/checkout"
            className="block w-full bg-primary hover:bg-primary/90 text-white text-center py-3 rounded-xl font-semibold transition btn-shine"
          >
            Proceed to Checkout
          </Link>
          <Link
            href="/shop"
            className="block w-full text-gray-300 hover:text-white text-center text-sm mt-3 transition"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
