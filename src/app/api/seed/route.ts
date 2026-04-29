import { NextResponse } from 'next/server';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const seedProducts = [
  {
    name: 'Mo-Tech NFC Card - White',
    description: 'Premium white NFC smart card. Share your contact info, social media, and portfolio with a single tap. No app needed.',
    price: 250,
    category: 'nfc-card',
    image: '/images/white-nfc-card.png',
    color: 'White',
    inStock: true,
  },
  {
    name: 'Mo-Tech NFC Card - Black',
    description: 'Sleek black NFC smart card. Professional design that makes a lasting impression. Tap to share everything.',
    price: 250,
    category: 'nfc-card',
    image: '/images/black-nfc-card.jpeg',
    color: 'Black',
    inStock: true,
  },
  {
    name: 'Personal Website Development',
    description: 'Custom-built personal or portfolio website. Responsive design, modern UI, and fast performance. Delivered in 3-5 days.',
    price: 1500,
    category: 'digital-service',
    image: '/images/white-nfc-card.png',
    color: null,
    inStock: true,
  },
  {
    name: 'Shopify Store Setup',
    description: 'Complete Shopify store setup with custom theme, product listings, payment integration, and SEO optimization.',
    price: 3000,
    category: 'digital-service',
    image: '/images/white-nfc-card.png',
    color: null,
    inStock: true,
  },
];

export async function GET() {
  try {
    // Check if products already exist
    const existing = await getDocs(collection(db, 'products'));
    if (existing.size > 0) {
      return NextResponse.json({ message: `Database already has ${existing.size} products. Skipping seed.` });
    }

    // Seed products
    for (const product of seedProducts) {
      await addDoc(collection(db, 'products'), {
        ...product,
        createdAt: serverTimestamp(),
      });
    }

    return NextResponse.json({ message: `Seeded ${seedProducts.length} products successfully!` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
