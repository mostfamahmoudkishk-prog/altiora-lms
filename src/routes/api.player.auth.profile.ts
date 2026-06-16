import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/lib/db";
import { verifyJwt } from "@/lib/jwt";

export const Route = createFileRoute("/api/player/auth/profile")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        try {
          const authHeader = request.headers.get("Authorization");
          if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return new Response(JSON.stringify({ error: "غير مصرح بالوصول. يرجى تسجيل الدخول." }), {
              status: 401,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            });
          }

          const token = authHeader.substring(7);
          const secret = process.env.JWT_SECRET || "altiora_secure_player_secret_2026";
          const payload = verifyJwt(token, secret);

          if (!payload || !payload.userId) {
            return new Response(JSON.stringify({ error: "انتهت صلاحية الجلسة أو الرمز غير صالح." }), {
              status: 401,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            });
          }

          const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            include: { profile: true },
          });

          if (!user) {
            return new Response(JSON.stringify({ error: "الحساب غير موجود." }), {
              status: 404,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            });
          }

          if (user.deleted_at || user.isBanned) {
            return new Response(JSON.stringify({ error: "هذا الحساب معطل أو محظور حالياً." }), {
              status: 403,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            });
          }

          return new Response(
            JSON.stringify({
              success: true,
              user: {
                id: user.id,
                email: user.email,
                name: user.profile?.name || user.email.split("@")[0],
                role: user.role,
              },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            }
          );
        } catch (err: any) {
          console.error("Error in profile endpoint:", err);
          return new Response(JSON.stringify({ error: "حدث خطأ غير متوقع على الخادم." }), {
            status: 500,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          });
        }
      },
    },
  },
});
