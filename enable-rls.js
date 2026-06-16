import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log("Creating SQL helper functions for RLS checks...");
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION public.is_super_admin(user_id uuid)
      RETURNS boolean AS $$
      BEGIN
        RETURN EXISTS (SELECT 1 FROM public."User" WHERE id = user_id AND role = 'SUPER_ADMIN' AND deleted_at IS NULL);
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
      RETURNS boolean AS $$
      BEGIN
        RETURN EXISTS (SELECT 1 FROM public."User" WHERE id = user_id AND (role = 'ADMIN' OR role = 'SUPER_ADMIN') AND deleted_at IS NULL);
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION public.is_teacher(user_id uuid)
      RETURNS boolean AS $$
      BEGIN
        RETURN EXISTS (SELECT 1 FROM public."User" WHERE id = user_id AND (role = 'TEACHER' OR role = 'ADMIN' OR role = 'SUPER_ADMIN') AND deleted_at IS NULL);
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    console.log("Helper functions created successfully.");

    // List of public tables and their owner ID column names
    const tableOwnerCols = {
      User: "id",
      Profile: '"userId"',
      Session: '"userId"',
      Device: '"userId"',
      LoginHistory: '"userId"',
      CourseReview: '"studentId"',
      WatchHistory: '"studentId"',
      ContinueWatching: '"studentId"',
      VideoNote: '"studentId"',
      Enrollment: '"studentId"',
      StudentProgress: '"studentId"',
      ActivityTimeline: '"studentId"',
      SavedNote: '"studentId"',
      Wishlist: '"studentId"',
      RecentlyViewed: '"studentId"',
      DownloadedFileHistory: '"studentId"',
      StudentAccessCode: '"studentId"',
      ExamAttempt: '"studentId"',
      ExamViolation: '"studentId"',
      AntiCheatEvent: '"studentId"',
      Order: '"studentId"',
      Certificate: '"studentId"',
      Comment: '"authorId"',
      Discussion: '"authorId"',
      AnswerDiscussion: '"authorId"',
      Notification: '"userId"',
      EmailNotification: '"userId"',
      PushNotification: '"userId"',
      Ticket: '"studentId"',
      Reply: '"userId"',
      Complaint: '"studentId"',
      WatchTimeAnalytics: '"studentId"',
      AuditLog: '"userId"',
      SecurityEvent: '"userId"',
      SuspiciousActivity: '"userId"',
      backup_logs: '"initiatedBy"',
      activity_logs: '"userId"',
      student_codes: '"studentId"',
      maintenance_logs: '"initiatedBy"',
      push_subscriptions: '"userId"',
      notification_preferences: '"userId"',
      user_sessions: "user_id",
      user_devices: "user_id",
      security_events: "user_id",
      exam_violations: "user_id",
      watch_progress: "user_id",
      video_notes: "user_id",
      download_history: "user_id",
      activity_timeline: "user_id",
      watch_time_stats: '"studentId"',
      student_activity_stats: '"studentId"',
    };

    // General read-only tables for students, writeable by teachers/admins
    const generalTables = [
      "Category",
      "Course",
      "CourseInstructor",
      "Module",
      "Lesson",
      "Attachment",
      "PdfFile",
      "VideoMetadata",
      "Video",
      "Question",
      "Choice",
      "Exam",
      "Coupon",
      "SiteSetting",
      "Banner",
      "Faq",
    ];

    console.log("Enabling RLS and applying policies on user-specific tables...");
    for (const [table, col] of Object.entries(tableOwnerCols)) {
      try {
        console.log(`Configuring RLS on table: ${table}`);
        await prisma.$executeRawUnsafe(`ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY;`);

        // Drop old policies
        await prisma.$executeRawUnsafe(
          `DROP POLICY IF EXISTS "${table}_student_policy" ON public."${table}";`,
        );
        await prisma.$executeRawUnsafe(
          `DROP POLICY IF EXISTS "${table}_admin_policy" ON public."${table}";`,
        );
        await prisma.$executeRawUnsafe(
          `DROP POLICY IF EXISTS "${table}_super_admin_policy" ON public."${table}";`,
        );

        // Create Super Admin Policy
        await prisma.$executeRawUnsafe(`
          CREATE POLICY "${table}_super_admin_policy" ON public."${table}"
          AS PERMISSIVE FOR ALL TO public
          USING (public.is_super_admin(auth.uid()))
          WITH CHECK (public.is_super_admin(auth.uid()));
        `);

        // Create Admin Policy (if not super-admin specific)
        const isSuperOnly = [
          "AuditLog",
          "SecurityEvent",
          "backup_logs",
          "maintenance_logs",
          "security_events",
        ].includes(table);
        if (!isSuperOnly) {
          await prisma.$executeRawUnsafe(`
            CREATE POLICY "${table}_admin_policy" ON public."${table}"
            AS PERMISSIVE FOR ALL TO public
            USING (public.is_admin(auth.uid()))
            WITH CHECK (public.is_admin(auth.uid()));
          `);
        }

        // Create Student Ownership Policy
        await prisma.$executeRawUnsafe(`
          CREATE POLICY "${table}_student_policy" ON public."${table}"
          AS PERMISSIVE FOR ALL TO public
          USING (auth.uid() IS NOT NULL AND ${col}::text = auth.uid()::text)
          WITH CHECK (auth.uid() IS NOT NULL AND ${col}::text = auth.uid()::text);
        `);
      } catch (err) {
        console.warn(`Could not set up RLS on user table ${table}:`, err.message);
      }
    }

    console.log("Enabling RLS and applying policies on general educational tables...");
    for (const table of generalTables) {
      try {
        console.log(`Configuring RLS on table: ${table}`);
        await prisma.$executeRawUnsafe(`ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY;`);

        await prisma.$executeRawUnsafe(
          `DROP POLICY IF EXISTS "${table}_read_all" ON public."${table}";`,
        );
        await prisma.$executeRawUnsafe(
          `DROP POLICY IF EXISTS "${table}_teacher_write" ON public."${table}";`,
        );
        await prisma.$executeRawUnsafe(
          `DROP POLICY IF EXISTS "${table}_admin_all" ON public."${table}";`,
        );

        // Everyone can select
        await prisma.$executeRawUnsafe(`
          CREATE POLICY "${table}_read_all" ON public."${table}"
          AS PERMISSIVE FOR SELECT TO public
          USING (true);
        `);

        // Teachers can manage
        await prisma.$executeRawUnsafe(`
          CREATE POLICY "${table}_teacher_write" ON public."${table}"
          AS PERMISSIVE FOR ALL TO public
          USING (public.is_teacher(auth.uid()))
          WITH CHECK (public.is_teacher(auth.uid()));
        `);

        // Admins have full access
        await prisma.$executeRawUnsafe(`
          CREATE POLICY "${table}_admin_all" ON public."${table}"
          AS PERMISSIVE FOR ALL TO public
          USING (public.is_admin(auth.uid()))
          WITH CHECK (public.is_admin(auth.uid()));
        `);
      } catch (err) {
        console.warn(`Could not set up RLS on general table ${table}:`, err.message);
      }
    }

    // Configure RLS specifically for system_logs (admin/super-admin only, no student access)
    try {
      console.log("Configuring RLS on table: system_logs");
      await prisma.$executeRawUnsafe(`ALTER TABLE public."system_logs" ENABLE ROW LEVEL SECURITY;`);
      await prisma.$executeRawUnsafe(
        `DROP POLICY IF EXISTS "system_logs_super_admin_policy" ON public."system_logs";`,
      );
      await prisma.$executeRawUnsafe(
        `DROP POLICY IF EXISTS "system_logs_admin_policy" ON public."system_logs";`,
      );

      await prisma.$executeRawUnsafe(`
        CREATE POLICY "system_logs_super_admin_policy" ON public."system_logs"
        AS PERMISSIVE FOR ALL TO public
        USING (public.is_super_admin(auth.uid()))
        WITH CHECK (public.is_super_admin(auth.uid()));
      `);

      await prisma.$executeRawUnsafe(`
        CREATE POLICY "system_logs_admin_policy" ON public."system_logs"
        AS PERMISSIVE FOR ALL TO public
        USING (public.is_admin(auth.uid()))
        WITH CHECK (public.is_admin(auth.uid()));
      `);
      console.log("system_logs RLS policies configured successfully.");
    } catch (err) {
      console.warn("Could not set up RLS on system_logs table:", err.message);
    }

    console.log("Row Level Security (RLS) policies successfully configured on all tables.");
  } catch (error) {
    console.error("Failed to enable RLS:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
