'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { FiHome, FiPackage, FiShoppingBag, FiDollarSign, FiArrowLeft, FiSettings, FiTag } from 'react-icons/fi';
import ThemeToggle from '@/components/ThemeToggle';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userProfile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && (!userProfile || !userProfile.isAdmin)) {
      router.push('/');
    }
  }, [userProfile, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!userProfile?.isAdmin) return null;

  const links = [
    { href: '/admin', icon: <FiHome size={18} />, label: 'Dashboard' },
    { href: '/admin/products', icon: <FiPackage size={18} />, label: 'Products' },
    { href: '/admin/orders', icon: <FiShoppingBag size={18} />, label: 'Orders' },
    { href: '/admin/payments', icon: <FiDollarSign size={18} />, label: 'Payments' },
    { href: '/admin/categories', icon: <FiTag size={18} />, label: 'Categories' },
    { href: '/admin/settings', icon: <FiSettings size={18} />, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-dark-800 border-r border-white/10 p-6 hidden md:block">
        <div className="mb-8">
          <h2 className="text-white font-bold text-lg">Admin Panel</h2>
          <p className="text-gray-500 text-sm">Mo-Tech Management</p>
        </div>
        <nav className="space-y-2">
          {links.map(link => (
            <Link key={link.href} href={link.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition ${pathname === link.href ? 'bg-primary text-white' : 'text-gray-400 hover:text-white hover:bg-dark-700'}`}>
              {link.icon} {link.label}
            </Link>
          ))}
        </nav>
        <Link href="/" className="flex items-center gap-2 text-gray-500 hover:text-primary mt-8 px-4 transition">
          <FiArrowLeft size={16} /> Back to Shop
        </Link>
        <div className="mt-4 px-4">
          <ThemeToggle showLabel className="text-gray-400" />
        </div>
      </aside>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-dark-800 border-t border-white/10 z-50 flex">
        {links.map(link => (
          <Link key={link.href} href={link.href}
            className={`flex-1 flex flex-col items-center py-3 text-xs transition ${pathname === link.href ? 'text-primary' : 'text-gray-500'}`}>
            {link.icon}
            <span className="mt-1">{link.label}</span>
          </Link>
        ))}
      </div>

      <main className="flex-1 p-6 md:p-8 pb-20 md:pb-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
