'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes

export function InactivityLock() {
  const [isLocked, setIsLocked] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    // Check initial state
    const lockedState = localStorage.getItem('teacherLocked');
    if (lockedState === 'true') {
      setIsLocked(true);
    }

    const savedLastActivity = localStorage.getItem('lastActivity');
    if (savedLastActivity) {
      lastActivityRef.current = parseInt(savedLastActivity, 10);
    } else {
      localStorage.setItem('lastActivity', lastActivityRef.current.toString());
    }

    const updateActivity = () => {
      const now = Date.now();
      // Throttle updates to localstorage to every 5 seconds
      if (now - lastActivityRef.current > 5000) {
        lastActivityRef.current = now;
        localStorage.setItem('lastActivity', now.toString());
      }
    };

    const handleUserActivity = () => {
      if (!isLocked) {
        updateActivity();
      }
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);

    const checkInactivity = setInterval(() => {
      if (isLocked) return;
      const now = Date.now();
      const storedLastActivity = parseInt(localStorage.getItem('lastActivity') || now.toString(), 10);
      
      if (now - storedLastActivity > INACTIVITY_TIMEOUT) {
        setIsLocked(true);
        localStorage.setItem('teacherLocked', 'true');
      }
    }, 10000); // Check every 10 seconds

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      clearInterval(checkInactivity);
    };
  }, [isLocked]);

  const handleUnlock = async (e: React.FormEvent) => {
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
        setIsLocked(false);
        setPassword('');
        localStorage.removeItem('teacherLocked');
        const now = Date.now();
        lastActivityRef.current = now;
        localStorage.setItem('lastActivity', now.toString());
      } else {
        setError(data.message || '密碼錯誤');
      }
    } catch (err) {
      setError('網路連線錯誤');
    } finally {
      setLoading(false);
    }
  };

  if (!isLocked) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-transparent flex flex-col items-center pt-8">
      {/* Invisible overlay to block clicks on underlying page */}
      <div className="absolute inset-0 bg-transparent" style={{ pointerEvents: 'auto' }}></div>
      
      {/* Unlock dialog at the top */}
      <div 
        className="relative z-10 bg-secondary/90 border border-border p-4 rounded-xl shadow-2xl backdrop-blur-md w-[400px] animate-fade-in"
        style={{ pointerEvents: 'auto' }}
      >
        <div className="flex items-center gap-2 mb-3 text-warning">
          <Lock size={20} />
          <h3 className="m-0 text-base">閒置超過10分鐘，系統已暫停操作</h3>
        </div>
        
        <form onSubmit={handleUnlock} className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              type="password"
              className="flex-1 text-sm bg-background/80"
              placeholder="請輸入管理員密碼解鎖"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <button type="submit" className="btn btn-primary text-sm whitespace-nowrap" disabled={loading}>
              {loading ? '驗證中...' : '解除鎖定'}
            </button>
          </div>
          {error && <p className="text-danger text-xs m-0">{error}</p>}
        </form>
      </div>
    </div>
  );
}
