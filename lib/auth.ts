import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { db } from './db';
import { AuthUser, UserRole } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'zenith_sme_erp_jwt_secret_key_production_grade_secure_2026';
const COOKIE_NAME = 'zenith_auth_token';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export async function removeAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload?.id) return null;

    const user = await db.user.findUnique({
      where: { id: payload.id },
      include: { company: true },
    });

    if (!user || !user.isActive) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      phone: user.phone,
      companyId: user.companyId,
      companyName: user.company?.name || null,
    };
  } catch {
    return null;
  }
}

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: [
    'company:manage',
    'users:manage',
    'customers:read', 'customers:write',
    'suppliers:read', 'suppliers:write',
    'products:read', 'products:write',
    'inventory:read', 'inventory:write',
    'sales:read', 'sales:write',
    'purchases:read', 'purchases:write',
    'payments:read', 'payments:write',
    'expenses:read', 'expenses:write',
    'accounting:read', 'accounting:write',
    'reports:read',
    'audit:read',
    'backup:export',
  ],
  MANAGER: [
    'customers:read', 'customers:write',
    'suppliers:read', 'suppliers:write',
    'products:read', 'products:write',
    'inventory:read', 'inventory:write',
    'sales:read', 'sales:write',
    'purchases:read', 'purchases:write',
    'payments:read', 'payments:write',
    'expenses:read', 'expenses:write',
    'reports:read',
  ],
  SALESPERSON: [
    'customers:read', 'customers:write',
    'products:read',
    'inventory:read',
    'sales:read', 'sales:write',
  ],
  ACCOUNTANT: [
    'customers:read',
    'suppliers:read',
    'sales:read',
    'purchases:read',
    'payments:read', 'payments:write',
    'expenses:read', 'expenses:write',
    'accounting:read', 'accounting:write',
    'reports:read',
  ],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}
