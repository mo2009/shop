'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiX, FiBell } from 'react-icons/fi';
import { useSettings } from '@/context/SettingsContext';

const STORAGE_KEY = 'announcement-corner-dismissed';
const HIDDEN_PREFIXES = ['/admin'];

export default function AnnouncementPopup() {
  const { settings } = useSettings();
  const pathname = usePathname() || '/';
  const [dismissed, setDismissed] = useState(true);

  const text = settings?.announcementText?.trim() || '';
  const enabled = !!settings?.announcementEnabled;
  const link = settings?.announcementLink?.trim() || '';
  const cacheKey = `${STORAGE_KEY}:${text}`;
  const onAdminRoute = HIDDEN_PREFIXES.some(
    p => pathname === p || pathname.startsWith(`${p}/`),
  );

  useEffect(() => {
    if (!enabled || !text || onAdminRoute) {
      setDismissed(true);
      return;
    }
    try {
      setDismissed(sessionStorage.getItem(cacheKey) === '1');
    } catch {
      setDismissed(false);
    }
  }, [cacheKey, enabled, text, onAdminRoute]);

  if (!enabled || !text || onAdminRoute || dismissed) return null;

  const close = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(cacheKey, '1');
    } catch {}
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-[80] max-w-xs w-[calc(100%-2rem)] sm:w-80 animate-fade-up"
      role="status"
      aria-live="polite"
    >
      <div className="bg-gradient-to-br from-dark-800 to-dark-900 border border-white/10 rounded-2xl shadow-2xl p-4 backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-primary/15 border border-primary/30">
            <FiBell className="text-primary" size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-semibold mb-1">Announcement</p>
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap break-words">
              {text}
            </p>
            {link && (
              <Link
                href={link}
                onClick={close}
                className="inline-block mt-2 text-primary text-sm font-semibold hover:underline"
              >
                Learn more &rarr;
              </Link>
            )}
          </div>
          <button
            onClick={close}
            aria-label="Dismiss announcement"
            className="flex-shrink-0 text-gray-400 hover:text-white transition"
          >
            <FiX size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
