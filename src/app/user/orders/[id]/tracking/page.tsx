'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Order } from '@/lib/types';
import OrderStatusTimeline from '@/components/OrderStatusTimeline';
import { FiArrowLeft } from 'react-icons/fi';

export default function OrderTrackingPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'orders', id as string));
        if (!snap.exists()) {
          setNotFound(true);
        } else {
          const data = snap.data() as Record<string, unknown>;
          if (data.userId && data.userId !== user.uid) {
            setNotFound(true);
          } else {
            const ts = data.createdAt as Timestamp | undefined;
            setOrder({
              id: snap.id,
              ...data,
              createdAt: ts?.toDate ? ts.toDate() : new Date(),
            } as Order);
          }
        }
      } catch (e) {
        console.error(e);
        setNotFound(true);
      }
      setLoading(false);
    })();
  }, [id, user, authLoading, router]);

  if (loading || authLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 mb-4">Order not found.</p>
        <Link href="/user/orders" className="text-primary hover:underline">
          Back to my orders
        </Link>
      </div>
    );
  }

  const subtotal =
    order.items?.reduce(
      (s: number, it: any) => s + (it.price || 0) * (it.quantity || 0),
      0,
    ) || 0;

  const eta = (() => {
    const placed = new Date(order.createdAt as Date).getTime();
    if (Number.isNaN(placed)) return null;
    const days = order.orderStatus === 'shipped' ? 1 : order.orderStatus === 'processing' ? 3 : 4;
    return new Date(placed + days * 86400000);
  })();

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link
        href="/user/orders"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-primary text-sm mb-6 transition"
      >
        <FiArrowLeft /> Back to my orders
      </Link>
      <div className="bg-dark-700/50 border border-white/10 rounded-2xl p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">
              Order #{order.id.slice(0, 8).toUpperCase()}
            </h1>
            <p className="text-gray-400 text-sm">
              Placed{' '}
              {order.createdAt instanceof Date
                ? order.createdAt.toLocaleDateString('en-EG', { dateStyle: 'medium' })
                : ''}
            </p>
          </div>
          <span className="px-3 py-1 bg-primary/15 text-primary border border-primary/30 rounded-full text-xs capitalize">
            {order.orderStatus}
          </span>
        </div>
        {eta && order.orderStatus !== 'delivered' && order.orderStatus !== 'cancelled' && (
          <p className="text-gray-300 text-sm">
            Estimated delivery:{' '}
            <span className="text-white font-medium">
              {eta.toLocaleDateString('en-EG', { dateStyle: 'medium' })}
            </span>
          </p>
        )}
      </div>

      <div className="bg-dark-700/50 border border-white/10 rounded-2xl p-6 mb-6">
        <h2 className="text-white font-semibold mb-5">Order status</h2>
        <OrderStatusTimeline status={order.orderStatus} />
      </div>

      <div className="bg-dark-700/50 border border-white/10 rounded-2xl p-6 mb-6">
        <h2 className="text-white font-semibold mb-3">Items</h2>
        <div className="space-y-2 text-sm">
          {(order.items as any[]).map((it, i) => (
            <div key={i} className="flex justify-between gap-3 text-gray-300">
              <span>
                {it.productName} × {it.quantity}
              </span>
              <span>{it.price * it.quantity} EGP</span>
            </div>
          ))}
          <div className="border-t border-white/10 mt-3 pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Subtotal</span>
              <span>{subtotal} EGP</span>
            </div>
            {order.discountAmount ? (
              <div className="flex justify-between text-green-400">
                <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
                <span>−{order.discountAmount} EGP</span>
              </div>
            ) : null}
            <div className="flex justify-between text-white font-semibold pt-1">
              <span>Total</span>
              <span>{order.total} EGP</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-dark-700/50 border border-white/10 rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-3">Delivery to</h2>
        <p className="text-gray-300 text-sm">{order.shippingAddress?.fullName}</p>
        <p className="text-gray-400 text-sm">{order.shippingAddress?.address}</p>
        <p className="text-gray-400 text-sm">
          {order.shippingAddress?.city}, {order.shippingAddress?.governorate}
        </p>
        <p className="text-gray-400 text-sm">{order.shippingAddress?.phone}</p>
      </div>
    </div>
  );
}
