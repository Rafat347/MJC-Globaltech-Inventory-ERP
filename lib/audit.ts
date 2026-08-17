import { db } from './db';

export interface LogAuditParams {
  userId?: string | null;
  userName?: string | null;
  action: string;
  module: string;
  recordId?: string | null;
  description: string;
  companyId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logAuditEvent(params: LogAuditParams) {
  try {
    const {
      userId,
      userName,
      action,
      module,
      recordId,
      description,
      companyId,
      ipAddress,
      userAgent,
    } = params;

    return await db.auditLog.create({
      data: {
        userId,
        userName: userName || 'System',
        action,
        module,
        recordId,
        description,
        companyId,
        ipAddress,
        userAgent,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
    return null;
  }
}
