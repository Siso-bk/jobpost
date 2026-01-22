'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/api';

export default function SettingsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    authService
      .me()
      .then((res) => {
        if (!active) return;
        const id = res.data?.id;
        if (id) {
          router.replace(`/profile/${id}`);
        } else {
          router.replace('/login');
        }
      })
      .catch(() => {
        if (!active) return;
        router.replace('/login');
      });
    return () => {
      active = false;
    };
  }, [router]);

  return null;
}
