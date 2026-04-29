'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Product } from '@/lib/types';
import ProductCard from '@/components/ProductCard';
import Link from 'next/link';
import Image from 'next/image';
import { FiArrowRight, FiZap, FiGlobe, FiCpu, FiShoppingBag } from 'react-icons/fi';

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const snap = await getDocs(collection(db, 'products'));
        const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(items);
      } catch (err) {
        console.error('Error fetching products:', err);
      }
      setLoading(false);
    }
    fetchProducts();
  }, []);

  const services = [
    { icon: <FiZap size={32} />, title: 'NFC Smart Cards', desc: 'Share your contact info with a single tap. Available in multiple colors.' },
    { icon: <FiGlobe size={32} />, title: 'Personal Websites', desc: 'Custom-built personal and portfolio websites tailored to your brand.' },
    { icon: <FiCpu size={32} />, title: 'Arduino & IoT', desc: 'Custom IoT solutions and Arduino projects for your business needs.' },
    { icon: <FiShoppingBag size={32} />, title: 'Shopify Stores', desc: 'Professional e-commerce stores built on Shopify platform.' },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-dark-900 to-secondary/10" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-secondary/20 rounded-full blur-[100px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Tap Into The <span className="text-primary">Future</span> With Mo-Tech
            </h1>
            <p className="text-gray-400 text-lg mb-8 max-w-lg">
              Smart NFC cards, custom websites, IoT solutions, and Shopify stores. We bring your digital vision to life.
            </p>
            <div className="flex gap-4">
              <Link href="/shop" className="bg-primary hover:bg-primary/80 text-white px-8 py-3 rounded-xl font-semibold transition flex items-center gap-2">
                Shop Now <FiArrowRight />
              </Link>
              <Link href="/contact" className="border border-white/20 hover:border-primary text-white px-8 py-3 rounded-xl font-semibold transition">
                Contact Us
              </Link>
            </div>
          </div>
          <div className="hidden md:flex justify-center">
            <div className="relative animate-float">
              <Image src="/images/white-nfc-card.png" alt="NFC Card" width={400} height={250} className="rounded-2xl shadow-2xl shadow-primary/20" />
              <div className="absolute inset-0 rounded-2xl animate-glow opacity-30" />
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">Our Services</h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">From smart NFC cards to full digital solutions, we have everything you need.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((s, i) => (
              <div key={i} className="bg-dark-700/50 backdrop-blur border border-white/10 rounded-2xl p-6 hover:border-primary/50 transition-all duration-300 group">
                <div className="text-primary mb-4 group-hover:scale-110 transition-transform">{s.icon}</div>
                <h3 className="text-white font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-gray-400 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 px-4 bg-dark-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Featured Products</h2>
              <p className="text-gray-400">Check out our latest NFC smart cards</p>
            </div>
            <Link href="/shop" className="text-primary hover:text-primary/80 flex items-center gap-1 transition">
              View All <FiArrowRight />
            </Link>
          </div>
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <p className="text-gray-400 text-center py-10">No products yet. Check back soon!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.slice(0, 4).map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
