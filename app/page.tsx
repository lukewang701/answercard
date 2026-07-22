import { TeacherEntrance } from './TeacherEntrance';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Home() {
  return (
    <div className="container min-h-screen flex flex-col justify-center items-center" style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: '1rem', right: '1.5rem' }}>
        <ThemeToggle />
      </div>
      <div className="card max-w-md w-full text-center animate-fade-in">
        <h1 className="text-primary mb-6">數位答案卡</h1>
        <div className="flex flex-col gap-4">
          <TeacherEntrance />
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="mb-4 text-sm" style={{ color: 'var(--foreground)', opacity: 0.8 }}>學生請掃描老師提供的 QR Code<br/>或直接輸入試卷代碼</p>
            <StudentCodeForm />
          </div>
        </div>
      </div>
    </div>
  );
}

// Client component for the student code form to handle navigation
import { StudentCodeForm } from './StudentCodeForm';
