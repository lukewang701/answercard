'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
      document.documentElement.classList.add('light-mode');
      setIsLight(true);
    }
  }, []);

  const toggle = () => {
    const next = !isLight;
    setIsLight(next);
    if (next) {
      document.documentElement.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    }
  };

  return (
    <button
      onClick={toggle}
      title={isLight ? '切換深色模式' : '切換淺色模式'}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '2rem', height: '2rem', borderRadius: '50%',
        background: 'var(--secondary)', border: '1px solid var(--border)',
        color: 'var(--foreground)', cursor: 'pointer', flexShrink: 0,
        transition: 'all 0.2s',
      }}
    >
      {isLight ? <Moon size={15} /> : <Sun size={15} />}
    </button>
  );
}
