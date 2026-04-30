'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  serverTimestamp,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { FiCheck, FiArrowLeft, FiArrowRight, FiTruck, FiCreditCard, FiFileText, FiTag } from 'react-icons/fi';
import { Coupon } from '@/lib/types';
import { validateCoupon } from '@/lib/coupons';

type Step = 0 | 1 | 2;

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const { settings } = useSettings();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'instapay'>('cod');
  const [instapayRef, setInstapayRef] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    governorate: '',
  });

  const instapayEnabled = settings?.instapayEnabled ?? true;

  const validation = validateCoupon(coupon, total);
  const discountAmount = validation.ok ? validation.discount : 0;
  const finalTotal = Math.max(0, total - discountAmount);

  const applyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    try {
      const q = query(
        collection(db, 'coupons'),
        where('code', '==', code),
        limit(1),
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        toast.error('Coupon not found');
        setCoupon(null);
        return;
      }
      const c = { id: snap.docs[0].id, ...snap.docs[0].data() } as Coupon;
      const v = validateCoupon(c, total);
      if (!v.ok) {
        toast.error(v.reason);
        setCoupon(null);
        return;
      }
      setCoupon(c);
      toast.success(`Saved ${v.discount} EGP with ${c.code}`);
    } catch (e) {
      console.error(e);
      toast.error('Could not apply coupon');
    }
    setCouponLoading(false);
  };

  const removeCoupon = () => {
    setCoupon(null);
    setCouponCode('');
  };

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">No items to checkout</h1>
        <Link href="/shop" className="text-primary hover:underline">
          Go to Shop
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Please sign in</h1>
        <p className="text-gray-400 mb-6">You need to be signed in to place an order</p>
        <Link
          href="/auth/login"
          className="bg-primary hover:bg-primary/80 text-white px-8 py-3 rounded-xl font-semibold transition"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const shippingValid =
    form.fullName.trim() && form.phone.trim() && form.address.trim() && form.city.trim() && form.governorate.trim();
  const paymentValid = paymentMethod === 'cod' || (paymentMethod === 'instapay' && instapayRef.trim());

  const goNext = () => {
    if (step === 0 && !shippingValid) {
      toast.error('Please fill all shipping fields');
      return;
    }
    if (step === 1 && !paymentValid) {
      toast.error(paymentMethod === 'instapay' ? 'Please enter your Instapay reference' : 'Please select a payment method');
      return;
    }
    setStep(s => (s < 2 ? ((s + 1) as Step) : s));
  };

  const goBack = () => setStep(s => (s > 0 ? ((s - 1) as Step) : s));

  const placeOrder = async () => {
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
        subtotal: total,
        total: finalTotal,
        discountAmount,
        couponCode: coupon?.code || null,
        couponId: coupon?.id || null,
        paymentMethod,
        paymentStatus: 'pending',
        orderStatus: 'pending',
        shippingAddress: form,
        instapayReference: paymentMethod === 'instapay' ? instapayRef : null,
        createdAt: serverTimestamp(),
      });

      // Decrement stock + bump coupon usage (best-effort, non-blocking).
      Promise.allSettled([
        ...items.map(async i => {
          try {
            const ref = doc(db, 'products', i.product.id);
            const s = await getDoc(ref);
            if (s.exists()) {
              const data = s.data() as Record<string, unknown>;
              if (typeof data.stockQuantity === 'number') {
                const next = Math.max(0, (data.stockQuantity as number) - i.quantity);
                await updateDoc(ref, {
                  stockQuantity: next,
                  inStock: next > 0,
                });
              }
            }
          } catch (e) {
            console.error('stock decrement failed', e);
          }
        }),
        coupon
          ? updateDoc(doc(db, 'coupons', coupon.id), { uses: increment(1) }).catch(() => null)
          : Promise.resolve(),
      ]);

      clearCart();
      toast.success('Order placed successfully!');
      router.push('/user/orders');
    } catch (err) {
      console.error(err);
      toast.error('Failed to place order');
    }
    setLoading(false);
  };

  const steps = [
    { label: 'Shipping', icon: FiTruck },
    { label: 'Payment', icon: FiCreditCard },
    { label: 'Review', icon: FiFileText },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-8 tracking-tight animate-fade-up">Checkout</h1>

      {/* Stepper */}
      <div className="mb-10 animate-fade-up">
        <ol className="flex items-center">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const active = i === step;
            return (
              <li key={i} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition ${
                      done
                        ? 'bg-primary border-primary text-white'
                        : active
                        ? 'border-primary text-primary bg-primary/10'
                        : 'border-white/15 text-gray-500'
                    }`}
                  >
                    {done ? <FiCheck size={16} /> : <Icon size={16} />}
                  </div>
                  <span
                    className={`mt-2 text-xs font-medium ${
                      done || active ? 'text-white' : 'text-gray-500'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`flex-1 h-px mx-2 mb-5 transition ${
                      done ? 'bg-primary' : 'bg-white/15'
                    }`}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="glass border border-white/10 rounded-2xl p-6 md:p-8 animate-fade-up">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white mb-1">Shipping address</h2>
            <p className="text-gray-400 text-sm mb-4">Where should we send your order?</p>
            {(
              [
                ['fullName', 'Full Name', 'text'],
                ['phone', 'Phone Number', 'tel'],
                ['address', 'Address', 'text'],
                ['city', 'City', 'text'],
                ['governorate', 'Governorate', 'text'],
              ] as const
            ).map(([key, label, type]) => (
              <div key={key}>
                <label htmlFor={key} className="block text-gray-400 text-xs mb-1">
                  {label}
                </label>
                <input
                  id={key}
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-primary focus:outline-none transition"
                />
              </div>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white mb-1">Payment method</h2>
            <p className="text-gray-400 text-sm mb-4">How do you want to pay?</p>

            <label
              className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition ${
                paymentMethod === 'cod' ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5'
              }`}
            >
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'cod'}
                onChange={() => setPaymentMethod('cod')}
                className="accent-primary"
              />
              <div>
                <p className="text-white font-medium">Cash on Delivery (COD)</p>
                <p className="text-gray-400 text-sm">Pay when you receive your order</p>
              </div>
            </label>

            {instapayEnabled && (
              <label
                className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition ${
                  paymentMethod === 'instapay' ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'instapay'}
                  onChange={() => setPaymentMethod('instapay')}
                  className="accent-primary"
                />
                <div>
                  <p className="text-white font-medium">Instapay</p>
                  <p className="text-gray-400 text-sm">Transfer via Instapay and enter reference</p>
                </div>
              </label>
            )}

            {paymentMethod === 'instapay' && instapayEnabled && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <p className="text-gray-300 text-sm">
                  Send <span className="text-secondary font-bold">{total} EGP</span> via Instapay, then enter the reference number below.
                </p>
                <input
                  type="text"
                  value={instapayRef}
                  onChange={e => setInstapayRef(e.target.value)}
                  placeholder="Instapay reference number"
                  className="w-full bg-dark-600 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition"
                />
                <p className="text-gray-500 text-xs">Your order will be confirmed once the admin verifies the payment.</p>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white mb-1">Review your order</h2>
            <p className="text-gray-400 text-sm">Confirm everything looks right before placing it.</p>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-2 text-sm">Shipping to</h3>
              <p className="text-gray-300 text-sm">{form.fullName}</p>
              <p className="text-gray-400 text-sm">{form.phone}</p>
              <p className="text-gray-400 text-sm">
                {form.address}, {form.city}, {form.governorate}
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-2 text-sm">Payment</h3>
              <p className="text-gray-300 text-sm">
                {paymentMethod === 'cod' ? 'Cash on Delivery' : 'Instapay'}
                {paymentMethod === 'instapay' && instapayRef && (
                  <span className="text-gray-500"> · Ref: {instapayRef}</span>
                )}
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-3 text-sm">Items</h3>
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.product.id} className="flex justify-between text-sm">
                    <span className="text-gray-300 truncate pr-3">
                      {item.product.name} <span className="text-gray-500">x{item.quantity}</span>
                    </span>
                    <span className="text-white whitespace-nowrap">{item.product.price * item.quantity} EGP</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/10 mt-3 pt-3 space-y-1 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span>{total} EGP</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span>Discount {coupon?.code ? `(${coupon.code})` : ''}</span>
                    <span>−{discountAmount} EGP</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-white/5">
                  <span className="text-white font-semibold">Total</span>
                  <span className="text-secondary font-bold text-lg">{finalTotal} EGP</span>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                <FiTag size={14} /> Promo / Coupon code
              </h3>
              {coupon && validation.ok ? (
                <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-xl px-3 py-2">
                  <p className="text-green-300 text-sm">
                    <span className="font-mono font-semibold">{coupon.code}</span> applied — saved {discountAmount} EGP
                  </p>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="text-xs text-gray-300 hover:text-white"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Enter code"
                    className="flex-1 bg-dark-600 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-primary focus:outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={applyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="px-4 py-2 bg-primary/90 hover:bg-primary text-white text-sm font-semibold rounded-xl transition disabled:opacity-50"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 mt-8 pt-6 border-t border-white/10">
          <button
            onClick={goBack}
            disabled={step === 0}
            className="inline-flex items-center gap-2 text-gray-300 hover:text-white disabled:opacity-0 disabled:pointer-events-none transition text-sm"
          >
            <FiArrowLeft /> Back
          </button>
          {step < 2 ? (
            <button
              onClick={goNext}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl font-semibold transition btn-shine"
            >
              Continue <FiArrowRight />
            </button>
          ) : (
            <button
              onClick={placeOrder}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:bg-gray-600 text-white px-6 py-2.5 rounded-xl font-semibold transition btn-shine"
            >
              {loading ? 'Placing Order...' : 'Place Order'}
              {!loading && <FiCheck />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
