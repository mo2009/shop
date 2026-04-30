'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { FiTool, FiClock, FiMail, FiPhone } from 'react-icons/fi';

const ALLOWED_PREFIXES = ['/auth', '/admin'];

export default function MaintenanceGate({ children }: { children: ReactNode }) {
  const { settings, loading: settingsLoading } = useSettings();
  const { userProfile, loading: authLoading } = useAuth();
  const pathname = usePathname() || '/';

  const maintenanceOn = !!settings?.maintenanceMode;

  // Don't gate while we're still figuring out who the user is — avoids a
  // flash of the maintenance screen for admins on first paint.
  if (!maintenanceOn || settingsLoading || authLoading) {
    return <>{children}</>;
  }

  const isAdmin = userProfile?.isAdmin === true;
  const onAllowedRoute = ALLOWED_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`));

  // Admin users keep full access (with a banner on every page).
  if (isAdmin) {
    return (
      <>
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-200 text-xs text-center py-1.5 px-3">
          Maintenance mode is ON — only admins can see the site. Toggle it off in Firestore at settings/site.maintenanceMode.
        </div>
        {children}
      </>
    );
  }

  // Allow auth + admin sign-in pages so the owner can still log in.
  if (onAllowedRoute) {
    return <>{children}</>;
  }

  return <MaintenanceScreen brand={settings?.brandName} message={settings?.maintenanceMessage} contactEmail={settings?.contactEmail} contactPhone={settings?.contactPhone} logoUrl={settings?.logoUrl} />;
}

function MaintenanceScreen({
  brand,
  message,
  contactEmail,
  contactPhone,
  logoUrl,
}: {
  brand?: string;
  message?: string;
  contactEmail?: string;
  contactPhone?: string;
  logoUrl?: string;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 px-6 py-10 overflow-hidden">
      <div
        className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full opacity-30 blur-3xl bg-primary"
        aria-hidden
      />
      <div
        className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full opacity-30 blur-3xl bg-secondary"
        aria-hidden
      />

      <div className="relative w-full max-w-xl text-center animate-fade-up">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/15 border border-primary/30 mb-6">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={brand || 'Brand'} className="w-12 h-12 object-contain" />
          ) : (
            <FiTool className="text-primary animate-pulse" size={36} />
          )}
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
          We&apos;ll be right back
        </h1>
        <p className="text-gray-300 text-base md:text-lg mb-2">
          {brand || 'Our site'} is getting an upgrade.
        </p>
        <p className="text-gray-400 text-sm md:text-base mb-8 leading-relaxed whitespace-pre-wrap">
          {message?.trim() ||
            'We are working on something better behind the scenes. The shop will be back online shortly — thanks for your patience.'}
        </p>

        <div className="flex items-center justify-center gap-2 text-gray-300 mb-8">
          <FiClock className="animate-spin" style={{ animationDuration: '4s' }} size={18} />
          <span className="text-sm">Maintenance in progress</span>
        </div>

        {(contactEmail || contactPhone) && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur">
            <p className="text-gray-300 text-sm mb-3">Need to reach us?</p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
              {contactEmail && (
                <a
                  href={`mailto:${contactEmail}`}
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <FiMail size={14} /> {contactEmail}
                </a>
              )}
              {contactPhone && (
                <a
                  href={`tel:${contactPhone}`}
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <FiPhone size={14} /> {contactPhone}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
