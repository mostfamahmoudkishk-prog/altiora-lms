import fs from "node:fs";
import path from "node:path";
const prisma = (globalThis as any).prisma;

export type LogLevel = "INFO" | "WARNING" | "ERROR" | "CRITICAL";
export type LogCategory = "REQUEST" | "ERROR" | "AUDIT" | "SECURITY";

let lastRotationCheck = 0;
const ROTATION_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // Check once every 24 hours

/**
 * Asynchronously writes a system log to the database in a non-blocking way.
 * Catches internal database errors to ensure the main application flow is never disrupted.
 */
export function logSystem(
  level: LogLevel,
  category: LogCategory,
  message: string,
  metadata?: Record<string, any>,
) {
  // Execute database insert in a non-blocking promise chain
  prisma.systemLog
    .create({
      data: {
        level,
        category,
        message,
        metadata: metadata ? (metadata as any) : undefined,
      },
    })
    .then(() => {
      // Trigger background log retention check periodically
      triggerLogRotation();
    })
    .catch((err) => {
      // Fallback: console log if database connection fails, ensuring no log loss
      console.error(`[FALLBACK-LOGGER] [${level}] [${category}] ${message}`, metadata, err);
    });
}

export async function logAudit(
  userId: string | null,
  action: string,
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    resourceType?: string;
    resourceId?: string;
    payload?: Record<string, any>;
    actionType?: string;
    performedBy?: string;
    targetUserId?: string;
    deviceInfo?: string;
  },
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || undefined,
        action,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        resourceType: metadata?.resourceType,
        resourceId: metadata?.resourceId,
        payload: metadata?.payload ? (metadata.payload as any) : undefined,
        actionType: metadata?.actionType || "UNKNOWN",
        performedBy: metadata?.performedBy || "SYSTEM",
        targetUserId: metadata?.targetUserId,
        deviceInfo: metadata?.deviceInfo,
      },
    });
  } catch (err) {
    console.error(`[AUDIT-LOGGER-FAILED] Action: ${action}, User: ${userId}`, err);
    logSystem("WARNING", "AUDIT", `Audit log failed for action: ${action}`, {
      userId,
      error: err instanceof Error ? err.message : String(err),
      ...metadata,
    });
  }
}

// Logger helper functions
export const logger = {
  info: (category: LogCategory, message: string, metadata?: Record<string, any>) =>
    logSystem("INFO", category, message, metadata),
  warn: (category: LogCategory, message: string, metadata?: Record<string, any>) =>
    logSystem("WARNING", category, message, metadata),
  error: (category: LogCategory, message: string, metadata?: Record<string, any>) =>
    logSystem("ERROR", category, message, metadata),
  critical: (category: LogCategory, message: string, metadata?: Record<string, any>) =>
    logSystem("CRITICAL", category, message, metadata),
  security: (message: string, metadata?: Record<string, any>) =>
    logSystem("CRITICAL", "SECURITY", message, metadata),
  audit: (
    userId: string | null,
    action: string,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
      resourceType?: string;
      resourceId?: string;
      payload?: Record<string, any>;
      actionType?: string;
      performedBy?: string;
      targetUserId?: string;
      deviceInfo?: string;
    },
  ) => {
    // We execute it asynchronously in non-blocking way to prevent blocking main flow
    logAudit(userId, action, metadata).catch((err) => {
      console.error("[LOGGER-AUDIT-UNHANDLED]", err);
    });
  },
};

/**
 * Periodically checks and runs log rotation in the background.
 */
function triggerLogRotation() {
  const now = Date.now();
  if (now - lastRotationCheck > ROTATION_CHECK_INTERVAL) {
    lastRotationCheck = now;
    rotateAndArchiveLogs(90).catch((err) => {
      console.error("[LOGGER] Log rotation/archival failed:", err);
    });
  }
}

/**
 * Performs log rotation: archives logs older than `daysToKeep` to disk, then prunes them from DB.
 */
export async function rotateAndArchiveLogs(daysToKeep = 90): Promise<{ archivedCount: number }> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  // 1. Fetch old logs to archive
  const oldLogs = await prisma.systemLog.findMany({
    where: {
      created_at: {
        lt: cutoffDate,
      },
    },
    orderBy: {
      created_at: "asc",
    },
  });

  if (oldLogs.length === 0) {
    return { archivedCount: 0 };
  }

  // 2. Ensure archive directory exists
  const archiveDir = path.resolve("./private/logs/archive");
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }

  // 3. Serialize and write old logs to file
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const archiveFilename = `system_logs_archive_${dateStr}_${Date.now()}.json`;
  const archivePath = path.join(archiveDir, archiveFilename);

  fs.writeFileSync(archivePath, JSON.stringify(oldLogs, null, 2), "utf-8");
  console.log(`[LOGGER] Archived ${oldLogs.length} logs to ${archivePath}`);

  // 4. Delete old logs from database
  const deleted = await prisma.systemLog.deleteMany({
    where: {
      created_at: {
        lt: cutoffDate,
      },
    },
  });

  console.log(`[LOGGER] Rotated database logs. Deleted ${deleted.count} entries from DB.`);
  return { archivedCount: oldLogs.length };
}
