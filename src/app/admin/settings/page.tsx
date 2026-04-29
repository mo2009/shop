'use client';

import { useEffect, useState } from 'react';
import { useSettings } from '@/context/SettingsContext';
import toast from 'react-hot-toast';
import { FiSave } from 'react-icons/fi';
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

export default function AdminSettings() {
  const { settings, loading, updateSettings } = useSettings();
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
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-white mb-8">Shop Settings</h1>

      {/* Brand */}
      <section className="mb-8">
        <h2 className="text-white font-semibold mb-4 pb-2 border-b border-white/10">Brand</h2>
        <div className="space-y-4">
          <input
            type="text" placeholder="Brand Name" value={form.brandName}
            onChange={e => setField('brandName', e.target.value)}
            className="w-full bg-dark-600 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none"
          />
          <input
            type="text" placeholder="Logo URL" value={form.logoUrl}
            onChange={e => setField('logoUrl', e.target.value)}
            className="w-full bg-dark-600 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none"
          />
        </div>
      </section>

      {/* Contact */}
      <section className="mb-8">
        <h2 className="text-white font-semibold mb-4 pb-2 border-b border-white/10">Contact</h2>
        <div className="space-y-4">
          <input
            type="email" placeholder="Contact Email" value={form.contactEmail}
            onChange={e => setField('contactEmail', e.target.value)}
            className="w-full bg-dark-600 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none"
          />
          <input
            type="tel" placeholder="Contact Phone (e.g. +20 1234567890)" value={form.contactPhone}
            onChange={e => setField('contactPhone', e.target.value)}
            className="w-full bg-dark-600 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none"
          />
        </div>
      </section>

      {/* Payment */}
      <section className="mb-8">
        <h2 className="text-white font-semibold mb-4 pb-2 border-b border-white/10">Payment</h2>
        <div className="flex items-center justify-between bg-dark-600 border border-white/10 rounded-xl px-4 py-3">
          <div>
            <p className="text-white font-medium">Instapay</p>
            <p className="text-gray-400 text-sm">Allow customers to pay via Instapay</p>
          </div>
          <button
  type="button"
  onClick={() => setField('instapayEnabled', !form.instapayEnabled)}
  className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
    form.instapayEnabled ? 'bg-primary' : 'bg-white/20'
  }`}
>
  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
    form.instapayEnabled ? 'translate-x-5' : 'translate-x-0'
  }`} />
</button>
        </div>
      </section>

      {/* Social Media */}
      <section className="mb-8">
        <h2 className="text-white font-semibold mb-4 pb-2 border-b border-white/10">Social Media</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <FaFacebook size={20} className="text-blue-400 flex-shrink-0" />
            <input
              type="url" placeholder="Facebook URL (e.g. https://facebook.com/yourpage)"
              value={form.socialFacebook}
              onChange={e => setField('socialFacebook', e.target.value)}
              className="w-full bg-dark-600 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <FaInstagram size={20} className="text-pink-400 flex-shrink-0" />
            <input
              type="url" placeholder="Instagram URL (e.g. https://instagram.com/yourpage)"
              value={form.socialInstagram}
              onChange={e => setField('socialInstagram', e.target.value)}
              className="w-full bg-dark-600 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <FaWhatsapp size={20} className="text-green-400 flex-shrink-0" />
            <input
              type="text" placeholder="WhatsApp number (e.g. +201234567890)"
              value={form.socialWhatsapp}
              onChange={e => setField('socialWhatsapp', e.target.value)}
              className="w-full bg-dark-600 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <FaTiktok size={20} className="text-white flex-shrink-0" />
            <input
              type="url" placeholder="TikTok URL (e.g. https://tiktok.com/@yourpage)"
              value={form.socialTiktok}
              onChange={e => setField('socialTiktok', e.target.value)}
              className="w-full bg-dark-600 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </section>

      <button
        onClick={handleSave}
        className="flex items-center gap-2 bg-primary hover:bg-primary/80 text-white px-6 py-3 rounded-xl transition font-semibold"
      >
        <FiSave /> Save Settings
      </button>
    </div>
  );
}