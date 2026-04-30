import type { MetadataRoute } from 'next';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map(p => ({
    url: `${base}${p || '/'}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: p === '' ? 1 : 0.7,
  }));
  try {
    const snap = await getDocs(collection(db, 'products'));
    snap.docs.forEach(d => {
      entries.push({
        url: `${base}/shop/${d.id}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      });
    });
  } catch {
    // best-effort
  }
  return entries;
}
