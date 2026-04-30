'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiX } from 'react-icons/fi';
import { useSettings } from '@/context/SettingsContext';

const STORAGE_KEY = 'announcement-dismissed';

export default function AnnouncementBar() {
  const { settings } = useSettings();
  const [dismissed, setDismissed] = useState(true);

  const text = settings?.announcementText?.trim() || '';
  const enabled = !!settings?.announcementEnabled;
  const link = settings?.announcementLink?.trim() || '';
  const cacheKey = `${STORAGE_KEY}:${text}`;

  useEffect(() => {
    if (!enabled || !text) {
      setDismissed(true);
      return;
    }
    try {
      setDismissed(localStorage.getItem(cacheKey) === '1');
    } catch {
      setDismissed(false);
    }
  }, [cacheKey, enabled, text]);

  if (!enabled || !text || dismissed) return null;

  const close = () => {
    setDismissed(true);
    try {
      localStorage.setItem(cacheKey, '1');
    } catch {}
  };

  const inner = <span className="font-medium">{text}</span>;

  return (
    <div className="bg-gradient-to-r from-primary to-secondary text-white text-sm">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        {link ? (
          <Link href={link} className="flex-1 text-center hover:underline">
            {inner}
          </Link>
        ) : (
          <span className="flex-1 text-center">{inner}</span>
        )}
        <button
          onClick={close}
          aria-label="Dismiss announcement"
          className="text-white/80 hover:text-white transition flex-shrink-0"
        >
          <FiX size={16} />
        </button>
      </div>
    </div>
  );
}
