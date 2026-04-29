'use client';

import Image from 'next/image';
import { FiZap, FiUsers, FiAward, FiHeart } from 'react-icons/fi';

export default function AboutPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-16">
        <Image src="/images/logo.png" alt="Mo-Tech" width={80} height={80} className="mx-auto mb-6" />
        <h1 className="text-4xl font-bold text-white mb-4">About Mo-Tech</h1>
        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
          We are a technology company specializing in smart NFC solutions and digital services. Founded by Moustafa Elboghdady, Mo-Tech brings innovation to your fingertips.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-12 mb-16">
        <div className="bg-dark-700/50 border border-white/10 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
          <p className="text-gray-400 leading-relaxed">
            To make digital connectivity seamless and accessible. Our NFC smart cards let you share your contact information, social media, and portfolio with a single tap. No apps needed, no hassle.
          </p>
        </div>
        <div className="bg-dark-700/50 border border-white/10 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-4">What We Do</h2>
          <p className="text-gray-400 leading-relaxed">
            Beyond NFC cards, we offer complete digital solutions including personal website development, Arduino & IoT project creation, and professional Shopify store setup. We are your one-stop tech partner.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { icon: <FiZap size={28} />, label: 'Innovation', desc: 'Cutting-edge NFC technology' },
          { icon: <FiUsers size={28} />, label: 'Customers', desc: 'Growing community' },
          { icon: <FiAward size={28} />, label: 'Quality', desc: 'Premium products' },
          { icon: <FiHeart size={28} />, label: 'Passion', desc: 'Built with love' },
        ].map((item, i) => (
          <div key={i} className="bg-dark-700/50 border border-white/10 rounded-2xl p-6 text-center">
            <div className="text-primary mb-3 flex justify-center">{item.icon}</div>
            <h3 className="text-white font-semibold mb-1">{item.label}</h3>
            <p className="text-gray-400 text-sm">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
