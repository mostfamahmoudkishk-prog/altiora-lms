import { createFileRoute } from "@tanstack/react-router";
import { verifyJwt } from "@/lib/jwt";

export const Route = createFileRoute("/api/player/log-security-event")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const { prisma } = await import("@/lib/db");
          const authHeader = request.headers.get("Authorization");
          if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return new Response(JSON.stringify({ error: "غير مصرح." }), {
              status: 401,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            });
          }

          const token = authHeader.substring(7);
          const secret = process.env.JWT_SECRET || "altiora_secure_player_secret_2026";
          const payload = verifyJwt(token, secret);

          if (!payload || !payload.userId) {
            return new Response(JSON.stringify({ error: "الرمز غير صالح." }), {
              status: 401,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            });
          }

          const userId = payload.userId;
          const body = await request.json();
          const { eventType, severity, details } = body;

          if (!eventType) {
            return new Response(JSON.stringify({ error: "نوع الحدث الأمني مطلوب." }), {
              status: 400,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            });
          }

          const finalSeverity = severity || "HIGH";
          const finalDetails = details || "No details provided.";

          // 1. Create a row in SecurityEvent table
          await prisma.securityEvent.create({
            data: {
              userId,
              eventType: `PLAYER_${eventType}`,
              severity: finalSeverity,
              description: finalDetails,
            },
          });

          // 2. Create a row in SuspiciousActivity table
          await prisma.suspiciousActivity.create({
            data: {
              userId,
              activityType: eventType,
              score: finalSeverity === "CRITICAL" ? 90 : finalSeverity === "HIGH" ? 70 : 40,
              details: finalDetails,
              resolved: false,
            },
          });

          // 3. Create an AuditLog entry
          await prisma.auditLog.create({
            data: {
              userId,
              action: "SECURITY_VIOLATION",
              actionType: eventType,
              performedBy: "STUDENT",
              deviceInfo: "Altiora Desktop Player",
              payload: { eventType, severity: finalSeverity, details: finalDetails },
            },
          });

          return new Response(
            JSON.stringify({
              success: true,
              message: "تم تسجيل الحدث الأمني في السجلات الخاصة بالطالب بنجاح.",
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            }
          );
        } catch (err: any) {
          console.error("Error in player security event logger:", err);
          return new Response(JSON.stringify({ error: "فشل تسجيل الحدث الأمني." }), {
            status: 500,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          });
        }
      },
    },
  },
});
