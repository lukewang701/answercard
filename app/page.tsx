import Link from 'next/link';

export default function Home() {
  return (
    <div className="container min-h-screen flex flex-col justify-center items-center">
      <div className="card max-w-md w-full text-center animate-fade-in">
        <h1 className="text-primary mb-6">答案卡掃描批改系統</h1>


        <div className="flex flex-col gap-4">
          <TeacherEntrance />
          
          <div>

            <p className="mb-4 text-sm" style={{ color: 'var(--foreground)' }}>學生請掃描老師提供的 QR Code<br/>或直接輸入試卷代碼</p>
            <StudentCodeForm />
          </div>
        </div>
      </div>
    </div>
  );
}

// Client component for the student code form to handle navigation
import { StudentCodeForm } from './StudentCodeForm';
import { TeacherEntrance } from './TeacherEntrance';
