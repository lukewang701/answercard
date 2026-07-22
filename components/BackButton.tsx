'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export function BackButton() {
  const router = useRouter();
  
  return (
    <button type="button" onClick={() => router.back()} className="btn btn-secondary px-2">
      <ArrowLeft size={20} />
    </button>
  );
}
