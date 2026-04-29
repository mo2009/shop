'use client';

import { useEffect, useState } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import toast from 'react-hot-toast';
import {
  FiSave,
  FiSun,
  FiMoon,
  FiTag,
  FiMail,
  FiCreditCard,
  FiShare2,
  FiSliders,
} from 'react-icons/fi';
import { FaFacebook, FaInstagram, FaWhatsapp, FaTiktok } from 'react-icons/fa';

interface SettingsForm {
  brandName: string;
  logoUrl: string;
  contactEmail: string;
  contactPhone: string;
  socialFacebook: string;
  socialInstagram: string;
  socialWhatsapp: string;
  socialTiktok: string;
  instapayEnabled: boolean;
}

type TabId = 'brand' | 'contact' | 'payment' | 'social' | 'appearance';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'brand', label: 'Brand', icon: <FiTag size={16} /> },
  { id: 'contact', label: 'Contact', icon: <FiMail size={16} /> },
  { id: 'payment', label: 'Payment', icon: <FiCreditCard size={16} /> },
  { id: 'social', label: 'Social', icon: <FiShare2 size={16} /> },
  { id: 'appearance', label: 'Appearance', icon: <FiSliders size={16} /> },
];

const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-primary focus:outline-none transition';

export default function AdminSettings() {
  const { settings, loading, updateSettings } = useSettings();
  const { theme, setTheme } = useTheme();
  const [tab, setTab] = useState<TabId>('brand');
  const [form, setForm] = useState<SettingsForm>({
    brandName: '',
    logoUrl: '',
    contactEmail: '',
    contactPhone: '',
    socialFacebook: '',
    socialInstagram: '',
    socialWhatsapp: '',
    socialTiktok: '',
    instapayEnabled: true,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        brandName: settings.brandName || '',
        logoUrl: settings.logoUrl || '',
        contactEmail: settings.contactEmail || '',
        contactPhone: settings.contactPhone || '',
        socialFacebook: settings.socialFacebook || '',
        socialInstagram: settings.socialInstagram || '',
        socialWhatsapp: settings.socialWhatsapp || '',
        socialTiktok: settings.socialTiktok || '',
        instapayEnabled: settings.instapayEnabled ?? true,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings(form);
      toast.success('Settings saved');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save settings');
    }
  };

  const setField = (field: keyof SettingsForm, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }));

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 animate-fade-up">
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Shop Settings</h1>
        <p className="text-gray-400 text-sm">Manage your storefront brand, contact, payment and social presence.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 border-b border-white/10 -mx-1 px-1">
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px transition ${
                active
                  ? 'border-primary text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {t.icon} {t.label}
            </button>
          );
        })}
      </div>

      <div className="glass border border-white/10 rounded-2xl p-6 animate-fade-up">
        {tab === 'brand' && (
          <div className="space-y-4">
            <h2 className="text-white font-semibold">Brand identity</h2>
            <div>
              <label htmlFor="brandName" className="block text-gray-400 text-xs mb-1">Brand Name</label>
              <input id="brandName" type="text" value={form.brandName}
                onChange={e => setField('brandName', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="logoUrl" className="block text-gray-400 text-xs mb-1">Logo URL</label>
              <input id="logoUrl" type="text" value={form.logoUrl}
                onChange={e => setField('logoUrl', e.target.value)} className={inputCls} placeholder="https://..." />
              {form.logoUrl && (
                <div className="mt-3 bg-white/5 border border-white/10 rounded-xl p-3 inline-flex items-center gap-3">
                  <img src={form.logoUrl} alt="Logo preview" className="w-12 h-12 object-contain" />
                  <span className="text-gray-400 text-xs">Preview</span>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'contact' && (
          <div className="space-y-4">
            <h2 className="text-white font-semibold">Contact info</h2>
            <div>
              <label htmlFor="contactEmail" className="block text-gray-400 text-xs mb-1">Contact Email</label>
              <input id="contactEmail" type="email" value={form.contactEmail}
                onChange={e => setField('contactEmail', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="contactPhone" className="block text-gray-400 text-xs mb-1">Contact Phone</label>
              <input id="contactPhone" type="tel" value={form.contactPhone}
                onChange={e => setField('contactPhone', e.target.value)} className={inputCls}
                placeholder="+20 1234567890" />
            </div>
          </div>
        )}

        {tab === 'payment' && (
          <div className="space-y-4">
            <h2 className="text-white font-semibold">Payment</h2>
            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <div>
                <p className="text-white font-medium">Instapay</p>
                <p className="text-gray-400 text-sm">Allow customers to pay via Instapay</p>
              </div>
              <button
                type="button"
                onClick={() => setField('instapayEnabled', !form.instapayEnabled)}
                aria-pressed={form.instapayEnabled}
                className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
                  form.instapayEnabled ? 'bg-primary' : 'bg-white/20'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                    form.instapayEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {tab === 'social' && (
          <div className="space-y-4">
            <h2 className="text-white font-semibold">Social media</h2>
            {(
              [
                ['socialFacebook', 'Facebook URL', <FaFacebook key="fb" size={20} className="text-blue-400 flex-shrink-0" />],
                ['socialInstagram', 'Instagram URL', <FaInstagram key="ig" size={20} className="text-pink-400 flex-shrink-0" />],
                ['socialWhatsapp', 'WhatsApp number', <FaWhatsapp key="wa" size={20} className="text-green-400 flex-shrink-0" />],
                ['socialTiktok', 'TikTok URL', <FaTiktok key="tt" size={20} className="text-white flex-shrink-0" />],
              ] as const
            ).map(([key, placeholder, icon]) => (
              <div key={key} className="flex items-center gap-3">
                {icon}
                <input
                  type="text"
                  placeholder={placeholder}
                  value={form[key as keyof SettingsForm] as string}
                  onChange={e => setField(key as keyof SettingsForm, e.target.value)}
                  className={inputCls}
                />
              </div>
            ))}
          </div>
        )}

        {tab === 'appearance' && (
          <div className="space-y-4">
            <h2 className="text-white font-semibold">Appearance</h2>
            <p className="text-gray-400 text-sm">Choose how the admin panel and storefront look on this device.</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex items-center justify-center gap-2 px-4 py-4 rounded-xl border transition ${
                  theme === 'dark'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white/5 text-gray-300 border-white/10 hover:border-white/20'
                }`}
              >
                <FiMoon size={18} /> Dark
              </button>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex items-center justify-center gap-2 px-4 py-4 rounded-xl border transition ${
                  theme === 'light'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white/5 text-gray-300 border-white/10 hover:border-white/20'
                }`}
              >
                <FiSun size={18} /> Light
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        className="mt-6 flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl transition font-semibold btn-shine"
      >
        <FiSave /> Save Settings
      </button>
    </div>
  );
}
