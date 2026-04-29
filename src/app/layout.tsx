import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import Navbar from '@/components/Navbar';
import { SettingsProvider } from '@/context/SettingsContext';
import { ThemeProvider } from '@/context/ThemeContext';
import Footer from '@/components/Footer';
import ActiveUserTracker from '@/components/ActiveUserTracker';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mo-Tech | Smart NFC Cards & Digital Solutions',
  description: 'Smart NFC cards, personal websites, Arduino & IoT projects, and Shopify stores by Mo-Tech.',
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
          <SettingsProvider>
            <AuthProvider>
              <CartProvider>
                <Toaster position="top-center" toastOptions={{
                  style: { background: '#00ccff', color: '#c90000', border: '1px solid rgba(255,255,255,0.1)' },
                }} />
                <Navbar />
                <ActiveUserTracker />
                <main className="min-h-screen pt-16">
                  {children}
                </main>
                <Footer />
              </CartProvider>
            </AuthProvider>
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
