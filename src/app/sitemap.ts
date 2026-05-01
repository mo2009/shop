import type { MetadataRoute } from 'next';

const STATIC_PATHS = [
  '',
  '/shop',
  '/about',
  '/contact',
  '/legal/privacy',
  '/legal/terms',
  '/legal/returns',
  '/legal/faq',
];

function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'https://example.com'
  );
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();
  return STATIC_PATHS.map(p => ({
    url: `${base}${p || '/'}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: p === '' ? 1 : 0.7,
  }));
}
