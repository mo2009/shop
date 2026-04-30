'use client';

import { useEffect, useState } from 'react';
import { useSettings } from '@/context/SettingsContext';
import toast from 'react-hot-toast';
import {
  FiSave,
  FiTag,
  FiMail,
  FiCreditCard,
  FiShare2,
  FiBell,
  FiFileText,
  FiSearch,
} from 'react-icons/fi';
import { FaFacebook, FaInstagram, FaWhatsapp, FaTiktok } from 'react-icons/fa';

interface SettingsForm {
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
  announcementText: string;
  announcementLink: string;
  announcementEnabled: boolean;
  saleEndsAt: string;
  saleHeadline: string;
  legalPrivacy: string;
  legalTerms: string;
  legalReturns: string;
  legalFaq: string;
  seoDescription: string;
  seoKeywords: string;
}

type TabId = 'brand' | 'contact' | 'payment' | 'social' | 'promotions' | 'legal' | 'seo';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'brand', label: 'Brand', icon: <FiTag size={16} /> },
  { id: 'contact', label: 'Contact', icon: <FiMail size={16} /> },
  { id: 'payment', label: 'Payment', icon: <FiCreditCard size={16} /> },
  { id: 'social', label: 'Social', icon: <FiShare2 size={16} /> },
  { id: 'promotions', label: 'Promotions', icon: <FiBell size={16} /> },
  { id: 'legal', label: 'Legal', icon: <FiFileText size={16} /> },
  { id: 'seo', label: 'SEO', icon: <FiSearch size={16} /> },
];

const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-primary focus:outline-none transition';

