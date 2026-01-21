"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCatchPage() {
  const router = useRouter();

  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get('token');
    const id = url.searchParams.get('id');
    const role = url.searchParams.get('role');
    if (token) localStorage.setItem('token', token);
    if (id) localStorage.setItem('userId', id);
    if (role) localStorage.setItem('userRole', role);
    if (role === 'employer') {
      router.replace('/employer');
    } else {
      router.replace('/jobs');
    }
  }, [router]);

  return null;
}
