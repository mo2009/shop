'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import {
  FiUsers,
  FiShoppingBag,
  FiDollarSign,
  FiPackage,
  FiClock,
  FiTrendingUp,
  FiTrendingDown,
  FiAlertTriangle,
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
  hiddenFromAdmin?: boolean;
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

type LowStockProduct = { id: string; name: string; stockQuantity: number };

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [productsCount, setProductsCount] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [ordersSnap, productsSnap] = await Promise.all([
          getDocs(collection(db, 'orders')),
          getDocs(collection(db, 'products')),
        ]);
        setOrders(
          ordersSnap.docs
            .map(d => ({ ...(d.data() as Order), id: d.id }))
            .filter(o => o.hiddenFromAdmin !== true),
        );
        setProductsCount(productsSnap.size);
        const low = productsSnap.docs
          .map(d => {
            const data = d.data() as { name?: string; stockQuantity?: number };
            return { id: d.id, name: data.name || 'Untitled', stockQuantity: data.stockQuantity ?? -1 };
          })
          .filter(p => p.stockQuantity >= 0 && p.stockQuantity <= 5)
          .sort((a, b) => a.stockQuantity - b.stockQuantity);
        setLowStock(low);
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
        .filter(o => o.orderStatus === 'pending' || o.orderStatus === 'processing')
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        .slice(0, 10),
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

      {lowStock.length > 0 && (
        <div className="glass border border-amber-500/30 bg-amber-500/5 rounded-2xl p-4 mb-6 animate-fade-up">
          <div className="flex items-start gap-3">
            <FiAlertTriangle className="text-amber-400 mt-0.5 flex-shrink-0" size={18} />
            <div className="flex-1 min-w-0">
              <p className="text-amber-300 font-medium text-sm">
                Low stock — {lowStock.length} product{lowStock.length === 1 ? '' : 's'} need restocking
              </p>
              <ul className="mt-2 space-y-1 text-xs text-amber-200/80">
                {lowStock.slice(0, 6).map(p => (
                  <li key={p.id} className="flex items-center justify-between gap-3">
                    <Link
                      href="/admin/products"
                      className="truncate hover:text-amber-100"
                    >
                      {p.name}
                    </Link>
                    <span className="font-mono">
                      {p.stockQuantity === 0 ? 'Out of stock' : `${p.stockQuantity} left`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

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
          <h2 className="text-lg font-semibold text-white tracking-tight">Pending &amp; Processing Orders</h2>
          <button
            onClick={async () => {
              if (
                !confirm(
                  'Clear delivered orders from the admin view? A spreadsheet of the last 30 days of delivered orders will be downloaded first. Customers still see their own orders.',
                )
              )
                return;
              try {
                const { getDocs, collection, updateDoc, doc } = await import('firebase/firestore');
                const snap = await getDocs(collection(db, 'orders'));
                const allDocs = snap.docs.map(d => ({ id: d.id, data: d.data() as Record<string, unknown> }));
                const isDeliveredVisible = (data: Record<string, unknown>) =>
                  data.orderStatus === 'delivered' && data.hiddenFromAdmin !== true;

                const visibleDelivered = allDocs.filter(({ data }) => isDeliveredVisible(data));
                if (visibleDelivered.length === 0) {
                  alert('No delivered orders to clear.');
                  return;
                }

                // Export delivered orders from the last 30 days to a CSV before hiding.
                const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
                const recent = visibleDelivered.filter(({ data }) => {
                  const ts = (data.createdAt as { seconds?: number } | undefined)?.seconds;
                  return typeof ts === 'number' && ts * 1000 >= cutoff;
                });
                if (recent.length > 0) {
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
                    'Items',
                  ];
                  const escape = (v: unknown) => {
                    const s = v === null || v === undefined ? '' : String(v);
                    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
                    return s;
                  };
                  const lines = [headers.join(',')];
                  recent.forEach(({ id, data }) => {
                    const o = data as {
                      userName?: string;
                      userEmail?: string;
                      total?: number;
                      discountAmount?: number;
                      couponCode?: string;
                      paymentMethod?: string;
                      paymentStatus?: string;
                      orderStatus?: string;
                      shippingAddress?: { phone?: string; city?: string; governorate?: string; address?: string };
                      items?: Array<{ productName?: string; quantity?: number }>;
                      createdAt?: { seconds?: number };
                    };
                    const ts = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : null;
                    const itemsStr = (o.items || [])
                      .map(it => `${it.productName ?? ''} x${it.quantity ?? 1}`)
                      .join(' | ');
                    const row = [
                      `#${id.slice(0, 8).toUpperCase()}`,
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
                      itemsStr,
                    ].map(escape);
                    lines.push(row.join(','));
                  });
                  // Prepend BOM so Excel auto-detects UTF-8 (Arabic city/address fields render correctly).
                  const blob = new Blob(['\ufeff' + lines.join('\n')], {
                    type: 'text/csv;charset=utf-8;',
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `delivered-orders-last-30d-${new Date().toISOString().slice(0, 10)}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }

                await Promise.all(
                  visibleDelivered.map(({ id }) =>
                    updateDoc(doc(db, 'orders', id), { hiddenFromAdmin: true }),
                  ),
                );
                setOrders(prev => prev.filter(o => o.orderStatus !== 'delivered'));
                alert(
                  `Cleared ${visibleDelivered.length} delivered order(s) from the admin view. ${recent.length} downloaded to CSV. Customers can still see their orders.`,
                );
              } catch (e) {
                console.error(e);
                alert('Failed to clear delivered orders.');
              }
            }}
            className="px-3 py-1.5 bg-red-500/15 text-red-400 border border-red-500/30 rounded-lg text-xs hover:bg-red-500/25 transition"
          >
            Clear Delivered Orders
          </button>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-gray-400">No pending or processing orders.</p>
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
