'use client';

import { useEffect } from 'react';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export function useActiveUser() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const ref = doc(db, 'activeUsers', user.uid);

    const update = () => {
      setDoc(ref, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        lastSeen: serverTimestamp(),
      }, { merge: true });
    };

    update();
    const interval = setInterval(update, 30000);

    return () => {
      clearInterval(interval);
      deleteDoc(ref).catch(() => {});
    };
  }, [user]);
}
