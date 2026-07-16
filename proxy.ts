import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

export default async function proxy(request: NextRequest) {
  const isTeacherRoute = request.nextUrl.pathname.startsWith('/teacher');
  const isLoginRoute = request.nextUrl.pathname === '/teacher/login';

  if (isTeacherRoute && !isLoginRoute) {
    const token = request.cookies.get('teacher_token')?.value;
    
    if (!token) {
      return NextResponse.redirect(new URL('/teacher/login', request.url));
    }
    
    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'teacher') {
      return NextResponse.redirect(new URL('/teacher/login', request.url));
    }
  }

  // If already logged in, redirect away from login page
  if (isLoginRoute) {
    const token = request.cookies.get('teacher_token')?.value;
    if (token) {
      const payload = await verifyToken(token);
      if (payload && payload.role === 'teacher') {
        return NextResponse.redirect(new URL('/teacher', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/teacher/:path*'],
};
