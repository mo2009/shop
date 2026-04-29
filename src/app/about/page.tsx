'use client';

import Image from 'next/image';
import { FiZap, FiUsers, FiAward, FiHeart } from 'react-icons/fi';

export default function AboutPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-16 animate-fade-up">
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" />
          <Image src="/images/logo.png" alt="Mo-Tech" width={96} height={96} className="relative" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">About Mo-Tech</h1>
        <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
          We are a technology company specializing in smart NFC solutions and digital services. Founded by Moustafa Elboghdady, Mo-Tech brings innovation to your fingertips.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-16">
        {[
          {
            title: 'Our Mission',
            body:
              'To make digital connectivity seamless and accessible. Our NFC smart cards let you share your contact information, social media, and portfolio with a single tap. No apps needed, no hassle.',
          },
          {
            title: 'What We Do',
            body:
              'Beyond NFC cards, we offer complete digital solutions including personal website development, Arduino & IoT project creation, and professional Shopify store setup. We are your one-stop tech partner.',
          },
        ].map((c, i) => (
          <div
            key={c.title}
            className="glass border border-white/10 rounded-2xl p-8 animate-fade-up"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">{c.title}</h2>
            <p className="text-gray-400 leading-relaxed">{c.body}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { icon: <FiZap size={28} />, label: 'Innovation', desc: 'Cutting-edge NFC technology' },
          { icon: <FiUsers size={28} />, label: 'Customers', desc: 'Growing community' },
          { icon: <FiAward size={28} />, label: 'Quality', desc: 'Premium products' },
          { icon: <FiHeart size={28} />, label: 'Passion', desc: 'Built with love' },
        ].map((item, i) => (
          <div
            key={i}
            className="card-lift glass border border-white/10 rounded-2xl p-6 text-center animate-fade-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="text-primary mb-3 flex justify-center">{item.icon}</div>
            <h3 className="text-white font-semibold mb-1">{item.label}</h3>
            <p className="text-gray-400 text-sm">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
