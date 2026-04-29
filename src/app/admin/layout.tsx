'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  FiHome,
  FiPackage,
  FiShoppingBag,
  FiDollarSign,
  FiArrowLeft,
  FiSettings,
  FiTag,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';
import ThemeToggle from '@/components/ThemeToggle';

const SIDEBAR_KEY = 'admin-sidebar-collapsed';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userProfile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(SIDEBAR_KEY);
      if (v === '1') setCollapsed(true);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed, hydrated]);

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
      <aside
        className={`${
          collapsed ? 'w-[72px]' : 'w-64'
        } bg-dark-800 border-r border-white/10 py-6 hidden md:flex md:flex-col transition-[width] duration-300`}
      >
        <div className={`mb-6 px-6 ${collapsed ? 'hidden' : ''}`}>
          <h2 className="text-white font-bold text-lg tracking-tight">Admin Panel</h2>
          <p className="text-gray-500 text-sm">Mo-Tech Management</p>
        </div>

        <div className="px-3 mb-2">
          <span className={`block px-3 text-[11px] uppercase tracking-wider text-gray-500 ${collapsed ? 'hidden' : ''}`}>
            Navigation
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {links.map(link => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition group ${
                  active
                    ? 'bg-gradient-to-r from-primary/30 to-primary/10 text-white border border-primary/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
                title={collapsed ? link.label : undefined}
              >
                {active && !collapsed && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r" />
                )}
                <span className="flex-shrink-0">{link.icon}</span>
                <span className={`text-sm ${collapsed ? 'hidden' : ''}`}>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 mt-4 pt-4 border-t border-white/10 space-y-1">
          <Link
            href="/"
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-gray-500 hover:text-primary hover:bg-white/5 transition text-sm ${
              collapsed ? 'justify-center' : ''
            }`}
            title={collapsed ? 'Back to Shop' : undefined}
          >
            <FiArrowLeft size={16} />
            <span className={collapsed ? 'hidden' : ''}>Back to Shop</span>
          </Link>
          <div className={`px-3 ${collapsed ? 'hidden' : ''}`}>
            <ThemeToggle showLabel className="w-full text-gray-400" />
          </div>
          {collapsed && (
            <div className="flex justify-center">
              <ThemeToggle />
            </div>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`flex items-center gap-2 w-full px-3 py-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition text-sm ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            {collapsed ? <FiChevronRight size={16} /> : <FiChevronLeft size={16} />}
            <span className={collapsed ? 'hidden' : ''}>Collapse</span>
          </button>
        </div>
      </aside>

      <div className="md:hidden fixed bottom-0 left-0 right-0 glass-strong border-t border-white/10 z-50 grid grid-cols-6">
        {links.map(link => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center py-2.5 text-[10px] transition ${
                active ? 'text-primary' : 'text-gray-500'
              }`}
            >
              {link.icon}
              <span className="mt-0.5 truncate max-w-full px-1">{link.label}</span>
            </Link>
          );
        })}
      </div>

      <main className="flex-1 p-6 md:p-8 pb-24 md:pb-8 overflow-auto">{children}</main>
    </div>
  );
}
