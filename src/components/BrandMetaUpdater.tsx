'use client';

import { useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';

const DEFAULT_TITLE = 'Mo-Tech | Smart NFC Cards & Digital Solutions';
const DEFAULT_ICON = '/images/logo.png';

/**
 * Syncs the browser tab title and favicon with the admin-configured brand
 * settings (brandName, logoUrl). This runs on every page as a child of
 * <SettingsProvider>, and re-runs whenever settings change.
 */
export default function BrandMetaUpdater() {
  const { settings } = useSettings();

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const name = settings?.brandName?.trim();
    const logo = settings?.logoUrl?.trim() || DEFAULT_ICON;

    document.title = name
      ? `${name} | Smart NFC Cards & Digital Solutions`
      : DEFAULT_TITLE;

    const head = document.head;
    const setIcon = (rel: string, sizes?: string) => {
      const selector = sizes
        ? `link[rel="${rel}"][sizes="${sizes}"]`
        : `link[rel="${rel}"]`;
      let link = head.querySelector<HTMLLinkElement>(selector);
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        if (sizes) link.sizes = sizes;
        head.appendChild(link);
      }
      link.href = logo;
    };

    setIcon('icon');
    setIcon('shortcut icon');
    setIcon('apple-touch-icon');
  }, [settings?.brandName, settings?.logoUrl]);

  return null;
}
