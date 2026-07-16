import Link from 'next/link';

export default function Home() {
  return (
    <div className="container min-h-screen flex flex-col justify-center items-center">
      <div className="card max-w-md w-full text-center animate-fade-in">
        <h1 className="text-primary mb-2">答案卡掃描批改系統</h1>
        <p className="mb-8">請選擇您的身份進入系統</p>

        <div className="flex flex-col gap-4">
          <Link href="/teacher/login" className="btn btn-primary w-full py-3" style={{ fontSize: '1.1rem' }}>
            👨‍🏫 老師登入 (後台管理)
          </Link>
          
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
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
