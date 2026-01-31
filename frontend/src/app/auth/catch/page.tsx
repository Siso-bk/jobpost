'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/api';
import { getDefaultRouteForRoles, normalizeRoles } from '@/lib/roles';

export default function AuthCatchPage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    authService
      .me()
      .then((res) => {
        if (!active) return;
        const roles = normalizeRoles(res.data?.roles);
        router.replace(getDefaultRouteForRoles(roles));
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
