import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import Navbar from '@/components/Navbar';
import { SettingsProvider } from '@/context/SettingsContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { I18nProvider } from '@/context/I18nContext';
import { RecentlyViewedProvider } from '@/context/RecentlyViewedContext';
import Footer from '@/components/Footer';
import ActiveUserTracker from '@/components/ActiveUserTracker';
import ThemeMetaUpdater from '@/components/ThemeMetaUpdater';
import BrandMetaUpdater from '@/components/BrandMetaUpdater';
import MobileBottomNav from '@/components/MobileBottomNav';
import AnnouncementBar from '@/components/AnnouncementBar';
import AnnouncementPopup from '@/components/AnnouncementPopup';
import CookieConsent from '@/components/CookieConsent';
import MaintenanceGate from '@/components/MaintenanceGate';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://example.com',
  ),
  title: {
    default: 'Mo-Tech | Smart NFC Cards & Digital Solutions',
    template: '%s | Mo-Tech',
  },
  description:
    'Smart NFC cards, personal websites, Arduino & IoT projects, and Shopify stores by Mo-Tech.',
  keywords: [
    'NFC card',
    'smart business card',
    'Egypt',
    'Shopify',
    'IoT',
    'Arduino',
    'web development',
  ],
  openGraph: {
    type: 'website',
    title: 'Mo-Tech | Smart NFC Cards & Digital Solutions',
    description:
      'Smart NFC cards, personal websites, Arduino & IoT projects, and Shopify stores by Mo-Tech.',
    images: ['/images/logo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mo-Tech | Smart NFC Cards & Digital Solutions',
    description:
      'Smart NFC cards, personal websites, Arduino & IoT projects, and Shopify stores by Mo-Tech.',
    images: ['/images/logo.png'],
  },
  icons: {
    icon: '/images/logo.png',
    apple: '/images/logo.png',
  },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
};

const themeInitScript = `
(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t='dark';}document.documentElement.setAttribute('data-theme',t);document.documentElement.setAttribute('lang','en');document.documentElement.setAttribute('dir','ltr');try{localStorage.removeItem('site-locale');}catch(e){}}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <ThemeMetaUpdater />
          <I18nProvider>
            <SettingsProvider>
              <BrandMetaUpdater />
              <AuthProvider>
                <CartProvider>
                  <WishlistProvider>
                    <RecentlyViewedProvider>
                      <Toaster
                        position="top-center"
                        toastOptions={{
                          style: {
                            background: 'rgba(17, 17, 23, 0.9)',
                            color: '#ffffff',
                            border: '1px solid rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(10px)',
                          },
                          success: { iconTheme: { primary: '#2196F3', secondary: '#ffffff' } },
                        }}
                      />
                      <MaintenanceGate>
                        <AnnouncementBar />
                        <Navbar />
                        <ActiveUserTracker />
                        <main className="min-h-screen pt-16 pb-16 md:pb-0">{children}</main>
                        <Footer />
                        <MobileBottomNav />
                        <CookieConsent />
                        <AnnouncementPopup />
                      </MaintenanceGate>
                    </RecentlyViewedProvider>
                  </WishlistProvider>
                </CartProvider>
              </AuthProvider>
            </SettingsProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
