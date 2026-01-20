"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const id = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    if (id) {
      router.replace(`/profile/${id}`);
    } else {
      router.replace('/login');
    }
  }, [router]);

  return null;
}
