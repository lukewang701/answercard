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
        </div>
      </div>
    </div>
  );
}
