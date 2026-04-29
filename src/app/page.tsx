'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Product } from '@/lib/types';
import ProductCard from '@/components/ProductCard';
import SkeletonCard from '@/components/SkeletonCard';
import Link from 'next/link';
import Image from 'next/image';
import {
  FiArrowRight,
  FiZap,
  FiGlobe,
  FiCpu,
  FiShoppingBag,
  FiCreditCard,
  FiEdit3,
  FiSend,
  FiStar,
} from 'react-icons/fi';

const TAGLINES = ['Connect.', 'Personalize.', 'Share with one tap.'];

const SERVICES = [
  { icon: <FiZap size={30} />, title: 'NFC Smart Cards', desc: 'Share your contact info with a single tap. Available in multiple colors.' },
  { icon: <FiGlobe size={30} />, title: 'Personal Websites', desc: 'Custom-built personal and portfolio websites tailored to your brand.' },
  { icon: <FiCpu size={30} />, title: 'Arduino & IoT', desc: 'Custom IoT solutions and Arduino projects for your business needs.' },
  { icon: <FiShoppingBag size={30} />, title: 'Shopify Stores', desc: 'Professional e-commerce stores built on Shopify platform.' },
];

const STEPS = [
  { icon: <FiCreditCard size={22} />, title: 'Order your card', desc: 'Pick a design and checkout in minutes.' },
  { icon: <FiEdit3 size={22} />, title: 'Personalize it', desc: 'Link your socials, contact info, portfolio.' },
  { icon: <FiSend size={22} />, title: 'Tap & share', desc: 'Tap on any phone to instantly share who you are.' },
];

