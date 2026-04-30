'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { FiClock, FiCheck, FiX, FiActivity } from 'react-icons/fi';
import OrderStatusTimeline from '@/components/OrderStatusTimeline';

export default function UserOrders() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    if (!user) return;
    const snap = await getDocs(collection(db, 'orders'));
    const data = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter((o: any) => o.userId === user.uid)
      .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    setOrders(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && user) fetchOrders();
  }, [authLoading, user]);

  const cancelOrder = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { orderStatus: 'cancelled' });
      toast.success('Order cancelled');
      fetchOrders();
    } catch (e) {
      toast.error('Failed to cancel');
    }
  };

  if (authLoading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <p className="text-center py-20 text-gray-400">Please sign in to view your orders.</p>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-white mb-6">My Orders</h1>
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : orders.length === 0 ? (
        <p className="text-gray-400 text-center py-20">You have no orders yet.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => {
            const isInstapay = order.paymentMethod === 'instapay';
            const paymentStatus = order.paymentStatus;

            return (
              <div key={order.id} className="bg-dark-700/50 border border-white/10 rounded-2xl p-5">

                {/* Order header */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-white font-semibold text-sm">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('en-EG', { dateStyle: 'medium' }) : 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-secondary font-bold">{order.total} EGP</p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs mt-1 capitalize ${
                      order.orderStatus === 'delivered' ? 'bg-green-500/20 text-green-400' :
                      order.orderStatus === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                      order.orderStatus === 'shipped' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {order.orderStatus}
                    </span>
                  </div>
                </div>

                {/* Status timeline */}
                <div className="my-4">
                  <OrderStatusTimeline status={order.orderStatus} />
                </div>

                {/* Items */}
                <div className="mb-3">
                  {order.items?.map((item: any, i: number) => (
                    <p key={i} className="text-gray-300 text-sm">{item.productName} x{item.quantity} — {item.price * item.quantity} EGP</p>
                  ))}
                </div>

                {order.couponCode && (
                  <p className="text-gray-400 text-xs mb-2">
                    Coupon applied: <span className="font-mono text-primary">{order.couponCode}</span>
                    {order.discountAmount ? ` (−${order.discountAmount} EGP)` : ''}
                  </p>
                )}

                {/* Instapay payment status banner */}
                {isInstapay && (
                  <div className={`rounded-xl p-3 mb-3 flex items-center gap-3 ${
                    paymentStatus === 'confirmed' ? 'bg-green-500/10 border border-green-500/30' :
                    paymentStatus === 'rejected' ? 'bg-red-500/10 border border-red-500/30' :
                    'bg-yellow-500/10 border border-yellow-500/30'
                  }`}>
                    {paymentStatus === 'confirmed' ? (
                      <FiCheck className="text-green-400 flex-shrink-0" size={18} />
                    ) : paymentStatus === 'rejected' ? (
                      <FiX className="text-red-400 flex-shrink-0" size={18} />
                    ) : (
                      <FiClock className="text-yellow-400 flex-shrink-0" size={18} />
                    )}
                    <div>
                      <p className={`text-sm font-medium ${
                        paymentStatus === 'confirmed' ? 'text-green-400' :
                        paymentStatus === 'rejected' ? 'text-red-400' :
                        'text-yellow-400'
                      }`}>
                        {paymentStatus === 'confirmed' ? 'Payment Confirmed' :
                         paymentStatus === 'rejected' ? 'Payment Rejected' :
                         'Payment Pending Review'}
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        {paymentStatus === 'confirmed' ? 'Your Instapay payment has been approved and your order is being processed.' :
                         paymentStatus === 'rejected' ? 'Your Instapay payment was rejected. Please contact support.' :
                         'Your Instapay reference is being reviewed. This usually takes a few hours.'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mt-1">
                  <Link
                    href={`/user/orders/${order.id}/tracking`}
                    className="px-3 py-1.5 bg-primary/15 text-primary border border-primary/30 rounded-lg text-sm hover:bg-primary/25 transition inline-flex items-center gap-1.5"
                  >
                    <FiActivity size={14} /> Track order
                  </Link>
                  {order.orderStatus === 'pending' && (
                    <button
                      onClick={() => cancelOrder(order.id)}
                      className="px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm hover:bg-red-500/30 transition"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}