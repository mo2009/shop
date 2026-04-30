'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FiSearch, FiX } from 'react-icons/fi';

type OrderRow = {
  userId?: string;
  userEmail?: string;
  userName?: string;
  total?: number;
  orderStatus?: string;
  paymentStatus?: string;
  hiddenFromAdmin?: boolean;
  createdAt?: { seconds?: number };
};

type Customer = {
  userId: string;
  email: string;
  name: string;
  orders: number;
  spent: number;
  lastOrderAt: number;
};

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'orders'));
        const rows = snap.docs.map(d => d.data() as OrderRow);
        const map = new Map<string, Customer>();
        rows.forEach(o => {
          // Customers stick around even after the admin clears their orders
          // from the dashboard view, so we intentionally do NOT skip
          // hiddenFromAdmin here. We still skip cancelled orders for
          // spend / order-count purposes.
          if (o.orderStatus === 'cancelled') return;
          const key = o.userId || o.userEmail || '';
          if (!key) return;
          const existing = map.get(key);
          const total = o.total || 0;
          const ts = (o.createdAt?.seconds || 0) * 1000;
          if (existing) {
            existing.orders += 1;
            existing.spent += total;
            if (ts > existing.lastOrderAt) existing.lastOrderAt = ts;
          } else {
            map.set(key, {
              userId: o.userId || '',
              email: o.userEmail || '',
              name: o.userName || o.userEmail || '—',
              orders: 1,
              spent: total,
              lastOrderAt: ts,
            });
          }
        });
        const list = Array.from(map.values()).sort((a, b) => b.spent - a.spent);
        setCustomers(list);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      c =>
        c.email.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.userId.toLowerCase().includes(q),
    );
  }, [customers, search]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Customers</h1>

      <div className="relative mb-6">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, or user id"
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

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-center py-20">
          {search ? 'No customers match your search.' : 'No customers yet.'}
        </p>
      ) : (
        <div className="overflow-x-auto bg-dark-700/40 border border-white/10 rounded-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-white/10">
                <th className="text-left py-3 px-4 font-medium">Customer</th>
                <th className="text-right py-3 px-4 font-medium">Orders</th>
                <th className="text-right py-3 px-4 font-medium">Lifetime spend</th>
                <th className="text-right py-3 px-4 font-medium">Last order</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr
                  key={c.userId || c.email}
                  className="border-b border-white/5 hover:bg-white/[0.03] transition"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white">{c.name}</p>
                      <span className="inline-flex items-center bg-primary/15 text-primary text-[11px] font-semibold px-2 py-0.5 rounded-full border border-primary/30">
                        {c.orders} {c.orders === 1 ? 'order' : 'orders'}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs">{c.email}</p>
                  </td>
                  <td className="py-3 px-4 text-right text-white">{c.orders}</td>
                  <td className="py-3 px-4 text-right text-secondary font-bold">{c.spent} EGP</td>
                  <td className="py-3 px-4 text-right text-gray-400">
                    {c.lastOrderAt
                      ? new Date(c.lastOrderAt).toLocaleDateString('en-EG', { dateStyle: 'medium' })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
