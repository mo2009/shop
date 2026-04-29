'use client';

import { useState } from 'react';
import { FiPhone, FiMail, FiMapPin, FiSend } from 'react-icons/fi';
import { FaWhatsapp, FaFacebook, FaInstagram } from 'react-icons/fa';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';
import { useSettings } from '@/context/SettingsContext';

export default function ContactPage() {
  const { settings, loading: settingsLoading } = useSettings();
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);

  const phone = settings?.contactPhone || '';
  const email = settings?.contactEmail || '';
  const whatsapp = settings?.socialWhatsapp || '';
  const facebook = settings?.socialFacebook || '';
  const instagram = settings?.socialInstagram || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill all fields');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'messages'), { ...form, createdAt: serverTimestamp() });
      toast.success('Message sent successfully!');
      setForm({ name: '', email: '', message: '' });
    } catch (err) {
      toast.error('Failed to send message');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-white mb-2 text-center">Contact Us</h1>
      <p className="text-gray-400 text-center mb-12">Have a question or want to work with us? Get in touch!</p>

      <div className="grid md:grid-cols-2 gap-12">
        <div>
          <div className="space-y-6 mb-8">
{/* Phone */}
{settingsLoading ? (
  <div className="flex items-center gap-4">
    <div className="w-12 h-12 bg-white/10 rounded-xl animate-pulse" />
    <div className="space-y-2">
      <div className="w-16 h-4 bg-white/10 rounded animate-pulse" />
      <div className="w-36 h-4 bg-white/10 rounded animate-pulse" />
    </div>
  </div>
) : phone ? (
  <div className="flex items-center gap-4">
    <div className="bg-primary/10 text-primary p-3 rounded-xl"><FiPhone size={20} /></div>
    <div>
      <p className="text-white font-medium">Phone</p>
      <a href={`tel:${phone}`} className="text-gray-400 hover:text-primary transition">{phone}</a>
    </div>
  </div>
) : null}
    {/* Email */}
{settingsLoading ? (
  <div className="flex items-center gap-4">
    <div className="w-12 h-12 bg-white/10 rounded-xl animate-pulse" />
    <div className="space-y-2">
      <div className="w-16 h-4 bg-white/10 rounded animate-pulse" />
      <div className="w-44 h-4 bg-white/10 rounded animate-pulse" />
    </div>
  </div>
) : email ? (
  <div className="flex items-center gap-4">
    <div className="bg-primary/10 text-primary p-3 rounded-xl"><FiMail size={20} /></div>
    <div>
      <p className="text-white font-medium">Email</p>
      <a href={`mailto:${email}`} className="text-gray-400 hover:text-primary transition">{email}</a>
    </div>
  </div>
) : null}

            {/* Location */}
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 text-primary p-3 rounded-xl"><FiMapPin size={20} /></div>
              <div>
                <p className="text-white font-medium">Location</p>
                <p className="text-gray-400">Egypt</p>
              </div>
            </div>
          </div>

          {/* Social Icons */}
          {settingsLoading ? (
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl animate-pulse" />
              <div className="w-12 h-12 bg-white/10 rounded-xl animate-pulse" />
              <div className="w-12 h-12 bg-white/10 rounded-xl animate-pulse" />
            </div>
          ) : (
            <div className="flex gap-4">
              {whatsapp && (
                <a href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                  className="bg-dark-700 text-gray-400 hover:text-primary p-3 rounded-xl transition">
                  <FaWhatsapp size={24} />
                </a>
              )}
              {facebook && (
                <a href={facebook} target="_blank" rel="noopener noreferrer"
                  className="bg-dark-700 text-gray-400 hover:text-primary p-3 rounded-xl transition">
                  <FaFacebook size={24} />
                </a>
              )}
              {instagram && (
                <a href={instagram} target="_blank" rel="noopener noreferrer"
                  className="bg-dark-700 text-gray-400 hover:text-primary p-3 rounded-xl transition">
                  <FaInstagram size={24} />
                </a>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-dark-700/50 border border-white/10 rounded-2xl p-6 space-y-4">
          <input type="text" placeholder="Your Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
            className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-primary focus:outline-none" />
          <input type="email" placeholder="Your Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
            className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-primary focus:outline-none" />
          <textarea placeholder="Your Message" rows={5} value={form.message} onChange={e => setForm({...form, message: e.target.value})}
            className="w-full bg-dark-700 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-primary focus:outline-none resize-none" />
          <button type="submit" disabled={loading}
            className="w-full bg-primary hover:bg-primary/80 disabled:bg-gray-600 text-white py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2">
            <FiSend /> {loading ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>
    </div>
  );
}