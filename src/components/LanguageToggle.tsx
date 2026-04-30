'use client';

import { useI18n } from '@/context/I18nContext';

export default function LanguageToggle({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  const next = locale === 'en' ? 'ar' : 'en';
  return (
    <button
      onClick={() => setLocale(next)}
      aria-label={`Switch language to ${next === 'ar' ? 'Arabic' : 'English'}`}
      className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider border border-white/15 text-gray-300 hover:border-primary hover:text-primary transition ${className}`}
    >
      {locale === 'en' ? 'AR' : 'EN'}
    </button>
  );
}
