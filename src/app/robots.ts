import type { MetadataRoute } from 'next';

function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'https://example.com'
  );
}

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/*', '/auth/*', '/checkout', '/cart', '/user/*'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
