'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function StudentCodeForm() {
  const [code, setCode] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      router.push(`/s/${code.trim()}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        placeholder="輸入 6 碼試卷代碼"
        className="w-full text-center"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        maxLength={6}
      />
      <button type="submit" className="btn btn-secondary" disabled={!code.trim()}>
        進入
      </button>
    </form>
  );
}