const TESTIMONIALS = [
  { name: 'Ahmed K.', role: 'Entrepreneur', text: 'Ditched paper cards for good. Clients are impressed every single time.', rating: 5 },
  { name: 'Salma M.', role: 'Designer', text: 'Sleek, modern, and it just works. Worth every EGP.', rating: 5 },
  { name: 'Omar H.', role: 'Developer', text: 'Got my portfolio live in a week. Support was on point.', rating: 5 },
  { name: 'Nour A.', role: 'Consultant', text: 'Networking is a breeze now. Highly recommend.', rating: 5 },
];

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [taglineIdx, setTaglineIdx] = useState(0);

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

  useEffect(() => {
    const id = setInterval(() => setTaglineIdx(i => (i + 1) % TAGLINES.length), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden gradient-hero">
        <div className="absolute top-16 right-6 w-72 h-72 bg-primary/30 rounded-full blur-[120px] animate-float-slow" />
        <div className="absolute bottom-16 left-6 w-72 h-72 bg-secondary/25 rounded-full blur-[120px] animate-float-slow delay-300" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-12 items-center py-20">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs text-gray-200 mb-6 backdrop-blur">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Now shipping across Egypt
            </span>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 leading-[1.05] tracking-tight">
              Tap Into The{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Future
                </span>
              </span>
              <br />
              <span className="text-white/90 text-3xl md:text-5xl">
                {TAGLINES[taglineIdx]}
              </span>
            </h1>
            <p className="text-gray-300 text-lg mb-8 max-w-lg">
              Smart NFC cards, custom websites, IoT solutions, and Shopify stores. We bring your digital vision to life.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/shop"
                className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl font-semibold transition flex items-center gap-2 shadow-lg shadow-primary/30 btn-shine"
              >
                Shop Now <FiArrowRight />
              </Link>
              <Link
                href="/contact"
                className="border border-white/20 hover:border-primary text-white px-8 py-3 rounded-xl font-semibold transition"
              >
                Contact Us
              </Link>
            </div>
            <div className="flex items-center gap-6 mt-10 text-sm text-gray-400">
              <div>
                <p className="text-white font-bold text-xl">500+</p>
                <p>Cards shipped</p>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <p className="text-white font-bold text-xl">4.9★</p>
                <p>Average rating</p>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <p className="text-white font-bold text-xl">24h</p>
                <p>Avg. reply</p>
              </div>
            </div>
          </div>

          <div className="hidden md:flex justify-center animate-fade-up delay-150">
            <div className="relative animate-float-slow">
              <Image
                src="/images/white-nfc-card.png"
                alt="NFC Card"
                width={420}
                height={260}
                className="rounded-2xl shadow-2xl shadow-primary/30"
                priority
              />
              <div className="absolute inset-0 rounded-2xl ring-1 ring-white/20" />
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-dark-900 pointer-events-none" />
      </section>

      {/* Services */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 animate-fade-up">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">Our Services</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              From smart NFC cards to full digital solutions, we have everything you need.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SERVICES.map((s, i) => (
              <div
                key={i}
                className="group relative p-[1px] rounded-2xl bg-gradient-to-br from-white/10 to-white/5 hover:from-primary/50 hover:to-secondary/30 transition animate-fade-up"
                style={{ animationDelay: `${i * 75}ms` }}
              >
                <div className="relative h-full bg-dark-700/70 rounded-2xl p-6">
                  <div className="text-primary mb-4 group-hover:scale-110 transition-transform">{s.icon}</div>
                  <h3 className="text-white font-semibold text-lg mb-2">{s.title}</h3>
                  <p className="text-gray-400 text-sm">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-dark-800/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 animate-fade-up">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">How it works</h2>
            <p className="text-gray-400">Three steps. No app. No setup headaches.</p>
          </div>
          <ol className="grid md:grid-cols-3 gap-6 relative">
            {STEPS.map((step, i) => (
              <li
                key={i}
                className="relative bg-dark-700/50 border border-white/10 rounded-2xl p-6 animate-fade-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                    {step.icon}
                  </span>
                  <span className="text-gray-500 text-sm font-mono">0{i + 1}</span>
                </div>
                <h3 className="text-white font-semibold text-lg mb-1">{step.title}</h3>
                <p className="text-gray-400 text-sm">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Testimonials marquee */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 animate-fade-up">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">Loved by our customers</h2>
            <p className="text-gray-400">Real words from real users.</p>
          </div>
          <div className="overflow-hidden relative no-scrollbar" aria-hidden={false}>
            <div className="flex gap-4 animate-marquee w-max">
              {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
                <div
                  key={i}
                  className="w-[280px] sm:w-[320px] shrink-0 bg-dark-700/50 border border-white/10 rounded-2xl p-5"
                >
                  <div className="flex gap-1 mb-3 text-yellow-400">
                    {[...Array(t.rating)].map((_, s) => (
                      <FiStar key={s} size={14} fill="currentColor" />
                    ))}
                  </div>
                  <p className="text-gray-300 text-sm mb-4 leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                  <div>
                    <p className="text-white text-sm font-semibold">{t.name}</p>
                    <p className="text-gray-500 text-xs">{t.role}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-dark-900 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-dark-900 to-transparent" />
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 px-4 bg-dark-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10 animate-fade-up">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">Featured Products</h2>
              <p className="text-gray-400">Check out our latest NFC smart cards</p>
            </div>
            <Link
              href="/shop"
              className="text-primary hover:text-primary/80 flex items-center gap-1 transition text-sm"
            >
              View All <FiArrowRight />
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <p className="text-gray-400 text-center py-10">No products yet. Check back soon!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.slice(0, 4).map((product, i) => (
                <div key={product.id} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto relative overflow-hidden rounded-3xl border border-white/10 p-[1px] bg-gradient-to-br from-primary/40 via-white/10 to-secondary/40">
          <div className="relative rounded-3xl bg-dark-800 px-6 sm:px-12 py-12 text-center">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-secondary/20 rounded-full blur-3xl" />
            <h3 className="relative text-2xl md:text-4xl font-bold text-white mb-3 tracking-tight">
              Ready to tap into the future?
            </h3>
            <p className="relative text-gray-300 mb-8 max-w-lg mx-auto">
              Get your smart NFC card today and start sharing instantly.
            </p>
            <Link
              href="/shop"
              className="relative inline-flex items-center gap-2 bg-white text-black px-8 py-3 rounded-xl font-semibold hover:bg-gray-100 transition btn-shine"
            >
              Shop Now <FiArrowRight />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
