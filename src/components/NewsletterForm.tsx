'use client';

import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';
import { useI18n } from '@/context/I18nContext';
import { FiMail } from 'react-icons/fi';

export default function NewsletterForm() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
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
      await addDoc(collection(db, 'newsletter'), {
        email: trimmed,
        createdAt: serverTimestamp(),
        source: 'footer',
      });
      toast.success('Subscribed!');
      setEmail('');
    } catch {
      toast.error('Failed to subscribe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <p className="text-gray-400 text-sm">{t('footer_newsletter_desc')}</p>
      <div className="relative">
        <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder={t('footer_email_placeholder')}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white text-sm placeholder-gray-500 focus:border-primary focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-primary hover:bg-primary/90 disabled:opacity-60 text-white text-sm py-2 rounded-xl font-medium transition"
      >
        {loading ? '…' : t('footer_subscribe')}
      </button>
    </form>
  );
}
