'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FiUsers, FiShoppingBag, FiDollarSign, FiPackage, FiClock } from 'react-icons/fi';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ orders: 0, revenue: 0, products: 0, pendingPayments: 0 });
  const [activeUsers, setActiveUsers] = useState(0);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [ordersSnap, productsSnap] = await Promise.all([
          getDocs(collection(db, 'orders')),
          getDocs(collection(db, 'products')),
        ]);

        const orders = ordersSnap.docs.map(d => d.data());
        const revenue = orders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
        const pendingPayments = orders.filter((o: any) => o.paymentMethod === 'instapay' && o.paymentStatus === 'pending').length;

        setStats({
          orders: orders.length,
          revenue,
          products: productsSnap.size,
          pendingPayments,
        });

        setRecentOrders(ordersSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          .slice(0, 5)
        );
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }

    fetchStats();

    // Listen for active users (users who have been active in the last 5 minutes)
    const unsubscribe = onSnapshot(collection(db, 'activeUsers'), (snap) => {
      const fiveMinAgo = Date.now() - 5 * 60 * 1000;
      const active = snap.docs.filter(d => {
        const data = d.data();
        return data.lastSeen?.seconds * 1000 > fiveMinAgo;
      });
      setActiveUsers(active.length);
    });

    return () => unsubscribe();
  }, []);

  const statCards = [
    { icon: <FiShoppingBag size={24} />, label: 'Total Orders', value: stats.orders, color: 'text-primary' },
    { icon: <FiDollarSign size={24} />, label: 'Revenue', value: `${stats.revenue} EGP`, color: 'text-green-400' },
    { icon: <FiPackage size={24} />, label: 'Products', value: stats.products, color: 'text-secondary' },
    { icon: <FiUsers size={24} />, label: 'Active Users', value: activeUsers, color: 'text-cyan-400' },
    { icon: <FiClock size={24} />, label: 'Pending Payments', value: stats.pendingPayments, color: 'text-yellow-400' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((card, i) => (
          <div key={i} className="bg-dark-700/50 border border-white/10 rounded-2xl p-5">
            <div className={`${card.color} mb-2`}>{card.icon}</div>
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <p className="text-gray-400 text-sm">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-dark-700/50 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
  <h2 className="text-lg font-semibold text-white">Recent Orders</h2>
  <button
    onClick={async () => {
      if (!confirm('⚠️ This will permanently delete ALL orders. Are you sure?')) return;
      if (!confirm('This cannot be undone. Delete all orders?')) return;
      try {
        const { getDocs, collection, deleteDoc, doc } = await import('firebase/firestore');
        const snap = await getDocs(collection(db, 'orders'));
        await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'orders', d.id))));
        setRecentOrders([]);
        setStats(prev => ({ ...prev, orders: 0, revenue: 0, pendingPayments: 0 }));
        alert('All orders deleted.');
      } catch (e) {
        console.error(e);
        alert('Failed to delete orders.');
      }
    }}
    className="px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs hover:bg-red-500/30 transition"
  >
    Delete All Orders
  </button>
</div>
        {recentOrders.length === 0 ? (
          <p className="text-gray-400">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-white/10">
                  <th className="text-left py-3 px-2">Ref & Customer</th>
                  <th className="text-left py-3 px-2">Total</th>
                  <th className="text-left py-3 px-2">Payment</th>
                  <th className="text-left py-3 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order: any) => (
                  <tr key={order.id} className="border-b border-white/5">
           <td className="py-3 px-2">
  <div className="flex items-center gap-2">
    
    <span className="text-white">{order.userName || order.userEmail}</span>
    <span className="text-xs font-mono text-primary">#{order.id.slice(0, 8).toUpperCase()}</span>
    {order.paymentMethod === 'instapay' && order.paymentStatus !== 'confirmed' && (
      <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse flex-shrink-0" title="Awaiting payment confirmation" />
    )}
  </div>
</td>
                    <td className="py-3 px-2 text-secondary font-medium">{order.total} EGP</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${order.paymentMethod === 'instapay' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {order.paymentMethod === 'instapay' ? 'Instapay' : 'COD'}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        order.orderStatus === 'delivered' ? 'bg-green-500/20 text-green-400' :
                        order.orderStatus === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {order.orderStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
