'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type Settings = {
  brandName: string;
  tabTitle: string;
  logoUrl: string;
  contactEmail: string;
  contactPhone: string;
  socialFacebook: string;
  socialInstagram: string;
  socialWhatsapp: string;
  socialTiktok: string;
  instapayEnabled: boolean;

  /** Site-wide announcement bar shown above the navbar. Empty = hidden. */
  announcementText?: string;
  announcementLink?: string;
  announcementEnabled?: boolean;

  /** Optional ISO datetime; when in the future a countdown shows on the homepage. */
  saleEndsAt?: string;
  saleHeadline?: string;

  /** Editable legal pages (Markdown-ish plain text with line breaks). */
  legalPrivacy?: string;
  legalTerms?: string;
  legalReturns?: string;
  legalFaq?: string;

  /** SEO meta defaults. */
  seoDescription?: string;
  seoKeywords?: string;

  /**
   * When true, non-admin visitors are shown an "Under Maintenance" page
   * instead of the storefront. Toggle only from the Firestore console
   * at settings/site.maintenanceMode.
   */
  maintenanceMode?: boolean;
  /** Optional message displayed on the maintenance screen. */
  maintenanceMessage?: string;
};

type SettingsContextType = {
  settings: Settings | null;
  loading: boolean;
  updateSettings: (data: Partial<Settings>) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextType>({
  settings: null,
  loading: true,
  updateSettings: async () => {},
});

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'site'),
      snap => {
        if (snap.exists()) {
          const data = snap.data() as Settings;
          setSettings(data);
          if (typeof window !== 'undefined') {
            // eslint-disable-next-line no-console
            console.debug('[settings] loaded', {
              maintenanceMode: data.maintenanceMode,
              maintenanceModeType: typeof data.maintenanceMode,
            });
          }
        } else {
          setSettings(null);
        }
        setLoading(false);
      },
      err => {
        // eslint-disable-next-line no-console
        console.error(
          '[settings] failed to read settings/site — check Firestore rules',
          err,
        );
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  const updateSettings = async (data: Partial<Settings>) => {
    await setDoc(doc(db, 'settings', 'site'), data, { merge: true });
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
