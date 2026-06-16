import { createFileRoute } from "@tanstack/react-router";
import { verifyJwt } from "@/lib/jwt";
import { generateSignedPlaybackUrl } from "@/lib/bunny";

export const Route = createFileRoute("/api/player/get-video-url")({
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
          const role = payload.role;

          const body = await request.json();
          const { lessonId } = body;

          if (!lessonId) {
            return new Response(JSON.stringify({ error: "معرف الدرس مطلوب." }), {
              status: 400,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            });
          }

          // Fetch lesson to ensure it exists and get videoId
          const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId, deleted_at: null },
            include: {
              videoMetadata: true,
              module: {
                select: {
                  courseId: true,
                },
              },
            },
          });

          if (!lesson) {
            return new Response(JSON.stringify({ error: "الدرس غير موجود." }), {
              status: 404,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            });
          }

          // Check enrollment if not admin/teacher
          if (role !== "SUPER_ADMIN" && role !== "ADMIN" && role !== "TEACHER" && !lesson.isPreview) {
            const courseId = lesson.module?.courseId;
            if (!courseId) {
              return new Response(JSON.stringify({ error: "فشل التحقق من ملكية الكورس للدرس." }), {
                status: 400,
                headers: { "Content-Type": "application/json; charset=utf-8" },
              });
            }

            const enrollment = await prisma.enrollment.findFirst({
              where: { studentId: userId, courseId, deleted_at: null },
            });

            if (!enrollment) {
              return new Response(JSON.stringify({ error: "عذراً، يجب عليك الاشتراك في هذا الكورس أولاً لتشغيل هذا الفيديو." }), {
                status: 403,
                headers: { "Content-Type": "application/json; charset=utf-8" },
              });
            }
          }

          const videoId = lesson.videoMetadata?.videoId;
          if (!videoId) {
            return new Response(JSON.stringify({ error: "لا يوجد فيديو مرتبط بهذا الدرس حالياً." }), {
              status: 404,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            });
          }

          // Generate a signed URL with 5-minute (300 seconds) expiration for maximum DRM protection
          const signedUrl = generateSignedPlaybackUrl(videoId, 300);

          return new Response(
            JSON.stringify({
              success: true,
              signedUrl,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            }
          );
        } catch (err: any) {
          console.error("Error in player get-video-url endpoint:", err);
          return new Response(JSON.stringify({ error: "فشل الحصول على رابط البث الآمن." }), {
            status: 500,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          });
        }
      },
    },
  },
});
