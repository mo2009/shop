'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';
import { FiCheck, FiX } from 'react-icons/fi';

export default function AdminPayments() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPendingPayments = async () => {
    const snap = await getDocs(collection(db, 'orders'));
    const instapayOrders = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter((o: any) => o.paymentMethod === 'instapay')
      .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    setOrders(instapayOrders);
    setLoading(false);
  };

  useEffect(() => { fetchPendingPayments(); }, []);

  const handlePayment = async (orderId: string, status: 'confirmed' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        paymentStatus: status,
        orderStatus: status === 'confirmed' ? 'pending' : 'cancelled',
      });
      toast.success(`Payment ${status}`);
      fetchPendingPayments();
    } catch (err) {
      toast.error('Failed to update payment');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Instapay Payments</h1>
      <p className="text-gray-400 mb-6">Review and approve Instapay payment references</p>

      {orders.length === 0 ? (
        <p className="text-gray-400 text-center py-20">No Instapay orders.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => (
            <div key={order.id} className="bg-dark-700/50 border border-white/10 rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
               <div>
  <p className="text-xs font-mono text-primary mb-1">
    #{order.id.slice(0, 8).toUpperCase()}
  </p>
  <p className="text-white font-semibold">{order.userName || order.userEmail}</p>
  <p className="text-gray-400 text-sm">{order.userEmail}</p>
</div>
                <div className="text-right">
                  <p className="text-secondary font-bold text-lg">{order.total} EGP</p>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs mt-1 ${
                    order.paymentStatus === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                    order.paymentStatus === 'rejected' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {order.paymentStatus}
                  </span>
                </div>
              </div>

              <div className="bg-dark-600 rounded-xl p-4 mb-4">
                <p className="text-gray-400 text-sm mb-1">Instapay Reference:</p>
                <p className="text-white font-mono text-lg">{order.instapayReference || 'No reference provided'}</p>
              </div>

              <div className="mb-4">
                <p className="text-gray-400 text-sm mb-1">Items:</p>
                {order.items?.map((item: any, i: number) => (
                  <p key={i} className="text-white text-sm">{item.productName} x{item.quantity}</p>
                ))}
              </div>

              {order.paymentStatus === 'pending' && (
                <div className="flex gap-3">
                  <button onClick={() => handlePayment(order.id, 'confirmed')}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl font-medium transition flex items-center justify-center gap-2">
                    <FiCheck /> Confirm Payment
                  </button>
                  <button onClick={() => handlePayment(order.id, 'rejected')}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl font-medium transition flex items-center justify-center gap-2">
                    <FiX /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
