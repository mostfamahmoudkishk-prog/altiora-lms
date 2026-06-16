-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE 'PENDING';

-- AlterTable
ALTER TABLE "featured_courses" ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "startDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "watch_time_stats" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "watchTime" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watch_time_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_completion_stats" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "enrolledCount" INTEGER NOT NULL DEFAULT 0,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_completion_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_activity_stats" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "loginCount" INTEGER NOT NULL DEFAULT 0,
    "lessonsWatched" INTEGER NOT NULL DEFAULT 0,
    "examsTaken" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_activity_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "watch_time_stats_studentId_idx" ON "watch_time_stats"("studentId");

-- CreateIndex
CREATE INDEX "watch_time_stats_courseId_idx" ON "watch_time_stats"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "watch_time_stats_studentId_courseId_key" ON "watch_time_stats"("studentId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "course_completion_stats_courseId_key" ON "course_completion_stats"("courseId");

-- CreateIndex
CREATE INDEX "course_completion_stats_courseId_idx" ON "course_completion_stats"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "student_activity_stats_studentId_key" ON "student_activity_stats"("studentId");

-- CreateIndex
CREATE INDEX "student_activity_stats_studentId_idx" ON "student_activity_stats"("studentId");

-- AddForeignKey
ALTER TABLE "watch_time_stats" ADD CONSTRAINT "watch_time_stats_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_time_stats" ADD CONSTRAINT "watch_time_stats_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_completion_stats" ADD CONSTRAINT "course_completion_stats_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_activity_stats" ADD CONSTRAINT "student_activity_stats_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
