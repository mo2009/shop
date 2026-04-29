import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import Navbar from '@/components/Navbar';
import { SettingsProvider } from '@/context/SettingsContext';
import Footer from '@/components/Footer';
import ActiveUserTracker from '@/components/ActiveUserTracker';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mo-Tech | Smart NFC Cards & Digital Solutions',
  description: 'Smart NFC cards, personal websites, Arduino & IoT projects, and Shopify stores by Mo-Tech.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
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
      </body>
    </html>
  );
}
