'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  FiUsers,
  FiShoppingBag,
  FiDollarSign,
  FiPackage,
  FiClock,
  FiTrendingUp,
  FiTrendingDown,
} from 'react-icons/fi';
import Sparkline from '@/components/Sparkline';

type Order = {
  id: string;
  total?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  orderStatus?: string;
  userName?: string;
  userEmail?: string;
  createdAt?: { seconds?: number };
};

/** Bucket orders into the last `n` day-counts for a sparkline. */
function ordersByDay(orders: Order[], days: number) {
  const now = Date.now();
  const buckets = new Array(days).fill(0) as number[];
  for (const o of orders) {
    const ts = (o.createdAt?.seconds || 0) * 1000;
    if (!ts) continue;
    const ageDays = Math.floor((now - ts) / 86400000);
    if (ageDays < days) {
      buckets[days - 1 - ageDays] += 1;
    }
  }
  return buckets;
}

function revenueByDay(orders: Order[], days: number) {
  const now = Date.now();
  const buckets = new Array(days).fill(0) as number[];
  for (const o of orders) {
    const ts = (o.createdAt?.seconds || 0) * 1000;
    if (!ts) continue;
    const ageDays = Math.floor((now - ts) / 86400000);
    if (ageDays < days) {
      buckets[days - 1 - ageDays] += o.total || 0;
    }
  }
  return buckets;
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [productsCount, setProductsCount] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [ordersSnap, productsSnap] = await Promise.all([
          getDocs(collection(db, 'orders')),
          getDocs(collection(db, 'products')),
        ]);
        setOrders(ordersSnap.docs.map(d => ({ id: d.id, ...(d.data() as Order) })));
        setProductsCount(productsSnap.size);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    fetchAll();

    const unsubscribe = onSnapshot(collection(db, 'activeUsers'), snap => {
      const fiveMinAgo = Date.now() - 5 * 60 * 1000;
      const active = snap.docs.filter(d => {
        const data = d.data();
        return (data.lastSeen?.seconds || 0) * 1000 > fiveMinAgo;
      });
      setActiveUsers(active.length);
    });

    return () => unsubscribe();
  }, []);

  const revenue = useMemo(
    () => orders.reduce((sum, o) => sum + (o.total || 0), 0),
    [orders],
  );
  const pendingPayments = useMemo(
    () => orders.filter(o => o.paymentMethod === 'instapay' && o.paymentStatus !== 'confirmed').length,
    [orders],
  );

  const ordersTrend = useMemo(() => ordersByDay(orders, 14), [orders]);
  const revenueTrend = useMemo(() => revenueByDay(orders, 14), [orders]);

  const trendDelta = (arr: number[]) => {
    const half = Math.floor(arr.length / 2);
    const prev = arr.slice(0, half).reduce((a, b) => a + b, 0);
    const curr = arr.slice(half).reduce((a, b) => a + b, 0);
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const ordersDelta = trendDelta(ordersTrend);
  const revenueDelta = trendDelta(revenueTrend);

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        .slice(0, 5),
    [orders],
  );

  const statCards = [
    {
      icon: <FiShoppingBag size={20} />,
      label: 'Total Orders',
      value: orders.length.toString(),
      color: '#2196F3',
      trend: ordersTrend,
      delta: ordersDelta,
    },
    {
      icon: <FiDollarSign size={20} />,
      label: 'Revenue',
      value: `${revenue} EGP`,
      color: '#4ade80',
      trend: revenueTrend,
      delta: revenueDelta,
    },
    {
      icon: <FiPackage size={20} />,
      label: 'Products',
      value: productsCount.toString(),
      color: '#f59e0b',
      trend: null,
      delta: null,
    },
    {
      icon: <FiUsers size={20} />,
      label: 'Active Users',
      value: activeUsers.toString(),
      color: '#22d3ee',
      trend: null,
      delta: null,
    },
    {
      icon: <FiClock size={20} />,
      label: 'Pending Payments',
      value: pendingPayments.toString(),
      color: '#fbbf24',
      trend: null,
      delta: null,
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton h-[120px] rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 animate-fade-up">
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-gray-400 text-sm">Store overview at a glance.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((card, i) => (
          <div
            key={i}
            className="glass border border-white/10 rounded-2xl p-5 animate-fade-up"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${card.color}22`, color: card.color }}
              >
                {card.icon}
              </div>
              {card.delta !== null && (
                <span
                  className={`flex items-center gap-1 text-xs font-medium ${
                    card.delta >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {card.delta >= 0 ? <FiTrendingUp size={12} /> : <FiTrendingDown size={12} />}
                  {Math.abs(card.delta)}%
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <p className="text-gray-400 text-sm">{card.label}</p>
            {card.trend && (
              <div className="mt-3 -mx-1">
                <Sparkline data={card.trend} color={card.color} height={30} width={160} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="glass border border-white/10 rounded-2xl p-6 animate-fade-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white tracking-tight">Recent Orders</h2>
          <button
            onClick={async () => {
              if (!confirm('⚠️ This will permanently delete ALL orders. Are you sure?')) return;
              if (!confirm('This cannot be undone. Delete all orders?')) return;
              try {
                const { getDocs, collection, deleteDoc, doc } = await import('firebase/firestore');
                const snap = await getDocs(collection(db, 'orders'));
                await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'orders', d.id))));
                setOrders([]);
                alert('All orders deleted.');
              } catch (e) {
                console.error(e);
                alert('Failed to delete orders.');
              }
            }}
            className="px-3 py-1.5 bg-red-500/15 text-red-400 border border-red-500/30 rounded-lg text-xs hover:bg-red-500/25 transition"
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
                  <th className="text-left py-3 px-2 font-medium">Ref &amp; Customer</th>
                  <th className="text-left py-3 px-2 font-medium">Total</th>
                  <th className="text-left py-3 px-2 font-medium">Payment</th>
                  <th className="text-left py-3 px-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(order => (
                  <tr
                    key={order.id}
                    className="border-b border-white/5 hover:bg-white/[0.03] transition"
                  >
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <span className="text-white">{order.userName || order.userEmail}</span>
                        <span className="text-xs font-mono text-primary">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                        {order.paymentMethod === 'instapay' && order.paymentStatus !== 'confirmed' && (
                          <span
                            className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse flex-shrink-0"
                            title="Awaiting payment confirmation"
                          />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-secondary font-medium">{order.total} EGP</td>
                    <td className="py-3 px-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          order.paymentMethod === 'instapay'
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}
                      >
                        {order.paymentMethod === 'instapay' ? 'Instapay' : 'COD'}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          order.orderStatus === 'delivered'
                            ? 'bg-green-500/20 text-green-300'
                            : order.orderStatus === 'cancelled'
                            ? 'bg-red-500/20 text-red-300'
                            : 'bg-yellow-500/20 text-yellow-300'
                        }`}
                      >
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
