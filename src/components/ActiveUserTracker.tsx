'use client';

import { useActiveUser } from '@/hooks/useActiveUser';

export default function ActiveUserTracker() {
  useActiveUser();
  return null;
}
