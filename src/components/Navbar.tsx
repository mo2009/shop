'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { FiShoppingCart, FiMenu, FiX, FiUser } from 'react-icons/fi';
import { useSettings } from '@/context/SettingsContext';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageToggle from '@/components/LanguageToggle';
import CartDrawer from '@/components/CartDrawer';

export default function Navbar() {
  const { settings, loading } = useSettings();
  const { user, userProfile, logout } = useAuth();
  const { itemCount } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const pathname = usePathname();

  const brand = settings?.brandName || '';
  const logoUrl = settings?.logoUrl || '/images/logo.png';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    }
    if (mobileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [mobileOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/shop', label: 'Shop' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <>
      <nav
        ref={navRef}
        data-site-nav="top"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'glass-strong shadow-lg' : 'bg-dark-900/60 backdrop-blur-md'
        } border-b border-white/10`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 group" aria-label="Home">
              {loading ? (
                <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
              ) : (
                <img
                  src={logoUrl}
                  alt={brand}
                  width={40}
                  height={40}
                  style={{ objectFit: 'contain' }}
                  className="group-hover:scale-105 transition-transform"
                />
              )}
              {loading ? (
                <div className="w-24 h-5 rounded bg-white/10 animate-pulse" />
              ) : (
                <span className="text-white font-bold text-xl tracking-tight">{brand}</span>
              )}
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(link => {
                const active = link.href === '/' ? pathname === '/' : pathname?.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={`relative px-4 py-1.5 rounded-full text-sm transition ${
                      active
                        ? 'text-white bg-white/10'
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <LanguageToggle className="hidden sm:inline-flex" />
              <ThemeToggle />

              <button
                onClick={() => setCartOpen(true)}
                aria-label={`Open cart, ${itemCount} items`}
                className="relative text-gray-300 hover:text-primary transition p-1"
              >
                <FiShoppingCart size={22} />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-secondary text-white text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center animate-scale-in">
                    {itemCount}
                  </span>
                )}
              </button>

              {user ? (
                <div className="relative group hidden sm:block">
                  <button
                    className="flex items-center gap-2 text-gray-300 hover:text-primary transition"
                    aria-label="Account menu"
                  >
                    <FiUser size={20} />
                    <span className="hidden md:inline text-sm max-w-[140px] truncate">
                      {user.displayName || user.email}
                    </span>
                  </button>
                  <div
                    className="absolute right-0 mt-2 w-52 glass-strong rounded-xl shadow-xl py-2 z-50
                      opacity-0 invisible group-hover:opacity-100 group-hover:visible
                      focus-within:opacity-100 focus-within:visible
                      transition-all duration-200"
                  >
                    {userProfile?.isAdmin && (
                      <Link
                        href="/admin"
                        className="block px-4 py-2 text-gray-200 hover:bg-white/10 hover:text-primary text-sm"
                      >
                        Admin Panel
                      </Link>
                    )}
                    <Link
                      href="/user/orders"
                      className="block px-4 py-2 text-gray-200 hover:bg-white/10 hover:text-primary text-sm"
                    >
                      My Orders
                    </Link>
                    <button
                      onClick={() => logout()}
                      className="block w-full text-left px-4 py-2 text-gray-200 hover:bg-white/10 hover:text-red-400 text-sm"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  href="/auth/login"
                  className="hidden sm:inline text-gray-300 hover:text-primary transition text-sm"
                >
                  Login
                </Link>
              )}

              <button
                className="md:hidden text-gray-300 p-1"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <FiX size={24} /> : <FiMenu size={24} />}
              </button>
            </div>
          </div>
        </div>

        <div
          className={`md:hidden overflow-hidden transition-[max-height,opacity] duration-300 ${
            mobileOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="glass-strong border-t border-white/10 px-4 py-4 space-y-1">
            {navLinks.map(link => {
              const active = link.href === '/' ? pathname === '/' : pathname?.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block px-3 py-2 rounded-lg text-sm transition ${
                    active ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="pt-2 border-t border-white/10">
              <ThemeToggle showLabel className="w-full px-3 py-2 rounded-lg hover:bg-white/5" />
            </div>
            {user && (
              <div className="border-t border-white/10 pt-2 space-y-1">
                {userProfile?.isAdmin && (
                  <Link
                    href="/admin"
                    className="block px-3 py-2 rounded-lg text-gray-300 hover:text-primary hover:bg-white/5 text-sm"
                    onClick={() => setMobileOpen(false)}
                  >
                    Admin Panel
                  </Link>
                )}
                <Link
                  href="/user/orders"
                  className="block px-3 py-2 rounded-lg text-gray-300 hover:text-primary hover:bg-white/5 text-sm"
                  onClick={() => setMobileOpen(false)}
                >
                  My Orders
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 rounded-lg text-gray-300 hover:text-red-400 hover:bg-white/5 text-sm"
                >
                  Logout
                </button>
              </div>
            )}
            {!user && (
              <Link
                href="/auth/login"
                className="block px-3 py-2 rounded-lg text-gray-300 hover:text-primary hover:bg-white/5 text-sm border-t border-white/10 mt-2"
                onClick={() => setMobileOpen(false)}
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </nav>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
