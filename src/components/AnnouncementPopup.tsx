'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiX, FiBell } from 'react-icons/fi';
import { useSettings } from '@/context/SettingsContext';

const STORAGE_KEY = 'announcement-popup-dismissed';

const HIDDEN_PREFIXES = ['/admin'];

export default function AnnouncementPopup() {
  const { settings } = useSettings();
  const pathname = usePathname() || '/';
  const [open, setOpen] = useState(false);

  const text = settings?.announcementText?.trim() || '';
  const enabled = !!settings?.announcementEnabled;
  const link = settings?.announcementLink?.trim() || '';
  const cacheKey = `${STORAGE_KEY}:${text}`;
  const onAdminRoute = HIDDEN_PREFIXES.some(
    p => pathname === p || pathname.startsWith(`${p}/`),
  );

  useEffect(() => {
    if (!enabled || !text || onAdminRoute) {
      setOpen(false);
      return;
    }
    try {
      const dismissed = sessionStorage.getItem(cacheKey) === '1';
      if (!dismissed) {
        // Small delay so the popup feels intentional rather than racing the page in.
        const t = window.setTimeout(() => setOpen(true), 600);
        return () => window.clearTimeout(t);
      }
    } catch {
      setOpen(true);
    }
  }, [cacheKey, enabled, text, onAdminRoute]);

  if (!open) return null;

  const close = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(cacheKey, '1');
    } catch {}
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-popup-title"
      onClick={close}
    >
      <div
        className="relative w-full max-w-md bg-gradient-to-br from-dark-800 to-dark-900 border border-white/10 rounded-2xl shadow-2xl p-7 text-center animate-fade-up"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={close}
          aria-label="Close announcement"
          className="absolute top-3 right-3 text-gray-400 hover:text-white transition"
        >
          <FiX size={20} />
        </button>

        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 mb-4">
          <FiBell className="text-primary" size={26} />
        </div>

        <h2 id="announcement-popup-title" className="text-xl md:text-2xl font-bold text-white mb-3 tracking-tight">
          Announcement
        </h2>

        <p className="text-gray-200 text-base leading-relaxed whitespace-pre-wrap mb-6">{text}</p>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          {link ? (
            <Link
              href={link}
              onClick={close}
              className="inline-flex items-center justify-center bg-primary hover:bg-primary/90 text-white font-semibold px-5 py-2.5 rounded-xl transition btn-shine"
            >
              Learn more
            </Link>
          ) : null}
          <button
            onClick={close}
            className="inline-flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold px-5 py-2.5 rounded-xl transition"
          >
            {link ? 'Dismiss' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
}
