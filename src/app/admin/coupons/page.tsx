'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Coupon } from '@/lib/types';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';

interface CouponForm {
  code: string;
  type: 'percent' | 'flat';
  value: string;
  minOrder: string;
  maxUses: string;
  expiresAt: string;
  active: boolean;
}

const empty: CouponForm = {
  code: '',
  type: 'percent',
  value: '',
  minOrder: '',
  maxUses: '',
  expiresAt: '',
  active: true,
};

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState<CouponForm>(empty);

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'coupons'));
      const list = snap.docs.map(d => {
        const data = d.data() as Record<string, unknown>;
        const ts = data.createdAt as Timestamp | undefined;
        return {
          id: d.id,
          ...data,
          createdAt: ts?.toDate ? ts.toDate() : undefined,
        } as Coupon;
      });
      list.sort((a, b) =>
        (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0),
      );
      setCoupons(list);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(empty);
    setShowModal(true);
  };

  const openEdit = (c: Coupon) => {
    setEditing(c);
    setForm({
      code: c.code,
      type: c.type,
      value: String(c.value),
      minOrder: c.minOrder ? String(c.minOrder) : '',
      maxUses: c.maxUses ? String(c.maxUses) : '',
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
      active: c.active,
    });
    setShowModal(true);
  };

  const save = async () => {
    const code = form.code.trim().toUpperCase();
    const value = Number(form.value);
    if (!code) return toast.error('Code is required');
    if (!value || value <= 0) return toast.error('Value must be greater than 0');
    if (form.type === 'percent' && value > 100) {
      return toast.error('Percentage cannot exceed 100');
    }
    const minOrder = Number(form.minOrder) || 0;
    const maxUses = Number(form.maxUses) || 0;
    const data: Record<string, unknown> = {
      code,
      type: form.type,
      value,
      minOrder,
      maxUses,
      active: form.active,
      expiresAt: form.expiresAt ? new Date(form.expiresAt + 'T23:59:59').toISOString() : '',
    };
    try {
      if (editing) {
        await updateDoc(doc(db, 'coupons', editing.id), data);
        toast.success('Coupon updated');
      } else {
        await addDoc(collection(db, 'coupons'), {
          ...data,
          uses: 0,
          createdAt: serverTimestamp(),
        });
        toast.success('Coupon created');
      }
      setShowModal(false);
      load();
    } catch (e) {
      console.error(e);
      toast.error('Failed to save coupon');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this coupon?')) return;
    try {
      await deleteDoc(doc(db, 'coupons', id));
      toast.success('Coupon deleted');
      load();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const toggleActive = async (c: Coupon) => {
    try {
      await updateDoc(doc(db, 'coupons', c.id), { active: !c.active });
      load();
    } catch {
      toast.error('Failed to toggle');
    }
  };

  const inputCls =
    'w-full bg-dark-600 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Coupons</h1>
        <button
          onClick={openAdd}
          className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition"
        >
          <FiPlus /> New Coupon
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : coupons.length === 0 ? (
        <p className="text-gray-400 text-center py-20">No coupons yet. Create your first one!</p>
      ) : (
        <div className="grid gap-3">
          {coupons.map(c => (
            <div
              key={c.id}
              className="bg-dark-700/50 border border-white/10 rounded-2xl p-4 flex flex-wrap items-center gap-4"
            >
              <div className="flex-1 min-w-[180px]">
                <p className="font-mono text-lg text-white">{c.code}</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {c.type === 'percent' ? `${c.value}% off` : `${c.value} EGP off`}
                  {c.minOrder ? ` · min ${c.minOrder} EGP` : ''}
                  {c.maxUses ? ` · ${c.uses}/${c.maxUses} used` : ` · ${c.uses} used`}
                  {c.expiresAt
                    ? ` · expires ${new Date(c.expiresAt).toLocaleDateString('en-EG', { dateStyle: 'medium' })}`
                    : ''}
                </p>
              </div>
              <button
                onClick={() => toggleActive(c)}
                className={`px-3 py-1 rounded-full text-xs ${
                  c.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                }`}
              >
                {c.active ? 'Active' : 'Inactive'}
              </button>
              <button
                onClick={() => openEdit(c)}
                className="text-gray-400 hover:text-primary transition"
                aria-label="Edit"
              >
                <FiEdit2 size={18} />
              </button>
              <button
                onClick={() => remove(c.id)}
                className="text-gray-400 hover:text-red-400 transition"
                aria-label="Delete"
              >
                <FiTrash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-700 border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {editing ? 'Edit Coupon' : 'New Coupon'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white"
                aria-label="Close"
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-xs mb-1">Code</label>
                <input
                  type="text"
                  placeholder="e.g. WELCOME10"
                  value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className={`${inputCls} font-mono uppercase`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 text-xs mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value as 'percent' | 'flat' })}
                    className={inputCls}
                  >
                    <option value="percent">Percent (%)</option>
                    <option value="flat">Flat (EGP)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1">
                    {form.type === 'percent' ? 'Discount %' : 'Amount EGP'}
                  </label>
                  <input
                    type="number"
                    value={form.value}
                    onChange={e => setForm({ ...form, value: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 text-xs mb-1">
                    Minimum order (EGP, optional)
                  </label>
                  <input
                    type="number"
                    value={form.minOrder}
                    onChange={e => setForm({ ...form, minOrder: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1">
                    Max uses (0 = unlimited)
                  </label>
                  <input
                    type="number"
                    value={form.maxUses}
                    onChange={e => setForm({ ...form, maxUses: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1">
                  Expires on (optional)
                </label>
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={e => setForm({ ...form, expiresAt: e.target.value })}
                  className={inputCls}
                />
              </div>
              <label className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={e => setForm({ ...form, active: e.target.checked })}
                  className="accent-primary"
                />
                <span className="text-white text-sm">Active</span>
              </label>
              <button
                onClick={save}
                className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-semibold transition"
              >
                {editing ? 'Update Coupon' : 'Create Coupon'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
