import { createFileRoute } from "@tanstack/react-router";
import { verifyJwt } from "@/lib/jwt";

export const Route = createFileRoute("/api/player/progress")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const { trackLessonWatchProgress } = await import("@/lib/bunny");
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
          const { lessonId, watchedSeconds, totalSeconds } = body;

          if (!lessonId || watchedSeconds === undefined || totalSeconds === undefined) {
            return new Response(JSON.stringify({ error: "البيانات المرسلة غير مكتملة." }), {
              status: 400,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            });
          }

          // Sync progress to DB
          await trackLessonWatchProgress(userId, lessonId, watchedSeconds, totalSeconds);

          return new Response(
            JSON.stringify({
              success: true,
              message: "تم تحديث التقدم بنجاح.",
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            }
          );
        } catch (err: any) {
          console.error("Error in player progress sync endpoint:", err);
          return new Response(JSON.stringify({ error: "فشل تحديث تقدم المشاهدة." }), {
            status: 500,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          });
        }
      },
    },
  },
});
