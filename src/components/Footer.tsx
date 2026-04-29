'use client';

import Link from 'next/link';
import { FiPhone, FiMail, FiMapPin } from 'react-icons/fi';
import { FaFacebook, FaInstagram, FaWhatsapp, FaTiktok } from 'react-icons/fa';
import { useSettings } from '@/context/SettingsContext';

export default function Footer() {
  const { settings, loading } = useSettings();

  const phone = settings?.contactPhone ?? '';
  const email = settings?.contactEmail ?? '';
  const facebook = settings?.socialFacebook ?? '';
  const instagram = settings?.socialInstagram ?? '';
  const whatsapp = settings?.socialWhatsapp ?? '';
  const tiktok = settings?.socialTiktok ?? '';
  const brand = settings?.brandName ?? '';
  const logo = settings?.logoUrl || '/images/logo.png';

  return (
    <footer className="bg-dark-800 border-t border-white/10 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              {loading ? (
                <>
                  <div className="w-9 h-9 rounded-full bg-white/10 animate-pulse" />
                  <div className="w-24 h-5 rounded bg-white/10 animate-pulse" />
                </>
              ) : (
                <>
                  <img src={logo} alt={brand} width={36} height={36} style={{ objectFit: 'contain' }} />
                  <span className="text-lg font-bold text-white">{brand}</span>
                </>
              )}
            </div>
            <p className="text-gray-400 text-sm">
              Smart NFC cards and digital solutions for the modern world.{!loading && brand && ` Tap into the future with ${brand}.`}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <div className="space-y-2">
              <Link href="/shop" className="block text-gray-400 hover:text-primary text-sm transition">Shop</Link>
              <Link href="/about" className="block text-gray-400 hover:text-primary text-sm transition">About Us</Link>
              <Link href="/contact" className="block text-gray-400 hover:text-primary text-sm transition">Contact</Link>
            </div>
          </div>

          {/* Contact + Social */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact</h3>
            <div className="space-y-2">

              {/* Phone */}
              {loading ? (
                <div className="w-36 h-4 bg-white/10 rounded animate-pulse" />
              ) : phone ? (
                <a href={`tel:${phone}`} className="flex items-center gap-2 text-gray-400 hover:text-primary text-sm transition">
                  <FiPhone size={14} />{phone}
                </a>
              ) : null}

              {/* Email */}
              {loading ? (
                <div className="w-44 h-4 bg-white/10 rounded animate-pulse" />
              ) : email ? (
                <a href={`mailto:${email}`} className="flex items-center gap-2 text-gray-400 hover:text-primary text-sm transition">
                  <FiMail size={14} />{email}
                </a>
              ) : null}

              <p className="flex items-center gap-2 text-gray-400 text-sm"><FiMapPin size={14} />Egypt</p>
            </div>

            {/* Social Icons */}
            {loading ? (
              <div className="flex gap-3 mt-4">
                <div className="w-6 h-6 bg-white/10 rounded animate-pulse" />
                <div className="w-6 h-6 bg-white/10 rounded animate-pulse" />
                <div className="w-6 h-6 bg-white/10 rounded animate-pulse" />
              </div>
            ) : (
              <div className="flex gap-3 mt-4">
                {facebook && (
                  <a href={facebook} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition">
                    <FaFacebook size={20} />
                  </a>
                )}
                {instagram && (
                  <a href={instagram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition">
                    <FaInstagram size={20} />
                  </a>
                )}
                {whatsapp && (
                  <a href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition">
                    <FaWhatsapp size={20} />
                  </a>
                )}
                {tiktok && (
                  <a href={tiktok} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition">
                    <FaTiktok size={20} />
                  </a>
                )}
              </div>
            )}
          </div>

        </div>

        <div className="border-t border-white/10 mt-8 pt-8 text-center">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()}{!loading && brand && ` ${brand}`}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}