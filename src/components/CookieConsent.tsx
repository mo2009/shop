'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/context/I18nContext';

const KEY = 'cookie-consent';

export default function CookieConsent() {
  const { t } = useI18n();
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) !== '1') setShow(true);
    } catch {
      setShow(false);
    }
  }, []);

  if (!show) return null;

  const accept = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {}
    setShow(false);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-6 md:bottom-6 md:right-auto md:max-w-md z-50 glass border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-md bg-dark-800/90">
      <p className="text-gray-200 text-sm mb-3">
        {t('cookie_text')}{' '}
        <Link href="/legal/privacy" className="text-primary hover:underline">
          Privacy Policy
        </Link>
      </p>
      <div className="flex justify-end">
        <button
          onClick={accept}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition"
        >
          {t('cookie_accept')}
        </button>
      </div>
    </div>
  );
}
