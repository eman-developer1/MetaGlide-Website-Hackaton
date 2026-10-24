'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '../lib/api';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (token) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-[#0A66C2] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-[var(--text-muted)] tracking-wider uppercase">
          Redirecting to MetaGlide HCM...
        </p>
      </div>
    </div>
  );
}
