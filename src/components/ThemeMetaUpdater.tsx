'use client';

import { useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';

/**
 * Keeps the <meta name="theme-color"> in sync with the active theme so the
 * mobile browser chrome matches the current background.
 */
export default function ThemeMetaUpdater() {
  const { theme } = useTheme();

  useEffect(() => {
    const color = theme === 'light' ? '#ffffff' : '#0a0a0a';
    let meta = document.querySelector('meta[name="theme-color"]:not([media])') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = color;
  }, [theme]);

  return null;
}
