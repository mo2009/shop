'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, getDoc, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';
import { FiSearch, FiX, FiShield, FiShieldOff } from 'react-icons/fi';

type OrderRow = {
  userId?: string;
  userEmail?: string;
  total?: number;
  orderStatus?: string;
  createdAt?: { seconds?: number };
};

type UserDoc = {
  uid: string;
  email?: string;
  displayName?: string;
  isAdmin?: boolean;
  createdAt?: { seconds?: number } | string | Date;
};

type Customer = {
  uid: string;
  email: string;
  name: string;
  isAdmin: boolean;
  joinedAt: number;
  orders: number;
  spent: number;
  lastOrderAt: number;
};

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busyUid, setBusyUid] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [usersSnap, ordersSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'orders')),
      ]);
      const orderRows = ordersSnap.docs.map(d => d.data() as OrderRow);
      const userDocs: UserDoc[] = usersSnap.docs.map(d => ({
        uid: d.id,
        ...(d.data() as Omit<UserDoc, 'uid'>),
      }));

      // Aggregate orders per uid, falling back to email if uid missing.
      const byUid = new Map<string, { orders: number; spent: number; lastOrderAt: number }>();
      const byEmail = new Map<string, { orders: number; spent: number; lastOrderAt: number }>();
      orderRows.forEach(o => {
        if (o.orderStatus === 'cancelled') return;
        const total = o.total || 0;
        const ts = (o.createdAt?.seconds || 0) * 1000;
        if (o.userId) {
          const e = byUid.get(o.userId) || { orders: 0, spent: 0, lastOrderAt: 0 };
          e.orders += 1;
          e.spent += total;
          if (ts > e.lastOrderAt) e.lastOrderAt = ts;
          byUid.set(o.userId, e);
        } else if (o.userEmail) {
          const e = byEmail.get(o.userEmail) || { orders: 0, spent: 0, lastOrderAt: 0 };
          e.orders += 1;
          e.spent += total;
          if (ts > e.lastOrderAt) e.lastOrderAt = ts;
          byEmail.set(o.userEmail, e);
        }
      });

      const list: Customer[] = userDocs.map(u => {
        const stats = byUid.get(u.uid) ||
          (u.email ? byEmail.get(u.email) : undefined) || { orders: 0, spent: 0, lastOrderAt: 0 };
        const joinedRaw = u.createdAt as { seconds?: number } | string | Date | undefined;
        let joinedAt = 0;
        if (joinedRaw && typeof joinedRaw === 'object' && 'seconds' in joinedRaw && typeof joinedRaw.seconds === 'number') {
          joinedAt = joinedRaw.seconds * 1000;
        } else if (joinedRaw instanceof Date) {
          joinedAt = joinedRaw.getTime();
        } else if (typeof joinedRaw === 'string') {
          const d = new Date(joinedRaw);
          if (!Number.isNaN(d.getTime())) joinedAt = d.getTime();
        }
        return {
          uid: u.uid,
          email: u.email || '',
          name: u.displayName || u.email || '—',
          isAdmin: u.isAdmin === true,
          joinedAt,
          orders: stats.orders,
          spent: stats.spent,
          lastOrderAt: stats.lastOrderAt,
        };
      });

      list.sort((a, b) => {
        if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1;
        if (b.spent !== a.spent) return b.spent - a.spent;
        return b.joinedAt - a.joinedAt;
      });
      setCustomers(list);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load customers');
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      c =>
        c.email.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.uid.toLowerCase().includes(q),
    );
  }, [customers, search]);

  const toggleAdmin = async (c: Customer) => {
    const becomingAdmin = !c.isAdmin;
    const action = becomingAdmin ? 'make this user an admin' : 'remove admin access from this user';
    const entered = window.prompt(
      `Enter the admin verification password to ${action}.\nThis password is editable only directly in Firestore at settings/site.adminVerifyPassword.`,
    );
    if (entered === null) return;

    setBusyUid(c.uid);
    try {
      const settingsSnap = await getDoc(doc(db, 'settings', 'site'));
      const stored = settingsSnap.exists()
        ? ((settingsSnap.data() as Record<string, unknown>).adminVerifyPassword as string | undefined)
        : undefined;
      if (!stored) {
        toast.error(
          'Admin verification password is not set. Add it directly in Firestore at settings/site.adminVerifyPassword.',
        );
        return;
      }
      if (entered !== stored) {
        toast.error('Incorrect verification password');
        return;
      }
      await updateDoc(doc(db, 'users', c.uid), { isAdmin: becomingAdmin });
      toast.success(becomingAdmin ? `${c.name} is now an admin` : `${c.name} is no longer an admin`);
      setCustomers(prev =>
        prev.map(x => (x.uid === c.uid ? { ...x, isAdmin: becomingAdmin } : x)),
      );
    } catch (e) {
      console.error(e);
      toast.error('Failed to update admin status');
    }
    setBusyUid(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-white">Customers</h1>
        <p className="text-xs text-gray-500">
          Admin access changes require a password set in Firestore at <code className="text-gray-300">settings/site.adminVerifyPassword</code>
        </p>
      </div>

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
                <th className="text-right py-3 px-4 font-medium">Admin</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr
                  key={c.uid}
                  className="border-b border-white/5 hover:bg-white/[0.03] transition"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white">{c.name}</p>
                      <span className="inline-flex items-center bg-primary/15 text-primary text-[11px] font-semibold px-2 py-0.5 rounded-full border border-primary/30">
                        {c.orders} {c.orders === 1 ? 'order' : 'orders'}
                      </span>
                      {c.isAdmin && (
                        <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-300 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-amber-500/30">
                          <FiShield size={11} /> Admin
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-xs">{c.email || c.uid}</p>
                  </td>
                  <td className="py-3 px-4 text-right text-white">{c.orders}</td>
                  <td className="py-3 px-4 text-right text-secondary font-bold">{c.spent} EGP</td>
                  <td className="py-3 px-4 text-right text-gray-400">
                    {c.lastOrderAt
                      ? new Date(c.lastOrderAt).toLocaleDateString('en-EG', { dateStyle: 'medium' })
                      : '—'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => toggleAdmin(c)}
                      disabled={busyUid === c.uid}
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition disabled:opacity-50 ${
                        c.isAdmin
                          ? 'bg-red-500/10 text-red-300 border-red-500/30 hover:bg-red-500/20'
                          : 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20'
                      }`}
                    >
                      {c.isAdmin ? (
                        <>
                          <FiShieldOff size={12} /> Remove admin
                        </>
                      ) : (
                        <>
                          <FiShield size={12} /> Make admin
                        </>
                      )}
                    </button>
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
