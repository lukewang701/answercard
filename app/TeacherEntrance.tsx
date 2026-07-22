'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export function TeacherEntrance() {
  const [showTeacher, setShowTeacher] = useState(false);

  useEffect(() => {
    // Check initial hash
    if (typeof window !== 'undefined' && window.location.hash === '#lukewang') {
      setShowTeacher(true);
    }

    // Optional: Listen for hash changes if user types it manually while on the page
    const handleHashChange = () => {
      if (window.location.hash === '#lukewang') {
        setShowTeacher(true);
      } else {
        setShowTeacher(false);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (!showTeacher) return null;

  return (
    <div className="flex flex-col">
      <Link href="/teacher/login" className="btn btn-primary w-full py-3" style={{ fontSize: '1.1rem' }}>
        👨‍🏫 老師登入 (後台管理)
      </Link>
    </div>
  );
}
