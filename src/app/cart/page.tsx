'use client';

import { useCart } from '@/context/CartContext';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { FiTrash2, FiMinus, FiPlus, FiShoppingBag, FiAlertTriangle } from 'react-icons/fi';

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, clearCart, total, itemCount } = useCart();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClearCart = () => {
    clearCart();
    setShowConfirm(false);
  };

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <FiShoppingBag size={64} className="mx-auto text-gray-600 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Your cart is empty</h1>
        <p className="text-gray-400 mb-6">Add some products to get started</p>
        <Link href="/shop" className="bg-primary hover:bg-primary/80 text-white px-8 py-3 rounded-xl font-semibold transition inline-block">
          Browse Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-dark-700 border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
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

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Shopping Cart ({itemCount} items)</h1>
        <button
          onClick={() => setShowConfirm(true)}
          className="flex items-center gap-2 text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-300/50 hover:bg-red-400/10 px-4 py-2 rounded-xl text-sm font-medium transition"
        >
          <FiTrash2 size={15} />
          Clear Cart
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => (
            <div key={item.product.id} className="bg-dark-700/50 border border-white/10 rounded-2xl p-4 flex gap-4">
              <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                <Image src={item.product.image} alt={item.product.name} fill className="object-cover" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold">{item.product.name}</h3>
                <p className="text-secondary font-bold">{item.product.price} EGP</p>
                <div className="flex items-center gap-3 mt-2">
                  <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="bg-dark-600 text-white w-8 h-8 rounded-lg flex items-center justify-center hover:bg-dark-500 transition">
                    <FiMinus size={14} />
                  </button>
                  <span className="text-white font-medium">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="bg-dark-600 text-white w-8 h-8 rounded-lg flex items-center justify-center hover:bg-dark-500 transition">
                    <FiPlus size={14} />
                  </button>
                  <button onClick={() => removeFromCart(item.product.id)} className="ml-auto text-red-400 hover:text-red-300 transition">
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-dark-700/50 border border-white/10 rounded-2xl p-6 h-fit">
          <h2 className="text-white font-semibold text-lg mb-4">Order Summary</h2>
          <div className="space-y-3 mb-6">
            {items.map(item => (
              <div key={item.product.id} className="flex justify-between text-sm">
                <span className="text-gray-400">{item.product.name} x{item.quantity}</span>
                <span className="text-white">{item.product.price * item.quantity} EGP</span>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-4 mb-6">
            <div className="flex justify-between">
              <span className="text-white font-semibold">Total</span>
              <span className="text-secondary font-bold text-xl">{total} EGP</span>
            </div>
          </div>
          <Link href="/checkout" className="block w-full bg-primary hover:bg-primary/80 text-white text-center py-3 rounded-xl font-semibold transition">
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}