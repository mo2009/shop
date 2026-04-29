'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiHome, FiShoppingBag, FiShoppingCart, FiUser } from 'react-icons/fi';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

const links = [
  { href: '/', icon: FiHome, label: 'Home' },
  { href: '/shop', icon: FiShoppingBag, label: 'Shop' },
  { href: '/cart', icon: FiShoppingCart, label: 'Cart' },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { user } = useAuth();

  // Hide on admin pages — admin has its own bottom bar.
  if (pathname?.startsWith('/admin')) return null;

  const accountHref = user ? '/user/orders' : '/auth/login';

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-strong border-t border-white/10"
      aria-label="Primary"
    >
      <div className="grid grid-cols-4">
        {links.map(link => {
          const active = link.href === '/' ? pathname === '/' : pathname?.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-col items-center py-2.5 text-xs transition ${
                active ? 'text-primary' : 'text-gray-400'
              }`}
            >
              <Icon size={20} />
              {link.href === '/cart' && itemCount > 0 && (
                <span className="absolute top-1 right-1/4 bg-secondary text-white text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
              <span className="mt-0.5">{link.label}</span>
            </Link>
          );
        })}
        <Link
          href={accountHref}
          aria-current={pathname?.startsWith('/user') || pathname?.startsWith('/auth') ? 'page' : undefined}
          className={`flex flex-col items-center py-2.5 text-xs transition ${
            pathname?.startsWith('/user') || pathname?.startsWith('/auth')
              ? 'text-primary'
              : 'text-gray-400'
          }`}
        >
          <FiUser size={20} />
          <span className="mt-0.5">{user ? 'Account' : 'Login'}</span>
        </Link>
      </div>
    </nav>
  );
}
