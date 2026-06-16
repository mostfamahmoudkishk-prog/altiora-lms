import { createFileRoute } from "@tanstack/react-router";
import { verifyJwt } from "@/lib/jwt";

export const Route = createFileRoute("/api/player/courses")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
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

          let courses: any[] = [];

          if (role === "SUPER_ADMIN" || role === "ADMIN" || role === "TEACHER") {
            // Return all non-archived courses for testing/management roles
            courses = await prisma.course.findMany({
              where: { isArchived: false },
              select: {
                id: true,
                title: true,
                description: true,
                coverImage: true,
              },
            });
          } else {
            // Return only enrolled courses for students
            const enrollments = await prisma.enrollment.findMany({
              where: { studentId: userId, deleted_at: null },
              include: {
                course: {
                  select: {
                    id: true,
                    title: true,
                    description: true,
                    coverImage: true,
                  },
                },
              },
            });
            courses = enrollments.map((e) => e.course).filter(Boolean);
          }

          return new Response(
            JSON.stringify({
              success: true,
              courses,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            }
          );
        } catch (err: any) {
          console.error("Error in player courses endpoint:", err);
          return new Response(JSON.stringify({ error: "فشل تحميل الكورسات." }), {
            status: 500,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          });
        }
      },
    },
  },
});
