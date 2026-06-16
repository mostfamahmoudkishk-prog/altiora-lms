import { createFileRoute } from "@tanstack/react-router";
import { verifyJwt } from "@/lib/jwt";

export const Route = createFileRoute("/api/player/verify-device")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const { prisma } = await import("@/lib/db");
          const authHeader = request.headers.get("Authorization");
          if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return new Response(JSON.stringify({ error: "غير مصرح بالوصول." }), {
              status: 401,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            });
          }

          const token = authHeader.substring(7);
          const secret = process.env.JWT_SECRET || "altiora_secure_player_secret_2026";
          const payload = verifyJwt(token, secret);

          if (!payload || !payload.userId) {
            return new Response(JSON.stringify({ error: "الرمز غير صالح أو منتهي الصلاحية." }), {
              status: 401,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            });
          }

          const userId = payload.userId;
          const body = await request.json();
          const { deviceId, cpu, os: deviceOs, hostname } = body;

          if (!deviceId) {
            return new Response(JSON.stringify({ error: "بصمة الجهاز (deviceId) مطلوبة للتحقق." }), {
              status: 400,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            });
          }

          const user = await prisma.user.findUnique({
            where: { id: userId },
          });

          if (!user) {
            return new Response(JSON.stringify({ error: "المستخدم غير موجود." }), {
              status: 404,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            });
          }

          const allowedLimit = user.deviceLimit || 1;

          // Find if device is already registered for this user
          const existingDevice = await prisma.userDevice.findFirst({
            where: { user_id: userId, device_id: deviceId },
          });

          if (existingDevice) {
            if (existingDevice.revoked) {
              return new Response(
                JSON.stringify({ error: "تم إلغاء ترخيص هذا الجهاز. يرجى مراجعة الدعم الفني." }),
                {
                  status: 403,
                  headers: { "Content-Type": "application/json; charset=utf-8" },
                }
              );
            }

            // Update last seen
            await prisma.userDevice.update({
              where: { id: existingDevice.id },
              data: { last_seen: new Date() },
            });
          } else {
            // Device is new, check limit
            const activeDevicesCount = await prisma.userDevice.count({
              where: { user_id: userId, revoked: false },
            });

            if (activeDevicesCount >= allowedLimit) {
              return new Response(
                JSON.stringify({
                  error: `عذراً، لقد تجاوزت الحد الأقصى المسموح به للأجهزة وهو (${allowedLimit}) جهاز. يرجى إلغاء تفعيل الأجهزة الأخرى لتتمكن من تشغيل المشغل على هذا الجهاز.`,
                }),
                {
                  status: 403,
                  headers: { "Content-Type": "application/json; charset=utf-8" },
                }
              );
            }

            // Register new device
            await prisma.userDevice.create({
              data: {
                user_id: userId,
                device_id: deviceId,
                fingerprint_hash: deviceId,
                browser: "Altiora Player Desktop",
                os: `${deviceOs} | CPU: ${cpu || "Unknown"} | Host: ${hostname || "Unknown"}`,
              },
            });
          }

          // Maintain active session
          const existingSession = await prisma.userSession.findFirst({
            where: { user_id: userId, device_id: deviceId, status: "ACTIVE" },
          });

          if (existingSession) {
            await prisma.userSession.update({
              where: { id: existingSession.id },
              data: { last_activity: new Date() },
            });
          } else {
            // Revoke other active sessions for clean single device enforcement if desired
            await prisma.userSession.create({
              data: {
                user_id: userId,
                session_id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                device_id: deviceId,
                fingerprint_hash: deviceId,
                browser: "Altiora Player Desktop",
                os: `${deviceOs} | CPU: ${cpu || "Unknown"}`,
                status: "ACTIVE",
              },
            });
          }

          return new Response(
            JSON.stringify({
              success: true,
              message: "تم التحقق من الجهاز بنجاح.",
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            }
          );
        } catch (err: any) {
          console.error("Error in verify-device endpoint:", err);
          return new Response(JSON.stringify({ error: "حدث خطأ غير متوقع أثناء التحقق من بصمة الجهاز." }), {
            status: 500,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          });
        }
      },
    },
  },
});
