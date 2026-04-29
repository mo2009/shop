'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { FiShoppingCart, FiMenu, FiX, FiUser } from 'react-icons/fi';
import { useSettings } from '@/context/SettingsContext';
import ThemeToggle from '@/components/ThemeToggle';

export default function Navbar() {
  const { settings, loading } = useSettings();
  const { user, userProfile, logout } = useAuth();
  const { itemCount } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const brand = settings?.brandName || '';
  const logoUrl = settings?.logoUrl || '/images/logo.png';

  // Close mobile menu when tapping outside
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

  return (
    <nav ref={navRef} className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            {loading ? (
              <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
            ) : (
              <img src={logoUrl} alt={brand} width={40} height={40} style={{ objectFit: 'contain' }} />
            )}
            {loading ? (
              <div className="w-24 h-5 rounded bg-white/10 animate-pulse" />
            ) : (
              <span className="text-white font-bold text-xl">{brand}</span>
            )}
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-gray-300 hover:text-primary transition">Home</Link>
            <Link href="/shop" className="text-gray-300 hover:text-primary transition">Shop</Link>
            <Link href="/about" className="text-gray-300 hover:text-primary transition">About</Link>
            <Link href="/contact" className="text-gray-300 hover:text-primary transition">Contact</Link>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />

            <Link href="/cart" className="relative text-gray-300 hover:text-primary transition">
              <FiShoppingCart size={24} />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-secondary text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="relative group">
                <button className="flex items-center gap-2 text-gray-300 hover:text-primary transition">
                  <FiUser size={20} />
                  <span className="hidden md:inline text-sm">{user.displayName || user.email}</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-dark-700 border border-white/10 rounded-lg shadow-xl py-2 z-50
                  opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  {userProfile?.isAdmin && (
                    <Link href="/admin" className="block px-4 py-2 text-gray-300 hover:bg-dark-600 hover:text-primary">
                      Admin Panel
                    </Link>
                  )}
                  <Link href="/user/orders" className="block px-4 py-2 text-gray-300 hover:bg-dark-600 hover:text-primary">
                    My Orders
                  </Link>
                  <button
                    onClick={() => logout()}
                    className="block w-full text-left px-4 py-2 text-gray-300 hover:bg-dark-600 hover:text-red-400"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <Link href="/auth/login" className="text-gray-300 hover:text-primary transition text-sm">
                Login
              </Link>
            )}

            <button className="md:hidden text-gray-300" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-dark-800 border-t border-white/10 px-4 py-4 space-y-3">
          <Link href="/" className="block text-gray-300 hover:text-primary" onClick={() => setMobileOpen(false)}>Home</Link>
          <Link href="/shop" className="block text-gray-300 hover:text-primary" onClick={() => setMobileOpen(false)}>Shop</Link>
          <Link href="/about" className="block text-gray-300 hover:text-primary" onClick={() => setMobileOpen(false)}>About</Link>
          <Link href="/contact" className="block text-gray-300 hover:text-primary" onClick={() => setMobileOpen(false)}>Contact</Link>
          <ThemeToggle showLabel className="pt-1" />
          {user && (
            <div className="border-t border-white/10 pt-3 space-y-3">
              {userProfile?.isAdmin && (
                <Link href="/admin" className="block text-gray-300 hover:text-primary" onClick={() => setMobileOpen(false)}>
                  Admin Panel
                </Link>
              )}
              <Link href="/user/orders" className="block text-gray-300 hover:text-primary" onClick={() => setMobileOpen(false)}>
                My Orders
              </Link>
              <button onClick={() => { logout(); setMobileOpen(false); }} className="block text-left text-gray-300 hover:text-red-400">
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}