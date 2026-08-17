import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { comparePassword, generateToken, setAuthCookie } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { company: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Invalid credentials or inactive account' }, { status: 401 });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const authUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      companyId: user.companyId,
      companyName: user.company?.name || null,
    };

    const token = generateToken(authUser);
    await setAuthCookie(token);

    if (user.companyId) {
      await logAuditEvent({
        userId: user.id,
        userName: user.name,
        action: 'LOGIN',
        module: 'AUTH',
        description: `User ${user.name} (${user.role}) logged in successfully.`,
        companyId: user.companyId,
      });
    }

    return NextResponse.json({ success: true, user: authUser });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
