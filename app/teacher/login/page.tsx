'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TeacherLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push('/teacher');
      } else {
        setError(data.message || '登入失敗');
      }
    } catch (err) {
      setError('網路連線錯誤');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container min-h-screen flex flex-col justify-center items-center">
      <div className="card max-w-md w-full animate-fade-in">
        <h2 className="text-center mb-6">老師登入</h2>
        
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block mb-2 text-sm">請輸入管理員密碼</label>
            <input
              type="password"
              className="w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>
          
          {error && <p className="text-danger text-sm mb-0">{error}</p>}
          
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? '登入中...' : '登入'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button onClick={() => router.push('/')} className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
            返回首頁
          </button>
        </div>
      </div>
    </div>
  );
}
