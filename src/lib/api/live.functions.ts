import { createServerFn } from "@tanstack/react-start";
import { getCookie, getRequestIP } from "@tanstack/react-start/server";
import { prisma } from "../db";
import { z } from "zod";
import { dbService } from "../dbService";
import { logger } from "../logger";
import { UserRole } from "@prisma/client";

// Serialize Helper to convert Decimals/BigInts
function recursivelySerialize(obj: any): any {
  if (obj === null) return null;
  if (obj === undefined) return null;
  if (typeof obj === "bigint") return obj.toString();
  if (typeof obj === "function") return null;
  if (typeof obj === "symbol") return null;
  if (obj instanceof Date) return obj.toISOString();

  if (typeof File !== "undefined" && obj instanceof File) return null;
  if (typeof Blob !== "undefined" && obj instanceof Blob) return null;
  if (Buffer.isBuffer(obj)) return null;
  if (obj && typeof obj.on === "function" && typeof obj.pipe === "function") return null;
  if (typeof Request !== "undefined" && obj instanceof Request) return null;
  if (typeof Response !== "undefined" && obj instanceof Response) return null;
  if (obj.constructor && obj.constructor.name === "PrismaClient") return null;

  if (obj instanceof Map) {
    const plainObj: any = {};
    for (const [key, val] of obj.entries()) {
      plainObj[key.toString()] = recursivelySerialize(val);
    }
    return plainObj;
  }

  if (obj instanceof Set) {
    return Array.from(obj.values()).map(recursivelySerialize);
  }

  if (typeof obj === "object") {
    if (Array.isArray(obj)) {
      return obj.map(recursivelySerialize);
    }
    if (
      obj.constructor &&
      (obj.constructor.name === "Decimal" || obj.constructor.name === "DecimalJsLike")
    ) {
      return Number(obj.toString());
    }
    if (obj instanceof Error) {
      return { message: obj.message };
    }
    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (typeof val === "function") continue;
      newObj[key] = recursivelySerialize(val);
    }
    return newObj;
  }
  return obj;
}

function serializeBigIntsAndDecimals<T>(obj: T): any {
  if (obj === null || obj === undefined) return null;
  const serialized = recursivelySerialize(obj);
  return JSON.parse(JSON.stringify(serialized));
}

function getActiveSessionId(): string | null {
  try {
    return getCookie("altiora_session_id") || null;
  } catch {
    return null;
  }
}

async function getAuthenticatedUserId(): Promise<string | null> {
  const sessionId = getActiveSessionId();
  if (!sessionId) return null;
  try {
    const session = await prisma.userSession.findFirst({
      where: { session_id: sessionId, status: "ACTIVE", revoked_at: null },
      select: { user_id: true },
    });
    return session?.user_id || null;
  } catch {
    try {
      const store = dbService.readStore();
      const session = store.user_sessions.find(
        (s) => s.session_id === sessionId && s.status === "ACTIVE" && s.revoked_at === null,
      );
      return session?.user_id || null;
    } catch {
      return null;
    }
  }
}

async function checkTeacherOrAdminAuth(): Promise<string> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    throw new Error("ERR_UNAUTHORIZED: غير مصرح بالوصول بدون جلسة نشطة.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    throw new Error("ERR_FORBIDDEN: ليس لديك صلاحية للقيام بهذا الإجراء.");
  }

  return userId;
}

async function checkStudentEnrollment(courseId: string): Promise<string> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    throw new Error("ERR_UNAUTHORIZED: غير مصرح بالوصول بدون جلسة نشطة.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    throw new Error("ERR_UNAUTHORIZED: المستخدم غير موجود.");
  }

  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN" || user.role === "TEACHER") {
    return userId;
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: userId,
        courseId: courseId,
      },
    },
  });

  if (!enrollment) {
    throw new Error("ERR_FORBIDDEN: يجب أن تكون مسجلاً في الكورس لتتمكن من الانضمام إلى البث.");
  }

  return userId;
}

// ------------------------------------------------
// SERVER ACTIONS
// ------------------------------------------------

