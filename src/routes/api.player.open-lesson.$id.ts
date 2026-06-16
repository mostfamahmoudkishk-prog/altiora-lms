import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/lib/db";
import { verifyJwt } from "@/lib/jwt";

export const Route = createFileRoute("/api/player/open-lesson/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }: { request: Request; params: { id: string } }) => {
        try {
          const lessonId = params.id;
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

          // Fetch lesson with module and course
          const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId, deleted_at: null },
            include: {
              videoMetadata: true,
              module: {
                include: {
                  course: true,
                },
              },
            },
          });

          if (!lesson || !lesson.module || !lesson.module.course) {
            return new Response(JSON.stringify({ error: "الدرس غير موجود أو لا ينتمي لكورس." }), {
              status: 404,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            });
          }

          const course = lesson.module.course;

          // Check enrollment if not admin/teacher
          if (role !== "SUPER_ADMIN" && role !== "ADMIN" && role !== "TEACHER" && !lesson.isPreview) {
            const enrollment = await prisma.enrollment.findFirst({
              where: { studentId: userId, courseId: course.id, deleted_at: null },
            });
            if (!enrollment) {
              return new Response(
                JSON.stringify({ error: "يجب الاشتراك في الكورس أولاً لمشاهدة هذا الدرس." }),
                {
                  status: 403,
                  headers: { "Content-Type": "application/json; charset=utf-8" },
                }
              );
            }
          }

          return new Response(
            JSON.stringify({
              success: true,
              course: {
                id: course.id,
                title: course.title,
                description: course.description,
                coverImage: course.coverImage,
              },
              lesson: {
                id: lesson.id,
                title: lesson.title,
                videoId: lesson.videoMetadata?.videoId || null,
                videoUrl: lesson.videoMetadata?.videoUrl || null,
                isPreview: lesson.isPreview,
              },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            }
          );
        } catch (err: any) {
          console.error(`Error in player open-lesson endpoint for ID ${params.id}:`, err);
          return new Response(JSON.stringify({ error: "فشل فتح الدرس." }), {
            status: 500,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          });
        }
      },
    },
  },
});
