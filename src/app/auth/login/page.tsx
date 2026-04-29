'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FcGoogle } from 'react-icons/fc';
import { FaApple } from 'react-icons/fa';

export default function LoginPage() {
  const { signInWithGoogle, signInWithApple, signInWithEmail } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill all fields'); return; }
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      toast.success('Welcome back!');
      router.push('/');
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    try {
      await signInWithGoogle();
      toast.success('Welcome!');
      router.push('/');
    } catch (err: any) {
      toast.error(err.message || 'Google sign-in failed');
    }
  };

  const handleApple = async () => {
    try {
      await signInWithApple();
      toast.success('Welcome!');
      router.push('/');
    } catch (err: any) {
      toast.error(err.message || 'Apple sign-in failed');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-dark-700/50 border border-white/10 rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-white text-center mb-2">Welcome Back</h1>
        <p className="text-gray-400 text-center mb-8">Sign in to your Mo-Tech account</p>

        <div className="space-y-3 mb-6">
          <button onClick={handleGoogle} className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 py-3 rounded-xl font-medium hover:bg-gray-100 transition">
            <FcGoogle size={20} /> Continue with Google
          </button>
          <button onClick={handleApple} className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 py-3 rounded-xl font-medium hover:bg-gray-100 transition">
            <FaApple size={20} /> Continue with Apple
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-gray-500 text-sm">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <form onSubmit={handleEmail} className="space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full bg-dark-600 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-primary focus:outline-none" />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full bg-dark-600 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-primary focus:outline-none" />
          <button type="submit" disabled={loading}
            className="w-full bg-primary hover:bg-primary/80 disabled:bg-gray-600 text-white py-3 rounded-xl font-semibold transition">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-gray-400 text-center mt-6 text-sm">
          Don&apos;t have an account? <Link href="/auth/register" className="text-primary hover:underline">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
