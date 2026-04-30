'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';
import { FiCheck, FiX, FiSearch } from 'react-icons/fi';

type TabId = 'pending' | 'reviewed';

export default function AdminPayments() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>('pending');
  const [search, setSearch] = useState('');

  const fetchPendingPayments = async () => {
    const snap = await getDocs(collection(db, 'orders'));
    const instapayOrders = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter((o: any) => o.paymentMethod === 'instapay' && o.hiddenFromAdmin !== true)
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

  const isReviewed = (o: any) =>
    o.paymentStatus === 'confirmed' || o.paymentStatus === 'rejected';

  const pendingCount = orders.filter(o => !isReviewed(o)).length;
  const reviewedCount = orders.filter(isReviewed).length;

  const q = search.trim().toLowerCase().replace(/^#/, '');
  const visible = orders.filter((o: any) => {
    if (q) {
      const id: string = o.id || '';
      return id.toLowerCase().includes(q);
    }
    return tab === 'pending' ? !isReviewed(o) : isReviewed(o);
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Instapay Payments</h1>
      <p className="text-gray-400 mb-6">Review and approve Instapay payment references</p>

      <div className="relative mb-4">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by reference number (e.g. A1B2C3D4)"
          aria-label="Search payments by reference number"
          className="w-full bg-dark-700/60 border border-white/10 rounded-xl pl-10 pr-9 py-2.5 text-white placeholder-gray-500 focus:border-primary focus:outline-none transition"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
          >
            <FiX size={16} />
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-6 border-b border-white/10">
        {(
          [
            { id: 'pending' as TabId, label: 'Pending review', count: pendingCount },
            { id: 'reviewed' as TabId, label: 'Reviewed', count: reviewedCount },
          ]
        ).map(t => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 -mb-px transition ${
                active
                  ? 'border-primary text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {t.label}
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  active ? 'bg-primary/20 text-primary' : 'bg-white/5 text-gray-400'
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="text-gray-400 text-center py-20">
          {q
            ? `No payments found for reference \u201c${search}\u201d.`
            : tab === 'pending'
            ? 'No payments waiting for review.'
            : 'No payments have been confirmed or rejected yet.'}
        </p>
      ) : (
        <div className="space-y-4">
          {visible.map((order: any) => (
            <div key={order.id} className="bg-dark-700/50 border border-white/10 rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
               <div>
  <p className="text-xs font-mono text-primary mb-1">
    #{order.id.slice(0, 8).toUpperCase()}
  </p>
  <p className="text-white font-semibold">{order.userName || order.userEmail}</p>
  <p className="text-gray-400 text-sm">{order.userEmail}</p>
  {order.shippingAddress?.phone && (
    <p className="text-gray-400 text-sm">
      <a
        href={`tel:${order.shippingAddress.phone}`}
        className="hover:text-primary transition"
      >
        {order.shippingAddress.phone}
      </a>
    </p>
  )}
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