export default function AdminSettings() {
  const { settings, loading, updateSettings } = useSettings();
  const [tab, setTab] = useState<TabId>('brand');
  const [form, setForm] = useState<SettingsForm>({
    brandName: '',
    tabTitle: '',
    logoUrl: '',
    contactEmail: '',
    contactPhone: '',
    socialFacebook: '',
    socialInstagram: '',
    socialWhatsapp: '',
    socialTiktok: '',
    instapayEnabled: true,
    announcementText: '',
    announcementLink: '',
    announcementEnabled: false,
    saleEndsAt: '',
    saleHeadline: '',
    legalPrivacy: '',
    legalTerms: '',
    legalReturns: '',
    legalFaq: '',
    seoDescription: '',
    seoKeywords: '',
  });

  useEffect(() => {
    if (settings) {
      setForm({
        brandName: settings.brandName || '',
        tabTitle: settings.tabTitle || '',
        logoUrl: settings.logoUrl || '',
        contactEmail: settings.contactEmail || '',
        contactPhone: settings.contactPhone || '',
        socialFacebook: settings.socialFacebook || '',
        socialInstagram: settings.socialInstagram || '',
        socialWhatsapp: settings.socialWhatsapp || '',
        socialTiktok: settings.socialTiktok || '',
        instapayEnabled: settings.instapayEnabled ?? true,
        announcementText: settings.announcementText || '',
        announcementLink: settings.announcementLink || '',
        announcementEnabled: !!settings.announcementEnabled,
        saleEndsAt: settings.saleEndsAt ? settings.saleEndsAt.slice(0, 16) : '',
        saleHeadline: settings.saleHeadline || '',
        legalPrivacy: settings.legalPrivacy || '',
        legalTerms: settings.legalTerms || '',
        legalReturns: settings.legalReturns || '',
        legalFaq: settings.legalFaq || '',
        seoDescription: settings.seoDescription || '',
        seoKeywords: settings.seoKeywords || '',
      });
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      const payload = {
        ...form,
        saleEndsAt: form.saleEndsAt ? new Date(form.saleEndsAt).toISOString() : '',
      };
      await updateSettings(payload);
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
              <label htmlFor="tabTitle" className="block text-gray-400 text-xs mb-1">
                Browser Tab Title
              </label>
              <input
                id="tabTitle"
                type="text"
                value={form.tabTitle}
                onChange={e => setField('tabTitle', e.target.value)}
                className={inputCls}
                placeholder="e.g. Mo-Tech | Smart NFC Cards"
              />
              <p className="text-gray-500 text-xs mt-1">
                Shown next to the favicon in the browser tab. Leave blank to use the brand name with the default tagline.
              </p>
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

        {tab === 'promotions' && (
          <div className="space-y-4">
            <h2 className="text-white font-semibold">Announcement bar</h2>
            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <div>
                <p className="text-white font-medium">Show announcement bar</p>
                <p className="text-gray-400 text-sm">Sticky banner shown above the navbar.</p>
              </div>
              <button
                type="button"
                onClick={() => setField('announcementEnabled', !form.announcementEnabled)}
                aria-pressed={form.announcementEnabled}
                className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
                  form.announcementEnabled ? 'bg-primary' : 'bg-white/20'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                    form.announcementEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <div>
              <label htmlFor="announcementText" className="block text-gray-400 text-xs mb-1">Text</label>
              <input
                id="announcementText"
                value={form.announcementText}
                onChange={e => setField('announcementText', e.target.value)}
                placeholder="e.g. Free shipping for orders above 1000 EGP — limited time!"
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="announcementLink" className="block text-gray-400 text-xs mb-1">Link (optional)</label>
              <input
                id="announcementLink"
                value={form.announcementLink}
                onChange={e => setField('announcementLink', e.target.value)}
                placeholder="/shop"
                className={inputCls}
              />
            </div>
            <hr className="border-white/10" />
            <h2 className="text-white font-semibold">Sale countdown</h2>
            <p className="text-gray-400 text-sm">Show a live countdown on the homepage banner. Leave the date blank to hide.</p>
            <div>
              <label htmlFor="saleHeadline" className="block text-gray-400 text-xs mb-1">Headline</label>
              <input
                id="saleHeadline"
                value={form.saleHeadline}
                onChange={e => setField('saleHeadline', e.target.value)}
                placeholder="e.g. Black Friday ends in"
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="saleEndsAt" className="block text-gray-400 text-xs mb-1">Sale ends at</label>
              <input
                id="saleEndsAt"
                type="datetime-local"
                value={form.saleEndsAt}
                onChange={e => setField('saleEndsAt', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        )}

        {tab === 'legal' && (
          <div className="space-y-4">
            <h2 className="text-white font-semibold">Legal pages</h2>
            <p className="text-gray-400 text-sm">
              Edit the content shown at <code className="text-primary">/legal/privacy</code>,{' '}
              <code className="text-primary">/legal/terms</code>,{' '}
              <code className="text-primary">/legal/returns</code>, and{' '}
              <code className="text-primary">/legal/faq</code>. Leave a field empty to use the built-in default. Use <code className="text-primary">#</code> for headings and a blank line for paragraphs.
            </p>
            {(
              [
                ['legalPrivacy', 'Privacy Policy'],
                ['legalTerms', 'Terms of Service'],
                ['legalReturns', 'Returns & Refunds'],
                ['legalFaq', 'FAQ'],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label htmlFor={key} className="block text-gray-400 text-xs mb-1">{label}</label>
                <textarea
                  id={key}
                  rows={6}
                  value={form[key as keyof SettingsForm] as string}
                  onChange={e => setField(key as keyof SettingsForm, e.target.value)}
                  className={inputCls}
                />
              </div>
            ))}
          </div>
        )}

        {tab === 'seo' && (
          <div className="space-y-4">
            <h2 className="text-white font-semibold">SEO defaults</h2>
            <p className="text-gray-400 text-sm">
              These appear in the homepage meta tags and as a fallback for product pages.
            </p>
            <div>
              <label htmlFor="seoDescription" className="block text-gray-400 text-xs mb-1">
                Default meta description
              </label>
              <textarea
                id="seoDescription"
                rows={3}
                value={form.seoDescription}
                onChange={e => setField('seoDescription', e.target.value)}
                placeholder="Smart NFC cards, custom websites, IoT and Shopify stores in Egypt."
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="seoKeywords" className="block text-gray-400 text-xs mb-1">
                Default meta keywords
              </label>
              <input
                id="seoKeywords"
                value={form.seoKeywords}
                onChange={e => setField('seoKeywords', e.target.value)}
                placeholder="nfc card, smart business card, egypt shop"
                className={inputCls}
              />
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
