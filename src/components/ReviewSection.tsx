'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Review } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import StarRating from './StarRating';
import toast from 'react-hot-toast';
import { FiStar } from 'react-icons/fi';

export default function ReviewSection({ productId }: { productId: string }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, 'reviews'),
          where('productId', '==', productId),
          orderBy('createdAt', 'desc'),
        ),
      );
      const list = snap.docs.map(d => {
        const data = d.data() as Record<string, unknown>;
        const ts = data.createdAt as Timestamp | undefined;
        return {
          id: d.id,
          ...data,
          createdAt: ts?.toDate ? ts.toDate() : new Date(),
        } as Review;
      });
      setReviews(list);
    } catch (e) {
      // Index missing or no perms — fall back to a simpler query.
      try {
        const snap2 = await getDocs(
          query(collection(db, 'reviews'), where('productId', '==', productId)),
        );
        const list2 = snap2.docs.map(d => {
          const data = d.data() as Record<string, unknown>;
          const ts = data.createdAt as Timestamp | undefined;
          return {
            id: d.id,
            ...data,
            createdAt: ts?.toDate ? ts.toDate() : new Date(),
          } as Review;
        });
        list2.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setReviews(list2);
      } catch {}
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [productId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Sign in to leave a review');
      return;
    }
    const text = comment.trim();
    if (!text) {
      toast.error('Please write your review');
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        productId,
        userId: user.uid,
        userName: user.displayName || user.email || 'Customer',
        rating,
        comment: text,
        createdAt: serverTimestamp(),
      });
      // Update product aggregates (best-effort).
      try {
        const prodRef = doc(db, 'products', productId);
        const prodSnap = await getDoc(prodRef);
        if (prodSnap.exists()) {
          const data = prodSnap.data() as { rating?: number; reviewCount?: number };
          const prevCount = data.reviewCount || 0;
          const prevAvg = data.rating || 0;
          const nextCount = prevCount + 1;
          const nextAvg = (prevAvg * prevCount + rating) / nextCount;
          await setDoc(
            prodRef,
            { rating: Number(nextAvg.toFixed(2)), reviewCount: nextCount },
            { merge: true },
          );
        }
      } catch {}
      toast.success('Thanks for your review!');
      setComment('');
      setRating(5);
      load();
    } catch {
      toast.error('Failed to submit review');
    }
    setSubmitting(false);
  };

  const average =
    reviews.length === 0 ? 0 : reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  return (
    <section className="mt-16">
      <h2 className="text-2xl font-bold text-white mb-2">Customer reviews</h2>
      <div className="flex items-center gap-3 mb-6">
        <StarRating value={average} size={18} />
        <span className="text-gray-300 text-sm">
          {average.toFixed(1)} · {reviews.length} review{reviews.length === 1 ? '' : 's'}
        </span>
      </div>

      {user ? (
        <form onSubmit={submit} className="glass border border-white/10 rounded-2xl p-5 mb-8">
          <p className="text-white font-medium mb-3">Write a review</p>
          <div className="flex items-center gap-1 mb-3" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map(i => (
              <button
                key={i}
                type="button"
                onMouseEnter={() => setHover(i)}
                onClick={() => setRating(i)}
                aria-label={`${i} star${i > 1 ? 's' : ''}`}
                className="p-0.5 transition"
              >
                <FiStar
                  size={22}
                  className={
                    (hover || rating) >= i ? 'text-yellow-400' : 'text-gray-500'
                  }
                  fill={(hover || rating) >= i ? 'currentColor' : 'none'}
                />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            placeholder="Share your thoughts about this product…"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-500 focus:border-primary focus:outline-none transition"
          />
          <button
            type="submit"
            disabled={submitting}
            className="mt-3 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white px-4 py-2 rounded-xl font-medium text-sm transition"
          >
            {submitting ? 'Posting…' : 'Post review'}
          </button>
        </form>
      ) : (
        <p className="text-gray-400 text-sm mb-6">
          <a href="/auth/login" className="text-primary hover:underline">
            Sign in
          </a>{' '}
          to leave a review.
        </p>
      )}

      {loading ? (
        <p className="text-gray-400">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="text-gray-400">No reviews yet — be the first!</p>
      ) : (
        <div className="space-y-4">
          {reviews.map(r => (
            <div key={r.id} className="bg-dark-700/40 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white font-medium">{r.userName}</p>
                <StarRating value={r.rating} size={14} />
              </div>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{r.comment}</p>
              <p className="text-gray-500 text-xs mt-2">
                {r.createdAt.toLocaleDateString('en-EG', { dateStyle: 'medium' })}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
