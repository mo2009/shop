'use client';

import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';
import { useI18n } from '@/context/I18nContext';
import { useAuth } from '@/context/AuthContext';

export default function NotifyMeForm({ productId, productName }: { productId: string; productName: string }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? '');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      toast.error('Please enter a valid email');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'stockAlerts'), {
        email: trimmed,
        productId,
        productName,
        userId: user?.uid ?? null,
        createdAt: serverTimestamp(),
      });
      toast.success("We'll email you when it's back");
      setSubmitted(true);
    } catch {
      toast.error('Failed to register');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
        <p className="text-green-400 text-sm">
          You'll be notified at <span className="font-medium">{email}</span> when this is back in stock.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
      <p className="text-white font-medium">{t('notify_me')}</p>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder={t('notify_me_email')}
        className="w-full bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-primary focus:outline-none"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary hover:bg-primary/90 disabled:opacity-60 text-white py-2 rounded-lg font-medium text-sm transition"
      >
        {loading ? '…' : t('notify_me_submit')}
      </button>
    </form>
  );
}
