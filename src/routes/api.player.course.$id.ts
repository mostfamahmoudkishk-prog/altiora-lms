import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/lib/db";
import { verifyJwt } from "@/lib/jwt";

export const Route = createFileRoute("/api/player/course/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }: { request: Request; params: { id: string } }) => {
        try {
          const courseId = params.id;
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

          // Ensure user is enrolled in this course or is an admin/teacher
          if (role !== "SUPER_ADMIN" && role !== "ADMIN" && role !== "TEACHER") {
            const enrollment = await prisma.enrollment.findFirst({
              where: { studentId: userId, courseId, deleted_at: null },
            });
            if (!enrollment) {
              return new Response(JSON.stringify({ error: "أنت غير مشترك في هذا الكورس." }), {
                status: 403,
                headers: { "Content-Type": "application/json; charset=utf-8" },
              });
            }
          }

          // Fetch course syllabus
          const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: {
              modules: {
                where: { deleted_at: null },
                orderBy: { sortOrder: "asc" },
                include: {
                  lessons: {
                    where: { deleted_at: null },
                    orderBy: { sortOrder: "asc" },
                    include: {
                      videoMetadata: true,
                    },
                  },
                },
              },
            },
          });

          if (!course) {
            return new Response(JSON.stringify({ error: "الكورس غير موجود." }), {
              status: 404,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            });
          }

          // Format response structure for App.tsx renderer
          const formattedModules = course.modules.map((m) => ({
            id: m.id,
            title: m.title,
            lessons: m.lessons.map((l) => ({
              id: l.id,
              title: l.title,
              videoId: l.videoMetadata?.videoId || null,
              videoUrl: l.videoMetadata?.videoUrl || null,
              isPreview: l.isPreview,
            })),
          }));

          return new Response(
            JSON.stringify({
              success: true,
              course: {
                id: course.id,
                title: course.title,
                description: course.description,
                coverImage: course.coverImage,
              },
              modules: formattedModules,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            }
          );
        } catch (err: any) {
          console.error(`Error in player course syllabus endpoint for ID ${params.id}:`, err);
          return new Response(JSON.stringify({ error: "فشل تحميل منهج الكورس." }), {
            status: 500,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          });
        }
      },
    },
  },
});
