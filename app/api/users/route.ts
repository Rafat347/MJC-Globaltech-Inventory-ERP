import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { UserRole } from '@prisma/client';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const users = await db.user.findMany({
      where: { companyId: user.companyId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { email, password, name, role, phone } = await request.json();
    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: 'Email, password, name, and role are required' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const newUser = await db.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        name,
        role: role as UserRole,
        phone,
        companyId: user.companyId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      action: 'CREATE',
      module: 'USER',
      recordId: newUser.id,
      description: `Created user ${newUser.name} with role ${newUser.role}`,
      companyId: user.companyId,
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
