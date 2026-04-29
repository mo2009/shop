'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const { settings } = useSettings();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'instapay'>('cod');
  const [instapayRef, setInstapayRef] = useState('');
  const [form, setForm] = useState({
    fullName: '', phone: '', address: '', city: '', governorate: '',
  });

  const instapayEnabled = settings?.instapayEnabled ?? true;

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">No Items to Checkout</h1>
        <Link href="/shop" className="text-primary hover:underline">Go to Shop</Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Please Sign In</h1>
        <p className="text-gray-400 mb-6">You need to be signed in to place an order</p>
        <Link href="/auth/login" className="bg-primary hover:bg-primary/80 text-white px-8 py-3 rounded-xl font-semibold transition">
          Sign In
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.phone || !form.address || !form.city || !form.governorate) {
      toast.error('Please fill all fields');
      return;
    }
    if (paymentMethod === 'instapay' && !instapayRef) {
      toast.error('Please enter your Instapay reference number');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'orders'), {
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || form.fullName,
        items: items.map(i => ({
          productId: i.product.id,
          productName: i.product.name,
          price: i.product.price,
          quantity: i.quantity,
          image: i.product.image,
        })),
        total,
        paymentMethod,
        paymentStatus: 'pending',
        orderStatus: 'pending',
        shippingAddress: form,
        instapayReference: paymentMethod === 'instapay' ? instapayRef : null,
        createdAt: serverTimestamp(),
      });
      clearCart();
      toast.success('Order placed successfully!');
      router.push('/');
    } catch (err) {
      console.error(err);
      toast.error('Failed to place order');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-white mb-8">Checkout</h1>
      <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Shipping Address</h2>
          <input type="text" placeholder="Full Name" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})}
            className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-primary focus:outline-none" />
          <input type="tel" placeholder="Phone Number" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
            className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-primary focus:outline-none" />
          <input type="text" placeholder="Address" value={form.address} onChange={e => setForm({...form, address: e.target.value})}
            className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-primary focus:outline-none" />
          <input type="text" placeholder="City" value={form.city} onChange={e => setForm({...form, city: e.target.value})}
            className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-primary focus:outline-none" />
          <input type="text" placeholder="Governorate" value={form.governorate} onChange={e => setForm({...form, governorate: e.target.value})}
            className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-primary focus:outline-none" />
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Payment Method</h2>
          <div className="space-y-3">
            {/* COD — always shown */}
            <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition ${paymentMethod === 'cod' ? 'border-primary bg-primary/10' : 'border-white/10 bg-dark-700'}`}>
              <input type="radio" name="payment" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="accent-primary" />
              <div>
                <p className="text-white font-medium">Cash on Delivery (COD)</p>
                <p className="text-gray-400 text-sm">Pay when you receive your order</p>
              </div>
            </label>

            {/* Instapay — only shown if enabled */}
            {instapayEnabled && (
              <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition ${paymentMethod === 'instapay' ? 'border-primary bg-primary/10' : 'border-white/10 bg-dark-700'}`}>
                <input type="radio" name="payment" checked={paymentMethod === 'instapay'} onChange={() => setPaymentMethod('instapay')} className="accent-primary" />
                <div>
                  <p className="text-white font-medium">Instapay</p>
                  <p className="text-gray-400 text-sm">Transfer via Instapay and enter reference</p>
                </div>
              </label>
            )}
          </div>

          {paymentMethod === 'instapay' && instapayEnabled && (
            <div className="bg-dark-700 border border-white/10 rounded-xl p-4 space-y-3">
              <p className="text-gray-300 text-sm">Send <span className="text-secondary font-bold">{total} EGP</span> via Instapay, then enter the reference number below.</p>
              <input type="text" value={instapayRef} onChange={e => setInstapayRef(e.target.value)} placeholder="Instapay reference number"
                className="w-full bg-dark-600 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition" />
              <p className="text-gray-500 text-xs">Your order will be confirmed once the admin verifies the payment.</p>
            </div>
          )}

          <div className="bg-dark-700/50 border border-white/10 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3">Order Summary</h3>
            {items.map(item => (
              <div key={item.product.id} className="flex justify-between text-sm py-1">
                <span className="text-gray-400">{item.product.name} x{item.quantity}</span>
                <span className="text-white">{item.product.price * item.quantity} EGP</span>
              </div>
            ))}
            <div className="border-t border-white/10 mt-3 pt-3 flex justify-between">
              <span className="text-white font-semibold">Total</span>
              <span className="text-secondary font-bold">{total} EGP</span>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-primary hover:bg-primary/80 disabled:bg-gray-600 text-white py-3 rounded-xl font-semibold transition">
            {loading ? 'Placing Order...' : 'Place Order'}
          </button>
        </div>
      </form>
    </div>
  );
}