import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import Navbar from '@/components/Navbar';
import { SettingsProvider } from '@/context/SettingsContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { WishlistProvider } from '@/context/WishlistContext';
import Footer from '@/components/Footer';
import ActiveUserTracker from '@/components/ActiveUserTracker';
import ThemeMetaUpdater from '@/components/ThemeMetaUpdater';
import BrandMetaUpdater from '@/components/BrandMetaUpdater';
import MobileBottomNav from '@/components/MobileBottomNav';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mo-Tech | Smart NFC Cards & Digital Solutions',
  description: 'Smart NFC cards, personal websites, Arduino & IoT projects, and Shopify stores by Mo-Tech.',
  icons: {
    icon: '/images/logo.png',
    apple: '/images/logo.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

const themeInitScript = `
(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t='dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();
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
          <SettingsProvider>
            <BrandMetaUpdater />
            <AuthProvider>
              <CartProvider>
                <WishlistProvider>
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
                  <Navbar />
                  <ActiveUserTracker />
                  <main className="min-h-screen pt-16 pb-16 md:pb-0">
                    {children}
                  </main>
                  <Footer />
                  <MobileBottomNav />
                </WishlistProvider>
              </CartProvider>
            </AuthProvider>
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
