'use client';

import { useTheme } from '../ThemeProvider';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ width: 32, height: 32 }} />;
  }

  return (
    <button
      onClick={toggleTheme}
      className="btn btn-secondary flex items-center justify-center p-2 rounded-full"
      style={{ width: '32px', height: '32px' }}
      title={theme === 'dark' ? '切換為淺色模式' : '切換為深色模式'}
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
