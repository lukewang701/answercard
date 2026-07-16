import { NextResponse } from 'next/server';
import { createSession, clearSession } from '@/lib/auth';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export async function POST(request: Request) {
  try {
    const { action, password } = await request.json();

    if (action === 'logout') {
      await clearSession();
      return NextResponse.json({ success: true });
    }

    if (!ADMIN_PASSWORD) {
      console.error('安全警告：未設定 ADMIN_PASSWORD 環境變數，系統已自動鎖定登入功能。');
      return NextResponse.json({ success: false, message: '系統未設定安全密碼，登入功能已鎖定。請聯絡系統管理員。' }, { status: 500 });
    }

    if (password === ADMIN_PASSWORD) {
      await createSession();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, message: '密碼錯誤' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, message: '伺服器錯誤' }, { status: 500 });
  }
}