export const createLiveSessionFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      courseId: z.string().uuid(),
      title: z.string(),
      description: z.string().optional(),
      countdownEnd: z.string().datetime().optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const teacherId = await checkTeacherOrAdminAuth();

    // Return existing active session if any
    const activeSession = await prisma.liveSession.findFirst({
      where: {
        courseId: data.courseId,
        status: { in: ["WAITING", "LIVE"] },
      },
    });

    if (activeSession) {
      return serializeBigIntsAndDecimals(activeSession);
    }

    const session = await prisma.liveSession.create({
      data: {
        courseId: data.courseId,
        teacherId: teacherId,
        title: data.title,
        description: data.description || "",
        status: "WAITING",
        countdownEnd: data.countdownEnd ? new Date(data.countdownEnd) : null,
      },
    });

    logger.audit(teacherId, "CREATE_LIVE_SESSION", {
      resourceType: "LiveSession",
      resourceId: session.id,
      payload: { title: data.title, courseId: data.courseId },
    });

    return serializeBigIntsAndDecimals(session);
  });

export const getLiveSessionFn = createServerFn({ method: "GET" })
  .validator(z.object({ sessionId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      throw new Error("ERR_UNAUTHORIZED: غير مصرح بالوصول بدون جلسة نشطة.");
    }

    const session = await prisma.liveSession.findUnique({
      where: { id: data.sessionId },
      include: {
        course: {
          select: {
            title: true,
          },
        },
        teacher: {
          include: {
            profile: {
              select: {
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new Error("ERR_NOT_FOUND: البث المباشر غير موجود.");
    }

    await checkStudentEnrollment(session.courseId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        studentCode: {
          select: {
            code: true,
          },
        },
      },
    });

    return serializeBigIntsAndDecimals({
      session,
      userRole: user?.role || "STUDENT",
      studentCode: user?.studentCode?.code || null,
      userId,
    });
  });

export const endLiveSessionFn = createServerFn({ method: "POST" })
  .validator(z.object({ sessionId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const teacherId = await checkTeacherOrAdminAuth();

    const session = await prisma.liveSession.findUnique({
      where: { id: data.sessionId },
    });

    if (!session) {
      throw new Error("ERR_NOT_FOUND: البث المباشر غير موجود.");
    }

    const endedSession = await prisma.liveSession.update({
      where: { id: data.sessionId },
      data: {
        status: "ENDED",
        endedAt: new Date(),
      },
    });

    logger.audit(teacherId, "END_LIVE_SESSION", {
      resourceType: "LiveSession",
      resourceId: session.id,
      payload: { courseId: session.courseId },
    });

    return serializeBigIntsAndDecimals(endedSession);
  });

export const getCourseLiveSessionsFn = createServerFn({ method: "GET" })
  .validator(z.object({ courseId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkStudentEnrollment(data.courseId);

    const sessions = await prisma.liveSession.findMany({
      where: { courseId: data.courseId },
      orderBy: { startedAt: "desc" },
    });

    return serializeBigIntsAndDecimals(sessions);
  });

export const getLivePollsFn = createServerFn({ method: "GET" })
  .validator(z.object({ sessionId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await prisma.liveSession.findUnique({
      where: { id: data.sessionId },
    });
    if (!session) throw new Error("Session not found");

    await checkStudentEnrollment(session.courseId);

    const polls = await prisma.livePoll.findMany({
      where: { sessionId: data.sessionId },
      orderBy: { created_at: "desc" },
    });

    return serializeBigIntsAndDecimals(polls);
  });

export const createLivePollFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      sessionId: z.string().uuid(),
      question: z.string(),
      options: z.array(z.string()),
    }),
  )
  .handler(async ({ data }) => {
    const teacherId = await checkTeacherOrAdminAuth();

    const poll = await prisma.livePoll.create({
      data: {
        sessionId: data.sessionId,
        question: data.question,
        options: JSON.stringify(data.options),
        results: JSON.stringify({}),
        status: "ACTIVE",
      },
    });

    logger.audit(teacherId, "CREATE_LIVE_POLL", {
      resourceType: "LivePoll",
      resourceId: poll.id,
      payload: { question: data.question },
    });

    return serializeBigIntsAndDecimals(poll);
  });

export const submitPollVoteFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      pollId: z.string().uuid(),
      optionIndex: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      throw new Error("ERR_UNAUTHORIZED");
    }

    const poll = await prisma.livePoll.findUnique({
      where: { id: data.pollId },
    });

    if (!poll || poll.status !== "ACTIVE") {
      throw new Error("Poll is not active");
    }

    const results = JSON.parse(poll.results || "{}");
    results[userId] = data.optionIndex;

    const updatedPoll = await prisma.livePoll.update({
      where: { id: data.pollId },
      data: {
        results: JSON.stringify(results),
      },
    });

    return serializeBigIntsAndDecimals(updatedPoll);
  });

export const getRaisedHandsFn = createServerFn({ method: "GET" })
  .validator(z.object({ sessionId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await prisma.liveSession.findUnique({
      where: { id: data.sessionId },
    });
    if (!session) throw new Error("Session not found");

    await checkStudentEnrollment(session.courseId);

    const raisedHands = await prisma.liveRaisedHand.findMany({
      where: { sessionId: data.sessionId, isHandled: false },
      include: {
        student: {
          select: {
            profile: {
              select: {
                name: true,
              },
            },
            studentCode: {
              select: {
                code: true,
              },
            },
          },
        },
      },
      orderBy: { raisedAt: "asc" },
    });

    return serializeBigIntsAndDecimals(raisedHands);
  });

export const raiseHandFn = createServerFn({ method: "POST" })
  .validator(z.object({ sessionId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const studentId = await getAuthenticatedUserId();
    if (!studentId) throw new Error("ERR_UNAUTHORIZED");

    const existing = await prisma.liveRaisedHand.findFirst({
      where: { sessionId: data.sessionId, studentId, isHandled: false },
    });

    if (existing) return serializeBigIntsAndDecimals(existing);

    const raisedHand = await prisma.liveRaisedHand.create({
      data: {
        sessionId: data.sessionId,
        studentId,
        isHandled: false,
      },
    });

    return serializeBigIntsAndDecimals(raisedHand);
  });

export const lowerHandFn = createServerFn({ method: "POST" })
  .validator(z.object({ sessionId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const studentId = await getAuthenticatedUserId();
    if (!studentId) throw new Error("ERR_UNAUTHORIZED");

    await prisma.liveRaisedHand.updateMany({
      where: { sessionId: data.sessionId, studentId, isHandled: false },
      data: { isHandled: true },
    });

    return { success: true };
  });

export const handleRaisedHandFn = createServerFn({ method: "POST" })
  .validator(z.object({ raisedHandId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkTeacherOrAdminAuth();

    const updated = await prisma.liveRaisedHand.update({
      where: { id: data.raisedHandId },
      data: { isHandled: true },
    });

    return serializeBigIntsAndDecimals(updated);
  });

export const trackAttendanceFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      sessionId: z.string().uuid(),
      durationSeconds: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    const studentId = await getAuthenticatedUserId();
    if (!studentId) throw new Error("ERR_UNAUTHORIZED");

    const session = await prisma.liveSession.findUnique({
      where: { id: data.sessionId },
    });
    if (!session) throw new Error("Session not found");

    const attendance = await prisma.liveAttendance.findFirst({
      where: { sessionId: data.sessionId, studentId },
    });

    const totalDurationSoFar = Math.max(
      1,
      Math.floor((Date.now() - session.startedAt.getTime()) / 1000),
    );

    let updatedAttendance;
    if (attendance) {
      const newDuration = attendance.duration + data.durationSeconds;
      const attendancePct = Math.min(
        100.0,
        Number(((newDuration / totalDurationSoFar) * 100).toFixed(2)),
      );

      updatedAttendance = await prisma.liveAttendance.update({
        where: { id: attendance.id },
        data: {
          duration: newDuration,
          leaveTime: new Date(),
          attendancePct: attendancePct,
        },
      });
    } else {
      const attendancePct = Math.min(
        100.0,
        Number(((data.durationSeconds / totalDurationSoFar) * 100).toFixed(2)),
      );
      updatedAttendance = await prisma.liveAttendance.create({
        data: {
          sessionId: data.sessionId,
          studentId,
          joinTime: new Date(),
          leaveTime: new Date(),
          duration: data.durationSeconds,
          reconnectCount: 0,
          attendancePct: attendancePct,
        },
      });
    }

    return serializeBigIntsAndDecimals(updatedAttendance);
  });

export const incrementReconnectCountFn = createServerFn({ method: "POST" })
  .validator(z.object({ sessionId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const studentId = await getAuthenticatedUserId();
    if (!studentId) throw new Error("ERR_UNAUTHORIZED");

    const attendance = await prisma.liveAttendance.findFirst({
      where: { sessionId: data.sessionId, studentId },
    });

    if (attendance) {
      const updated = await prisma.liveAttendance.update({
        where: { id: attendance.id },
        data: {
          reconnectCount: attendance.reconnectCount + 1,
        },
      });
      return serializeBigIntsAndDecimals(updated);
    }

    return { success: false };
  });

export const getLiveAttendanceReportFn = createServerFn({ method: "GET" })
  .validator(z.object({ sessionId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkTeacherOrAdminAuth();

    const report = await prisma.liveAttendance.findMany({
      where: { sessionId: data.sessionId },
      include: {
        student: {
          select: {
            email: true,
            profile: {
              select: {
                name: true,
              },
            },
            studentCode: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    });

    return serializeBigIntsAndDecimals(report);
  });

export const admitStudentFn = createServerFn({ method: "POST" })
  .validator(z.object({ sessionId: z.string().uuid(), studentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkTeacherOrAdminAuth();

    const participant = await prisma.liveParticipant.findFirst({
      where: { sessionId: data.sessionId, userId: data.studentId, leftAt: null },
    });

    if (participant) {
      const updated = await prisma.liveParticipant.update({
        where: { id: participant.id },
        data: {
          isAdmitted: true,
          isRejected: false,
        },
      });
      return serializeBigIntsAndDecimals(updated);
    }

    const newParticipant = await prisma.liveParticipant.create({
      data: {
        sessionId: data.sessionId,
        userId: data.studentId,
        socketId: "waiting_room",
        isAdmitted: true,
        isRejected: false,
      },
    });
    return serializeBigIntsAndDecimals(newParticipant);
  });

export const rejectStudentFn = createServerFn({ method: "POST" })
  .validator(z.object({ sessionId: z.string().uuid(), studentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkTeacherOrAdminAuth();

    const participant = await prisma.liveParticipant.findFirst({
      where: { sessionId: data.sessionId, userId: data.studentId, leftAt: null },
    });

    if (participant) {
      const updated = await prisma.liveParticipant.update({
        where: { id: participant.id },
        data: {
          isAdmitted: false,
          isRejected: true,
        },
      });
      return serializeBigIntsAndDecimals(updated);
    }

    const newParticipant = await prisma.liveParticipant.create({
      data: {
        sessionId: data.sessionId,
        userId: data.studentId,
        socketId: "waiting_room",
        isAdmitted: false,
        isRejected: true,
      },
    });
    return serializeBigIntsAndDecimals(newParticipant);
  });

export const compileRecordingToLessonFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      sessionId: z.string().uuid(),
      videoId: z.string().optional(),
      videoUrl: z.string().optional(),
      thumbnailUrl: z.string().optional(),
      duration: z.number().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const teacherId = await checkTeacherOrAdminAuth();

    const session = await prisma.liveSession.findUnique({
      where: { id: data.sessionId },
    });

    if (!session) throw new Error("Session not found");

    let module = await prisma.module.findFirst({
      where: { courseId: session.courseId, deleted_at: null },
      orderBy: { sortOrder: "asc" },
    });

    if (!module) {
      module = await prisma.module.create({
        data: {
          courseId: session.courseId,
          title: "المحاضرات المسجلة (البث المباشر)",
          sortOrder: 0,
        },
      });
    }

    const lesson = await prisma.lesson.create({
      data: {
        moduleId: module.id,
        title: session.title,
        isPreview: false,
      },
    });

    const videoId = data.videoId || `live-${session.id}`;
    const cdnHost = process.env.BUNNY_CDN_HOST || process.env.BUNNY_STORAGE_ZONE || "vz-4e8e38f7-1c1.b-cdn.net";
    const videoUrl =
      data.videoUrl ||
      `https://${cdnHost}/${videoId}/playlist.m3u8`;
    const thumbnailUrl =
      data.thumbnailUrl ||
      `https://${cdnHost}/${videoId}/thumbnail.jpg`;

    const videoMeta = await prisma.videoMetadata.create({
      data: {
        lessonId: lesson.id,
        videoUrl,
        duration: data.duration || 0,
        videoId,
        thumbnailUrl,
        status: "COMPLETED",
      },
    });

    logger.audit(teacherId, "COMPILE_LIVE_RECORDING_TO_LESSON", {
      resourceType: "Lesson",
      resourceId: lesson.id,
      payload: { sessionId: session.id, videoId },
    });

    return serializeBigIntsAndDecimals({ lesson, videoMeta });
  });
