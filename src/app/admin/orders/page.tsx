'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';
import { FiSearch, FiX, FiDownload } from 'react-icons/fi';

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    const snap = await getDocs(collection(db, 'orders'));
    const data = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter((o: any) => {
        // Honor the dashboard "Delete All Orders" soft-clear flag.
        if (o.hiddenFromAdmin === true) return false;
        // Hide instapay orders that are not confirmed yet
        if (o.paymentMethod === 'instapay' && o.paymentStatus !== 'confirmed') return false;
        return true;
      });
    data.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    setOrders(data);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { orderStatus: status });
      toast.success(`Order marked as ${status}`);
      fetchOrders();
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const exportCsv = () => {
    if (orders.length === 0) {
      toast.error('No orders to export');
      return;
    }
    const headers = [
      'Reference',
      'Date',
      'Customer',
      'Email',
      'Phone',
      'Total',
      'Discount',
      'Coupon',
      'Payment Method',
      'Payment Status',
      'Order Status',
      'City',
      'Governorate',
      'Address',
    ];
    const escape = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [headers.join(',')];
    orders.forEach((o: any) => {
      const ts = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : null;
      const row = [
        `#${(o.id || '').slice(0, 8).toUpperCase()}`,
        ts ? ts.toISOString() : '',
        o.userName || '',
        o.userEmail || '',
        o.shippingAddress?.phone || '',
        o.total ?? '',
        o.discountAmount ?? '',
        o.couponCode || '',
        o.paymentMethod || '',
        o.paymentStatus || '',
        o.orderStatus || '',
        o.shippingAddress?.city || '',
        o.shippingAddress?.governorate || '',
        o.shippingAddress?.address || '',
      ].map(escape);
      lines.push(row.join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Orders</h1>
        <button
          onClick={exportCsv}
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-3 py-2 rounded-xl text-sm transition"
        >
          <FiDownload size={16} /> Export CSV
        </button>
      </div>

      <div className="relative mb-4">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by reference number (e.g. A1B2C3D4)"
          aria-label="Search orders by reference number"
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

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(tab => (
          <button key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-3 py-1 rounded ${selectedTab === tab ? 'bg-primary text-white' : 'bg-dark-600 text-gray-400 hover:text-white'}`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
        <select value={selectedPayment} onChange={e => setSelectedPayment(e.target.value)} className="p-1 bg-dark-600 text-gray-400 rounded">
          <option value="all">All Payments</option>
          <option value="instapay">Instapay</option>
          <option value="cod">COD</option>
        </select>
      </div>

      {orders.length === 0 ? (
        <p className="text-gray-400 text-center py-20">No orders yet.</p>
      ) : (() => {
        const q = search.trim().toLowerCase().replace(/^#/, '');
        const visible = orders.filter((order: any) => {
          if (q) {
            const id: string = order.id || '';
            if (!id.toLowerCase().includes(q)) return false;
            return true; // Search bypasses status/payment filters
          }
          const statusOk =
            selectedTab === 'all'
              ? ['pending', 'processing'].includes(order.orderStatus)
              : order.orderStatus === selectedTab;
          const paymentOk = selectedPayment === 'all' || order.paymentMethod === selectedPayment;
          return statusOk && paymentOk;
        });

        if (visible.length === 0) {
          return (
            <p className="text-gray-400 text-center py-20">
              {q ? `No orders found for reference “${search}”.` : 'No orders match the current filters.'}
            </p>
          );
        }

        return (
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
  <p className="text-gray-500 text-xs mt-1">
    {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('en-EG', { dateStyle: 'medium' }) : 'N/A'}
  </p>
</div>
                  <div className="text-right">
                    <p className="text-secondary font-bold text-lg">{order.total} EGP</p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs mt-1 ${order.paymentMethod === 'instapay' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {order.paymentMethod === 'instapay' ? 'Instapay' : 'COD'}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-gray-400 text-sm mb-1">Items:</p>
                  {order.items?.map((item: any, i: number) => (
                    <p key={i} className="text-white text-sm">{item.productName} x{item.quantity} — {item.price * item.quantity} EGP</p>
                  ))}
                </div>

                <div className="mb-4">
                  <p className="text-gray-400 text-sm mb-1">Shipping:</p>
                  <p className="text-white text-sm">
                    {order.shippingAddress?.fullName}, {order.shippingAddress?.phone}<br />
                    {order.shippingAddress?.address}, {order.shippingAddress?.city}, {order.shippingAddress?.governorate}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-gray-400 text-sm mr-2">Status:</span>
                  {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(status => (
                    <button key={status} onClick={() => updateStatus(order.id, status)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition ${order.orderStatus === status
                        ? status === 'delivered' ? 'bg-green-500 text-white'
                          : status === 'cancelled' ? 'bg-red-500 text-white'
                          : 'bg-primary text-white'
                        : 'bg-dark-600 text-gray-400 hover:text-white'}`}>
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            ))}
        </div>
        );
      })()}
    </div>
  );
}