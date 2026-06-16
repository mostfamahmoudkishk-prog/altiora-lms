import { PrismaClient } from "@prisma/client";
import process from "node:process";
import crypto from "node:crypto";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const rawPrisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = rawPrisma;

// Helper to get active simulation session on the server
async function getSimulationSession() {
  if (typeof window !== "undefined") return null;
  try {
    const pkg = "@tanstack/react-start/server";
    const { getCookie } = await import(pkg);
    const token = getCookie("altiora_simulation_token");
    if (!token) return null;
    
    // We query rawPrisma directly to avoid infinite recursion
    const session = await rawPrisma.simulationSession.findFirst({
      where: { simulationToken: token, isActive: true, expiresAt: { gte: new Date() } }
    });
    return session;
  } catch {
    return null;
  }
}

// Extend Prisma Client to support advanced simulation modes (Read-Only, Interactive Test, Live Control)
export const prisma = rawPrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        // Bypass simulation tables to prevent infinite recursion
        const bypassModels = ["SimulationSession", "SimulationSandbox", "SimulationAuditLog"];
        if (bypassModels.includes(model)) {
          return query(args);
        }

        const session = await getSimulationSession();
        if (!session) {
          return query(args);
        }

        const isMutation = [
          "create", "update", "delete", "upsert",
          "createMany", "updateMany", "deleteMany",
          "executeRaw", "queryRaw"
        ].includes(operation);

        // Cast args to any to safely handle custom properties
        const anyArgs = args as any;

        // 1. Read-Only Mode
        if (session.readOnlyMode && isMutation) {
          throw new Error("ERR_SIMULATION_READ_ONLY: وضع المحاكاة للقراءة فقط ولا يسمح بإجراء تعديلات.");
        }

        // 2. Interactive Test Mode (Sandbox)
        if (session.interactiveMode) {
          if (isMutation) {
            // Intercept write operations and save them in the sandbox instead of writing to the real DB
            const entityId = anyArgs.where?.id || anyArgs.where?.uuid || anyArgs.data?.id || null;
            let finalId = entityId;
            
            if (operation === "create" || operation === "createMany") {
              // Generate mock ID if missing
              finalId = anyArgs.data?.id || crypto.randomUUID();
            }

            await rawPrisma.simulationSandbox.create({
              data: {
                sessionId: session.id,
                entityType: model,
                entityId: finalId ? String(finalId) : null,
                action: operation.toUpperCase(),
                data: JSON.parse(JSON.stringify(anyArgs.data || anyArgs || {}))
              }
            });

            // Return mock entity to prevent caller crash
            if (operation === "create") {
              return { ...anyArgs.data, id: finalId };
            } else if (operation === "update") {
              try {
                const realEntity = await (rawPrisma as any)[model].findUnique({ where: anyArgs.where });
                return { ...realEntity, ...anyArgs.data };
              } catch {
                return { ...anyArgs.data, id: finalId };
              }
            } else if (operation === "delete") {
              return { id: finalId };
            }
            return { success: true };
          } else {
            // For reads (findMany, findUnique, findFirst), fetch from real DB and merge sandbox data
            const result = await query(args);
            try {
              const sandboxes = await rawPrisma.simulationSandbox.findMany({
                where: { sessionId: session.id, entityType: model }
              });
              if (sandboxes.length === 0) {
                return result;
              }

              if (Array.isArray(result)) {
                let mergedList = [...result];
                for (const sandbox of sandboxes) {
                  const data = sandbox.data as any;
                  if (sandbox.action === "CREATE") {
                    mergedList.push(data);
                  } else if (sandbox.action === "UPDATE") {
                    mergedList = mergedList.map(item => 
                      item.id === sandbox.entityId ? { ...item, ...data } : item
                    );
                  } else if (sandbox.action === "DELETE") {
                    mergedList = mergedList.filter(item => item.id !== sandbox.entityId);
                  }
                }
                return mergedList;
              } else if (result && typeof result === "object") {
                let mergedItem = { ...result } as any;
                const deleteSandbox = sandboxes.find(s => s.action === "DELETE" && s.entityId === mergedItem.id);
                if (deleteSandbox) return null;

                const updateSandboxes = sandboxes.filter(s => s.action === "UPDATE" && s.entityId === mergedItem.id);
                for (const sandbox of updateSandboxes) {
                  mergedItem = { ...mergedItem, ...(sandbox.data as any) };
                }
                return mergedItem;
              } else if (result === null) {
                // Check if a matching create sandbox exists
                const createSandbox = sandboxes.find(s => s.action === "CREATE" && s.entityId === (anyArgs.where?.id || anyArgs.where?.uuid));
                if (createSandbox) {
                  return createSandbox.data;
                }
              }
            } catch (err) {
              console.error("Failed to merge sandbox data for model:", model, err);
            }
            return result;
          }
        }

        // 3. Live Control Mode
        if (isMutation) {
          // Block deletions of critical entities
          const criticalModels = [
            "User", "Course", "Order", "Payment", 
            "Transaction", "RevenueTransaction", "RevenueSettings", 
            "Certificate", "AuditLog", "SecurityEvent", "SuspiciousActivity", 
            "BackupLog", "InstructorBranding"
          ];
          
          const isDelete = operation.includes("delete");
          const isSoftDelete = operation === "update" && anyArgs.data?.deleted_at !== undefined;
          
          if (criticalModels.includes(model) && (isDelete || isSoftDelete)) {
            throw new Error("ERR_SIMULATION_DELETE_BLOCKED: لا يمكن حذف الكيانات الحساسة أثناء جلسة التحكم المباشر. يرجى تنفيذ هذا الإجراء من لوحة الإدارة الرئيسية.");
          }

          // Concurrency Conflict Check
          let clientUpdatedAt: string | null = null;
          let overwrite = false;

          if (anyArgs.clientUpdatedAt !== undefined) {
            clientUpdatedAt = anyArgs.clientUpdatedAt;
            delete anyArgs.clientUpdatedAt;
          } else if (anyArgs.data && anyArgs.data.clientUpdatedAt !== undefined) {
            clientUpdatedAt = anyArgs.data.clientUpdatedAt;
            delete anyArgs.data.clientUpdatedAt;
          }

          if (anyArgs.overwrite !== undefined) {
            overwrite = anyArgs.overwrite;
            delete anyArgs.overwrite;
          } else if (anyArgs.data && anyArgs.data.overwrite !== undefined) {
            overwrite = anyArgs.data.overwrite;
            delete anyArgs.data.overwrite;
          }

          if (clientUpdatedAt && !overwrite) {
            try {
              const currentRecord = await (rawPrisma as any)[model].findUnique({ where: anyArgs.where });
              if (currentRecord) {
                const dbUpdatedAt = currentRecord.updated_at || currentRecord.updatedAt || currentRecord.updated_At;
                if (dbUpdatedAt && new Date(dbUpdatedAt) > new Date(clientUpdatedAt)) {
                  throw new Error("ERR_CONCURRENT_MODIFICATION: تم تعديل هذا العنصر بواسطة المستخدم الحقيقي أثناء جلسة المحاكاة.");
                }
              }
            } catch (err: any) {
              if (err.message?.includes("ERR_CONCURRENT_MODIFICATION")) throw err;
            }
          }

          // Wrap updates inside transaction and log the modifications for Audit Trail
          let beforeValues: any = null;
          if (operation === "update" || operation === "delete") {
            try {
              beforeValues = await (rawPrisma as any)[model].findUnique({ where: anyArgs.where });
            } catch {}
          }

          // Execute operation
          const result = await query(args);

          // Log to audit logs in the background
          try {
            const pkg = "@tanstack/react-start/server";
            const { getRequestIP, getRequest } = await import(pkg);
            const ipAddress = getRequestIP() || "127.0.0.1";
            let device = "Unknown Device";
            try {
              const req = getRequest();
              device = req.headers.get("user-agent") || "Unknown Device";
            } catch {}

            await rawPrisma.simulationAuditLog.create({
              data: {
                adminId: session.realAdminId,
                targetUserId: session.targetUserId,
                targetRole: session.targetRole,
                sessionId: session.id,
                entityType: model,
                action: operation.toUpperCase(),
                beforeValues: beforeValues ? JSON.parse(JSON.stringify(beforeValues)) : null,
                afterValues: result ? JSON.parse(JSON.stringify(result)) : null,
                ipAddress,
                device,
                reason: "Live Control Troubleshooting"
              }
            });
          } catch (auditErr) {
            console.error("Failed to write simulation audit log:", auditErr);
          }

          return result;
        }

        return query(args);
      }
    }
  }
});
