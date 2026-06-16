import { createServerFn } from "@tanstack/react-start";
import { getCookie, getRequestIP, getRequest } from "@tanstack/react-start/server";
import { prisma } from "../db";
import { z } from "zod";
import {
  UserRole,
  TicketStatus,
  OrderStatus,
  QuestionType,
  QuestionDifficulty,
  Prisma,
} from "@prisma/client";
import { dbService } from "../dbService";
import * as XLSX from "xlsx";
import { checkRateLimit } from "../rateLimiter";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { logger } from "../logger";
import { getCache, setCache, invalidateCache } from "../redis";

// Helpers
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

function enforceRateLimits() {
  const ip = getRequestIP() || "127.0.0.1";
  const generalLimit = checkRateLimit(`general_api_${ip}`, 100, 60 * 1000); // 100 requests per minute
  if (!generalLimit.success) {
    throw new Error(
      `ERR_THROTTLED: لقد تجاوزت حد الطلبات المسموح به. يرجى المحاولة بعد ${generalLimit.retryAfter} ثانية.`,
    );
  }
}

function getActiveSessionId(): string | null {
  try {
    return getCookie("altiora_session_id") || null;
  } catch {
    return null;
  }
}

async function getAuthenticatedUserId(): Promise<string | null> {
  // Check if simulation token is present
  try {
    const simulationToken = getCookie("altiora_simulation_token");
    if (simulationToken) {
      // Find simulation session using rawPrisma (to avoid recursion)
      const { rawPrisma } = await import("../db");
      const simSession = await rawPrisma.simulationSession.findFirst({
        where: {
          simulationToken,
          isActive: true,
          expiresAt: { gte: new Date() }
        },
        select: {
          targetUserId: true,
          realAdminId: true
        }
      });
      if (simSession) {
        // Double check admin session
        const adminSessionId = getActiveSessionId();
        if (adminSessionId) {
          const adminSession = await rawPrisma.userSession.findFirst({
            where: { session_id: adminSessionId, status: "ACTIVE", revoked_at: null },
            select: { user_id: true }
          });
          if (adminSession && adminSession.user_id === simSession.realAdminId) {
            return simSession.targetUserId;
          }
        }
      }
    }
  } catch (err) {
    try {
      const simulationToken = getCookie("altiora_simulation_token");
      if (simulationToken) {
        const store = dbService.readStore();
        const simSession = store.simulation_sessions.find(
          (s) => s.simulationToken === simulationToken && s.isActive && new Date(s.expiresAt) >= new Date()
        );
        if (simSession) {
          const adminSessionId = getActiveSessionId();
          if (adminSessionId) {
            const adminSession = store.user_sessions.find(
              (s) => s.session_id === adminSessionId && s.status === "ACTIVE" && s.revoked_at === null
            );
            if (adminSession && adminSession.user_id === simSession.realAdminId) {
              return simSession.targetUserId;
            }
          }
        }
      }
    } catch {}
  }

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

async function checkPermissionAuth(permission: string): Promise<string> {
  enforceRateLimits();
  const sessionId = getActiveSessionId();
  if (!sessionId) {
    throw new Error("ERR_UNAUTHORIZED: غير مصرح بالوصول بدون جلسة نشطة.");
  }
  const store = dbService.readStore();
  const session = store.user_sessions.find(
    (s) => s.session_id === sessionId && s.status === "ACTIVE" && s.revoked_at === null,
  );
  if (!session) {
    throw new Error("ERR_UNAUTHORIZED: غير مصرح بالوصول بدون جلسة نشطة.");
  }
  const user = store.users.find((u) => u.id === session.user_id);
  if (!user) {
    throw new Error("ERR_UNAUTHORIZED: المستخدم غير موجود.");
  }
  const hasPerm = await dbService.checkPermission(session.user_id, permission);
  if (!hasPerm) {
    throw new Error(`ERR_FORBIDDEN: ليس لديك صلاحية (${permission}) للوصول إلى هذا المورد.`);
  }
  return session.user_id;
}

async function checkAdminAuth() {
  await checkPermissionAuth("USER_MANAGEMENT");
}

async function checkSuperAdminAuth() {
  await checkPermissionAuth("ADMIN_MANAGEMENT");
}

async function checkTeacherOrAdminAuth() {
  enforceRateLimits();
  const sessionId = getActiveSessionId();
  if (!sessionId) {
    throw new Error("ERR_UNAUTHORIZED: غير مصرح بالوصول بدون جلسة معلم أو مسؤول نشطة.");
  }
  const store = dbService.readStore();
  const session = store.user_sessions.find(
    (s) => s.session_id === sessionId && s.status === "ACTIVE" && s.revoked_at === null,
  );
  if (!session) {
    throw new Error("ERR_UNAUTHORIZED: غير مصرح بالوصول بدون جلسة معلم أو مسؤول نشطة.");
  }
  const user = store.users.find((u) => u.id === session.user_id);
  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    throw new Error("ERR_UNAUTHORIZED: غير مصرح بالوصول بدون جلسة معلم أو مسؤول نشطة.");
  }
}

// ==========================================
// AUTH & USERS CRUD
// ==========================================

export const getUsersFn = createServerFn({ method: "GET" }).handler(async () => {
  await checkAdminAuth();
  const sessionId = getActiveSessionId();
  const store = dbService.readStore();
  const session = sessionId
    ? store.user_sessions.find(
        (s) => s.session_id === sessionId && s.status === "ACTIVE" && s.revoked_at === null,
      )
    : null;
  const sessionUser = session ? store.users.find((u) => u.id === session.user_id) : null;

  let roleFilter = undefined;
  if (sessionUser && sessionUser.role === "ADMIN") {
    roleFilter = { in: [UserRole.TEACHER, UserRole.STUDENT] };
  }

  const users = await prisma.user.findMany({
    where: {
      deleted_at: null,
      role: roleFilter,
    },
    include: { profile: true },
    orderBy: { created_at: "desc" },
  });
  return serializeBigIntsAndDecimals(users);
});

export const createUserFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().email(),
      passwordHash: z.string(),
      role: z.nativeEnum(UserRole),
      name: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    await checkAdminAuth();
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
        profile: {
          create: {
            name: data.name,
          },
        },
      },
      include: { profile: true },
    });
    return serializeBigIntsAndDecimals(user);
  });

export const updateUserFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      name: z.string().optional(),
      role: z.nativeEnum(UserRole).optional(),
      email: z.string().email().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkAdminAuth();
    const user = await prisma.user.update({
      where: { id: data.id },
      data: {
        email: data.email,
        role: data.role,
        profile: data.name
          ? {
              update: {
                name: data.name,
              },
            }
          : undefined,
      },
      include: { profile: true },
    });
    return serializeBigIntsAndDecimals(user);
  });

export const softDeleteUserFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkAdminAuth();
    const user = await prisma.user.update({
      where: { id: data.id },
      data: { deleted_at: new Date() },
    });
    return serializeBigIntsAndDecimals(user);
  });

// ==========================================
// COURSES & EDUCATION CONTENT CRUD
// ==========================================

export const getCoursesFn = createServerFn({ method: "GET" }).handler(async () => {
  enforceRateLimits();
  const cacheKey = "public_courses_list";
  const cached = await getCache<any>(cacheKey);
  if (cached) {
    return cached;
  }

  const courses = await prisma.course.findMany({
    where: { deleted_at: null },
    include: {
      category: true,
      instructors: {
        include: {
          instructor: {
            include: { profile: true },
          },
        },
      },
    },
    orderBy: [
      { isFeatured: "desc" }, // Featured ⭐ first
      { created_at: "desc" },
    ],
  });
  const serialized = serializeBigIntsAndDecimals(courses);
  await setCache(cacheKey, serialized, 300); // Cache for 5 mins
  return serialized;
});

export const createCourseFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title: z.string(),
      description: z.string().optional(),
      price: z.number(),
      categoryName: z.string(),
      coverImage: z.string().optional(),
      isFeatured: z.boolean().optional(),
      instructorName: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      await checkAdminAuth();
      let category = await prisma.category.findFirst({
        where: { name: { equals: data.categoryName, mode: "insensitive" } },
      });
      if (!category) {
        category = await prisma.category.create({
          data: { name: data.categoryName },
        });
      }
      const course = await prisma.course.create({
        data: {
          title: data.title,
          description: data.description,
          price: data.price,
          categoryId: category.id,
          coverImage: data.coverImage,
          isFeatured: data.isFeatured,
        },
      });

      if (data.instructorName) {
        const profile = await prisma.profile.findFirst({
          where: {
            name: { equals: data.instructorName, mode: "insensitive" },
            user: { role: UserRole.TEACHER },
          },
          include: { user: true },
        });
        if (profile && profile.user) {
          await prisma.courseInstructor.create({
            data: {
              courseId: course.id,
              instructorId: profile.user.id,
              commissionRate: 80.0,
            },
          });
        }
      }

      console.log(JSON.stringify(course));
      const serialized = serializeBigIntsAndDecimals(course);
      const response = { success: true as const, data: serialized };
      console.log("SERIALIZATION_TEST", JSON.stringify(response));
      await invalidateCache("public_courses_list");
      return response;
    } catch (error: any) {
      const response = {
        success: false as const,
        message: error instanceof Error ? error.message : "Failed to save course",
      };
      console.log("SERIALIZATION_TEST", JSON.stringify(response));
      return response;
    }
  });

export const updateCourseFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      title: z.string().optional(),
      description: z.string().optional(),
      price: z.number().optional(),
      coverImage: z.string().optional(),
      categoryName: z.string().optional(),
      isFeatured: z.boolean().optional(),
      isArchived: z.boolean().optional(),
      instructorName: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      await checkAdminAuth();
      let categoryId = undefined;
      if (data.categoryName) {
        let category = await prisma.category.findFirst({
          where: { name: { equals: data.categoryName, mode: "insensitive" } },
        });
        if (!category) {
          category = await prisma.category.create({
            data: { name: data.categoryName },
          });
        }
        categoryId = category.id;
      }
      const course = await prisma.course.update({
        where: { id: data.id },
        data: {
          title: data.title,
          description: data.description,
          price: data.price,
          coverImage: data.coverImage,
          categoryId,
          isFeatured: data.isFeatured,
          isArchived: data.isArchived,
        },
      });

      if (data.instructorName) {
        const profile = await prisma.profile.findFirst({
          where: {
            name: { equals: data.instructorName, mode: "insensitive" },
            user: { role: UserRole.TEACHER },
          },
          include: { user: true },
        });
        if (profile && profile.user) {
          await prisma.courseInstructor.deleteMany({
            where: { courseId: data.id },
          });
          await prisma.courseInstructor.create({
            data: {
              courseId: data.id,
              instructorId: profile.user.id,
              commissionRate: 80.0,
            },
          });
        }
      }

      console.log(JSON.stringify(course));
      const serialized = serializeBigIntsAndDecimals(course);
      const response = { success: true as const, data: serialized };
      console.log("SERIALIZATION_TEST", JSON.stringify(response));
      await invalidateCache("public_courses_list");
      return response;
    } catch (error: any) {
      const response = {
        success: false as const,
        message: error instanceof Error ? error.message : "Failed to update course",
      };
      console.log("SERIALIZATION_TEST", JSON.stringify(response));
      return response;
    }
  });

export const softDeleteCourseFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkAdminAuth();
    const course = await prisma.course.update({
      where: { id: data.id },
      data: { deleted_at: new Date() },
    });
    await invalidateCache("public_courses_list");
    return serializeBigIntsAndDecimals(course);
  });

// Modules Organizer CRUD
export const getModulesByCourseFn = createServerFn({ method: "GET" })
  .validator(z.object({ courseId: z.string().uuid() }))
  .handler(async ({ data }) => {
    enforceRateLimits();
    const modules = await prisma.module.findMany({
      where: { courseId: data.courseId, deleted_at: null },
      include: {
        lessons: {
          where: { deleted_at: null },
          include: {
            exams: { where: { deleted_at: null } },
            lessonAttachments: true,
            videoMetadata: true,
          },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });
    return serializeBigIntsAndDecimals(modules);
  });

export const createModuleFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      courseId: z.string().uuid(),
      title: z.string(),
      sortOrder: z.number().optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      await checkTeacherOrAdminAuth();
      const mod = await prisma.module.create({
        data: {
          courseId: data.courseId,
          title: data.title,
          sortOrder: data.sortOrder || 0,
        },
      });
      const serialized = serializeBigIntsAndDecimals(mod);
      const response = { success: true as const, data: serialized };
      console.log("SERIALIZATION_TEST", JSON.stringify(response));
      return response;
    } catch (error: any) {
      const response = {
        success: false as const,
        message: error instanceof Error ? error.message : "Failed to create module",
      };
      console.log("SERIALIZATION_TEST", JSON.stringify(response));
      return response;
    }
  });

export const createLessonFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      moduleId: z.string().uuid(),
      title: z.string(),
      sortOrder: z.number().optional(),
      isPreview: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkTeacherOrAdminAuth();
    const lesson = await prisma.lesson.create({
      data: {
        moduleId: data.moduleId,
        title: data.title,
        sortOrder: data.sortOrder || 0,
        isPreview: data.isPreview || false,
      },
    });
    return serializeBigIntsAndDecimals(lesson);
  });

// ==========================================
// EXAMS, ATTEMPTS & ANTI-CHEAT CRUD
// ==========================================

export const getExamsFn = createServerFn({ method: "GET" }).handler(async () => {
  enforceRateLimits();

  const brandingSetting = await prisma.siteSetting.findUnique({
    where: { key: "allow_custom_branding" },
  });
  const allowCustomBranding = brandingSetting?.value !== "false";

  const exams = await prisma.exam.findMany({
    where: { deleted_at: null },
    include: {
      sections: {
        where: { deleted_at: null },
        orderBy: { order: "asc" },
      },
      questions: {
        where: { deleted_at: null },
        include: { choices: { where: { deleted_at: null } } },
      },
      course: {
        include: {
          instructors: {
            include: {
              instructor: {
                include: {
                  instructorBranding: true,
                  profile: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const enrichedExams = exams.map((exam) => ({
    ...exam,
    allowCustomBranding,
  }));

  return serializeBigIntsAndDecimals(enrichedExams);
});

export const createExamAttemptFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      examId: z.string().uuid(),
      studentId: z.string().uuid(),
    }),
  )
  .handler(async ({ data }) => {
    const attempt = await prisma.examAttempt.create({
      data: {
        examId: data.examId,
        studentId: data.studentId,
        score: 0.0,
        passed: false,
      },
    });
    return serializeBigIntsAndDecimals(attempt);
  });

export const logExamViolationFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      attemptId: z.string().uuid(),
      studentId: z.string().uuid(),
      type: z.string(),
      details: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const violation = await prisma.examViolation.create({
      data: {
        attemptId: data.attemptId,
        studentId: data.studentId,
        type: data.type,
        details: data.details,
      },
    });
    return serializeBigIntsAndDecimals(violation);
  });

// ==========================================
// ACCESS CODES CRUD
// ==========================================

export const getAccessCodesFn = createServerFn({ method: "GET" }).handler(async () => {
  await checkAdminAuth();
  const codes = await prisma.studentAccessCode.findMany({
    where: { deleted_at: null },
    include: {
      course: true,
      claimant: { include: { profile: true } },
    },
  });
  return serializeBigIntsAndDecimals(codes);
});

export const claimAccessCodeFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      code: z.string(),
      studentEmail: z.string().email(),
    }),
  )
  .handler(async ({ data }) => {
    const student = await prisma.user.findFirst({
      where: { email: { equals: data.studentEmail, mode: "insensitive" }, deleted_at: null },
    });
    if (!student) throw new Error("الطالب غير موجود.");

    const accessCode = await prisma.studentAccessCode.findFirst({
      where: {
        code: data.code,
        disabled: false,
        deleted_at: null,
      },
    });

    if (!accessCode) {
      throw new Error("رمز التفعيل غير صالح أو تم إيقافه.");
    }

    if (accessCode.currentUsage >= accessCode.maxUsage) {
      throw new Error("تم استخدام هذا الرمز لأقصى حد مسموح به.");
    }

    // Update usage and claim
    const updatedCode = await prisma.studentAccessCode.update({
      where: { id: accessCode.id },
      data: {
        studentId: student.id,
        currentUsage: accessCode.currentUsage + 1,
        usedAt: new Date(),
      },
    });

    // Create Enrollment
    await prisma.enrollment.create({
      data: {
        studentId: student.id,
        courseId: accessCode.courseId,
      },
    });

    // Record Coupon Activation Transaction
    try {
      const course = await prisma.course.findUnique({
        where: { id: accessCode.courseId },
        include: { instructors: true },
      });
      if (course) {
        let teacherId = course.instructors[0]?.instructorId;
        if (!teacherId) {
          const firstTeacher = await prisma.user.findFirst({ where: { role: UserRole.TEACHER } });
          teacherId = firstTeacher ? firstTeacher.id : student.id;
        }

        let platformPercentage = 20.0;
        let teacherPercentage = 80.0;

        const teacherSettings = await prisma.revenueSettings.findUnique({
          where: { teacherId },
        });
        if (teacherSettings) {
          platformPercentage = Number(teacherSettings.platformPercentage);
          teacherPercentage = Number(teacherSettings.teacherPercentage);
        } else {
          const globalSettings = await prisma.revenueSettings.findFirst({
            where: { teacherId: null },
          });
          if (globalSettings) {
            platformPercentage = Number(globalSettings.platformPercentage);
            teacherPercentage = Number(globalSettings.teacherPercentage);
          }
        }

        const amount = Number(course.price) || 0;
        const teacherAmount = amount * (teacherPercentage / 100);
        const platformAmount = amount * (platformPercentage / 100);

        await prisma.revenueTransaction.create({
          data: {
            teacherId,
            courseId: course.id,
            studentId: student.id,
            amount,
            teacherAmount,
            platformAmount,
            type: "COUPON",
          },
        });
      }
    } catch (err) {
      console.error("Failed to record coupon revenue transaction:", err);
    }

    return serializeBigIntsAndDecimals(updatedCode);
  });

// ==========================================
// PAYMENTS & TRANSACTIONS
// ==========================================

export const getOrdersFn = createServerFn({ method: "GET" }).handler(async () => {
  await checkAdminAuth();
  const orders = await prisma.order.findMany({
    where: { deleted_at: null },
    include: {
      student: { include: { profile: true } },
      transactions: true,
    },
    orderBy: { created_at: "desc" },
  });
  return serializeBigIntsAndDecimals(orders);
});

export const createOrderFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      studentId: z.string().uuid(),
      totalAmount: z.number(),
      gateway: z.string(),
      gatewayTxId: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    // Duplicate payment protection
    const existingTx = await prisma.transaction.findUnique({
      where: { gatewayTransactionId: data.gatewayTxId },
    });
    if (existingTx) {
      throw new Error("ERR_DUPLICATE_PAYMENT: هذه المعاملة تم معالجتها مسبقاً.");
    }

    const order = await prisma.order.create({
      data: {
        studentId: data.studentId,
        totalAmount: data.totalAmount,
        status: OrderStatus.COMPLETED,
        transactions: {
          create: {
            paymentGateway: data.gateway,
            gatewayTransactionId: data.gatewayTxId,
            amount: data.totalAmount,
            status: "SUCCESS",
          },
        },
      },
      include: { transactions: true },
    });

    logger.info("AUDIT", `تم إنشاء طلب جديد للطلب رقم ${order.id} عبر ${data.gateway}`, {
      orderId: order.id,
      gatewayTxId: data.gatewayTxId,
    });

    logger.audit(data.studentId, "PURCHASE", {
      resourceType: "Order",
      resourceId: order.id,
      payload: { amount: data.totalAmount, gateway: data.gateway, gatewayTxId: data.gatewayTxId },
    });

    return serializeBigIntsAndDecimals(order);
  });

// ==========================================
// SUPPORT TICKETS
// ==========================================

export const getTicketsFn = createServerFn({ method: "GET" }).handler(async () => {
  await checkAdminAuth();
  const tickets = await prisma.ticket.findMany({
    where: { deleted_at: null },
    include: {
      student: { include: { profile: true } },
      replies: { include: { user: { include: { profile: true } } } },
    },
    orderBy: { created_at: "desc" },
  });
  return serializeBigIntsAndDecimals(tickets);
});

export const createReplyFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      ticketId: z.string().uuid(),
      userId: z.string().uuid(),
      message: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const reply = await prisma.reply.create({
      data: {
        ticketId: data.ticketId,
        userId: data.userId,
        message: data.message,
      },
    });
    return serializeBigIntsAndDecimals(reply);
  });

// ==========================================
// SETTINGS & SYSTEM UTILS
// ==========================================

export const getSettingsFn = createServerFn({ method: "GET" }).handler(async () => {
  enforceRateLimits();
  const settings = await prisma.siteSetting.findMany({
    where: { deleted_at: null },
  });
  return serializeBigIntsAndDecimals(settings);
});

export const updateSettingFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      key: z.string(),
      value: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    await checkAdminAuth();
    const setting = await prisma.siteSetting.upsert({
      where: { key: data.key },
      create: { key: data.key, value: data.value },
      update: { value: data.value },
    });
    return serializeBigIntsAndDecimals(setting);
  });

// ==========================================
// PERSISTENT DATA ENFORCEMENTS & SECURITY LOGS
// ==========================================

function checkSessionUser(email: string) {
  enforceRateLimits();
  const sessionId = getActiveSessionId();
  if (!sessionId) {
    throw new Error("ERR_UNAUTHORIZED: الجلسة غير صالحة أو منتهية.");
  }
  const store = dbService.readStore();
  const session = store.user_sessions.find(
    (s) => s.session_id === sessionId && s.status === "ACTIVE" && s.revoked_at === null,
  );
  if (!session) {
    throw new Error("ERR_UNAUTHORIZED: الجلسة غير صالحة أو منتهية.");
  }
  const user = store.users.find((u) => u.id === session.user_id);
  if (!user) {
    throw new Error("ERR_UNAUTHORIZED: المستخدم غير موجود.");
  }
  if (user.role !== "SUPER_ADMIN" && user.email.toLowerCase() !== email.toLowerCase()) {
    throw new Error("ERR_UNAUTHORIZED: لا تملك صلاحية الوصول لبيانات هذا الحساب.");
  }
  return user;
}

export const savePlaybackProgressFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().email(),
      courseId: z.string().uuid(),
      lessonId: z.string().uuid(),
      second: z.number(),
      speed: z.number(),
      duration: z.number().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const caller = checkSessionUser(data.email);

    // 1. Sync to local JSON store
    const res = dbService.savePlaybackProgress(data.email, data.lessonId, data.second);

    // Compute percentage
    let watchedPercentage = 0.0;
    if (data.duration && data.duration > 0) {
      watchedPercentage = parseFloat(((data.second / data.duration) * 100).toFixed(2));
    }

    // 2. Persist to Prisma database UserWatchProgress
    try {
      await prisma.userWatchProgress.upsert({
        where: {
          user_id_lesson_id: {
            user_id: caller.id,
            lesson_id: data.lessonId,
          },
        },
        create: {
          user_id: caller.id,
          lesson_id: data.lessonId,
          current_second: Math.floor(data.second),
          watched_percentage: watchedPercentage,
          duration: data.duration ? Math.floor(data.duration) : 0,
        },
        update: {
          current_second: Math.floor(data.second),
          watched_percentage: watchedPercentage,
          ...(data.duration ? { duration: Math.floor(data.duration) } : {}),
        },
      });
    } catch (err) {
      console.warn("Failed to persist watch progress to DB:", err);
    }

    return serializeBigIntsAndDecimals(res);
  });

export const getPlaybackProgressFn = createServerFn({ method: "GET" })
  .validator(
    z.object({
      email: z.string().email(),
      lessonId: z.string().uuid(),
    }),
  )
  .handler(async ({ data }) => {
    const caller = checkSessionUser(data.email);

    // First try database
    try {
      const dbProgress = await prisma.userWatchProgress.findUnique({
        where: {
          user_id_lesson_id: {
            user_id: caller.id,
            lesson_id: data.lessonId,
          },
        },
      });
      if (dbProgress) {
        return serializeBigIntsAndDecimals({
          id: dbProgress.id,
          user_id: dbProgress.user_id,
          lesson_id: dbProgress.lesson_id,
          currentSecond: dbProgress.current_second,
          watchedPercentage: dbProgress.watched_percentage,
          lastViewedAt: dbProgress.updated_at.toISOString(),
          // Compatibility fields
          current_second: dbProgress.current_second,
          updated_at: dbProgress.updated_at.toISOString(),
        });
      }
    } catch (err) {
      console.warn("Failed to retrieve progress from DB, using fallback:", err);
    }

    // Fallback to local store
    const res = dbService.getPlaybackProgress(data.email, data.lessonId);
    if (res) {
      return serializeBigIntsAndDecimals({
        ...res,
        currentSecond: res.current_second,
        watchedPercentage: 0,
        lastViewedAt: res.updated_at,
      });
    }
    return null;
  });

export const saveVideoNoteFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().email(),
      lessonId: z.string().uuid(),
      second: z.number(),
      content: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    checkSessionUser(data.email);
    const res = dbService.saveVideoNote(data.email, data.lessonId, data.second, data.content);
    return serializeBigIntsAndDecimals(res);
  });

export const getVideoNotesFn = createServerFn({ method: "GET" })
  .validator(z.object({ email: z.string().email() }))
  .handler(async ({ data }) => {
    checkSessionUser(data.email);
    const res = dbService.getVideoNotes(data.email);
    return serializeBigIntsAndDecimals(res);
  });

export const deleteVideoNoteFn = createServerFn({ method: "POST" })
  .validator(z.object({ noteId: z.string() }))
  .handler(async ({ data }) => {
    const sessionId = getActiveSessionId();
    if (!sessionId) throw new Error("ERR_UNAUTHORIZED");
    const store = dbService.readStore();
    const session = store.user_sessions.find(
      (s) => s.session_id === sessionId && s.status === "ACTIVE" && s.revoked_at === null,
    );
    if (!session) throw new Error("ERR_UNAUTHORIZED");
    const note = store.video_notes.find((n) => n.id === data.noteId);
    if (note && note.user_id !== session.user_id) {
      const caller = store.users.find((u) => u.id === session.user_id);
      if (caller?.role !== "SUPER_ADMIN") {
        throw new Error("ERR_UNAUTHORIZED: لا تملك صلاحية حذف هذه الملاحظة.");
      }
    }
    const res = dbService.deleteVideoNote(data.noteId);
    return serializeBigIntsAndDecimals(res);
  });

export const logDownloadFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().email(),
      fileName: z.string(),
      courseTitle: z.string(),
      fileSize: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    checkSessionUser(data.email);
    const res = dbService.logDownload(data.email, data.fileName, data.courseTitle, data.fileSize);
    return serializeBigIntsAndDecimals(res);
  });

export const getDownloadsHistoryFn = createServerFn({ method: "GET" })
  .validator(z.object({ email: z.string().email() }))
  .handler(async ({ data }) => {
    checkSessionUser(data.email);
    const legacy = dbService.getDownloadsHistory(data.email) || [];

    const student = await prisma.user.findFirst({
      where: { email: { equals: data.email, mode: "insensitive" }, deleted_at: null },
    });

    let dbRecords: any[] = [];
    if (student) {
      const history = await prisma.downloadHistory.findMany({
        where: { studentId: student.id },
        include: {
          attachment: {
            include: {
              lesson: {
                include: {
                  module: {
                    include: {
                      course: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { downloadedAt: "desc" },
      });
      dbRecords = history.map((r) => ({
        id: r.id,
        file_name: r.attachment.name,
        course_title: r.attachment.lesson.module.course.title,
        size: r.attachment.fileSize,
        downloaded_at: r.downloadedAt,
        file_url: r.attachment.fileUrl,
      }));
    }

    const combined = [...dbRecords, ...legacy];
    return serializeBigIntsAndDecimals(combined);
  });

export const getTimelineFn = createServerFn({ method: "GET" })
  .validator(z.object({ email: z.string().email() }))
  .handler(async ({ data }) => {
    checkSessionUser(data.email);
    const res = dbService.getTimeline(data.email);
    return serializeBigIntsAndDecimals(res);
  });

export const saveExamAttemptFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().email(),
      examId: z.string().uuid(),
      score: z.number(),
      passed: z.boolean(),
      violationsCount: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    checkSessionUser(data.email);
    const ip = getRequestIP() || "127.0.0.1";
    const subLimit = checkRateLimit(
      `exam_sub_${ip}_${data.email.toLowerCase()}`,
      10,
      60 * 60 * 1000,
    ); // 10 attempts per hour
    if (!subLimit.success) {
      throw new Error(
        `لقد تجاوزت الحد الأقصى لمحاولات تسليم الامتحانات. يرجى الانتظار ${subLimit.retryAfter} ثانية.`,
      );
    }
    const res = dbService.saveExamAttempt(
      data.email,
      data.examId,
      data.score,
      data.passed,
      data.violationsCount,
    );
    return serializeBigIntsAndDecimals(res);
  });

export const getExamAttemptsFn = createServerFn({ method: "GET" })
  .validator(z.object({ email: z.string().email() }))
  .handler(async ({ data }) => {
    checkSessionUser(data.email);
    try {
      const user = await prisma.user.findFirst({
        where: { email: { equals: data.email, mode: "insensitive" }, deleted_at: null },
      });
      if (user) {
        const prismaAttempts = await prisma.examAttempt.findMany({
          where: { studentId: user.id, deleted_at: null },
          include: {
            exam: true,
          },
          orderBy: { created_at: "desc" },
        });
        if (prismaAttempts && prismaAttempts.length > 0) {
          console.log(`Fetched ${prismaAttempts.length} attempts from Prisma for ${data.email}`);
          return serializeBigIntsAndDecimals(prismaAttempts);
        }
      }
    } catch (err) {
      console.error("Error in getExamAttemptsFn from Prisma:", err);
    }

    // Fallback to dbService JSON persistent store
    console.log(`Falling back to JSON store for attempts of ${data.email}`);
    const res = dbService.getExamAttempts(data.email) || [];
    const store = dbService.readStore();
    const enrichedRes = res.map((attempt: any) => {
      const exam = store.exams.find((e: any) => e.id === attempt.examId);
      return {
        ...attempt,
        exam,
      };
    });
    return serializeBigIntsAndDecimals(enrichedRes);
  });

export const getQuestionBankFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const questions = await prisma.question.findMany({
      where: { deleted_at: null },
      include: { choices: { where: { deleted_at: null } } },
    });
    return serializeBigIntsAndDecimals(questions);
  } catch (err) {
    console.error("Error in getQuestionBankFn:", err);
    return [];
  }
});

export const getStudentExamResultsFn = createServerFn({ method: "GET" })
  .validator(z.object({ email: z.string().email() }))
  .handler(async ({ data }) => {
    checkSessionUser(data.email);
    try {
      const user = await prisma.user.findFirst({
        where: { email: { equals: data.email, mode: "insensitive" }, deleted_at: null },
      });
      if (!user) return [];
      const attempts = await prisma.examAttempt.findMany({
        where: { studentId: user.id, deleted_at: null },
        include: {
          exam: true,
        },
        orderBy: { created_at: "desc" },
      });
      return serializeBigIntsAndDecimals(attempts);
    } catch (err) {
      console.error("Error in getStudentExamResultsFn:", err);
      // Fallback to dbService JSON persistent store
      const res = dbService.getExamAttempts(data.email) || [];
      const store = dbService.readStore();
      const enrichedRes = res.map((attempt: any) => {
        const exam = store.exams.find((e: any) => e.id === attempt.examId);
        return {
          ...attempt,
          exam,
        };
      });
      return serializeBigIntsAndDecimals(enrichedRes);
    }
  });

export const logViolationServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().email(),
      examTitle: z.string(),
      type: z.string(),
      details: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    checkSessionUser(data.email);
    const res = dbService.logViolation(data.email, data.examTitle, data.type, data.details);
    return serializeBigIntsAndDecimals(res);
  });

export const getViolationsListFn = createServerFn({ method: "GET" }).handler(async () => {
  await checkSuperAdminAuth();
  const res = dbService.getViolationsList();
  return serializeBigIntsAndDecimals(res);
});

export const getSessionsFn = createServerFn({ method: "GET" })
  .validator(z.object({ email: z.string().email() }))
  .handler(async ({ data }) => {
    checkSessionUser(data.email);
    const res = dbService.getSessions(data.email);
    return serializeBigIntsAndDecimals(res);
  });

export const revokeSessionFn = createServerFn({ method: "POST" })
  .validator(z.object({ deviceId: z.string() }))
  .handler(async ({ data }) => {
    const sessionId = getActiveSessionId();
    if (!sessionId) throw new Error("ERR_UNAUTHORIZED");
    const store = dbService.readStore();
    const session = store.user_sessions.find(
      (s) => s.session_id === sessionId && s.status === "ACTIVE" && s.revoked_at === null,
    );
    if (!session) throw new Error("ERR_UNAUTHORIZED");

    const targetDevice = store.user_devices.find((d) => d.device_id === data.deviceId);
    const targetSession = store.user_sessions.find((s) => s.device_id === data.deviceId);
    const targetUserId = targetDevice?.user_id || targetSession?.user_id;

    const user = store.users.find((u) => u.id === session.user_id);
    if (user && user.role !== "SUPER_ADMIN" && targetUserId && targetUserId !== session.user_id) {
      throw new Error("ERR_UNAUTHORIZED: لا تملك صلاحية إلغاء هذه الجلسة.");
    }

    const res = dbService.revokeSession(data.deviceId);
    return serializeBigIntsAndDecimals(res);
  });

export const revokeAllOtherSessionsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().email(),
      currentFingerprint: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    checkSessionUser(data.email);
    const res = dbService.revokeAllOtherSessions(data.email, data.currentFingerprint);
    return serializeBigIntsAndDecimals(res);
  });

export const getAllDevicesFn = createServerFn({ method: "GET" }).handler(async () => {
  await checkPermissionAuth("DEVICE_MANAGEMENT");
  const res = dbService.getAllDevices();
  return serializeBigIntsAndDecimals(res);
});

export const getAllSessionsFn = createServerFn({ method: "GET" }).handler(async () => {
  await checkPermissionAuth("SESSION_MANAGEMENT");
  const res = dbService.getAllSessions();
  return serializeBigIntsAndDecimals(res);
});

export const getAllSecurityEventsFn = createServerFn({ method: "GET" }).handler(async () => {
  await checkPermissionAuth("SECURITY_CENTER");
  const res = dbService.getAllSecurityEvents();
  return serializeBigIntsAndDecimals(res);
});

export const getAuditLogsFn = createServerFn({ method: "GET" }).handler(async () => {
  await checkPermissionAuth("AUDIT_LOGS");
  const logs = await prisma.auditLog.findMany({
    where: { deleted_at: null },
    include: { user: { include: { profile: true } } },
    orderBy: { created_at: "desc" },
  });
  return serializeBigIntsAndDecimals(logs);
});

export const getDashboardStatsFn = createServerFn({ method: "GET" }).handler(async () => {
  await checkSuperAdminAuth();

  const cacheKey = "dashboard_stats";
  const cached = await getCache<any>(cacheKey);
  if (cached) {
    return cached;
  }

  const totalUsers = await prisma.user.count({ where: { deleted_at: null } });
  const totalCourses = await prisma.course.count({ where: { deleted_at: null } });

  const revenueAggregate = await prisma.order.aggregate({
    where: { status: OrderStatus.COMPLETED, deleted_at: null },
    _sum: { totalAmount: true },
  });
  const totalRevenue = revenueAggregate._sum.totalAmount
    ? Number(revenueAggregate._sum.totalAmount)
    : 0;

  const activeSessionsCount = dbService
    .getAllSessions()
    .filter((s) => s.status === "ACTIVE").length;
  const pendingSecurityAlerts = dbService
    .getAllSecurityEvents()
    .filter((e) => e.severity === "HIGH").length;

  const stats = {
    totalUsers,
    totalCourses,
    totalRevenue,
    activeSessionsCount,
    pendingSecurityAlerts,
  };

  await setCache(cacheKey, stats, 60); // Cache dashboard stats for 60 seconds
  return stats;
});

// ==========================================
// SECURE FILE STORAGE & PAYMENTS WEBHOOKS
// ==========================================

export const validateWebhookPaymentFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      gateway: z.string(),
      rawBody: z.string(),
      signature: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    let verified = false;

    if (data.gateway === "STRIPE") {
      const secret = process.env.STRIPE_WEBHOOK_SECRET || "stripe_whsec_test";
      const hash = crypto.createHmac("sha256", secret).update(data.rawBody).digest("hex");
      verified =
        data.signature.includes(hash) ||
        data.signature === hash ||
        process.env.NODE_ENV !== "production";
    } else if (data.gateway === "PAYPAL") {
      const secret = process.env.PAYPAL_WEBHOOK_SECRET || "paypal_whsec_test";
      const hash = crypto.createHmac("sha256", secret).update(data.rawBody).digest("hex");
      verified = data.signature === hash || process.env.NODE_ENV !== "production";
    } else if (data.gateway === "FAWRY") {
      const secret = process.env.FAWRY_SEC_KEY || "fawry_sec_test";
      const hash = crypto
        .createHash("sha256")
        .update(data.rawBody + secret)
        .digest("hex");
      verified = data.signature === hash || process.env.NODE_ENV !== "production";
    }

    if (!verified) {
      logger.critical(
        "SECURITY",
        `فشل التحقق من صحة التوقيع الرقمي للـ Webhook للـ ${data.gateway}`,
        { signature: data.signature },
      );
      throw new Error("ERR_INVALID_SIGNATURE: توقيع Webhook غير صالح.");
    }

    logger.info("AUDIT", `تم التحقق من صحة Webhook للـ ${data.gateway} بنجاح.`);
    return { success: true };
  });

export const refundOrderFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      orderId: z.string().uuid(),
      reason: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkAdminAuth();

    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      include: { transactions: true },
    });
    if (!order) throw new Error("Order not found");
    if (order.status === OrderStatus.CANCELLED) {
      throw new Error("Order already refunded/cancelled");
    }

    const tx = order.transactions[0];
    if (!tx) throw new Error("No transaction found for this order");

    await prisma.$transaction(async (db) => {
      await db.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELLED },
      });

      await db.refund.create({
        data: {
          transactionId: tx.id,
          amount: tx.amount,
          reason: data.reason || "طلب استرداد الأموال",
          status: "SUCCESS",
        },
      });

      // Remove enrollment corresponding to latest course claimed by student
      const code = await db.studentAccessCode.findFirst({
        where: { studentId: order.studentId, deleted_at: null },
        orderBy: { usedAt: "desc" },
      });

      if (code) {
        await db.enrollment.deleteMany({
          where: {
            studentId: order.studentId,
            courseId: code.courseId,
          },
        });
      } else {
        const latestEnrollment = await db.enrollment.findFirst({
          where: { studentId: order.studentId },
          orderBy: { created_at: "desc" },
        });
        if (latestEnrollment) {
          await db.enrollment.delete({
            where: { id: latestEnrollment.id },
          });
        }
      }
    });

    logger.info("AUDIT", `تم معالجة استرداد الأموال للطلب ${data.orderId}`, {
      orderId: data.orderId,
      reason: data.reason,
    });
    return { success: true };
  });

export const uploadFileFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string(),
      base64: z.string(),
      category: z.enum(["avatar", "cover", "video", "pdf", "attachment"]),
      isPrivate: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const sessionId = getActiveSessionId();
      if (!sessionId) throw new Error("ERR_UNAUTHORIZED");

      const buffer = Buffer.from(data.base64.split(",")[1] || data.base64, "base64");
      const safeName = `${Date.now()}_${data.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;

      const baseFolder = data.isPrivate ? "./private/uploads" : "./public/uploads";
      const uploadDir = path.resolve(path.join(baseFolder, data.category));

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, safeName);
      fs.writeFileSync(filePath, buffer);

      try {
        fs.chmodSync(filePath, 0o644);
      } catch (err) {
        console.warn("Could not set strict file permissions:", err);
      }

      const url = data.isPrivate
        ? `/private/uploads/${data.category}/${safeName}`
        : `/uploads/${data.category}/${safeName}`;

      const response = { success: true as const, data: { url } };
      console.log("SERIALIZATION_TEST", JSON.stringify(response));
      return response;
    } catch (error: any) {
      const response = {
        success: false as const,
        message: error instanceof Error ? error.message : "Failed to upload file",
      };
      console.log("SERIALIZATION_TEST", JSON.stringify(response));
      return response;
    }
  });

export const cleanupOrphanFilesFn = createServerFn({ method: "POST" }).handler(async () => {
  await checkAdminAuth();

  const publicBase = path.resolve("./public/uploads");
  const privateBase = path.resolve("./private/uploads");

  const filesOnDisk: string[] = [];
  const categories = ["avatar", "cover", "video", "pdf", "attachment"];

  const scanDir = (baseDir: string, prefix: string) => {
    if (fs.existsSync(baseDir)) {
      for (const cat of categories) {
        const catDir = path.join(baseDir, cat);
        if (fs.existsSync(catDir)) {
          const files = fs.readdirSync(catDir);
          for (const file of files) {
            filesOnDisk.push(`${prefix}/${cat}/${file}`);
          }
        }
      }
    }
  };

  scanDir(publicBase, "/uploads");
  scanDir(privateBase, "/private/uploads");

  if (filesOnDisk.length === 0) {
    return { deletedCount: 0, message: "No files found on disk." };
  }

  const users = await prisma.user.findMany({
    select: { profile: { select: { avatarUrl: true } } },
  });
  const courses = await prisma.course.findMany({ select: { coverImage: true } });
  const videos = await prisma.video.findMany({ select: { url: true } });
  const pdfs = await prisma.pdfFile.findMany({ select: { fileUrl: true } });
  const attachments = await prisma.attachment.findMany({ select: { fileUrl: true } });
  const banners = await prisma.banner.findMany({ select: { imageUrl: true } });

  const referencedUrls = new Set<string>();
  for (const u of users) {
    if (u.profile?.avatarUrl) referencedUrls.add(u.profile.avatarUrl);
  }
  for (const c of courses) {
    if (c.coverImage) referencedUrls.add(c.coverImage);
  }
  for (const v of videos) {
    if (v.url) referencedUrls.add(v.url);
  }
  for (const p of pdfs) {
    if (p.fileUrl) referencedUrls.add(p.fileUrl);
  }
  for (const a of attachments) {
    if (a.fileUrl) referencedUrls.add(a.fileUrl);
  }
  for (const b of banners) {
    if (b.imageUrl) referencedUrls.add(b.imageUrl);
  }

  let deletedCount = 0;
  for (const fileUrl of filesOnDisk) {
    if (!referencedUrls.has(fileUrl)) {
      const relativePath = fileUrl.startsWith("/private/uploads")
        ? fileUrl.replace("/private/uploads/", "private/uploads/")
        : fileUrl.replace("/uploads/", "public/uploads/");
      const filePath = path.resolve(relativePath);

      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      } catch (err) {
        console.error(`Failed to delete orphan file: ${filePath}`, err);
      }
    }
  }

  logger.info("AUDIT", `تم تشغيل تنظيف الملفات اليتيمة. تم حذف ${deletedCount} ملفات غير مستخدمة.`);
  return { deletedCount };
});

// ==========================================
// BACKUP & RESTORE CRUD
// ==========================================

const ENCRYPTION_ALGORITHM = "aes-256-cbc";
const getEncryptionKey = (): Buffer => {
  const secret = process.env.BACKUP_ENCRYPTION_KEY || "altiora_super_secure_key_fallback_2026";
  return crypto.createHash("sha256").update(secret).digest();
};

function encryptData(data: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decryptData(encryptedText: string): string {
  const key = getEncryptionKey();
  const parts = encryptedText.split(":");
  if (parts.length !== 2) {
    throw new Error("Invalid backup encryption format");
  }
  const iv = Buffer.from(parts[0], "hex");
  const encrypted = Buffer.from(parts[1], "hex");
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString("utf8");
}

function serializeBackup(obj: any): string {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === "bigint") {
      return { _type: "BigInt", value: value.toString() };
    }
    return value;
  });
}

function deserializeBackup(str: string): any {
  return JSON.parse(str, (key, value) => {
    if (value && typeof value === "object" && value._type === "BigInt") {
      return BigInt(value.value);
    }
    return value;
  });
}

export const getBackupLogsFn = createServerFn({ method: "GET" }).handler(async () => {
  await checkSuperAdminAuth();
  const logs = await prisma.backupLog.findMany({
    where: { deleted_at: null },
    orderBy: { created_at: "desc" },
  });
  return serializeBigIntsAndDecimals(logs);
});

export const createBackupLogFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      action: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    await checkSuperAdminAuth();
    const sessionId = getActiveSessionId();
    const store = dbService.readStore();
    const session = store.user_sessions.find((s) => s.session_id === sessionId);
    const initiatedBy = session ? session.user_id : null;

    const backupDir = path.resolve("./private/backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString();
    const dateStr = timestamp.slice(0, 10).replace(/-/g, "");
    const fileName = `altiora_backup_${dateStr}_${Date.now()}.enc`;

    try {
      // 1. Gather all Postgres data dynamically from Prisma Client
      const postgresData: Record<string, any> = {};
      const models = Object.keys(prisma).filter((k) => !k.startsWith("_") && !k.startsWith("$"));
      for (const model of models) {
        try {
          postgresData[model] = await (prisma as any)[model].findMany();
        } catch (err) {
          console.warn(`Could not backup model ${model}:`, err);
        }
      }

      // 2. Gather dbStore data
      const dbStoreData = dbService.readStore();

      // 3. Construct backup payload
      const payload = {
        version: "1.0.0",
        timestamp,
        postgres: postgresData,
        dbStore: dbStoreData,
      };

      // 4. Encrypt payload
      const encrypted = encryptData(serializeBackup(payload));

      // 5. Write to disk
      const filePath = path.join(backupDir, fileName);
      fs.writeFileSync(filePath, encrypted, "utf8");
      const fileSize = fs.statSync(filePath).size;

      // 6. Create BackupLog record
      const log = await prisma.backupLog.create({
        data: {
          action: "CREATE",
          status: "SUCCESS",
          fileName,
          fileSize: BigInt(fileSize),
          initiatedBy,
        },
      });

      logger.info("AUDIT", `تم إنشاء نسخة احتياطية مشفرة بنجاح: ${fileName}`, {
        fileName,
        fileSize,
      });
      return serializeBigIntsAndDecimals(log);
    } catch (error: any) {
      console.error("Backup creation failed:", error);
      const failedLog = await prisma.backupLog.create({
        data: {
          action: "CREATE",
          status: "FAILED",
          fileName,
          fileSize: BigInt(0),
          initiatedBy,
          errorMessage: error.message || String(error),
        },
      });
      throw new Error(`فشل إنشاء النسخة الاحتياطية: ${error.message}`);
    }
  });

export const restoreBackupFn = createServerFn({ method: "POST" })
  .validator(z.object({ fileName: z.string() }))
  .handler(async ({ data }) => {
    await checkSuperAdminAuth();
    const sessionId = getActiveSessionId();
    const store = dbService.readStore();
    const session = store.user_sessions.find((s) => s.session_id === sessionId);
    const initiatedBy = session ? session.user_id : null;

    const backupDir = path.resolve("./private/backups");
    const filePath = path.join(backupDir, data.fileName);

    if (!fs.existsSync(filePath)) {
      throw new Error("ERR_FILE_NOT_FOUND: ملف النسخة الاحتياطية غير موجود.");
    }

    try {
      // 1. Read and decrypt file
      const encrypted = fs.readFileSync(filePath, "utf8");
      const decrypted = decryptData(encrypted);

      // 2. Parse and verify payload
      let payload: any;
      try {
        payload = deserializeBackup(decrypted);
      } catch (err) {
        throw new Error(
          "ERR_INVALID_FORMAT: ملف النسخة الاحتياطية تالف أو ليس بتنسيق JSON صالح بعد فك التشفير.",
        );
      }

      if (!payload || payload.version !== "1.0.0" || !payload.postgres || !payload.dbStore) {
        throw new Error(
          "ERR_INVALID_VERSION: ملف النسخة الاحتياطية غير متوافق مع إصدار النظام الحالي.",
        );
      }

      // 3. Restore Postgres database in a transaction
      const backupPostgres = payload.postgres;
      const deletionOrder = [
        // Dependent transactional/log tables (delete first, insert last)
        "refund",
        "transaction",
        "order",
        "examViolation",
        "antiCheatEvent",
        "examAttempt",
        "choice",
        "question",
        "exam",
        "studentAccessCode",
        "certificate",
        "downloadedFileHistory",
        "wishlist",
        "recentlyViewed",
        "savedNote",
        "videoNote",
        "continueWatching",
        "watchHistory",
        "courseReview",
        "enrollment",
        "studentProgress",
        "answerDiscussion",
        "questionDiscussion",
        "discussion",
        "comment",
        "reply",
        "ticket",
        "complaint",
        "watchTimeAnalytics",
        "revenueAnalytics",
        "auditLog",
        "securityEvent",
        "suspiciousActivity",
        "rolePermission",
        "userSession",
        "userDevice",
        "userSecurityEvent",
        "userExamViolation",
        "userWatchProgress",
        "userVideoNote",
        "userDownloadHistory",
        "userActivityTimeline",
        "activityLog",
        "studentCode",
        "featuredCourse",
        "maintenanceLog",
        "pushSubscription",
        "notificationPreference",
        "watchTimeStats",
        "courseCompletionStats",
        "studentActivityStats",
        "systemLog",
        "backupLog",
        "loginHistory",
        "session",
        "device",
        "courseInstructor",
        "attachment",
        "pdfFile",
        "videoMetadata",
        "video",
        "lesson",
        "module",

        // Core tables (delete last, insert first)
        "role",
        "permission",
        "course",
        "category",
        "profile",
        "user",
        "siteSetting",
        "banner",
        "faq",
        "coupon",
      ];

      await prisma.$transaction(
        async (tx) => {
          // Delete existing records in correct order to respect constraints
          for (const model of deletionOrder) {
            if ((tx as any)[model]) {
              await (tx as any)[model].deleteMany({});
            }
          }

          // Insert new records in reverse order
          const insertionOrder = [...deletionOrder].reverse();
          for (const model of insertionOrder) {
            const records = backupPostgres[model];
            if (records && records.length > 0 && (tx as any)[model]) {
              // Map Date string fields back to Date objects where necessary
              const mappedRecords = records.map((record: any) => {
                const mapped: any = {};
                for (const [key, value] of Object.entries(record)) {
                  if (
                    typeof value === "string" &&
                    (key.endsWith("_at") ||
                      key === "expiresAt" ||
                      key === "usedAt" ||
                      key === "startedAt" ||
                      key === "completedAt" ||
                      key === "issuedAt" ||
                      key === "revokedAt" ||
                      key === "lastActive" ||
                      key === "first_seen" ||
                      key === "last_seen" ||
                      key === "last_activity" ||
                      key === "scheduledFor" ||
                      key === "sentAt" ||
                      key === "startDate" ||
                      key === "endDate" ||
                      key === "date")
                  ) {
                    mapped[key] = new Date(value);
                  } else if (
                    value !== null &&
                    typeof value === "object" &&
                    (value as any).type === "Decimal"
                  ) {
                    mapped[key] = (value as any).value;
                  } else {
                    mapped[key] = value;
                  }
                }
                return mapped;
              });

              await (tx as any)[model].createMany({
                data: mappedRecords,
              });
            }
          }
        },
        {
          maxWait: 15000,
          timeout: 60000, // 60 seconds to support large databases and remote Supabase connections
        },
      );

      // 4. Restore file-based DB
      dbService.writeStore(payload.dbStore);

      // 5. Create restore success log
      const log = await prisma.backupLog.create({
        data: {
          action: "RESTORE",
          status: "SUCCESS",
          fileName: data.fileName,
          fileSize: BigInt(0),
          initiatedBy,
        },
      });

      logger.info("AUDIT", `تم استعادة النظام بنجاح من النسخة الاحتياطية: ${data.fileName}`);
      return serializeBigIntsAndDecimals(log);
    } catch (error: any) {
      console.error("Restore failed:", error);
      await prisma.backupLog
        .create({
          data: {
            action: "RESTORE",
            status: "FAILED",
            fileName: data.fileName,
            fileSize: BigInt(0),
            initiatedBy,
            errorMessage: error.message || String(error),
          },
        })
        .catch((err) => console.error("Failed to write restore failure log:", err));

      throw new Error(`فشل استعادة النسخة الاحتياطية: ${error.message}`);
    }
  });

export const deleteBackupLogFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkSuperAdminAuth();

    // First find the file to delete it from disk
    const log = await prisma.backupLog.findUnique({ where: { id: data.id } });
    if (log && log.fileName) {
      const filePath = path.resolve(path.join("./private/backups", log.fileName));
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error("Failed to delete backup file from disk:", err);
      }
    }

    const updatedLog = await prisma.backupLog.update({
      where: { id: data.id },
      data: { deleted_at: new Date() },
    });
    return serializeBigIntsAndDecimals(updatedLog);
  });

// ==========================================
// ADVANCED EXAM SYSTEM & GRADING ENGINE
// ==========================================

export const submitExamAttemptFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().email(),
      examId: z.string().uuid(),
      answers: z.array(
        z.object({
          questionId: z.string().uuid(),
          selectedChoiceId: z.string().uuid().nullable().optional(),
          essayAnswerText: z.string().nullable().optional(),
        }),
      ),
      violationsCount: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    const ip = getRequestIP() || "127.0.0.1";
    const subLimit = checkRateLimit(
      `exam_sub_${ip}_${data.email.toLowerCase()}`,
      10,
      60 * 60 * 1000,
    );
    if (!subLimit.success) {
      throw new Error(
        `لقد تجاوزت الحد الأقصى لمحاولات تسليم الامتحانات. يرجى الانتظار ${subLimit.retryAfter} ثانية.`,
      );
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: data.email, mode: "insensitive" }, deleted_at: null },
    });
    if (!user) throw new Error("المستخدم غير موجود");

    const exam = await prisma.exam.findUnique({
      where: { id: data.examId },
      include: {
        questions: {
          where: { deleted_at: null },
          include: { choices: { where: { deleted_at: null } } },
        },
      },
    });
    if (!exam) throw new Error("الامتحان غير موجود");

    const attempt = await prisma.examAttempt.create({
      data: {
        examId: data.examId,
        studentId: user.id,
        score: 0.0,
        passed: false,
      },
    });

    if (data.violationsCount > 0) {
      await prisma.examViolation.create({
        data: {
          attemptId: attempt.id,
          studentId: user.id,
          type: "MULTIPLE_VIOLATIONS",
          details: `تم رصد عدد ${data.violationsCount} مخالفات أثناء تأدية الامتحان.`,
        },
      });
    }

    let totalMcqPossible = 0;
    let totalMcqEarned = 0;
    let hasEssay = false;

    for (const q of exam.questions) {
      const qType = q.qType || "MULTIPLE_CHOICE";
      const qMark = q.mark || q.points || 1;
      const studentAnswer = data.answers.find((a) => a.questionId === q.id);

      if (qType === "MULTIPLE_CHOICE" || q.type === "MCQ" || q.type === "TRUE_FALSE") {
        totalMcqPossible += qMark;
        const selectedChoiceId = studentAnswer?.selectedChoiceId;

        if (selectedChoiceId) {
          const choice = q.choices.find((c) => c.id === selectedChoiceId);
          const isCorrect = choice?.isCorrect || false;
          if (isCorrect) {
            totalMcqEarned += qMark;
          }

          await prisma.examAttemptAnswer.create({
            data: {
              attemptId: attempt.id,
              questionId: q.id,
              selectedChoiceId,
            },
          });
        }
      } else {
        hasEssay = true;
        const essayAnswerText = studentAnswer?.essayAnswerText || "";

        await prisma.essayAnswer.create({
          data: {
            attemptId: attempt.id,
            questionId: q.id,
            answerText: essayAnswerText,
          },
        });
      }
    }

    let finalScore = 0;
    let passed = false;

    if (!hasEssay) {
      finalScore =
        totalMcqPossible > 0 ? Math.round((totalMcqEarned / totalMcqPossible) * 100) : 100;
      passed = finalScore >= (exam.passScore ? Number(exam.passScore) : 60);

      await prisma.examAttempt.update({
        where: { id: attempt.id },
        data: {
          score: finalScore,
          passed,
          completedAt: new Date(),
          isPublished: true, // MCQ-only exams are auto-published
          publishedAt: new Date(),
        },
      });
    } else {
      const essayCount = exam.questions.filter((q) => (q.qType || q.type) === "ESSAY").length;
      const totalPointsPossible = totalMcqPossible + essayCount * 5;
      finalScore =
        totalPointsPossible > 0 ? Math.round((totalMcqEarned / totalPointsPossible) * 100) : 0;

      await prisma.examAttempt.update({
        where: { id: attempt.id },
        data: {
          score: finalScore,
          passed: false,
          isPendingManualReview: true,
          completedAt: new Date(),
        },
      });
    }

    dbService.saveExamAttempt(data.email, data.examId, finalScore, passed, data.violationsCount);

    return serializeBigIntsAndDecimals({
      attemptId: attempt.id,
      score: finalScore,
      passed,
      hasEssay,
    });
  });

export const getExamCorrectionDetailsFn = createServerFn({ method: "GET" })
  .validator(z.object({ attemptId: z.string().uuid() }))
  .handler(async ({ data }) => {
    enforceRateLimits();
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: data.attemptId },
      include: {
        exam: {
          include: {
            questions: {
              where: { deleted_at: null },
              include: {
                choices: { where: { deleted_at: null } },
              },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
        essayAnswers: {
          where: { deleted_at: null },
        },
        attemptAnswers: {
          where: { deleted_at: null },
        },
        student: {
          include: { profile: true },
        },
        reviewedBy: {
          include: { profile: true },
        },
        aiRecommendation: true,
      },
    });

    if (!attempt) throw new Error("محاولة الامتحان غير موجودة");
    return serializeBigIntsAndDecimals(attempt);
  });

export const gradeEssayAnswerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      essayAnswerId: z.string().uuid(),
      grade: z.number(),
      feedback: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkTeacherOrAdminAuth();

    const essayAnswer = await prisma.essayAnswer.update({
      where: { id: data.essayAnswerId },
      data: {
        teacherGrade: data.grade,
        teacherFeedback: data.feedback,
      },
      include: {
        attempt: {
          include: {
            exam: {
              include: {
                questions: {
                  where: { deleted_at: null },
                  include: {
                    choices: { where: { deleted_at: null } },
                  },
                },
              },
            },
            essayAnswers: true,
            attemptAnswers: true,
          },
        },
      },
    });

    const attempt = essayAnswer.attempt;
    let totalPossiblePoints = 0;
    let totalEarnedPoints = 0;

    for (const q of attempt.exam.questions) {
      const qType = q.qType || "MULTIPLE_CHOICE";
      const qMark = q.mark || q.points || 1;

      totalPossiblePoints += qMark;

      if (qType === "MULTIPLE_CHOICE" || q.type === "MCQ" || q.type === "TRUE_FALSE") {
        const studentAns = attempt.attemptAnswers.find((a) => a.questionId === q.id);
        if (studentAns?.selectedChoiceId) {
          const choice = q.choices.find((c) => c.id === studentAns.selectedChoiceId);
          if (choice?.isCorrect) {
            totalEarnedPoints += qMark;
          }
        }
      } else {
        const essayAns = attempt.essayAnswers.find((a) => a.questionId === q.id);
        if (essayAns && essayAns.teacherGrade !== null) {
          totalEarnedPoints += Number(essayAns.teacherGrade);
        }
      }
    }

    const finalScore =
      totalPossiblePoints > 0 ? Math.round((totalEarnedPoints / totalPossiblePoints) * 100) : 100;
    const passed = finalScore >= (attempt.exam.passScore ? Number(attempt.exam.passScore) : 60);

    const updatedAttempt = await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        score: finalScore,
        passed,
        completedAt: new Date(),
      },
    });

    return serializeBigIntsAndDecimals(updatedAttempt);
  });

export const getPendingEssayAttemptsFn = createServerFn({ method: "GET" }).handler(async () => {
  await checkTeacherOrAdminAuth();
  const attempts = await prisma.examAttempt.findMany({
    where: {
      deleted_at: null,
      essayAnswers: {
        some: {
          teacherGrade: null,
        },
      },
    },
    include: {
      exam: true,
      student: {
        include: { profile: true },
      },
      essayAnswers: {
        include: {
          question: true,
        },
      },
    },
    orderBy: { created_at: "desc" },
  });
  return serializeBigIntsAndDecimals(attempts);
});

export const publishExamAttemptResultFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      attemptId: z.string().uuid(),
    }),
  )
  .handler(async ({ data }) => {
    const teacherId = await getAuthenticatedUserId();
    if (!teacherId) throw new Error("ERR_UNAUTHORIZED");
    await checkTeacherOrAdminAuth();

    const attempt = await prisma.examAttempt.findUnique({
      where: { id: data.attemptId },
      include: {
        exam: {
          include: {
            questions: {
              where: { deleted_at: null },
            },
          },
        },
        essayAnswers: {
          where: { deleted_at: null },
        },
        student: {
          include: {
            notificationPreference: true,
            profile: true,
          },
        },
      },
    });

    if (!attempt) throw new Error("ERR_NOT_FOUND: محاولة الامتحان غير موجودة.");
    if (attempt.isPublished) {
      throw new Error("ERR_ALREADY_PUBLISHED: النتيجة منشورة بالفعل.");
    }

    const essayQuestions = attempt.exam.questions.filter((q) => (q.qType || q.type) === "ESSAY");
    for (const eq of essayQuestions) {
      const studentAns = attempt.essayAnswers.find((ans) => ans.questionId === eq.id);
      if (!studentAns || studentAns.teacherGrade === null) {
        throw new Error("ERR_UNGRADED_ESSAYS: لم يتم تصحيح جميع الأسئلة المقالية بعد.");
      }
    }

    let totalPossiblePoints = 0;
    let totalEarnedPoints = 0;
    
    const attemptAnswers = await prisma.examAttemptAnswer.findMany({
      where: { attemptId: attempt.id, deleted_at: null },
    });
    
    const examQuestionsWithChoices = await prisma.question.findMany({
      where: { examId: attempt.examId, deleted_at: null },
      include: { choices: { where: { deleted_at: null } } },
    });

    for (const q of examQuestionsWithChoices) {
      const qType = q.qType || "MULTIPLE_CHOICE";
      const qMark = q.mark || q.points || 1;

      totalPossiblePoints += qMark;

      if (qType === "MULTIPLE_CHOICE" || q.type === "MCQ" || q.type === "TRUE_FALSE") {
        const studentAns = attemptAnswers.find((a) => a.questionId === q.id);
        if (studentAns?.selectedChoiceId) {
          const choice = q.choices.find((c) => c.id === studentAns.selectedChoiceId);
          if (choice?.isCorrect) {
            totalEarnedPoints += qMark;
          }
        }
      } else {
        const essayAns = attempt.essayAnswers.find((a) => a.questionId === q.id);
        if (essayAns && essayAns.teacherGrade !== null) {
          totalEarnedPoints += Number(essayAns.teacherGrade);
        }
      }
    }

    const finalScore = totalPossiblePoints > 0 ? Math.round((totalEarnedPoints / totalPossiblePoints) * 100) : 100;
    const passed = finalScore >= (attempt.exam.passScore ? Number(attempt.exam.passScore) : 60);

    const updatedAttempt = await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        score: finalScore,
        passed,
        isPublished: true,
        publishedAt: new Date(),
        reviewedById: teacherId,
        reviewedAt: new Date(),
        isPendingManualReview: false,
      },
    });

    await prisma.examPublishLog.create({
      data: {
        attemptId: attempt.id,
        teacherId,
        score: finalScore,
        publishedAt: new Date(),
      },
    });

    const notificationMessage = `تم نشر نتيجة امتحانك "${attempt.exam.title}". درجتك هي: ${finalScore}% (${passed ? "ناجح" : "راسب"})`;
    await createNotification({
      userId: attempt.studentId,
      title: "نشر نتيجة الامتحان",
      message: notificationMessage,
      type: "EXAM_RESULT",
      actionUrl: `/app/exams`,
    });

    if (!passed) {
      const incorrectQuestionSectionIds = new Set<string>();
      
      for (const q of examQuestionsWithChoices) {
        const qType = q.qType || "MULTIPLE_CHOICE";
        let isCorrect = false;

        if (qType === "MULTIPLE_CHOICE" || q.type === "MCQ" || q.type === "TRUE_FALSE") {
          const studentAns = attemptAnswers.find((a) => a.questionId === q.id);
          if (studentAns?.selectedChoiceId) {
            const choice = q.choices.find((c) => c.id === studentAns.selectedChoiceId);
            isCorrect = choice?.isCorrect || false;
          }
        } else {
          const essayAns = attempt.essayAnswers.find((a) => a.questionId === q.id);
          const qMark = q.mark || q.points || 5;
          if (essayAns && essayAns.teacherGrade !== null) {
            isCorrect = Number(essayAns.teacherGrade) >= (qMark * 0.6);
          }
        }

        if (!isCorrect) {
          if (q.sectionId) {
            incorrectQuestionSectionIds.add(q.sectionId);
          }
        }
      }

      const sections = await prisma.examSection.findMany({
        where: {
          id: { in: Array.from(incorrectQuestionSectionIds) },
          deleted_at: null,
        },
      });

      const weakTopics = sections.length > 0 ? sections.map((s) => s.name) : ["مراجعة عامة لمحتوى الامتحان"];

      const courseLessons = await prisma.lesson.findMany({
        where: {
          module: {
            courseId: attempt.exam.courseId,
          },
          deleted_at: null,
        },
        take: 3,
      });

      const recommendedLessons = courseLessons.map((l) => ({
        id: l.id,
        title: l.title,
      }));

      await prisma.aIStudyRecommendation.upsert({
        where: { attemptId: attempt.id },
        update: {
          weakTopics: weakTopics as any,
          recommendedLessons: recommendedLessons as any,
          generatedAt: new Date(),
        },
        create: {
          attemptId: attempt.id,
          weakTopics: weakTopics as any,
          recommendedLessons: recommendedLessons as any,
        },
      });
    }

    const pref = attempt.student.notificationPreference;
    const emailEnabled = pref ? pref.emailEnabled : true;
    if (emailEnabled && attempt.student.email) {
      await prisma.emailNotification.create({
        data: {
          userId: attempt.studentId,
          recipientEmail: attempt.student.email,
          subject: `تم نشر نتيجة امتحانك: ${attempt.exam.title}`,
          body: `مرحباً ${attempt.student.profile?.name || "الطالب"},\n\nتم نشر نتيجة امتحانك "${attempt.exam.title}".\nالدرجة النهائية: ${finalScore}%\nالحالة: ${passed ? "ناجح" : "راسب"}\n\nيرجى تسجيل الدخول لمراجعة تفاصيل الإجابة والملاحظات.\n\nمنصة Altiora التعليمية`,
        },
      });
    }

    return serializeBigIntsAndDecimals(updatedAttempt);
  });

export const unpublishExamAttemptResultFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      attemptId: z.string().uuid(),
    }),
  )
  .handler(async ({ data }) => {
    await checkTeacherOrAdminAuth();

    const attempt = await prisma.examAttempt.findUnique({
      where: { id: data.attemptId },
      include: { exam: true },
    });

    if (!attempt) throw new Error("ERR_NOT_FOUND: محاولة الامتحان غير موجودة.");

    const updatedAttempt = await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        isPublished: false,
        isPendingManualReview: true,
        publishedAt: null,
      },
    });

    await createNotification({
      userId: attempt.studentId,
      title: "تعديل نتيجة الامتحان",
      message: `تم سحب نتيجة امتحانك "${attempt.exam.title}" مؤقتًا لإعادة مراجعتها.`,
      type: "EXAM_RESULT",
      actionUrl: `/app/exams`,
    });

    return serializeBigIntsAndDecimals(updatedAttempt);
  });

export const getFeedbackTemplatesFn = createServerFn({ method: "GET" }).handler(async () => {
  const teacherId = await getAuthenticatedUserId();
  if (!teacherId) throw new Error("ERR_UNAUTHORIZED");
  await checkTeacherOrAdminAuth();

  const templates = await prisma.teacherFeedbackTemplate.findMany({
    where: { teacherId },
    orderBy: { created_at: "desc" },
  });

  return serializeBigIntsAndDecimals(templates);
});

export const createFeedbackTemplateFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      text: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const teacherId = await getAuthenticatedUserId();
    if (!teacherId) throw new Error("ERR_UNAUTHORIZED");
    await checkTeacherOrAdminAuth();

    const template = await prisma.teacherFeedbackTemplate.create({
      data: {
        teacherId,
        text: data.text,
      },
    });

    return serializeBigIntsAndDecimals(template);
  });

export const deleteFeedbackTemplateFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
    }),
  )
  .handler(async ({ data }) => {
    const teacherId = await getAuthenticatedUserId();
    if (!teacherId) throw new Error("ERR_UNAUTHORIZED");
    await checkTeacherOrAdminAuth();

    const template = await prisma.teacherFeedbackTemplate.findUnique({
      where: { id: data.id },
    });

    if (!template) throw new Error("ERR_NOT_FOUND");
    if (template.teacherId !== teacherId) throw new Error("ERR_FORBIDDEN");

    await prisma.teacherFeedbackTemplate.delete({
      where: { id: data.id },
    });

    return { success: true };
  });

export const getTeacherGradingDashboardDataFn = createServerFn({ method: "GET" }).handler(async () => {
  const teacherId = await getAuthenticatedUserId();
  if (!teacherId) throw new Error("ERR_UNAUTHORIZED");
  await checkTeacherOrAdminAuth();

  const exams = await prisma.exam.findMany({
    where: {
      course: {
        instructors: {
          some: { instructorId: teacherId }
        }
      },
      deleted_at: null,
    }
  });
  
  const examIds = exams.map(e => e.id);

  const attempts = await prisma.examAttempt.findMany({
    where: {
      examId: { in: examIds },
      deleted_at: null,
    },
    include: {
      exam: true,
      student: { include: { profile: true } },
      essayAnswers: { include: { question: true } },
      essayReviewLogs: true,
      examPublishLogs: true,
    },
    orderBy: { created_at: "desc" }
  });

  return serializeBigIntsAndDecimals(attempts);
});

export const importQuestionsFromExcelFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      examId: z.string().uuid(),
      questions: z.array(
        z.object({
          questionText: z.string(),
          choice1: z.string().optional().nullable(),
          choice2: z.string().optional().nullable(),
          choice3: z.string().optional().nullable(),
          choice4: z.string().optional().nullable(),
          correctAnswer: z.string().optional().nullable(),
          difficulty: z
            .enum(["VERY_EASY", "EASY", "MEDIUM", "HARD", "VERY_HARD"])
            .optional()
            .default("MEDIUM"),
          mark: z.number().optional().default(1),
          explanation: z.string().optional().default(""),
          type: z.enum(["MULTIPLE_CHOICE", "ESSAY"]).optional().default("MULTIPLE_CHOICE"),
        }),
      ),
    }),
  )
  .handler(async ({ data }) => {
    await checkTeacherOrAdminAuth();

    const results = [];
    for (const q of data.questions) {
      const question = await prisma.question.create({
        data: {
          examId: data.examId,
          text: q.questionText,
          questionText: q.questionText,
          type: q.type === "MULTIPLE_CHOICE" ? "MCQ" : "ESSAY",
          qType: q.type,
          difficulty: q.difficulty,
          mark: q.mark,
          points: q.mark,
          explanation: q.explanation,
        },
      });

      if (q.type === "MULTIPLE_CHOICE") {
        const choicesData = [];
        if (q.choice1)
          choicesData.push({ text: q.choice1, isCorrect: q.choice1 === q.correctAnswer });
        if (q.choice2)
          choicesData.push({ text: q.choice2, isCorrect: q.choice2 === q.correctAnswer });
        if (q.choice3)
          choicesData.push({ text: q.choice3, isCorrect: q.choice3 === q.correctAnswer });
        if (q.choice4)
          choicesData.push({ text: q.choice4, isCorrect: q.choice4 === q.correctAnswer });

        for (let i = 0; i < choicesData.length; i++) {
          const c = choicesData[i];
          await prisma.choice.create({
            data: {
              questionId: question.id,
              text: c.text,
              choiceText: c.text,
              isCorrect: c.isCorrect,
              sortOrder: i + 1,
            },
          });
        }
      }
      results.push(question);
    }

    return serializeBigIntsAndDecimals(results);
  });

// ==========================================
// REVENUE SHARING & ANALYTICS
// ==========================================

export const recordRevenueTransactionFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      courseId: z.string().uuid(),
      studentEmail: z.string().email(),
      amount: z.number(),
      type: z.enum(["PURCHASE", "COUPON", "MANUAL"]),
      couponId: z.string().uuid().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const student = await prisma.user.findFirst({
      where: { email: { equals: data.studentEmail, mode: "insensitive" }, deleted_at: null },
    });
    if (!student) throw new Error("الطالب غير موجود");

    if (data.couponId) {
      await prisma.couponCode.update({
        where: { id: data.couponId },
        data: { usedCount: { increment: 1 } },
      });
    }

    const courseInstructor = await prisma.courseInstructor.findFirst({
      where: { courseId: data.courseId },
    });
    let teacherId = courseInstructor?.instructorId;
    if (!teacherId) {
      const firstTeacher = await prisma.user.findFirst({ where: { role: UserRole.TEACHER } });
      if (firstTeacher) {
        teacherId = firstTeacher.id;
      } else {
        teacherId = student.id;
      }
    }

    let platformPercentage = 20.0;
    let teacherPercentage = 80.0;

    const teacherSettings = await prisma.revenueSettings.findUnique({
      where: { teacherId },
    });

    if (teacherSettings) {
      platformPercentage = Number(teacherSettings.platformPercentage);
      teacherPercentage = Number(teacherSettings.teacherPercentage);
    } else {
      const globalSettings = await prisma.revenueSettings.findFirst({
        where: { teacherId: null },
      });
      if (globalSettings) {
        platformPercentage = Number(globalSettings.platformPercentage);
        teacherPercentage = Number(globalSettings.teacherPercentage);
      }
    }

    const teacherAmount = data.amount * (teacherPercentage / 100);
    const platformAmount = data.amount * (platformPercentage / 100);

    const tx = await prisma.revenueTransaction.create({
      data: {
        teacherId,
        courseId: data.courseId,
        studentId: student.id,
        amount: data.amount,
        teacherAmount,
        platformAmount,
        type: data.type,
      },
    });

    return serializeBigIntsAndDecimals(tx);
  });

export const getTeacherRevenueStatsFn = createServerFn({ method: "GET" })
  .validator(z.object({ email: z.string().email() }))
  .handler(async ({ data }) => {
    enforceRateLimits();
    const teacher = await prisma.user.findFirst({
      where: {
        email: { equals: data.email, mode: "insensitive" },
        role: { in: [UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
        deleted_at: null,
      },
    });
    if (!teacher) throw new Error("المعلم غير موجود");

    const txs = await prisma.revenueTransaction.findMany({
      where: { teacherId: teacher.id },
      include: {
        course: true,
        student: { include: { profile: true } },
      },
      orderBy: { created_at: "desc" },
    });

    let totalSales = 0;
    let totalEarnings = 0;
    let platformCommission = 0;

    txs.forEach((t) => {
      totalSales += Number(t.amount);
      totalEarnings += Number(t.teacherAmount);
      platformCommission += Number(t.platformAmount);
    });

    const courseSalesMap: Record<string, { title: string; count: number; total: number }> = {};
    txs.forEach((t) => {
      if (!courseSalesMap[t.courseId]) {
        courseSalesMap[t.courseId] = { title: t.course.title, count: 0, total: 0 };
      }
      courseSalesMap[t.courseId].count += 1;
      courseSalesMap[t.courseId].total += Number(t.amount);
    });
    const topCourses = Object.values(courseSalesMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const monthlyMap: Record<string, { month: string; sales: number; earnings: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleString("ar-EG", { month: "long", year: "numeric" });
      monthlyMap[key] = { month: key, sales: 0, earnings: 0 };
    }

    txs.forEach((t) => {
      const date = new Date(t.created_at);
      const key = date.toLocaleString("ar-EG", { month: "long", year: "numeric" });
      if (monthlyMap[key]) {
        monthlyMap[key].sales += Number(t.amount);
        monthlyMap[key].earnings += Number(t.teacherAmount);
      }
    });

    const monthlyChart = Object.values(monthlyMap);

    return serializeBigIntsAndDecimals({
      totalSales,
      totalEarnings,
      platformCommission,
      topCourses,
      monthlyChart,
      transactions: txs,
    });
  });

export const getSuperAdminRevenueAnalyticsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    await checkSuperAdminAuth();

    const txs = await prisma.revenueTransaction.findMany({
      include: {
        course: true,
        teacher: { include: { profile: true } },
        student: { include: { profile: true } },
      },
      orderBy: { created_at: "desc" },
    });

    let totalPlatformRevenue = 0;
    let totalTeachersRevenue = 0;

    txs.forEach((t) => {
      totalPlatformRevenue += Number(t.platformAmount);
      totalTeachersRevenue += Number(t.teacherAmount);
    });

    const teacherMap: Record<
      string,
      { name: string; email: string; sales: number; earnings: number }
    > = {};
    txs.forEach((t) => {
      const teacherName = t.teacher.profile?.name || t.teacher.email;
      if (!teacherMap[t.teacherId]) {
        teacherMap[t.teacherId] = {
          name: teacherName,
          email: t.teacher.email,
          sales: 0,
          earnings: 0,
        };
      }
      teacherMap[t.teacherId].sales += Number(t.amount);
      teacherMap[t.teacherId].earnings += Number(t.teacherAmount);
    });
    const bestTeachers = Object.values(teacherMap)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);

    const monthlyMap: Record<string, { month: string; platform: number; teachers: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleString("ar-EG", { month: "long", year: "numeric" });
      monthlyMap[key] = { month: key, platform: 0, teachers: 0 };
    }

    txs.forEach((t) => {
      const date = new Date(t.created_at);
      const key = date.toLocaleString("ar-EG", { month: "long", year: "numeric" });
      if (monthlyMap[key]) {
        monthlyMap[key].platform += Number(t.platformAmount);
        monthlyMap[key].teachers += Number(t.teacherAmount);
      }
    });
    const monthlyChart = Object.values(monthlyMap);

    const courseSalesMap: Record<string, { title: string; count: number; total: number }> = {};
    txs.forEach((t) => {
      if (!courseSalesMap[t.courseId]) {
        courseSalesMap[t.courseId] = { title: t.course.title, count: 0, total: 0 };
      }
      courseSalesMap[t.courseId].count += 1;
      courseSalesMap[t.courseId].total += Number(t.amount);
    });
    const topCourses = Object.values(courseSalesMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return serializeBigIntsAndDecimals({
      totalPlatformRevenue,
      totalTeachersRevenue,
      bestTeachers,
      monthlyChart,
      topCourses,
      transactions: txs,
    });
  },
);

export const updateRevenueSettingsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      teacherEmail: z.string().email().nullable().optional(),
      platformPercentage: z.number(),
      teacherPercentage: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    await checkSuperAdminAuth();

    let teacherId: string | null = null;
    if (data.teacherEmail) {
      const teacher = await prisma.user.findFirst({
        where: { email: { equals: data.teacherEmail, mode: "insensitive" } },
      });
      if (!teacher) throw new Error("المعلم غير موجود");
      teacherId = teacher.id;
    }

    let setting;
    if (teacherId) {
      setting = await prisma.revenueSettings.upsert({
        where: { teacherId },
        create: {
          teacherId,
          platformPercentage: data.platformPercentage,
          teacherPercentage: data.teacherPercentage,
          isCustom: true,
        },
        update: {
          platformPercentage: data.platformPercentage,
          teacherPercentage: data.teacherPercentage,
          isCustom: true,
        },
      });
    } else {
      const existingGlobal = await prisma.revenueSettings.findFirst({
        where: { teacherId: null },
      });
      if (existingGlobal) {
        setting = await prisma.revenueSettings.update({
          where: { id: existingGlobal.id },
          data: {
            platformPercentage: data.platformPercentage,
            teacherPercentage: data.teacherPercentage,
            isCustom: false,
          },
        });
      } else {
        setting = await prisma.revenueSettings.create({
          data: {
            teacherId: null,
            platformPercentage: data.platformPercentage,
            teacherPercentage: data.teacherPercentage,
            isCustom: false,
          },
        });
      }
    }

    return serializeBigIntsAndDecimals(setting);
  });

// ==========================================
// LESSON ATTACHMENTS & DOWNLOAD TRACKING
// ==========================================

export const createLessonAttachmentFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      lessonId: z.string().uuid(),
      name: z.string(),
      fileUrl: z.string(),
      fileType: z.string(),
      fileSize: z.string(),
      uploadedByEmail: z.string().email(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await prisma.user.findFirst({
      where: { email: { equals: data.uploadedByEmail, mode: "insensitive" }, deleted_at: null },
    });
    if (!user) throw new Error("المستخدم غير موجود");

    const attachment = await prisma.lessonAttachment.create({
      data: {
        lessonId: data.lessonId,
        name: data.name,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        fileSize: data.fileSize,
        uploadedBy: user.id,
      },
    });

    logger.info("AUDIT", `تم رفع ملف جديد: ${data.name} للدرس ${data.lessonId}`, {
      attachmentId: attachment.id,
      uploadedBy: user.id,
    });

    return serializeBigIntsAndDecimals(attachment);
  });

export const deleteLessonAttachmentFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const attachment = await prisma.lessonAttachment.findUnique({
      where: { id: data.id },
    });
    if (!attachment) throw new Error("الملف غير موجود");

    await prisma.lessonAttachment.delete({
      where: { id: data.id },
    });

    logger.info("AUDIT", `تم حذف ملف: ${attachment.name}`, { id: data.id });
    return { success: true };
  });

export const trackDownloadFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      attachmentId: z.string().uuid(),
      studentEmail: z.string().email(),
    }),
  )
  .handler(async ({ data }) => {
    const student = await prisma.user.findFirst({
      where: { email: { equals: data.studentEmail, mode: "insensitive" }, deleted_at: null },
    });
    if (!student) throw new Error("الطالب غير موجود");

    const attachment = await prisma.lessonAttachment.findUnique({
      where: { id: data.attachmentId },
    });
    if (!attachment) throw new Error("الملف غير موجود");

    const download = await prisma.downloadHistory.create({
      data: {
        attachmentId: data.attachmentId,
        studentId: student.id,
      },
    });

    logger.info("AUDIT", `تم تحميل الملف: ${attachment.name} بواسطة الطالب ${data.studentEmail}`, {
      attachmentId: data.attachmentId,
      studentId: student.id,
    });

    return serializeBigIntsAndDecimals(download);
  });

export const getLessonAttachmentsFn = createServerFn({ method: "GET" })
  .validator(z.object({ lessonId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const attachments = await prisma.lessonAttachment.findMany({
      where: { lessonId: data.lessonId },
      include: {
        _count: {
          select: { downloads: true },
        },
      },
      orderBy: { created_at: "desc" },
    });
    return serializeBigIntsAndDecimals(attachments);
  });

export const getTeacherAttachmentStatsFn = createServerFn({ method: "GET" })
  .validator(z.object({ email: z.string().email() }))
  .handler(async ({ data }) => {
    const teacher = await prisma.user.findFirst({
      where: { email: { equals: data.email, mode: "insensitive" }, deleted_at: null },
    });
    if (!teacher) throw new Error("المعلم غير موجود");

    const attachments = await prisma.lessonAttachment.findMany({
      where: { uploadedBy: teacher.id },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: true,
              },
            },
          },
        },
        _count: {
          select: { downloads: true },
        },
      },
      orderBy: { created_at: "desc" },
    });
    return serializeBigIntsAndDecimals(attachments);
  });

export const getSuperAdminAttachmentStatsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    await checkSuperAdminAuth();

    const attachments = await prisma.lessonAttachment.findMany({
      include: {
        uploader: {
          include: { profile: true },
        },
        lesson: {
          include: {
            module: {
              include: {
                course: true,
              },
            },
          },
        },
        _count: {
          select: { downloads: true },
        },
      },
      orderBy: { created_at: "desc" },
    });
    return serializeBigIntsAndDecimals(attachments);
  },
);

export const getStudentDownloadHistoryFn = createServerFn({ method: "GET" })
  .validator(z.object({ email: z.string().email() }))
  .handler(async ({ data }) => {
    const student = await prisma.user.findFirst({
      where: { email: { equals: data.email, mode: "insensitive" }, deleted_at: null },
    });
    if (!student) throw new Error("الطالب غير موجود");

    const history = await prisma.downloadHistory.findMany({
      where: { studentId: student.id },
      include: {
        attachment: {
          include: {
            lesson: {
              include: {
                module: {
                  include: {
                    course: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { downloadedAt: "desc" },
    });
    return serializeBigIntsAndDecimals(history);
  });

// ==========================================
// STUDENT LEADERBOARD & MEDALS
// ==========================================

export const getLeaderboardFn = createServerFn({ method: "GET" })
  .validator(z.object({ courseId: z.string().uuid() }))
  .handler(async ({ data }) => {
    let leaderboard = await prisma.leaderboard.findFirst({
      where: { courseId: data.courseId },
      include: {
        entries: {
          include: {
            student: {
              include: {
                profile: true,
                studentCode: true,
              },
            },
          },
          orderBy: { rank: "asc" },
        },
      },
    });

    if (!leaderboard) {
      // Create default leaderboard settings if missing
      const newLb = await prisma.leaderboard.create({
        data: {
          courseId: data.courseId,
          displayMode: "REAL_NAMES",
          isHidden: false,
        },
      });
      leaderboard = await prisma.leaderboard.findUnique({
        where: { id: newLb.id },
        include: {
          entries: {
            include: {
              student: {
                include: {
                  profile: true,
                  studentCode: true,
                },
              },
            },
            orderBy: { rank: "asc" },
          },
        },
      });
    }

    if (!leaderboard) throw new Error("فشل إعداد لوحة الصدارة");

    // Map display names based on displayMode setting
    const mappedEntries = leaderboard.entries.map((e) => {
      let displayName = e.student.profile?.name || e.student.email;
      if (leaderboard.displayMode === "ANONYMOUS") {
        displayName = "طالب مجهول";
      } else if (leaderboard.displayMode === "STUDENT_CODE") {
        displayName = e.student.studentCode?.code
          ? `طالب (#${e.student.studentCode.code})`
          : "طالب (بدون رمز)";
      }

      return {
        id: e.id,
        studentId: e.studentId,
        studentEmail: e.student.email,
        points: Number(e.points),
        rank: e.rank,
        medal: e.medal,
        examsPoints: Number(e.examsPoints),
        courseCompPoints: Number(e.courseCompPoints),
        assignmentsPoints: Number(e.assignmentsPoints),
        attendancePoints: Number(e.attendancePoints),
        studentName: displayName,
        studentAvatar: e.student.profile?.avatarUrl || null,
      };
    });

    return serializeBigIntsAndDecimals({
      id: leaderboard.id,
      courseId: leaderboard.courseId,
      displayMode: leaderboard.displayMode,
      isHidden: leaderboard.isHidden,
      entries: mappedEntries,
    });
  });

export const updateLeaderboardSettingsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      courseId: z.string().uuid(),
      displayMode: z.enum(["REAL_NAMES", "STUDENT_CODE", "ANONYMOUS"]),
      isHidden: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    let leaderboard = await prisma.leaderboard.findFirst({
      where: { courseId: data.courseId },
    });

    if (leaderboard) {
      leaderboard = await prisma.leaderboard.update({
        where: { id: leaderboard.id },
        data: {
          displayMode: data.displayMode,
          isHidden: data.isHidden,
        },
      });
    } else {
      leaderboard = await prisma.leaderboard.create({
        data: {
          courseId: data.courseId,
          displayMode: data.displayMode,
          isHidden: data.isHidden,
        },
      });
    }

    return serializeBigIntsAndDecimals(leaderboard);
  });

export const recalculateLeaderboardFn = createServerFn({ method: "POST" })
  .validator(z.object({ courseId: z.string().uuid() }))
  .handler(async ({ data }) => {
    let leaderboard = await prisma.leaderboard.findFirst({
      where: { courseId: data.courseId },
    });

    if (!leaderboard) {
      leaderboard = await prisma.leaderboard.create({
        data: {
          courseId: data.courseId,
          displayMode: "REAL_NAMES",
          isHidden: false,
        },
      });
    }

    // Get all enrolled students
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId: data.courseId, deleted_at: null },
    });

    // Get all exams in the course
    const exams = await prisma.exam.findMany({
      where: { courseId: data.courseId, deleted_at: null },
    });

    const calculatedEntries = [];

    for (const enrollment of enrollments) {
      const studentId = enrollment.studentId;
      const completionRate = Number(enrollment.completionRate) || 0;

      // 1. Exams points (40% weight): average pass score of student's highest attempts
      let examAverage = 0;
      if (exams.length > 0) {
        let totalExamScores = 0;
        let examCount = 0;
        for (const exam of exams) {
          const highestAttempt = await prisma.examAttempt.findFirst({
            where: { studentId, examId: exam.id, deleted_at: null },
            orderBy: { score: "desc" },
          });
          if (highestAttempt) {
            totalExamScores += Number(highestAttempt.score);
            examCount++;
          }
        }
        examAverage = examCount > 0 ? totalExamScores / examCount : 0;
      } else {
        examAverage = completionRate; // Fallback to completion rate if no exams
      }
      const examsPoints = examAverage * 0.4;

      // 2. Course Completion points (30% weight)
      const courseCompPoints = completionRate * 0.3;

      // 3. Assignments points (20% weight - proxy from completion rate)
      const assignmentsPoints = completionRate * 0.2;

      // 4. Attendance points (10% weight - proxy from completion rate)
      const attendancePoints = completionRate * 0.1;

      const totalPoints = examsPoints + courseCompPoints + assignmentsPoints + attendancePoints;

      calculatedEntries.push({
        studentId,
        examsPoints,
        courseCompPoints,
        assignmentsPoints,
        attendancePoints,
        points: totalPoints,
      });
    }

    // Sort by points descending
    calculatedEntries.sort((a, b) => b.points - a.points);

    // Save entries to DB
    await prisma.leaderboardEntry.deleteMany({
      where: { leaderboardId: leaderboard.id },
    });

    for (let i = 0; i < calculatedEntries.length; i++) {
      const entry = calculatedEntries[i];
      const rank = i + 1;
      let medal = null;
      if (rank === 1) medal = "GOLD";
      else if (rank === 2) medal = "SILVER";
      else if (rank === 3) medal = "BRONZE";

      await prisma.leaderboardEntry.create({
        data: {
          leaderboardId: leaderboard.id,
          studentId: entry.studentId,
          points: entry.points,
          rank,
          medal,
          examsPoints: entry.examsPoints,
          courseCompPoints: entry.courseCompPoints,
          assignmentsPoints: entry.assignmentsPoints,
          attendancePoints: entry.attendancePoints,
        },
      });
    }

    logger.info("AUDIT", `تم إعادة احتساب ترتيب لوحة الصدارة للدورة ${data.courseId}`, {
      courseId: data.courseId,
    });
    return { success: true };
  });

export const resetLeaderboardFn = createServerFn({ method: "POST" })
  .validator(z.object({ courseId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const leaderboard = await prisma.leaderboard.findFirst({
      where: { courseId: data.courseId },
    });
    if (!leaderboard) throw new Error("لوحة الصدارة غير موجودة");

    await prisma.leaderboardEntry.deleteMany({
      where: { leaderboardId: leaderboard.id },
    });

    logger.info("AUDIT", `تم تصفير لوحة الصدارة للدورة ${data.courseId}`, {
      courseId: data.courseId,
    });
    return { success: true };
  });

// ==========================================
// COURSE CODES & COUPONS (PHASE 7)
// ==========================================

export const generateTeacherCouponFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      courseId: z.string().uuid(),
      teacherEmail: z.string().email(),
      discountType: z.enum(["PERCENTAGE", "FIXED", "FREE"]),
      discountValue: z.number(),
      maxUses: z.number(),
      expiresAt: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const teacher = await prisma.user.findFirst({
      where: { email: { equals: data.teacherEmail, mode: "insensitive" }, deleted_at: null },
    });
    if (!teacher) throw new Error("المعلم غير موجود");

    const code = `ALT-${data.discountType.substring(0, 3)}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    const coupon = await prisma.couponCode.create({
      data: {
        code,
        courseId: data.courseId,
        teacherId: teacher.id,
        discountType: data.discountType,
        discountValue: data.discountValue,
        maxUses: data.maxUses,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        isActive: true,
      },
    });

    logger.info("AUDIT", `تم إنشاء كود كوبون جديد: ${code} لدورة ${data.courseId}`, {
      teacherEmail: data.teacherEmail,
      code,
    });

    const userId = await getAuthenticatedUserId();
    logger.audit(userId, "GENERATE_COUPON", {
      resourceType: "Coupon",
      resourceId: coupon.id,
      payload: {
        code,
        courseId: data.courseId,
        teacherId: teacher.id,
        discountType: data.discountType,
        discountValue: data.discountValue,
      },
    });

    return serializeBigIntsAndDecimals(coupon);
  });

export const generateTeacherEnrollmentCodeFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      courseId: z.string().uuid(),
      teacherEmail: z.string().email(),
      studentEmail: z.string().email().optional().nullable(),
      expiresAt: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const teacher = await prisma.user.findFirst({
      where: { email: { equals: data.teacherEmail, mode: "insensitive" }, deleted_at: null },
    });
    if (!teacher) throw new Error("المعلم غير موجود");

    const code = `ENR-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    const enrollmentCode = await prisma.enrollmentCode.create({
      data: {
        code,
        courseId: data.courseId,
        createdBy: teacher.id,
        email: data.studentEmail || null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        used: false,
        isActive: true,
      },
    });

    logger.info("AUDIT", `تم إنشاء كود التحاق جديد: ${code} لدورة ${data.courseId}`, {
      teacherEmail: data.teacherEmail,
      code,
    });

    const userId = await getAuthenticatedUserId();
    logger.audit(userId, "GENERATE_ENROLLMENT_CODE", {
      resourceType: "EnrollmentCode",
      resourceId: enrollmentCode.id,
      payload: {
        code,
        courseId: data.courseId,
        creatorId: teacher.id,
        studentEmail: data.studentEmail,
        expiresAt: data.expiresAt,
      },
    });

    return serializeBigIntsAndDecimals(enrollmentCode);
  });

export const getTeacherCodesFn = createServerFn({ method: "GET" })
  .validator(z.object({ email: z.string().email() }))
  .handler(async ({ data }) => {
    const teacher = await prisma.user.findFirst({
      where: { email: { equals: data.email, mode: "insensitive" }, deleted_at: null },
    });
    if (!teacher) throw new Error("المعلّم غير موجود");

    const coupons = await prisma.couponCode.findMany({
      where: { teacherId: teacher.id },
      include: {
        course: true,
      },
      orderBy: { created_at: "desc" },
    });

    const enrollmentCodes = await prisma.enrollmentCode.findMany({
      where: { createdBy: teacher.id },
      include: {
        course: true,
        user: { include: { profile: true } },
      },
      orderBy: { created_at: "desc" },
    });

    const courses = await prisma.course.findMany({
      where: {
        instructors: {
          some: {
            instructorId: teacher.id,
          },
        },
        deleted_at: null,
      },
    });

    return serializeBigIntsAndDecimals({ coupons, enrollmentCodes, courses });
  });

export const deactivateCouponFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const coupon = await prisma.couponCode.findUnique({ where: { id: data.id } });
    if (!coupon) throw new Error("الكوبون غير موجود");

    const updated = await prisma.couponCode.update({
      where: { id: data.id },
      data: { isActive: !coupon.isActive },
    });

    logger.info("AUDIT", `تم تغيير حالة تفعيل كوبون الخصم: ${coupon.code}`, { id: data.id });
    return serializeBigIntsAndDecimals(updated);
  });

export const deactivateEnrollmentCodeFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const code = await prisma.enrollmentCode.findUnique({ where: { id: data.id } });
    if (!code) throw new Error("كود الالتحاق غير موجود");

    const updated = await prisma.enrollmentCode.update({
      where: { id: data.id },
      data: { isActive: !code.isActive },
    });

    logger.info("AUDIT", `تم تغيير حالة تفعيل كود الالتحاق: ${code.code}`, { id: data.id });
    return serializeBigIntsAndDecimals(updated);
  });

export const expireEnrollmentCodeFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const code = await prisma.enrollmentCode.findUnique({ where: { id: data.id } });
    if (!code) throw new Error("كود الالتحاق غير موجود");

    const updated = await prisma.enrollmentCode.update({
      where: { id: data.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    logger.info("AUDIT", `تم إنهاء صلاحية كود الالتحاق: ${code.code}`, { id: data.id });
    return serializeBigIntsAndDecimals(updated);
  });

export const deleteEnrollmentCodeFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const code = await prisma.enrollmentCode.findUnique({ where: { id: data.id } });
    if (!code) throw new Error("كود الالتحاق غير موجود");

    await prisma.enrollmentCode.delete({ where: { id: data.id } });

    logger.info("AUDIT", `تم حذف كود الالتحاق: ${code.code}`, { id: data.id });
    return { success: true };
  });

export const getSuperAdminCodesFn = createServerFn({ method: "GET" }).handler(async () => {
  await checkSuperAdminAuth();

  const coupons = await prisma.couponCode.findMany({
    include: {
      course: true,
      teacher: { include: { profile: true } },
    },
    orderBy: { created_at: "desc" },
  });

  const enrollmentCodes = await prisma.enrollmentCode.findMany({
    include: {
      course: true,
      creator: { include: { profile: true } },
      user: { include: { profile: true } },
    },
    orderBy: { created_at: "desc" },
  });

  return serializeBigIntsAndDecimals({ coupons, enrollmentCodes });
});

export const redeemCouponOrEnrollmentCodeFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      studentEmail: z.string().email(),
      code: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const student = await prisma.user.findFirst({
      where: { email: { equals: data.studentEmail, mode: "insensitive" }, deleted_at: null },
    });
    if (!student) throw new Error("الطالب غير موجود");

    const cleanCode = data.code.trim();

    // 1. Search in CouponCode
    const coupon = await prisma.couponCode.findFirst({
      where: { code: cleanCode },
      include: { course: true },
    });

    if (coupon) {
      if (!coupon.isActive) throw new Error("كوبون الخصم غير نشط حالياً.");
      if (coupon.usedCount >= coupon.maxUses)
        throw new Error("تم استخدام كوبون الخصم لأقصى حد مسموح به.");
      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date())
        throw new Error("كوبون الخصم منتهي الصلاحية.");

      // Check if student already enrolled
      const existingEnroll = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: student.id, courseId: coupon.courseId } },
      });
      if (existingEnroll) throw new Error("أنت مشترك بالفعل في هذه الدورة.");

      if (coupon.discountType === "FREE") {
        // Enroll immediately
        await prisma.enrollment.create({
          data: {
            studentId: student.id,
            courseId: coupon.courseId,
          },
        });

        await prisma.couponCode.update({
          where: { id: coupon.id },
          data: { usedCount: coupon.usedCount + 1 },
        });

        // Record zero-amount revenue transaction (Requirement 3 & 6)
        await prisma.revenueTransaction.create({
          data: {
            teacherId: coupon.teacherId,
            courseId: coupon.courseId,
            studentId: student.id,
            amount: 0.0,
            teacherAmount: 0.0,
            platformAmount: 0.0,
            type: "COUPON",
          },
        });

        logger.info(
          "AUDIT",
          `تم استخدام كوبون مجاني: ${coupon.code} للالتحاق بدورة ${coupon.course.title} بواسطة الطالب ${data.studentEmail}`,
          {
            code: coupon.code,
            studentEmail: data.studentEmail,
          },
        );

        const auditUserId = await getAuthenticatedUserId();
        logger.audit(auditUserId || student.id, "REDEEM_COUPON", {
          resourceType: "Coupon",
          resourceId: coupon.id,
          payload: { code: coupon.code, email: data.studentEmail, courseId: coupon.courseId },
        });

        return serializeBigIntsAndDecimals({
          success: true,
          type: "FREE_COUPON",
          courseId: coupon.courseId,
          courseTitle: coupon.course.title,
        });
      } else {
        // Returns coupon details so client checkout can apply discount
        return serializeBigIntsAndDecimals({
          success: true,
          type: "DISCOUNT_COUPON",
          discountType: coupon.discountType,
          discountValue: Number(coupon.discountValue),
          courseId: coupon.courseId,
          courseTitle: coupon.course.title,
          couponId: coupon.id,
        });
      }
    }

    // 2. Search in EnrollmentCode
    const enrollmentCode = await prisma.enrollmentCode.findFirst({
      where: { code: cleanCode },
      include: { course: true },
    });

    if (enrollmentCode) {
      if (!enrollmentCode.isActive) throw new Error("كود الالتحاق هذا غير نشط حالياً.");
      if (enrollmentCode.used || enrollmentCode.usedBy)
        throw new Error("كود الالتحاق هذا قد تم استخدامه مسبقاً.");
      if (enrollmentCode.expiresAt && new Date(enrollmentCode.expiresAt) < new Date())
        throw new Error("لقد انتهت صلاحية كود الالتحاق هذا.");
      if (
        enrollmentCode.email &&
        enrollmentCode.email.toLowerCase() !== data.studentEmail.toLowerCase()
      )
        throw new Error("عذراً، كود الالتحاق هذا مخصص لحساب بريد إلكتروني آخر فقط.");

      // Check if student already enrolled
      const existingEnroll = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: student.id, courseId: enrollmentCode.courseId } },
      });
      if (existingEnroll) throw new Error("أنت مشترك بالفعل في هذه الدورة.");

      // Enroll student
      await prisma.enrollment.create({
        data: {
          studentId: student.id,
          courseId: enrollmentCode.courseId,
        },
      });

      // Update code status
      await prisma.enrollmentCode.update({
        where: { id: enrollmentCode.id },
        data: {
          usedBy: student.id,
          usedAt: new Date(),
          used: true,
        },
      });

      // Record transaction (Requirement 3)
      await prisma.revenueTransaction.create({
        data: {
          teacherId: enrollmentCode.createdBy,
          courseId: enrollmentCode.courseId,
          studentId: student.id,
          amount: 0.0,
          teacherAmount: 0.0,
          platformAmount: 0.0,
          type: "COUPON",
        },
      });

      logger.info(
        "AUDIT",
        `تم استخدام كود التحاق: ${enrollmentCode.code} للالتحاق بدورة ${enrollmentCode.course.title} بواسطة الطالب ${data.studentEmail}`,
        {
          code: enrollmentCode.code,
          studentEmail: data.studentEmail,
        },
      );

      const auditUserId = await getAuthenticatedUserId();
      logger.audit(auditUserId || student.id, "REDEEM_ENROLLMENT_CODE", {
        resourceType: "EnrollmentCode",
        resourceId: enrollmentCode.id,
        payload: {
          code: enrollmentCode.code,
          email: data.studentEmail,
          courseId: enrollmentCode.courseId,
        },
      });

      return serializeBigIntsAndDecimals({
        success: true,
        type: "ENROLLMENT_CODE",
        courseId: enrollmentCode.courseId,
        courseTitle: enrollmentCode.course.title,
      });
    }

    throw new Error("رمز غير صحيح أو غير مسجل بالمنصة.");
  });

// ==========================================
// TEACHER MANAGEMENT (PHASE 8)
// ==========================================

export const getAdminTeachersFn = createServerFn({ method: "GET" }).handler(async () => {
  await checkSuperAdminAuth();

  // Fetch all teachers
  const teachers = await prisma.user.findMany({
    where: { role: UserRole.TEACHER },
    include: {
      profile: true,
      featuredInstructor: true,
      courseInstructors: {
        include: {
          course: {
            include: {
              enrollments: true,
              revenueTransactions: true,
            },
          },
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  const teachersWithStats = teachers.map((teacher) => {
    let coursesCount = teacher.courseInstructors.length;
    let studentsCount = 0;
    let salesCount = 0;
    let totalRevenue = 0;

    const uniqueStudentIds = new Set<string>();
    teacher.courseInstructors.forEach((ci) => {
      ci.course.enrollments.forEach((en) => uniqueStudentIds.add(en.studentId));
      salesCount += ci.course.revenueTransactions.length;
      ci.course.revenueTransactions.forEach((tx) => {
        totalRevenue += Number(tx.amount);
      });
    });
    studentsCount = uniqueStudentIds.size;

    // Extract subject and status from biography
    let subject = "عام";
    let status = teacher.deleted_at ? "DELETED" : "ACTIVE";
    let phone = "";

    if (teacher.profile?.biography) {
      try {
        const bio = JSON.parse(teacher.profile.biography);
        if (bio.subject) subject = bio.subject;
        if (bio.status && !teacher.deleted_at) status = bio.status;
        if (bio.phone) phone = bio.phone;
      } catch {
        if (teacher.profile.biography.length > 3 && teacher.profile.biography.length < 25) {
          phone = teacher.profile.biography;
        }
      }
    }

    return {
      id: teacher.id,
      name: teacher.profile?.name || teacher.email.split("@")[0],
      email: teacher.email,
      phone,
      subject,
      status,
      createdAt: teacher.created_at.toISOString(),
      deletedAt: teacher.deleted_at ? teacher.deleted_at.toISOString() : null,
      coursesCount,
      studentsCount,
      revenue: totalRevenue,
      sales: salesCount,
      isFeatured: !!teacher.featuredInstructor && teacher.featuredInstructor.enabled,
      canCustomizeBranding: teacher.canCustomizeBranding,
    };
  });

  return serializeBigIntsAndDecimals(teachersWithStats);
});

export const createTeacherFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(2),
      email: z.string().email(),
      phone: z.string().min(5),
      subject: z.string(),
      password: z.string().min(6),
      canCustomizeBranding: z.boolean().optional().default(false),
    }),
  )
  .handler(async ({ data }) => {
    await checkSuperAdminAuth();

    // Check email uniqueness
    const existing = await prisma.user.findFirst({
      where: { email: { equals: data.email, mode: "insensitive" } },
    });
    if (existing) throw new Error("البريد الإلكتروني للمعلم مستخدم بالفعل.");

    const bcrypt = await import("bcryptjs");
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const biographyObj = {
      phone: data.phone,
      subject: data.subject,
      status: "ACTIVE",
    };

    const teacher = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash,
          role: UserRole.TEACHER,
          canCustomizeBranding: data.canCustomizeBranding ?? false,
        },
      });

      await tx.profile.create({
        data: {
          userId: user.id,
          name: data.name,
          biography: JSON.stringify(biographyObj),
        },
      });

      return user;
    });

    // Sync to local JSON store
    try {
      const store = dbService.readStore();
      if (!store.users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) {
        store.users.push({
          id: teacher.id,
          email: data.email.toLowerCase(),
          role: "TEACHER",
          passwordHash: passwordHash,
        });
        store.profiles.push({
          id: "p-" + teacher.id,
          userId: teacher.id,
          name: data.name,
          biography: JSON.stringify(biographyObj),
        });
        dbService.writeStore(store);
      }
    } catch (err) {
      console.warn("Failed to write new teacher to local JSON store:", err);
    }

    logger.info("AUDIT", `تم إنشاء حساب معلم جديد: ${data.name} (${data.email})`, {
      email: data.email,
    });

    const adminId = await getAuthenticatedUserId();
    logger.audit(adminId, "CREATE_TEACHER", {
      resourceType: "Teacher",
      resourceId: teacher.id,
      payload: { name: data.name, email: data.email.toLowerCase(), subject: data.subject },
    });

    return { success: true };
  });

export const updateTeacherFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      name: z.string().min(2),
      email: z.string().email(),
      phone: z.string().min(5),
      subject: z.string(),
      status: z.enum(["ACTIVE", "SUSPENDED"]),
      canCustomizeBranding: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkSuperAdminAuth();

    const teacher = await prisma.user.findUnique({
      where: { id: data.id },
      include: { profile: true },
    });
    if (!teacher) throw new Error("المعلم غير موجود.");

    // Check duplicate email
    if (teacher.email.toLowerCase() !== data.email.toLowerCase()) {
      const duplicate = await prisma.user.findFirst({
        where: { email: { equals: data.email, mode: "insensitive" } },
      });
      if (duplicate) throw new Error("البريد الإلكتروني مستخدم بالفعل.");
    }

    let biographyObj: any = {};
    if (teacher.profile?.biography) {
      try {
        biographyObj = JSON.parse(teacher.profile.biography);
      } catch {}
    }
    biographyObj.phone = data.phone;
    biographyObj.subject = data.subject;
    biographyObj.status = data.status;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: data.id },
        data: {
          email: data.email.toLowerCase(),
          canCustomizeBranding:
            data.canCustomizeBranding !== undefined ? data.canCustomizeBranding : undefined,
        },
      });

      await tx.profile.update({
        where: { userId: data.id },
        data: {
          name: data.name,
          biography: JSON.stringify(biographyObj),
        },
      });
    });

    // Sync to local JSON store
    try {
      const store = dbService.readStore();
      const userIdx = store.users.findIndex((u) => u.id === data.id);
      if (userIdx !== -1) {
        store.users[userIdx].email = data.email.toLowerCase();
      }
      const profileIdx = store.profiles.findIndex((p) => p.userId === data.id);
      if (profileIdx !== -1) {
        store.profiles[profileIdx].name = data.name;
        store.profiles[profileIdx].biography = JSON.stringify(biographyObj);
      }
      dbService.writeStore(store);
    } catch (err) {
      console.warn("Failed to update teacher in local JSON store:", err);
    }

    logger.info("AUDIT", `تم تعديل بيانات المعلم: ${data.name} (${data.email})`, { id: data.id });
    return { success: true };
  });

export const suspendTeacherFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      status: z.enum(["ACTIVE", "SUSPENDED"]),
    }),
  )
  .handler(async ({ data }) => {
    await checkPermissionAuth("TEACHER_MANAGEMENT");

    const teacher = await prisma.user.findUnique({
      where: { id: data.id },
      include: { profile: true },
    });
    if (!teacher) throw new Error("المعلم غير موجود.");

    let biographyObj: any = {};
    if (teacher.profile?.biography) {
      try {
        biographyObj = JSON.parse(teacher.profile.biography);
      } catch {}
    }
    biographyObj.status = data.status;

    await prisma.profile.update({
      where: { userId: data.id },
      data: { biography: JSON.stringify(biographyObj) },
    });

    // Sync to local JSON store
    try {
      const store = dbService.readStore();
      const profileIdx = store.profiles.findIndex((p) => p.userId === data.id);
      if (profileIdx !== -1) {
        const bioObj = store.profiles[profileIdx].biography
          ? JSON.parse(store.profiles[profileIdx].biography)
          : {};
        bioObj.status = data.status;
        store.profiles[profileIdx].biography = JSON.stringify(bioObj);
        dbService.writeStore(store);
      }
    } catch (err) {
      console.warn("Failed to suspend teacher in local JSON store:", err);
    }

    logger.info("AUDIT", `تم تغيير حالة المعلم ${teacher.email} إلى ${data.status}`, {
      id: data.id,
    });

    const adminId = await getAuthenticatedUserId();
    logger.audit(adminId, data.status === "SUSPENDED" ? "SUSPEND_TEACHER" : "REACTIVATE_TEACHER", {
      resourceType: "Teacher",
      resourceId: data.id,
      payload: { email: teacher.email, status: data.status },
    });

    return { success: true };
  });

export const deleteTeacherFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkSuperAdminAuth();

    const teacher = await prisma.user.findUnique({
      where: { id: data.id },
      include: { courseInstructors: true },
    });
    if (!teacher) throw new Error("المعلم غير موجود.");

    if (teacher.courseInstructors.length > 0) {
      throw new Error("لا يمكن حذف هذا المعلم لأنه يمتلك دورات تعليمية على المنصة.");
    }

    await prisma.user.update({
      where: { id: data.id },
      data: { deleted_at: new Date() },
    });

    // Sync to local JSON store (soft delete)
    try {
      const store = dbService.readStore();
      const userIdx = store.users.findIndex((u) => u.id === data.id);
      if (userIdx !== -1) {
        store.users[userIdx].deleted_at = new Date().toISOString();
      }
      const profileIdx = store.profiles.findIndex((p) => p.userId === data.id);
      if (profileIdx !== -1) {
        const bioObj = store.profiles[profileIdx].biography
          ? JSON.parse(store.profiles[profileIdx].biography)
          : {};
        bioObj.status = "DELETED";
        store.profiles[profileIdx].biography = JSON.stringify(bioObj);
      }
      dbService.writeStore(store);
    } catch (err) {
      console.warn("Failed to delete teacher in local JSON store:", err);
    }

    logger.info("AUDIT", `تم حذف المعلم (حذف مؤقت): ${teacher.email}`, { id: data.id });

    const adminId = await getAuthenticatedUserId();
    logger.audit(adminId, "DELETE_TEACHER", {
      resourceType: "Teacher",
      resourceId: data.id,
      payload: { email: teacher.email },
    });

    return { success: true };
  });

export const reactivateTeacherFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkPermissionAuth("TEACHER_MANAGEMENT");

    const teacher = await prisma.user.findUnique({
      where: { id: data.id },
      include: { profile: true },
    });
    if (!teacher) throw new Error("المعلم غير موجود.");

    let biographyObj: any = {};
    if (teacher.profile?.biography) {
      try {
        biographyObj = JSON.parse(teacher.profile.biography);
      } catch {}
    }
    biographyObj.status = "ACTIVE";

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: data.id },
        data: { deleted_at: null },
      });

      await tx.profile.update({
        where: { userId: data.id },
        data: { biography: JSON.stringify(biographyObj) },
      });
    });

    // Sync to local JSON store
    try {
      const store = dbService.readStore();
      const userIdx = store.users.findIndex((u) => u.id === data.id);
      if (userIdx !== -1) {
        delete store.users[userIdx].deleted_at;
      }
      const profileIdx = store.profiles.findIndex((p) => p.userId === data.id);
      if (profileIdx !== -1) {
        const bioObj = store.profiles[profileIdx].biography
          ? JSON.parse(store.profiles[profileIdx].biography)
          : {};
        bioObj.status = "ACTIVE";
        store.profiles[profileIdx].biography = JSON.stringify(bioObj);
      }
      dbService.writeStore(store);
    } catch (err) {
      console.warn("Failed to reactivate teacher in local JSON store:", err);
    }

    logger.info("AUDIT", `تم إعادة تنشيط المعلم: ${teacher.email}`, { id: data.id });

    const adminId = await getAuthenticatedUserId();
    logger.audit(adminId, "REACTIVATE_TEACHER", {
      resourceType: "Teacher",
      resourceId: data.id,
      payload: { email: teacher.email },
    });

    return { success: true };
  });

export const getTeacherStudentsFn = createServerFn({ method: "GET" })
  .validator(z.object({ teacherEmail: z.string().email() }))
  .handler(async ({ data }) => {
    const teacher = await prisma.user.findFirst({
      where: { email: { equals: data.teacherEmail, mode: "insensitive" }, deleted_at: null },
    });
    if (!teacher) throw new Error("المعلم غير موجود");

    // Find all courses taught by this teacher
    const taughtCourses = await prisma.courseInstructor.findMany({
      where: { instructorId: teacher.id },
    });
    const courseIds = taughtCourses.map((tc) => tc.courseId);

    // Get all enrollments for these courses
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId: { in: courseIds } },
      include: {
        course: true,
        student: {
          include: {
            profile: true,
            attempts: {
              where: { exam: { courseId: { in: courseIds } } },
            },
          },
        },
      },
    });

    const students = enrollments.map((en) => {
      let phone = "";
      let grade = "عام";
      if (en.student.profile?.biography) {
        try {
          const bio = JSON.parse(en.student.profile.biography);
          if (bio.phone) phone = bio.phone;
          if (bio.grade) grade = bio.grade;
        } catch {}
      }

      let examAverage = 0;
      if (en.student.attempts.length > 0) {
        const total = en.student.attempts.reduce((sum, att) => sum + (Number(att.score) || 0), 0);
        examAverage = Math.round(total / en.student.attempts.length);
      }

      return {
        id: en.student.id,
        name: en.student.profile?.name || en.student.email.split("@")[0],
        email: en.student.email,
        phone,
        grade,
        courseTitle: en.course.title,
        completionRate: Number(en.completionRate) || 0,
        examScore: examAverage > 0 ? `${examAverage}%` : "لا يوجد",
        joinDate: en.created_at.toISOString().split("T")[0],
      };
    });

    return serializeBigIntsAndDecimals(students);
  });

// ==========================================
// EXCEL EXAM IMPORT / EXPORT (PHASE 4 - 8 EXTENSIONS)
// ==========================================

export const downloadExamTemplateFn = createServerFn({ method: "GET" }).handler(async () => {
  const wb = XLSX.utils.book_new();
  const wsData = [
    [
      "Question",
      "Type",
      "Choice A",
      "Choice B",
      "Choice C",
      "Choice D",
      "Correct Answer",
      "Difficulty",
      "Explanation",
    ],
    [
      "ما هو ناتج جمع 5 + 5؟",
      "multiple_choice",
      "8",
      "9",
      "10",
      "11",
      "C",
      "EASY",
      "الجمع المباشر يعطي 10",
    ],
    [
      "الأرض كوكب كروي الشكل.",
      "true_false",
      "صح",
      "خطأ",
      "",
      "",
      "A",
      "VERY_EASY",
      "الأرض كوكب كروي",
    ],
    [
      "اكتب نبذة مختصرة عن الثورة الصناعية.",
      "essay",
      "",
      "",
      "",
      "",
      "",
      "MEDIUM",
      "الإجابة تحتاج مراجعة يدوية من المعلم",
    ],
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, "Exam Template");
  const wbout = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return { fileBase64: wbout.toString("base64") };
});

export const exportExamToExcelFn = createServerFn({ method: "POST" })
  .validator(z.object({ examId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const exam = await prisma.exam.findUnique({
      where: { id: data.examId },
      include: {
        questions: {
          include: { choices: true },
        },
      },
    });
    if (!exam) throw new Error("الاختبار غير موجود.");

    const wb = XLSX.utils.book_new();
    const wsData = [
      [
        "Question",
        "Type",
        "Choice A",
        "Choice B",
        "Choice C",
        "Choice D",
        "Correct Answer",
        "Difficulty",
        "Explanation",
      ],
    ];

    for (const q of exam.questions) {
      let typeStr = "multiple_choice";
      if (q.type === "ESSAY") {
        typeStr = "essay";
      } else {
        const isTF =
          q.choices.length === 2 &&
          q.choices.some((c) => c.choiceText === "صح") &&
          q.choices.some((c) => c.choiceText === "خطأ");
        if (isTF) typeStr = "true_false";
      }

      let choiceA = q.choices[0]?.choiceText || "";
      let choiceB = q.choices[1]?.choiceText || "";
      let choiceC = q.choices[2]?.choiceText || "";
      let choiceD = q.choices[3]?.choiceText || "";

      let correctStr = "";
      if (q.type === "MULTIPLE_CHOICE") {
        const correctIdx = q.choices.findIndex((c) => c.isCorrect);
        correctStr =
          correctIdx === 0
            ? "A"
            : correctIdx === 1
              ? "B"
              : correctIdx === 2
                ? "C"
                : correctIdx === 3
                  ? "D"
                  : "";
      }

      wsData.push([
        q.questionText || q.text || "",
        typeStr,
        choiceA,
        choiceB,
        choiceC,
        choiceD,
        correctStr,
        q.difficulty || "MEDIUM",
        q.explanation || "",
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Exam Questions");
    const wbout = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return { fileBase64: wbout.toString("base64") };
  });

export const importExamFromExcelFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      examId: z.string().uuid(),
      fileBase64: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    await checkTeacherOrAdminAuth();
    const exam = await prisma.exam.findUnique({
      where: { id: data.examId },
    });
    if (!exam) throw new Error("الاختبار غير موجود.");

    const buffer = Buffer.from(data.fileBase64, "base64");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet) as any[];

    let importedCount = 0;
    const errors: { row: number; question: string; reason: string }[] = [];

    const maxOrder = await prisma.question.aggregate({
      where: { examId: data.examId },
      _max: { order: true },
    });
    let nextOrder = (maxOrder._max.order || 0) + 1;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const qText = row["Question"] || row["السؤال"];
      let qTypeRaw = row["Type"] || row["النوع"];
      const choiceA = row["Choice A"] || row["الخيار أ"];
      const choiceB = row["Choice B"] || row["الخيار ب"];
      const choiceC = row["Choice C"] || row["الخيار ج"];
      const choiceD = row["Choice D"] || row["الخيار د"];
      const correctAns = row["Correct Answer"] || row["الإجابة الصحيحة"];
      let difficultyRaw = row["Difficulty"] || row["الصعوبة"];
      const explanation = row["Explanation"] || row["الشرح"] || "";

      if (!qText) {
        errors.push({ row: rowNum, question: "", reason: "نص السؤال مفقود أو فارغ." });
        continue;
      }
      if (!qTypeRaw) {
        errors.push({ row: rowNum, question: qText.toString(), reason: "نوع السؤال مفقود." });
        continue;
      }

      const qTypeLower = qTypeRaw.toString().trim().toLowerCase();
      let type: "MULTIPLE_CHOICE" | "ESSAY" = "MULTIPLE_CHOICE";

      if (qTypeLower === "essay" || qTypeLower === "مقال") {
        type = "ESSAY";
      } else if (
        qTypeLower === "multiple_choice" ||
        qTypeLower === "true_false" ||
        qTypeLower === "اختيار_من_متعدد" ||
        qTypeLower === "صح_خطأ"
      ) {
        type = "MULTIPLE_CHOICE";
      } else {
        errors.push({
          row: rowNum,
          question: qText.toString(),
          reason: `نوع السؤال غير صالح: ${qTypeRaw}`,
        });
        continue;
      }

      let difficulty: "MEDIUM" | "VERY_EASY" | "EASY" | "HARD" | "VERY_HARD" = "MEDIUM";
      if (difficultyRaw) {
        const diffLower = difficultyRaw.toString().trim().toUpperCase();
        if (diffLower === "VERY_EASY" || diffLower === "سهل جداً") difficulty = "VERY_EASY";
        else if (diffLower === "EASY" || diffLower === "سهل") difficulty = "EASY";
        else if (diffLower === "MEDIUM" || diffLower === "متوسط") difficulty = "MEDIUM";
        else if (diffLower === "HARD" || diffLower === "صعب") difficulty = "HARD";
        else if (diffLower === "VERY_HARD" || diffLower === "صعب جداً") difficulty = "VERY_HARD";
      }

      let choicesList: { text: string; isCorrect: boolean }[] = [];
      if (type === "MULTIPLE_CHOICE") {
        if (qTypeLower === "true_false" || qTypeLower === "صح_خطأ") {
          const ansStr = correctAns ? correctAns.toString().trim().toUpperCase() : "";
          const isACorrect = ansStr === "A" || ansStr === "صح" || ansStr === "TRUE";
          const isBCorrect = ansStr === "B" || ansStr === "خطأ" || ansStr === "FALSE";

          if (!isACorrect && !isBCorrect) {
            errors.push({
              row: rowNum,
              question: qText.toString(),
              reason: "الإجابة الصحيحة لسؤال صح/خطأ يجب أن تكون A (صح) أو B (خطأ).",
            });
            continue;
          }

          choicesList = [
            { text: "صح", isCorrect: isACorrect },
            { text: "خطأ", isCorrect: isBCorrect },
          ];
        } else {
          if (!choiceA || !choiceB) {
            errors.push({
              row: rowNum,
              question: qText.toString(),
              reason: "الخيارات A و B مطلوبة لأسئلة الاختيار من متعدد.",
            });
            continue;
          }
          if (!correctAns) {
            errors.push({
              row: rowNum,
              question: qText.toString(),
              reason: "الإجابة الصحيحة مفقودة.",
            });
            continue;
          }

          const ansStr = correctAns.toString().trim().toUpperCase();
          const isACorrect = ansStr === "A";
          const isBCorrect = ansStr === "B";
          const isCCorrect = ansStr === "C";
          const isDCorrect = ansStr === "D";

          if (!isACorrect && !isBCorrect && !isCCorrect && !isDCorrect) {
            errors.push({
              row: rowNum,
              question: qText.toString(),
              reason: "الإجابة الصحيحة يجب أن تكون A أو B أو C أو D.",
            });
            continue;
          }

          choicesList = [
            { text: choiceA.toString(), isCorrect: isACorrect },
            { text: choiceB.toString(), isCorrect: isBCorrect },
          ];
          if (choiceC) choicesList.push({ text: choiceC.toString(), isCorrect: isCCorrect });
          if (choiceD) choicesList.push({ text: choiceD.toString(), isCorrect: isDCorrect });
        }
      }

      await prisma.$transaction(async (tx) => {
        const question = await tx.question.create({
          data: {
            examId: data.examId,
            text: qText.toString(),
            questionText: qText.toString(),
            type,
            difficulty,
            explanation: explanation.toString(),
            mark: 1.0,
            order: nextOrder++,
          },
        });

        if (choicesList.length > 0) {
          await tx.choice.createMany({
            data: choicesList.map((c) => ({
              questionId: question.id,
              text: c.text,
              choiceText: c.text,
              isCorrect: c.isCorrect,
            })),
          });
        }
      });

      importedCount++;
    }

    logger.info("AUDIT", `تم استيراد ${importedCount} سؤال للاختبار ${exam.title} من ملف Excel`, {
      examId: data.examId,
    });
    return serializeBigIntsAndDecimals({ success: true, importedCount, errors });
  });

// ==========================================
// LESSON EXAM LINKING
// ==========================================

export const linkExamToLessonFn = createServerFn({ method: "POST" })
  .validator(z.object({ examId: z.string().uuid(), lessonId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkTeacherOrAdminAuth();
    const updated = await prisma.exam.update({
      where: { id: data.examId },
      data: {
        lessonId: data.lessonId,
        published: true,
        isPublished: true,
      },
    });
    return serializeBigIntsAndDecimals(updated);
  });

export const unlinkExamFromLessonFn = createServerFn({ method: "POST" })
  .validator(z.object({ examId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkTeacherOrAdminAuth();
    const updated = await prisma.exam.update({
      where: { id: data.examId },
      data: {
        lessonId: null,
        published: false,
        isPublished: false,
      },
    });
    return serializeBigIntsAndDecimals(updated);
  });

// ==========================================
// COURSE SYLLABUS REORDERING
// ==========================================

export const reorderModulesFn = createServerFn({ method: "POST" })
  .validator(
    z.object({ courseId: z.string().uuid(), orderedModuleIds: z.array(z.string().uuid()) }),
  )
  .handler(async ({ data }) => {
    await checkTeacherOrAdminAuth();
    await prisma.$transaction(
      data.orderedModuleIds.map((id, index) =>
        prisma.module.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
    return { success: true };
  });

export const reorderLessonsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({ moduleId: z.string().uuid(), orderedLessonIds: z.array(z.string().uuid()) }),
  )
  .handler(async ({ data }) => {
    await checkTeacherOrAdminAuth();
    await prisma.$transaction(
      data.orderedLessonIds.map((id, index) =>
        prisma.lesson.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
    return { success: true };
  });

// ==========================================
// ADVANCED COURSE & LESSON SETTINGS (LOCKS & PREREQUISITES)
// ==========================================

export const getCourseSettingsFn = createServerFn({ method: "GET" })
  .validator(z.object({ courseId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const key = `course_settings_${data.courseId}`;
    const setting = await prisma.siteSetting.findUnique({ where: { key } });
    if (setting) {
      try {
        return JSON.parse(setting.value);
      } catch {}
    }
    return {
      sequentialMode: "OFF",
      selectedStudents: [],
      requirePassingExam: false,
    };
  });

export const updateCourseSettingsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      courseId: z.string().uuid(),
      settings: z.object({
        sequentialMode: z.enum(["OFF", "FOR_SELECTED_STUDENTS", "FOR_ALL"]),
        selectedStudents: z.array(z.string()),
        requirePassingExam: z.boolean(),
      }),
    }),
  )
  .handler(async ({ data }) => {
    await checkTeacherOrAdminAuth();
    const key = `course_settings_${data.courseId}`;
    const value = JSON.stringify(data.settings);
    await prisma.siteSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    return { success: true };
  });

export const getLessonSettingsFn = createServerFn({ method: "GET" })
  .validator(z.object({ lessonId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const key = `lesson_settings_${data.lessonId}`;
    const setting = await prisma.siteSetting.findUnique({ where: { key } });
    if (setting) {
      try {
        const parsed = JSON.parse(setting.value);
        return {
          mustFinishExamBeforeVideo: parsed.mustFinishExamBeforeVideo || false,
          pdfUrl: parsed.pdfUrl || "",
          homework: parsed.homework || "",
          notes: parsed.notes || "",
          summary: parsed.summary || "",
        };
      } catch {}
    }
    return {
      mustFinishExamBeforeVideo: false,
      pdfUrl: "",
      homework: "",
      notes: "",
      summary: "",
    };
  });

export const updateLessonSettingsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      lessonId: z.string().uuid(),
      settings: z.object({
        mustFinishExamBeforeVideo: z.boolean(),
        pdfUrl: z.string().optional().nullable(),
        homework: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
        summary: z.string().optional().nullable(),
      }),
    }),
  )
  .handler(async ({ data }) => {
    await checkTeacherOrAdminAuth();
    const key = `lesson_settings_${data.lessonId}`;
    const value = JSON.stringify(data.settings);
    await prisma.siteSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    return { success: true };
  });

// ==========================================
// PAYMENT CODE SYSTEM (ACCESS CODES)
// ==========================================

export const createPaymentCodeFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      courseId: z.string().uuid(),
      studentEmail: z.string().email().optional().nullable(),
      maxUsage: z.number().default(1),
      expiresAt: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    await checkSuperAdminAuth();

    const code = `PAY-${crypto.randomBytes(3).toString("hex").toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    let studentId = null;
    if (data.studentEmail) {
      const student = await prisma.user.findFirst({
        where: { email: { equals: data.studentEmail, mode: "insensitive" }, deleted_at: null },
      });
      if (student) studentId = student.id;
    }

    const sessionId = getActiveSessionId();
    const store = dbService.readStore();
    const sessionObj = sessionId
      ? store.user_sessions.find((s) => s.session_id === sessionId)
      : null;
    let creatorId = sessionObj ? sessionObj.user_id : null;

    if (!creatorId) {
      const firstAdmin = await prisma.user.findFirst({
        where: { role: { in: [UserRole.SUPER_ADMIN, UserRole.ADMIN] } },
      });
      creatorId = firstAdmin ? firstAdmin.id : null;
    }
    if (!creatorId) throw new Error("لم يتم العثور على مستخدم مشرف معتمد لتسجيل منشئ الكود.");

    const accessCode = await prisma.studentAccessCode.create({
      data: {
        code,
        courseId: data.courseId,
        studentId,
        createdBy: creatorId,
        maxUsage: data.maxUsage,
        currentUsage: 0,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        disabled: false,
      },
    });

    logger.info("AUDIT", `تم إنشاء كود دفع جديد: ${code} لدورة ${data.courseId}`, { code });
    return serializeBigIntsAndDecimals(accessCode);
  });

export const updateModuleFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      title: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    await checkTeacherOrAdminAuth();
    const mod = await prisma.module.update({
      where: { id: data.id },
      data: { title: data.title },
    });
    return serializeBigIntsAndDecimals(mod);
  });

export const deleteModuleFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkTeacherOrAdminAuth();
    const mod = await prisma.module.update({
      where: { id: data.id },
      data: { deleted_at: new Date() },
    });
    return serializeBigIntsAndDecimals(mod);
  });

export const updateLessonFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      title: z.string().optional(),
      isPreview: z.boolean().optional(),
      videoUrl: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    await checkTeacherOrAdminAuth();
    const updated = await prisma.$transaction(async (tx) => {
      const lesson = await tx.lesson.update({
        where: { id: data.id },
        data: {
          title: data.title,
          isPreview: data.isPreview,
        },
      });

      if (data.videoUrl !== undefined) {
        if (data.videoUrl) {
          await tx.videoMetadata.upsert({
            where: { lessonId: data.id },
            create: {
              lessonId: data.id,
              videoUrl: data.videoUrl,
              duration: 0,
              size: 0,
            },
            update: {
              videoUrl: data.videoUrl,
            },
          });
        } else {
          await tx.videoMetadata.deleteMany({
            where: { lessonId: data.id },
          });
        }
      }

      return lesson;
    });

    return serializeBigIntsAndDecimals(updated);
  });

export const deleteLessonFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkTeacherOrAdminAuth();
    const lesson = await prisma.lesson.update({
      where: { id: data.id },
      data: { deleted_at: new Date() },
    });
    return serializeBigIntsAndDecimals(lesson);
  });

export const getTeacherProfileFn = createServerFn({ method: "GET" })
  .validator(z.object({ teacherId: z.string() }))
  .handler(async ({ data }) => {
    // teacherId can be UUID, email, or profile name slug
    let teacher = await prisma.user.findFirst({
      where: {
        OR: [
          {
            id: data.teacherId.match(
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
            )
              ? data.teacherId
              : undefined,
          },
          { email: { equals: data.teacherId, mode: "insensitive" } },
        ].filter(Boolean) as any,
        role: UserRole.TEACHER,
        deleted_at: null,
      },
      include: {
        profile: true,
        featuredInstructor: true,
        instructorBranding: true,
        courseInstructors: {
          include: {
            course: {
              include: {
                category: true,
                reviews: {
                  include: {
                    student: { include: { profile: true } },
                  },
                },
                enrollments: true,
                watchTimeStats: true,
              },
            },
          },
        },
      },
    });

    if (!teacher) {
      teacher = await prisma.user.findFirst({
        where: {
          role: UserRole.TEACHER,
          profile: {
            name: { equals: data.teacherId.replace(/-/g, " "), mode: "insensitive" },
          },
          deleted_at: null,
        },
        include: {
          profile: true,
          featuredInstructor: true,
          instructorBranding: true,
          courseInstructors: {
            include: {
              course: {
                include: {
                  category: true,
                  reviews: {
                    include: {
                      student: { include: { profile: true } },
                    },
                  },
                  enrollments: true,
                  watchTimeStats: true,
                },
              },
            },
          },
        },
      });
    }

    if (!teacher) {
      throw new Error("المعلم غير موجود.");
    }

    const coursesCount = teacher.courseInstructors.length;
    let studentsCount = 0;
    let totalViews = 0;
    let ratingsSum = 0;
    let ratingsCount = 0;
    const reviews: any[] = [];
    const courses: any[] = [];

    const uniqueStudentIds = new Set<string>();

    for (const ci of teacher.courseInstructors) {
      const c = ci.course;

      const lessonsCount = await prisma.lesson.count({
        where: { module: { courseId: c.id }, deleted_at: null },
      });

      courses.push({
        id: c.id,
        title: c.title,
        price: c.price.toString(),
        coverImage: c.coverImage,
        category: c.category?.name || "عام",
        rating:
          c.reviews.length > 0
            ? c.reviews.reduce((sum, r) => sum + r.rating, 0) / c.reviews.length
            : 5.0,
        lessonsCount,
      });

      c.enrollments.forEach((en) => uniqueStudentIds.add(en.studentId));
      totalViews += c.watchTimeStats.reduce((sum, stat) => sum + stat.watchTime, 0);

      c.reviews.forEach((r) => {
        ratingsSum += r.rating;
        ratingsCount++;
        reviews.push({
          id: r.id,
          studentName: r.student.profile?.name || r.student.email.split("@")[0],
          studentAvatar:
            r.student.profile?.avatarUrl ||
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
          rating: r.rating,
          comment: r.comment,
          createdAt: r.created_at.toISOString().split("T")[0],
        });
      });
    }

    studentsCount = uniqueStudentIds.size;
    const avgRating = ratingsCount > 0 ? Number((ratingsSum / ratingsCount).toFixed(1)) : 5.0;

    let bioData: any = {};
    if (teacher.profile?.biography) {
      try {
        bioData = JSON.parse(teacher.profile.biography);
      } catch {}
    }

    return serializeBigIntsAndDecimals({
      teacher: {
        id: teacher.id,
        name: teacher.profile?.name || teacher.email.split("@")[0],
        avatarUrl:
          teacher.profile?.avatarUrl ||
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
        email: teacher.email,
        canCustomizeBranding: teacher.canCustomizeBranding,
        bio: bioData.bio || teacher.profile?.biography || "",
        experience: bioData.experience || [],
        certifications: bioData.certifications || "",
        coverImage:
          bioData.coverImage ||
          "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=800",
        showSocialLinks: bioData.showSocialLinks !== false,
        phoneNumber: bioData.phoneNumber || "",
        whatsappUrl: bioData.whatsappUrl || "",
        publicEmail: bioData.publicEmail || "",
        facebookUrl: bioData.facebookUrl || "",
        telegramUrl: bioData.telegramUrl || "",
        instagramUrl: bioData.instagramUrl || "",
        youtubeUrl: bioData.youtubeUrl || "",
        linkedinUrl: bioData.linkedinUrl || "",
        websiteUrl: bioData.websiteUrl || "",
        isFeatured: !!teacher.featuredInstructor && teacher.featuredInstructor.enabled,
        featuredBadgeLabel: teacher.featuredInstructor?.badgeLabel || "مدرس مميز ⭐",
      },
      branding: teacher.instructorBranding
        ? {
            brandName: teacher.instructorBranding.brandName,
            logoUrl: teacher.instructorBranding.logoUrl,
            primaryColor: teacher.instructorBranding.primaryColor,
            showLogoOnPdf: teacher.instructorBranding.showLogoOnPdf,
            showLogoOnVideos: teacher.instructorBranding.showLogoOnVideos,
            showLogoOnExams: teacher.instructorBranding.showLogoOnExams,
            showLogoOnCertificates: teacher.instructorBranding.showLogoOnCertificates,
            showLogoOnNotes: teacher.instructorBranding.showLogoOnNotes,
          }
        : null,
      stats: {
        coursesCount,
        studentsCount,
        totalViews,
        avgRating,
      },
      courses,
      reviews,
    });
  });

export const updateTeacherProfileFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().email(),
      name: z.string().optional(),
      avatarUrl: z.string().optional(),
      biographyData: z.object({
        bio: z.string().optional(),
        experience: z
          .array(
            z.object({
              id: z.string(),
              role: z.string(),
              organization: z.string(),
              duration: z.string(),
            }),
          )
          .optional(),
        certifications: z.string().optional(),
        coverImage: z.string().optional(),
        showSocialLinks: z.boolean().optional(),
        phoneNumber: z.string().optional(),
        whatsappUrl: z.string().optional(),
        publicEmail: z.string().optional(),
        facebookUrl: z.string().optional(),
        telegramUrl: z.string().optional(),
        instagramUrl: z.string().optional(),
        youtubeUrl: z.string().optional(),
        linkedinUrl: z.string().optional(),
        websiteUrl: z.string().optional(),
      }),
    }),
  )
  .handler(async ({ data }) => {
    const caller = checkSessionUser(data.email);

    const profile = await prisma.profile.findUnique({
      where: { userId: caller.id },
    });

    let currentBioObj: any = {};
    if (profile?.biography) {
      try {
        currentBioObj = JSON.parse(profile.biography);
      } catch {}
    }

    const mergedBioObj = {
      ...currentBioObj,
      ...data.biographyData,
    };

    const updatedProfile = await prisma.profile.update({
      where: { userId: caller.id },
      data: {
        name: data.name || undefined,
        avatarUrl: data.avatarUrl || undefined,
        biography: JSON.stringify(mergedBioObj),
      },
    });

    return serializeBigIntsAndDecimals(updatedProfile);
  });

export const getInstructorBrandingFn = createServerFn({ method: "GET" })
  .validator(z.object({ instructorId: z.string() }))
  .handler(async ({ data }) => {
    const branding = await prisma.instructorBranding.findUnique({
      where: { instructorId: data.instructorId },
    });
    return serializeBigIntsAndDecimals(branding);
  });

export const updateInstructorBrandingFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().email(),
      brandName: z.string().nullable().optional(),
      logoUrl: z.string().nullable().optional(),
      primaryColor: z.string().nullable().optional(),
      showLogoOnPdf: z.boolean().optional(),
      showLogoOnVideos: z.boolean().optional(),
      showLogoOnExams: z.boolean().optional(),
      showLogoOnCertificates: z.boolean().optional(),
      showLogoOnNotes: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const caller = checkSessionUser(data.email);

    if (
      caller.role !== UserRole.TEACHER &&
      caller.role !== UserRole.ADMIN &&
      caller.role !== UserRole.SUPER_ADMIN
    ) {
      throw new Error("غير مصرح لك بتعديل الهوية التجارية.");
    }

    // Check if branding is enabled for this instructor
    const user = await prisma.user.findUnique({
      where: { id: caller.id },
      select: { canCustomizeBranding: true },
    });
    if (!user?.canCustomizeBranding) {
      throw new Error("ERR_UNAUTHORIZED: ميزة تخصيص الهوية التجارية معطلة لهذا الحساب.");
    }

    const branding = await prisma.instructorBranding.upsert({
      where: { instructorId: caller.id },
      create: {
        instructorId: caller.id,
        brandName: data.brandName,
        logoUrl: data.logoUrl,
        primaryColor: data.primaryColor || "#000000",
        showLogoOnPdf: data.showLogoOnPdf ?? true,
        showLogoOnVideos: data.showLogoOnVideos ?? true,
        showLogoOnExams: data.showLogoOnExams ?? true,
        showLogoOnCertificates: data.showLogoOnCertificates ?? true,
        showLogoOnNotes: data.showLogoOnNotes ?? true,
      },
      update: {
        brandName: data.brandName !== undefined ? data.brandName : undefined,
        logoUrl: data.logoUrl !== undefined ? data.logoUrl : undefined,
        primaryColor: data.primaryColor !== undefined ? data.primaryColor : undefined,
        showLogoOnPdf: data.showLogoOnPdf,
        showLogoOnVideos: data.showLogoOnVideos,
        showLogoOnExams: data.showLogoOnExams,
        showLogoOnCertificates: data.showLogoOnCertificates,
        showLogoOnNotes: data.showLogoOnNotes,
      },
    });

    logger.info("AUDIT", `تم تحديث الهوية التجارية للمعلم: ${caller.email}`, {
      instructorId: caller.id,
    });

    return serializeBigIntsAndDecimals(branding);
  });

export const getFeaturedInstructorFn = createServerFn({ method: "GET" })
  .validator(z.object({ instructorId: z.string() }))
  .handler(async ({ data }) => {
    const featured = await prisma.featuredInstructor.findUnique({
      where: { instructorId: data.instructorId },
    });
    return serializeBigIntsAndDecimals(featured);
  });

export const updateFeaturedInstructorFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      instructorId: z.string().uuid(),
      priority: z.number().optional(),
      badgeLabel: z.string().optional(),
      badgeColor: z.string().optional(),
      enabled: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkAdminAuth();
    const sessionId = getActiveSessionId();
    const store = dbService.readStore();
    const session = sessionId
      ? store.user_sessions.find((s) => s.session_id === sessionId && s.status === "ACTIVE")
      : null;
    const adminUserId = session ? session.user_id : null;

    const featured = await prisma.featuredInstructor.upsert({
      where: { instructorId: data.instructorId },
      create: {
        instructorId: data.instructorId,
        priority: data.priority ?? 0,
        badgeLabel: data.badgeLabel ?? "مدرس مميز ⭐",
        badgeColor: data.badgeColor ?? "GOLD",
        enabled: data.enabled ?? true,
        createdBy: adminUserId,
      },
      update: {
        priority: data.priority,
        badgeLabel: data.badgeLabel,
        badgeColor: data.badgeColor,
        enabled: data.enabled,
      },
    });

    logger.info("AUDIT", `تم تحديث حالة المعلم المتميز للمعلم ID: ${data.instructorId}`, {
      instructorId: data.instructorId,
      badgeLabel: data.badgeLabel,
      enabled: data.enabled,
      priority: data.priority,
    });

    return serializeBigIntsAndDecimals(featured);
  });

export const removeFeaturedInstructorFn = createServerFn({ method: "POST" })
  .validator(z.object({ instructorId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkAdminAuth();

    const featured = await prisma.featuredInstructor.update({
      where: { instructorId: data.instructorId },
      data: { enabled: false },
    });

    logger.info("AUDIT", `تم تعطيل تمييز المعلم: المعلم ID ${data.instructorId}`, {
      instructorId: data.instructorId,
    });
    return serializeBigIntsAndDecimals(featured);
  });

export const getPublicInstructorsFn = createServerFn({ method: "GET" }).handler(async () => {
  const instructors = await prisma.user.findMany({
    where: {
      role: UserRole.TEACHER,
      deleted_at: null,
    },
    include: {
      profile: true,
      featuredInstructor: true,
      instructorBranding: true,
    },
  });

  const result = instructors.map((ins) => {
    let bioData: any = {};
    if (ins.profile?.biography) {
      try {
        bioData = JSON.parse(ins.profile.biography);
      } catch {}
    }

    return {
      id: ins.id,
      name: ins.profile?.name || ins.email.split("@")[0],
      avatarUrl:
        ins.profile?.avatarUrl ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
      slug: ins.id,
      isFeatured: !!ins.featuredInstructor && ins.featuredInstructor.enabled,
      featuredPriority: ins.featuredInstructor?.priority || 0,
      featuredBadgeLabel: ins.featuredInstructor?.badgeLabel || "مدرس مميز ⭐",
      featuredBadgeColor: ins.featuredInstructor?.badgeColor || "GOLD",
      logoUrl: ins.instructorBranding?.logoUrl || null,
      brandName: ins.instructorBranding?.brandName || null,
      bio: bioData.bio || ins.profile?.biography || "",
    };
  });

  return serializeBigIntsAndDecimals(result);
});

export const getBrandingByLessonFn = createServerFn({ method: "GET" })
  .validator(z.object({ lessonId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const lesson = await prisma.lesson.findUnique({
      where: { id: data.lessonId },
      include: {
        module: {
          include: {
            course: {
              include: {
                instructors: {
                  include: {
                    instructor: {
                      include: {
                        instructorBranding: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const brandingSetting = await prisma.siteSetting.findUnique({
      where: { key: "allow_custom_branding" },
    });
    const allowCustomBranding = brandingSetting?.value !== "false";

    const instructor = (lesson as any)?.module?.course?.instructors?.[0]?.instructor;

    return serializeBigIntsAndDecimals({
      branding: instructor?.instructorBranding || null,
      allowCustomBranding,
    });
  });

export const createExamFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      courseId: z.string().uuid(),
      title: z
        .string({ required_error: "يرجى إدخال اسم الاختبار" })
        .min(2, { message: "يجب أن يحتوي اسم الاختبار على حرفين على الأقل" }),
      durationLimit: z.number().int().nonnegative(),
      passScore: z.number().int().min(0).max(100),
      maxAttempts: z.number().int().positive(),
      description: z.string().optional().nullable(),
      published: z.boolean().optional(),
      isPublished: z.boolean().optional(),
      shuffleQuestions: z.boolean().optional().default(false),
      shuffleChoices: z.boolean().optional().default(false),
      useRandomSubset: z.boolean().optional().default(false),
      subsetQuestionCount: z.number().int().nonnegative().optional().default(0),
      showResults: z.boolean().optional().default(true),
    }),
  )
  .handler(async ({ data }) => {
    await checkTeacherOrAdminAuth();
    const exam = await prisma.exam.create({
      data: {
        courseId: data.courseId,
        title: data.title,
        durationLimit: data.durationLimit,
        passScore: data.passScore,
        maxAttempts: data.maxAttempts,
        description: data.description || null,
        published: data.published ?? false,
        isPublished: data.isPublished ?? data.published ?? false,
        shuffleQuestions: data.shuffleQuestions ?? false,
        shuffleChoices: data.shuffleChoices ?? false,
        useRandomSubset: data.useRandomSubset ?? false,
        subsetQuestionCount: data.subsetQuestionCount ?? 0,
        showResults: data.showResults ?? true,
      },
    });
    logger.info("AUDIT", `تم إنشاء اختبار جديد: ${data.title}`, { courseId: data.courseId });
    return serializeBigIntsAndDecimals(exam);
  });

export const updateExamFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      title: z
        .string({ required_error: "يرجى إدخال اسم الاختبار" })
        .min(2, { message: "يجب أن يحتوي اسم الاختبار على حرفين على الأقل" })
        .optional(),
      durationLimit: z.number().int().nonnegative().optional(),
      passScore: z.number().int().min(0).max(100).optional(),
      maxAttempts: z.number().int().positive().optional(),
      description: z.string().optional().nullable(),
      published: z.boolean().optional(),
      isPublished: z.boolean().optional(),
      shuffleQuestions: z.boolean().optional(),
      shuffleChoices: z.boolean().optional(),
      useRandomSubset: z.boolean().optional(),
      subsetQuestionCount: z.number().int().nonnegative().optional(),
      showResults: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkTeacherOrAdminAuth();
    const exam = await prisma.exam.update({
      where: { id: data.id },
      data: {
        title: data.title,
        durationLimit: data.durationLimit,
        passScore: data.passScore,
        maxAttempts: data.maxAttempts,
        description: data.description !== undefined ? data.description : undefined,
        published: data.published !== undefined ? data.published : undefined,
        isPublished: data.isPublished !== undefined ? data.isPublished : (data.published !== undefined ? data.published : undefined),
        shuffleQuestions: data.shuffleQuestions !== undefined ? data.shuffleQuestions : undefined,
        shuffleChoices: data.shuffleChoices !== undefined ? data.shuffleChoices : undefined,
        useRandomSubset: data.useRandomSubset !== undefined ? data.useRandomSubset : undefined,
        subsetQuestionCount: data.subsetQuestionCount !== undefined ? data.subsetQuestionCount : undefined,
        showResults: data.showResults !== undefined ? data.showResults : undefined,
      },
    });
    logger.info("AUDIT", `تم تحديث بيانات الاختبار: ${data.title || exam.title}`, {
      examId: data.id,
    });
    return serializeBigIntsAndDecimals(exam);
  });

// ==========================================
// BUNNY STREAM VIDEO INTEGRATION (PHASE 2)
// ==========================================

export const createBunnyVideoFn = createServerFn({ method: "POST" })
  .validator(z.object({ title: z.string() }))
  .handler(async ({ data }) => {
    try {
      await checkTeacherOrAdminAuth();

      const libraryId = process.env.BUNNY_LIBRARY_ID || process.env.BUNNY_STREAM_LIBRARY_ID;
      const apiKey = process.env.BUNNY_API_KEY || process.env.BUNNY_STREAM_API_KEY || process.env.BUNNY_ACCESS_KEY;

      if (!libraryId || !apiKey) {
        throw new Error("Bunny Stream environment variables are not configured.");
      }

      const res = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
        method: "POST",
        headers: {
          AccessKey: apiKey,
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({ title: data.title }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Bunny video creation failed: ${errText}`);
      }

      const result = await res.json();
      const response = { success: true as const, data: { videoId: result.guid } };
      console.log("SERIALIZATION_TEST", JSON.stringify(response));
      return response;
    } catch (error: any) {
      const response = {
        success: false as const,
        message: error instanceof Error ? error.message : "Failed to create Bunny video",
      };
      console.log("SERIALIZATION_TEST", JSON.stringify(response));
      return response;
    }
  });

export const uploadVideoFn = createServerFn({ method: "POST" }).handler(async () => {
  try {
    await checkTeacherOrAdminAuth();
    const request = getRequest();

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const videoId = formData.get("videoId") as string;
    const lessonId = formData.get("lessonId") as string;
    const skipDbUpdate = formData.get("skipDbUpdate") === "true";

    if (!file || !videoId || !lessonId) {
      throw new Error("Missing file, videoId, or lessonId");
    }

    const libraryId = process.env.BUNNY_LIBRARY_ID || process.env.BUNNY_STREAM_LIBRARY_ID;
    const apiKey = process.env.BUNNY_API_KEY || process.env.BUNNY_STREAM_API_KEY || process.env.BUNNY_ACCESS_KEY;
    const cdnHost = process.env.BUNNY_CDN_HOST || process.env.BUNNY_STORAGE_ZONE;

    if (!libraryId || !apiKey || !cdnHost) {
      throw new Error("Bunny Stream environment variables are not configured on the server.");
    }

    const stream = file.stream();

    // PUT binary stream directly to Bunny
    const res = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`, {
      method: "PUT",
      headers: {
        AccessKey: apiKey,
        "Content-Type": "application/octet-stream",
      },
      body: stream as any,
      ...({ duplex: "half" } as any),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Bunny Stream upload failed: ${errText}`);
    }

    const result = await res.json();

    // Query status immediately to check duration, status, etc.
    let duration = 0;
    let bunnyStatus = "0";
    try {
      const statusRes = await fetch(
        `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`,
        {
          method: "GET",
          headers: {
            AccessKey: apiKey,
            accept: "application/json",
          },
        },
      );
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        duration = statusData.length || 0;
        bunnyStatus = statusData.status?.toString() || "0";
      }
    } catch {}

    const thumbnailUrl = `https://${cdnHost}/${videoId}/thumbnail.jpg`;
    const videoUrl = `https://${cdnHost}/${videoId}/playlist.m3u8`;

    // Verify videoId, thumbnailUrl, playbackUrl before saving
    if (!videoId || !thumbnailUrl || !videoUrl) {
      throw new Error("فشل التحقق: رمز الفيديو أو رابط التشغيل أو الصورة المصغرة غير متوفر.");
    }

    const checkRes = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`,
      {
        method: "GET",
        headers: { AccessKey: apiKey, accept: "application/json" },
      },
    );
    if (!checkRes.ok) {
      throw new Error("فشل التحقق: لم يتم العثور على الفيديو في خوادم Bunny Stream.");
    }
    const checkData = await checkRes.json();
    if (checkData.status === 4) {
      throw new Error("فشل التحقق: معالجة الفيديو في Bunny Stream فشلت (فيديو معطوب).");
    }

    if (!skipDbUpdate) {
      // Persist to Prisma VideoMetadata database table
      await prisma.videoMetadata.upsert({
        where: { lessonId },
        create: {
          lessonId,
          videoUrl,
          duration: Math.floor(duration),
          size: BigInt(file.size),
          videoId,
          thumbnailUrl,
          status: bunnyStatus,
        },
        update: {
          videoUrl,
          duration: Math.floor(duration),
          size: BigInt(file.size),
          videoId,
          thumbnailUrl,
          status: bunnyStatus,
        },
      });
    }

    const userId = await getAuthenticatedUserId();
    logger.audit(userId, "UPLOAD_VIDEO", {
      resourceType: "Lesson",
      resourceId: lessonId,
      payload: { videoId, size: file.size, name: file.name },
    });

    const response = {
      success: true as const,
      data: { videoId, status: bunnyStatus, duration, thumbnailUrl },
    };
    console.log("SERIALIZATION_TEST", JSON.stringify(response));
    return response;
  } catch (error: any) {
    const response = {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to upload video",
    };
    console.log("SERIALIZATION_TEST", JSON.stringify(response));
    return response;
  }
});

export const getVideoStatusFn = createServerFn({ method: "GET" })
  .validator(z.object({ videoId: z.string() }))
  .handler(async ({ data }) => {
    await checkTeacherOrAdminAuth();

    const libraryId = process.env.BUNNY_LIBRARY_ID || process.env.BUNNY_STREAM_LIBRARY_ID;
    const apiKey = process.env.BUNNY_API_KEY || process.env.BUNNY_STREAM_API_KEY || process.env.BUNNY_ACCESS_KEY;
    const cdnHost = process.env.BUNNY_CDN_HOST || process.env.BUNNY_STORAGE_ZONE;

    if (!libraryId || !apiKey || !cdnHost) {
      throw new Error("Bunny Stream environment variables are not configured.");
    }

    const res = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos/${data.videoId}`,
      {
        method: "GET",
        headers: {
          AccessKey: apiKey,
          accept: "application/json",
        },
      },
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch video status: ${res.statusText}`);
    }

    const result = await res.json();

    // Update status in db if we find this metadata
    try {
      await prisma.videoMetadata.updateMany({
        where: { videoId: data.videoId },
        data: {
          status: result.status?.toString() || "0",
          duration: Math.floor(result.length || 0),
        },
      });
    } catch {}

    return {
      status: result.status, // 0 = Uploaded, 1 = Processing, 2 = Transcoding, 3 = Finished, 4 = Failed
      duration: result.length,
      thumbnailUrl: `https://${cdnHost}/${data.videoId}/thumbnail.jpg`,
    };
  });

export const deleteBunnyVideoFn = createServerFn({ method: "POST" })
  .validator(z.object({ lessonId: z.string().uuid(), videoId: z.string() }))
  .handler(async ({ data }) => {
    await checkTeacherOrAdminAuth();

    const libraryId = process.env.BUNNY_LIBRARY_ID || process.env.BUNNY_STREAM_LIBRARY_ID;
    const apiKey = process.env.BUNNY_API_KEY || process.env.BUNNY_STREAM_API_KEY || process.env.BUNNY_ACCESS_KEY;

    if (!libraryId || !apiKey) {
      throw new Error("Bunny Stream environment variables are not configured.");
    }

    // 1. Delete from Bunny Stream
    const res = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos/${data.videoId}`,
      {
        method: "DELETE",
        headers: {
          AccessKey: apiKey,
          accept: "application/json",
        },
      },
    );

    if (!res.ok) {
      console.warn(`Could not delete video from Bunny Stream: ${res.status}`);
    }

    // 2. Remove VideoMetadata from database
    await prisma.videoMetadata.deleteMany({
      where: { lessonId: data.lessonId },
    });

    return { success: true };
  });

export const replaceVideoFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      lessonId: z.string().uuid(),
      oldVideoId: z.string(),
      newVideoId: z.string(),
      duration: z.number().int(),
      size: z.number().int(),
    }),
  )
  .handler(async ({ data }) => {
    await checkTeacherOrAdminAuth();

    const libraryId = process.env.BUNNY_LIBRARY_ID || process.env.BUNNY_STREAM_LIBRARY_ID;
    const apiKey = process.env.BUNNY_API_KEY || process.env.BUNNY_STREAM_API_KEY || process.env.BUNNY_ACCESS_KEY;
    const cdnHost = process.env.BUNNY_CDN_HOST || process.env.BUNNY_STORAGE_ZONE;

    if (!libraryId || !apiKey || !cdnHost) {
      throw new Error("Bunny Stream environment variables are not configured.");
    }

    const thumbnailUrl = `https://${cdnHost}/${data.newVideoId}/thumbnail.jpg`;
    const videoUrl = `https://${cdnHost}/${data.newVideoId}/playlist.m3u8`;

    // Verify videoId, thumbnailUrl, playbackUrl before saving
    if (!data.newVideoId || !thumbnailUrl || !videoUrl) {
      throw new Error(
        "فشل التحقق: رمز الفيديو الجديد أو رابط التشغيل أو الصورة المصغرة غير متوفر.",
      );
    }

    const checkRes = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos/${data.newVideoId}`,
      {
        method: "GET",
        headers: { AccessKey: apiKey, accept: "application/json" },
      },
    );
    if (!checkRes.ok) {
      throw new Error("فشل التحقق: لم يتم العثور على الفيديو الجديد في خوادم Bunny Stream.");
    }
    const checkData = await checkRes.json();
    if (checkData.status === 4) {
      throw new Error("فشل التحقق: معالجة الفيديو الجديد في Bunny Stream فشلت (فيديو معطوب).");
    }

    // 1. Update VideoMetadata record in database to point to the new video
    await prisma.videoMetadata.update({
      where: { lessonId: data.lessonId },
      data: {
        videoId: data.newVideoId,
        videoUrl: videoUrl,
        duration: Math.floor(data.duration),
        size: BigInt(data.size),
        thumbnailUrl: thumbnailUrl,
        status: "3", // Since it is ready
      },
    });

    // 2. Delete the old video from Bunny Stream
    try {
      await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${data.oldVideoId}`, {
        method: "DELETE",
        headers: {
          AccessKey: apiKey,
          accept: "application/json",
        },
      });
    } catch (err) {
      console.warn(`Could not delete old video ${data.oldVideoId} from Bunny Stream:`, err);
    }

    const userId = await getAuthenticatedUserId();
    logger.audit(userId, "REPLACE_VIDEO", {
      resourceType: "Lesson",
      resourceId: data.lessonId,
      payload: {
        oldVideoId: data.oldVideoId,
        newVideoId: data.newVideoId,
        size: data.size,
        duration: data.duration,
      },
    });

    return { success: true };
  });

export const getBunnyConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  return {
    libraryId: process.env.BUNNY_LIBRARY_ID || process.env.BUNNY_STREAM_LIBRARY_ID || "",
  };
});

export const getBunnySignedUrlFn = createServerFn({ method: "GET" })
  .validator(z.object({ videoId: z.string() }))
  .handler(async ({ data }) => {
    enforceRateLimits();
    const sessionId = getActiveSessionId();
    if (!sessionId) {
      throw new Error("ERR_UNAUTHORIZED: غير مصرح بالوصول بدون جلسة نشطة.");
    }
    const store = dbService.readStore();
    const session = store.user_sessions.find(
      (s) => s.session_id === sessionId && s.status === "ACTIVE" && s.revoked_at === null,
    );
    if (!session) {
      throw new Error("ERR_UNAUTHORIZED: غير مصرح بالوصول بدون جلسة نشطة.");
    }
    const user = store.users.find((u) => u.id === session.user_id);
    if (!user) {
      throw new Error("ERR_UNAUTHORIZED: غير مصرح بالوصول بدون جلسة نشطة.");
    }

    // 1. Session Protection - Bind session to User ID, Student Code, and current active session ID
    const dbSession = await prisma.userSession.findFirst({
      where: {
        session_id: sessionId,
        user_id: user.id,
        status: "ACTIVE",
        revoked_at: null,
      },
      include: {
        user: {
          include: {
            studentCode: true,
          },
        },
      },
    });

    if (!dbSession || !dbSession.user) {
      throw new Error("ERR_UNAUTHORIZED: الجلسة غير صالحة أو منتهية.");
    }

    const studentCode = dbSession.user.studentCode?.code;
    if (dbSession.user.role === "STUDENT" && !studentCode) {
      throw new Error("ERR_UNAUTHORIZED: لا يوجد رمز طالب مفعل لهذه الجلسة.");
    }

    const tokenKey = process.env.BUNNY_TOKEN_KEY;
    const libraryId = process.env.BUNNY_LIBRARY_ID || process.env.BUNNY_STREAM_LIBRARY_ID || "";

    if (!tokenKey) {
      return {
        url: `https://iframe.mediadelivery.net/embed/${libraryId}/${data.videoId}`,
      };
    }

    // 2. Expiration: 4 hours (14400 seconds)
    const expires = Math.floor(Date.now() / 1000) + 14400;
    const input = tokenKey + data.videoId + expires;
    const token = crypto.createHash("sha256").update(input).digest("hex");

    return {
      url: `https://iframe.mediadelivery.net/embed/${libraryId}/${data.videoId}?token=${token}&expires=${expires}`,
    };
  });

export const getCoursePlaybackProgressFn = createServerFn({ method: "GET" })
  .validator(
    z.object({
      email: z.string().email(),
      courseId: z.string().uuid(),
    }),
  )
  .handler(async ({ data }) => {
    const caller = checkSessionUser(data.email);
    try {
      const mods = await prisma.module.findMany({
        where: { courseId: data.courseId },
        select: { id: true },
      });
      const modIds = mods.map((m) => m.id);

      const progressList = await prisma.userWatchProgress.findMany({
        where: {
          user_id: caller.id,
          lesson: {
            moduleId: { in: modIds },
          },
        },
      });

      const progressMap: Record<string, any> = {};
      for (const p of progressList) {
        progressMap[p.lesson_id] = {
          currentSecond: p.current_second,
          watchedPercentage: p.watched_percentage,
          lastViewedAt: p.updated_at.toISOString(),
          duration: p.duration,
        };
      }
      return progressMap;
    } catch (err) {
      console.warn("Failed to fetch course playback progress:", err);
      return {};
    }
  });

// Throttling cache for play/pause analytics to prevent spamming DB writes
const playPauseThrottleCache = new Map<string, number>();

export const incrementPlayPauseAnalyticsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().email(),
      lessonId: z.string().uuid(),
      event: z.enum(["PLAY", "PAUSE"]),
    }),
  )
  .handler(async ({ data }) => {
    const caller = checkSessionUser(data.email);
    const cacheKey = `${caller.id}_${data.lessonId}_${data.event}`;
    const lastTime = playPauseThrottleCache.get(cacheKey) || 0;
    const now = Date.now();

    // Ignore duplicate events within 5 seconds interval
    if (now - lastTime < 5000) {
      return { success: false, reason: "THROTTLED" };
    }
    playPauseThrottleCache.set(cacheKey, now);

    try {
      await prisma.userWatchProgress.upsert({
        where: {
          user_id_lesson_id: {
            user_id: caller.id,
            lesson_id: data.lessonId,
          },
        },
        create: {
          user_id: caller.id,
          lesson_id: data.lessonId,
          current_second: 0,
          watched_percentage: 0.0,
          play_count: data.event === "PLAY" ? 1 : 0,
          pause_count: data.event === "PAUSE" ? 1 : 0,
        },
        update: {
          play_count: data.event === "PLAY" ? { increment: 1 } : undefined,
          pause_count: data.event === "PAUSE" ? { increment: 1 } : undefined,
        },
      });
      return { success: true };
    } catch (err) {
      console.warn("Failed to update play/pause analytics:", err);
      return { success: false };
    }
  });

// Cached analytics storage for Teacher Dashboard to avoid heavy live queries
const cachedTeacherAnalytics: Record<string, { data: any; expiry: number }> = {};

export const getTeacherCourseAnalyticsFn = createServerFn({ method: "GET" })
  .validator(z.object({ email: z.string().email() }))
  .handler(async ({ data }) => {
    await checkTeacherOrAdminAuth();

    const now = Date.now();
    const cache = cachedTeacherAnalytics[data.email];
    if (cache && now < cache.expiry) {
      return cache.data;
    }

    try {
      const teacher = await prisma.user.findUnique({
        where: { email: data.email },
        include: { courseInstructors: true },
      });
      if (!teacher) {
        throw new Error("Teacher not found");
      }

      const courseIds = teacher.courseInstructors.map((ci) => ci.courseId);
      if (courseIds.length === 0) {
        return {
          mostWatched: [],
          leastWatched: [],
          topCourses: [],
          stats: { avgCompletion: 0, avgWatchTime: 0, completionRate: 0 },
        };
      }

      const courses = await prisma.course.findMany({
        where: { id: { in: courseIds } },
        include: {
          modules: {
            include: {
              lessons: {
                include: {
                  userWatchProgresses: true,
                },
              },
            },
          },
          enrollments: true,
        },
      });

      const lessonStats: any[] = [];
      const coursePerformance: any[] = [];
      let totalWatchTime = 0;
      let totalWatchProgressRecords = 0;
      let completedLessonsCount = 0;

      for (const course of courses) {
        let coursePlayCount = 0;
        let courseCompletionPercentage = 0;
        let courseLessonsCount = 0;

        for (const mod of course.modules) {
          for (const les of mod.lessons) {
            courseLessonsCount++;

            let totalPlayCount = 0;
            let totalPauseCount = 0;
            let totalPercent = 0;
            const watchCount = les.userWatchProgresses.length;

            for (const wp of les.userWatchProgresses) {
              totalPlayCount += wp.play_count;
              totalPauseCount += wp.pause_count;
              totalPercent += wp.watched_percentage;

              const wpDuration = wp.duration || 0;
              const estimatedSeconds = Math.floor((wp.watched_percentage / 100) * wpDuration);
              totalWatchTime += estimatedSeconds;

              totalWatchProgressRecords++;
              if (wp.watched_percentage >= 95) {
                completedLessonsCount++;
              }
            }

            const avgPercent =
              watchCount > 0 ? parseFloat((totalPercent / watchCount).toFixed(2)) : 0;
            coursePlayCount += totalPlayCount;
            courseCompletionPercentage += avgPercent;

            lessonStats.push({
              id: les.id,
              title: les.title,
              courseTitle: course.title,
              playCount: totalPlayCount,
              pauseCount: totalPauseCount,
              avgCompletion: avgPercent,
              studentCount: watchCount,
            });
          }
        }

        const enrollCount = course.enrollments.length;
        coursePerformance.push({
          id: course.id,
          title: course.title,
          enrollCount,
          totalPlayCount: coursePlayCount,
          avgCompletion:
            courseLessonsCount > 0
              ? parseFloat((courseCompletionPercentage / courseLessonsCount).toFixed(2))
              : 0,
        });
      }

      const mostWatched = [...lessonStats].sort((a, b) => b.playCount - a.playCount).slice(0, 5);
      const leastWatched = [...lessonStats].sort((a, b) => a.playCount - b.playCount).slice(0, 5);
      const topCourses = [...coursePerformance]
        .sort((a, b) => b.enrollCount - a.enrollCount)
        .slice(0, 5);

      const stats = {
        avgCompletion:
          lessonStats.length > 0
            ? parseFloat(
                (
                  lessonStats.reduce((sum, l) => sum + l.avgCompletion, 0) / lessonStats.length
                ).toFixed(2),
              )
            : 0,
        avgWatchTime:
          totalWatchProgressRecords > 0
            ? Math.floor(totalWatchTime / totalWatchProgressRecords)
            : 0,
        completionRate:
          totalWatchProgressRecords > 0
            ? parseFloat(((completedLessonsCount / totalWatchProgressRecords) * 100).toFixed(2))
            : 0,
      };

      const result = {
        mostWatched,
        leastWatched,
        topCourses,
        stats,
      };

      // Cache values for 5 minutes
      cachedTeacherAnalytics[data.email] = {
        data: result,
        expiry: now + 5 * 60 * 1000,
      };

      return result;
    } catch (err) {
      console.warn("Failed to fetch teacher analytics:", err);
      return {
        mostWatched: [],
        leastWatched: [],
        topCourses: [],
        stats: { avgCompletion: 0, avgWatchTime: 0, completionRate: 0 },
      };
    }
  });

/*
 * =========================================================================
 * RECOVERED SERVER FUNCTIONS (DATABASE BACKED)
 * =========================================================================
 */

export const restoreCourseFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkPermissionAuth("COURSE_MANAGEMENT");
    const course = await prisma.course.update({
      where: { id: data.id },
      data: { deleted_at: null },
    });

    const store = dbService.readStore();
    const storeCourseIdx = store.courses.findIndex((c) => c.id === data.id);
    if (storeCourseIdx > -1) {
      store.courses[storeCourseIdx].deleted_at = null;
      dbService.writeStore(store);
    }

    return serializeBigIntsAndDecimals(course);
  });

export const duplicateCourseFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    try {
      await checkPermissionAuth("COURSE_MANAGEMENT");

      const origCourse = await prisma.course.findUnique({
        where: { id: data.id },
        include: {
          category: true,
          instructors: true,
          modules: {
            where: { deleted_at: null },
            include: {
              lessons: {
                where: { deleted_at: null },
                include: {
                  attachments: true,
                  pdfFiles: true,
                  videoMetadata: true,
                  videos: true,
                  exams: true,
                },
              },
            },
          },
        },
      });

      if (!origCourse) {
        throw new Error("ERR_NOT_FOUND: الكورس الأصلي غير موجود.");
      }

      const newCourse = await prisma.course.create({
        data: {
          title: `${origCourse.title} (نسخة مكررة)`,
          description: origCourse.description,
          price: origCourse.price,
          categoryId: origCourse.categoryId,
          coverImage: origCourse.coverImage,
          isFeatured: origCourse.isFeatured,
        },
      });

      for (const inst of origCourse.instructors) {
        await prisma.courseInstructor.create({
          data: {
            courseId: newCourse.id,
            instructorId: inst.instructorId,
            commissionRate: inst.commissionRate,
          },
        });
      }

      for (const mod of origCourse.modules) {
        const newMod = await prisma.module.create({
          data: {
            courseId: newCourse.id,
            title: mod.title,
            sortOrder: mod.sortOrder,
          },
        });

        for (const les of mod.lessons) {
          const newLes = await prisma.lesson.create({
            data: {
              moduleId: newMod.id,
              title: les.title,
              sortOrder: les.sortOrder,
              isPreview: les.isPreview,
            },
          });

          for (const att of les.attachments) {
            await prisma.attachment.create({
              data: {
                lessonId: newLes.id,
                title: att.title,
                fileUrl: att.fileUrl,
                fileType: att.fileType,
              },
            });
          }

          for (const pdf of les.pdfFiles) {
            await prisma.pdfFile.create({
              data: {
                lessonId: newLes.id,
                title: pdf.title,
                fileUrl: pdf.fileUrl,
              },
            });
          }

          if (les.videoMetadata) {
            await prisma.videoMetadata.create({
              data: {
                lessonId: newLes.id,
                videoUrl: les.videoMetadata.videoUrl,
                duration: les.videoMetadata.duration,
                size: les.videoMetadata.size,
                videoId: les.videoMetadata.videoId,
                thumbnailUrl: les.videoMetadata.thumbnailUrl,
                status: les.videoMetadata.status,
              },
            });
          }

          for (const vid of les.videos) {
            await prisma.video.create({
              data: {
                lessonId: newLes.id,
                url: vid.url,
                duration: vid.duration,
              },
            });
          }

          for (const ex of les.exams) {
            const examQuestions = await prisma.question.findMany({
              where: { examId: ex.id },
              include: { choices: true },
            });

            const newExam = await prisma.exam.create({
              data: {
                courseId: newCourse.id,
                lessonId: newLes.id,
                title: ex.title,
                durationLimit: ex.durationLimit,
                passScore: ex.passScore,
                maxAttempts: ex.maxAttempts,
              },
            });

            for (const q of examQuestions) {
              const newQ = await prisma.question.create({
                data: {
                  examId: newExam.id,
                  text: q.text,
                  type: q.type,
                  sortOrder: q.sortOrder,
                  points: q.points,
                  qType: q.qType,
                  difficulty: q.difficulty,
                  explanation: q.explanation,
                  questionText: q.questionText,
                  mark: q.mark,
                  order: q.order,
                },
              });

              for (const ch of q.choices) {
                await prisma.choice.create({
                  data: {
                    questionId: newQ.id,
                    text: ch.text,
                    isCorrect: ch.isCorrect,
                    sortOrder: ch.sortOrder,
                    choiceText: ch.choiceText,
                  },
                });
              }
            }
          }
        }
      }

      const store = dbService.readStore();
      store.courses.push({
        id: newCourse.id,
        title: newCourse.title,
        description: newCourse.description,
        price: newCourse.price,
        categoryId: newCourse.categoryId,
        coverImage: newCourse.coverImage,
        isFeatured: newCourse.isFeatured,
        created_at: newCourse.created_at.toISOString(),
        updated_at: newCourse.updated_at.toISOString(),
        deleted_at: null,
      });
      dbService.writeStore(store);

      const serialized = serializeBigIntsAndDecimals(newCourse);
      const response = { success: true, data: serialized };
      console.log("SERIALIZATION_TEST", JSON.stringify(response));
      return response;
    } catch (error: any) {
      const response = {
        success: false,
        message: error instanceof Error ? error.message : "Failed to duplicate course",
      };
      console.log("SERIALIZATION_TEST", JSON.stringify(response));
      return response;
    }
  });

export const deleteCourseFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkPermissionAuth("COURSE_MANAGEMENT");
    const course = await prisma.course.update({
      where: { id: data.id },
      data: { deleted_at: new Date() },
    });

    const store = dbService.readStore();
    const storeCourseIdx = store.courses.findIndex((c) => c.id === data.id);
    if (storeCourseIdx > -1) {
      store.courses[storeCourseIdx].deleted_at = new Date().toISOString();
      dbService.writeStore(store);
    }

    return serializeBigIntsAndDecimals(course);
  });

export const deleteExamFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkPermissionAuth("EXAM_MANAGEMENT");
    const exam = await prisma.exam.update({
      where: { id: data.id },
      data: { deleted_at: new Date() },
    });

    const store = dbService.readStore();
    const storeExamIdx = store.exams.findIndex((e) => e.id === data.id);
    if (storeExamIdx > -1) {
      store.exams[storeExamIdx].deleted_at = new Date().toISOString();
      dbService.writeStore(store);
    }

    return serializeBigIntsAndDecimals(exam);
  });

export const publishExamFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkPermissionAuth("EXAM_MANAGEMENT");
    const exam = await prisma.exam.update({
      where: { id: data.id },
      data: { published: true, updated_at: new Date() },
    });

    const store = dbService.readStore();
    const storeExamIdx = store.exams.findIndex((e) => e.id === data.id);
    if (storeExamIdx > -1) {
      store.exams[storeExamIdx].published = true;
      dbService.writeStore(store);
    }

    return serializeBigIntsAndDecimals(exam);
  });

export const duplicateExamFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkPermissionAuth("EXAM_MANAGEMENT");

    const origExam = await prisma.exam.findUnique({
      where: { id: data.id },
      include: {
        sections: {
          where: { deleted_at: null },
          orderBy: { order: "asc" },
        },
        questions: {
          where: { deleted_at: null },
          include: { choices: { where: { deleted_at: null } } },
        },
      },
    });

    if (!origExam) {
      throw new Error("ERR_NOT_FOUND: الامتحان الأصلي غير موجود.");
    }

    const newExam = await prisma.exam.create({
      data: {
        courseId: origExam.courseId,
        lessonId: null, // Always duplicated as unlinked/draft
        title: `${origExam.title} - نسخة`,
        durationLimit: origExam.durationLimit,
        passScore: origExam.passScore,
        maxAttempts: origExam.maxAttempts,
        description: origExam.description,
        published: false,
        isPublished: false,
        shuffleQuestions: origExam.shuffleQuestions,
        shuffleChoices: origExam.shuffleChoices,
        useRandomSubset: origExam.useRandomSubset,
        subsetQuestionCount: origExam.subsetQuestionCount,
        showResults: origExam.showResults,
      },
    });

    // Map old section IDs to new section IDs
    const sectionIdMap: Record<string, string> = {};

    for (const sec of origExam.sections) {
      const newSec = await prisma.examSection.create({
        data: {
          examId: newExam.id,
          name: sec.name,
          description: sec.description,
          mark: sec.mark,
          duration: sec.duration,
          order: sec.order,
        },
      });
      sectionIdMap[sec.id] = newSec.id;
    }

    for (const q of origExam.questions) {
      const newQ = await prisma.question.create({
        data: {
          examId: newExam.id,
          text: q.text,
          type: q.type,
          sortOrder: q.sortOrder,
          points: q.points,
          qType: q.qType,
          difficulty: q.difficulty,
          explanation: q.explanation,
          questionText: q.questionText,
          mark: q.mark,
          order: q.order,
          imageUrl: q.imageUrl,
          pdfUrl: q.pdfUrl,
          isImported: q.isImported,
          sectionId: q.sectionId ? sectionIdMap[q.sectionId] : null,
        },
      });

      for (const ch of q.choices) {
        await prisma.choice.create({
          data: {
            questionId: newQ.id,
            text: ch.text,
            isCorrect: ch.isCorrect,
            sortOrder: ch.sortOrder,
            choiceText: ch.choiceText,
          },
        });
      }
    }

    const store = dbService.readStore();
    store.exams.push({
      id: newExam.id,
      courseId: newExam.courseId,
      lessonId: newExam.lessonId,
      title: newExam.title,
      durationLimit: newExam.durationLimit,
      passScore: Number(newExam.passScore),
      maxAttempts: newExam.maxAttempts,
      created_at: newExam.created_at.toISOString(),
      updated_at: newExam.updated_at.toISOString(),
      deleted_at: null,
    });
    dbService.writeStore(store);

    return serializeBigIntsAndDecimals(newExam);
  });

export const banUserFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkPermissionAuth("USER_MANAGEMENT");

    const user = await prisma.user.findUnique({
      where: { id: data.id },
      include: { profile: true },
    });

    if (!user) {
      throw new Error("ERR_NOT_FOUND: المستخدم غير موجود.");
    }

    let bioObj: any = {};
    if (user.profile?.biography) {
      try {
        bioObj = JSON.parse(user.profile.biography);
      } catch {
        bioObj = { text: user.profile.biography };
      }
    }
    bioObj.status = "BLOCKED";

    const updatedProfile = await prisma.profile.update({
      where: { userId: data.id },
      data: { biography: JSON.stringify(bioObj) },
    });

    await prisma.userSession.updateMany({
      where: { user_id: data.id, status: "ACTIVE" },
      data: { status: "REVOKED", revoked_at: new Date() },
    });

    const store = dbService.readStore();
    const storeProfileIdx = store.profiles.findIndex((p) => p.userId === data.id);
    if (storeProfileIdx > -1) {
      let storeBioObj: any = {};
      try {
        storeBioObj = JSON.parse(store.profiles[storeProfileIdx].biography || "{}");
      } catch {
        storeBioObj = { text: store.profiles[storeProfileIdx].biography };
      }
      storeBioObj.status = "BLOCKED";
      store.profiles[storeProfileIdx].biography = JSON.stringify(storeBioObj);

      store.user_sessions = store.user_sessions.map((s) =>
        s.user_id === data.id && s.status === "ACTIVE"
          ? { ...s, status: "REVOKED", revoked_at: new Date().toISOString() }
          : s,
      );

      dbService.writeStore(store);
    }

    return serializeBigIntsAndDecimals(updatedProfile);
  });

export const reactivateUserFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkPermissionAuth("USER_MANAGEMENT");

    const user = await prisma.user.findUnique({
      where: { id: data.id },
      include: { profile: true },
    });

    if (!user) {
      throw new Error("ERR_NOT_FOUND: المستخدم غير موجود.");
    }

    let bioObj: any = {};
    if (user.profile?.biography) {
      try {
        bioObj = JSON.parse(user.profile.biography);
      } catch {
        bioObj = { text: user.profile.biography };
      }
    }
    bioObj.status = "ACTIVE";

    const updatedProfile = await prisma.profile.update({
      where: { userId: data.id },
      data: { biography: JSON.stringify(bioObj) },
    });

    const store = dbService.readStore();
    const storeProfileIdx = store.profiles.findIndex((p) => p.userId === data.id);
    if (storeProfileIdx > -1) {
      let storeBioObj: any = {};
      try {
        storeBioObj = JSON.parse(store.profiles[storeProfileIdx].biography || "{}");
      } catch {
        storeBioObj = { text: store.profiles[storeProfileIdx].biography };
      }
      storeBioObj.status = "ACTIVE";
      store.profiles[storeProfileIdx].biography = JSON.stringify(storeBioObj);
      dbService.writeStore(store);
    }

    return serializeBigIntsAndDecimals(updatedProfile);
  });

export const createAdminFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(2),
      email: z.string().email(),
      phone: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkPermissionAuth("ADMIN_MANAGEMENT");

    const bcrypt = await import("bcryptjs");
    const randomPassword = crypto.randomBytes(8).toString("hex");
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(randomPassword, salt);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: "ADMIN",
        profile: {
          create: {
            name: data.name,
            biography: JSON.stringify({ status: "ACTIVE", phone: data.phone }),
          },
        },
      },
      include: { profile: true },
    });

    const adminId = "00000000-0000-0000-0000-" + Date.now().toString().padStart(12, "0");
    await prisma.$executeRawUnsafe(
      `INSERT INTO admins (id, user_id) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING`,
      adminId,
      user.id,
    );

    const store = dbService.readStore();
    store.users.push({
      id: user.id,
      email: user.email,
      role: "ADMIN",
      passwordHash,
    });
    store.profiles.push({
      id: "p-" + user.id,
      userId: user.id,
      name: data.name,
      biography: JSON.stringify({ status: "ACTIVE", phone: data.phone }),
    });
    (store as any).admins.push({
      id: adminId,
      user_id: user.id,
      created_at: new Date().toISOString(),
    });
    dbService.writeStore(store);

    return serializeBigIntsAndDecimals({
      ...user,
      randomPassword,
    });
  });

export const getCourseStatsFn = createServerFn({ method: "POST" })
  .validator(z.object({ courseId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkPermissionAuth("ANALYTICS");

    const totalStudents = await prisma.enrollment.count({
      where: { courseId: data.courseId, deleted_at: null },
    });

    const reviews = await prisma.courseReview.findMany({
      where: { courseId: data.courseId, deleted_at: null },
      select: { rating: true },
    });
    const avgRating =
      reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 5.0;

    const modules = await prisma.module.findMany({
      where: { courseId: data.courseId, deleted_at: null },
      select: { id: true },
    });
    const moduleIds = modules.map((m) => m.id);
    const totalLessons = await prisma.lesson.count({
      where: { moduleId: { in: moduleIds }, deleted_at: null },
    });

    return serializeBigIntsAndDecimals({
      totalStudents,
      avgRating,
      totalLessons,
      ratingCount: reviews.length,
    });
  });

export const getStudentStatsFn = createServerFn({ method: "POST" })
  .validator(z.object({ studentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkPermissionAuth("ANALYTICS");

    const totalEnrollments = await prisma.enrollment.count({
      where: { studentId: data.studentId, deleted_at: null },
    });

    const examAttempts = await prisma.examAttempt.count({
      where: { studentId: data.studentId, deleted_at: null },
    });

    const passedExams = await prisma.examAttempt.count({
      where: { studentId: data.studentId, passed: true, deleted_at: null },
    });

    const watchHistoryCount = await prisma.watchHistory.count({
      where: { studentId: data.studentId, deleted_at: null },
    });

    return serializeBigIntsAndDecimals({
      totalEnrollments,
      examAttempts,
      passedExams,
      watchHistoryCount,
    });
  });

export const createCouponFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      courseId: z.string().uuid(),
      teacherEmail: z.string().email(),
      discountType: z.enum(["PERCENTAGE", "FIXED", "FREE"]),
      discountValue: z.number(),
      maxUses: z.number(),
      expiresAt: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkPermissionAuth("COUPON_MANAGEMENT");
    return generateTeacherCouponFn({ data });
  });

// ==========================================
// EXAM QUESTIONS CRUD
// ==========================================

export const createQuestionFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      examId: z.string().uuid(),
      text: z.string().min(1),
      type: z.enum(["MULTIPLE_CHOICE", "ESSAY"]),
      difficulty: z
        .enum(["VERY_EASY", "EASY", "MEDIUM", "HARD", "VERY_HARD"])
        .optional()
        .default("MEDIUM"),
      explanation: z.string().optional().default(""),
      mark: z.number().int().optional().default(1),
      choices: z.array(z.object({ text: z.string(), isCorrect: z.boolean() })).optional(),
      imageUrl: z.string().url().or(z.literal("")).optional().nullable(),
      pdfUrl: z.string().url().or(z.literal("")).optional().nullable(),
      sectionId: z.string().uuid().optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    await checkPermissionAuth("EXAM_MANAGEMENT");

    const maxOrder = await prisma.question.aggregate({
      where: { examId: data.examId },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order || 0) + 1;

    const question = await prisma.$transaction(async (tx) => {
      const q = await tx.question.create({
        data: {
          examId: data.examId,
          text: data.text,
          questionText: data.text,
          type: data.type,
          qType: data.type as QuestionType,
          difficulty: data.difficulty as QuestionDifficulty,
          explanation: data.explanation,
          mark: data.mark,
          order: nextOrder,
          points: data.mark || 1,
          imageUrl: data.imageUrl || null,
          pdfUrl: data.pdfUrl || null,
          sectionId: data.sectionId || null,
        },
      });

      if (data.type === "MULTIPLE_CHOICE" && data.choices && data.choices.length > 0) {
        await tx.choice.createMany({
          data: data.choices.map((c) => ({
            questionId: q.id,
            text: c.text,
            choiceText: c.text,
            isCorrect: c.isCorrect,
          })),
        });
      }
      return q;
    });

    const result = await prisma.question.findUnique({
      where: { id: question.id },
      include: { choices: { where: { deleted_at: null } } },
    });

    return serializeBigIntsAndDecimals(result);
  });

export const updateQuestionFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      text: z.string().min(1).optional(),
      type: z.enum(["MULTIPLE_CHOICE", "ESSAY"]).optional(),
      difficulty: z.enum(["VERY_EASY", "EASY", "MEDIUM", "HARD", "VERY_HARD"]).optional(),
      explanation: z.string().optional(),
      mark: z.number().int().optional(),
      order: z.number().int().optional(),
      choices: z.array(z.object({ text: z.string(), isCorrect: z.boolean() })).optional(),
      imageUrl: z.string().url().or(z.literal("")).optional().nullable(),
      pdfUrl: z.string().url().or(z.literal("")).optional().nullable(),
      sectionId: z.string().uuid().optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    await checkPermissionAuth("EXAM_MANAGEMENT");

    const question = await prisma.$transaction(async (tx) => {
      const q = await tx.question.update({
        where: { id: data.id },
        data: {
          text: data.text,
          questionText: data.text,
          type: data.type,
          qType: data.type ? (data.type as QuestionType) : undefined,
          difficulty: data.difficulty ? (data.difficulty as QuestionDifficulty) : undefined,
          explanation: data.explanation,
          mark: data.mark,
          points: data.mark,
          order: data.order !== undefined ? data.order : undefined,
          imageUrl: data.imageUrl !== undefined ? data.imageUrl : undefined,
          pdfUrl: data.pdfUrl !== undefined ? data.pdfUrl : undefined,
          sectionId: data.sectionId !== undefined ? data.sectionId : undefined,
        },
      });

      if (data.choices !== undefined) {
        await tx.choice.deleteMany({
          where: { questionId: data.id },
        });

        const targetType = data.type || q.type;
        if (targetType === "MULTIPLE_CHOICE" && data.choices.length > 0) {
          await tx.choice.createMany({
            data: data.choices.map((c) => ({
              questionId: q.id,
              text: c.text,
              choiceText: c.text,
              isCorrect: c.isCorrect,
            })),
          });
        }
      }
      return q;
    });

    const result = await prisma.question.findUnique({
      where: { id: question.id },
      include: { choices: { where: { deleted_at: null } } },
    });

    return serializeBigIntsAndDecimals(result);
  });

export const deleteQuestionFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkPermissionAuth("EXAM_MANAGEMENT");
    const question = await prisma.question.update({
      where: { id: data.id },
      data: { deleted_at: new Date() },
    });
    return serializeBigIntsAndDecimals(question);
  });

// ==========================================
// MESSAGING CENTER
// ==========================================

export const sendMessageFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      recipientIds: z.array(z.string().uuid()).optional(),
      courseId: z.string().uuid().optional(),
      sendToAllStudents: z.boolean().optional().default(false),
      sendToAllTeachers: z.boolean().optional().default(false),
      sendToAllUsers: z.boolean().optional().default(false),
      title: z.string().min(1),
      content: z.string().min(1),
      type: z.string().default("NORMAL"),
    }),
  )
  .handler(async ({ data }) => {
    enforceRateLimits();
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      throw new Error("ERR_UNAUTHORIZED");
    }
    const sender = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (
      !sender ||
      (sender.role !== "TEACHER" && sender.role !== "ADMIN" && sender.role !== "SUPER_ADMIN")
    ) {
      throw new Error("ERR_UNAUTHORIZED: غير مصرح بالعملية");
    }

    let targetUserIds: string[] = [];
    if (data.recipientIds && data.recipientIds.length > 0) {
      targetUserIds = data.recipientIds;
    } else if (data.courseId) {
      const enrollments = await prisma.enrollment.findMany({
        where: { courseId: data.courseId, deleted_at: null },
        select: { studentId: true },
      });
      targetUserIds = enrollments.map((e) => e.studentId);
    } else if (data.sendToAllStudents) {
      const students = await prisma.user.findMany({
        where: { role: "STUDENT", deleted_at: null },
        select: { id: true },
      });
      targetUserIds = students.map((s) => s.id);
    } else if (data.sendToAllTeachers) {
      const teachers = await prisma.user.findMany({
        where: { role: "TEACHER", deleted_at: null },
        select: { id: true },
      });
      targetUserIds = teachers.map((t) => t.id);
    } else if (data.sendToAllUsers) {
      const allUsers = await prisma.user.findMany({
        where: { deleted_at: null },
        select: { id: true },
      });
      targetUserIds = allUsers.map((u) => u.id);
    }

    if (targetUserIds.length === 0) {
      throw new Error("لم يتم تحديد أي مستلمين.");
    }

    const message = await prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: {
          senderId: userId,
          title: data.title,
          content: data.content,
          type: data.type,
        },
      });

      await tx.messageRecipient.createMany({
        data: targetUserIds.map((uid) => ({
          messageId: msg.id,
          recipientId: uid,
          isRead: false,
          isArchived: false,
        })),
      });

      return msg;
    });

    return serializeBigIntsAndDecimals({ success: true, messageId: message.id });
  });

export const getStudentMessagesFn = createServerFn({ method: "GET" }).handler(async () => {
  enforceRateLimits();
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    throw new Error("ERR_UNAUTHORIZED");
  }

  const messages = await prisma.messageRecipient.findMany({
    where: {
      recipientId: userId,
    },
    include: {
      message: {
        include: {
          sender: {
            include: {
              profile: true,
            },
          },
        },
      },
    },
    orderBy: {
      message: {
        created_at: "desc",
      },
    },
  });

  return serializeBigIntsAndDecimals(messages);
});

export const getSentMessagesFn = createServerFn({ method: "GET" }).handler(async () => {
  enforceRateLimits();
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    throw new Error("ERR_UNAUTHORIZED");
  }

  const messages = await prisma.message.findMany({
    where: {
      senderId: userId,
    },
    include: {
      recipients: {
        include: {
          recipient: {
            include: {
              profile: true,
            },
          },
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });

  return serializeBigIntsAndDecimals(messages);
});

export const markMessageReadFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    enforceRateLimits();
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      throw new Error("ERR_UNAUTHORIZED");
    }

    const updated = await prisma.messageRecipient.update({
      where: { id: data.id, recipientId: userId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return serializeBigIntsAndDecimals(updated);
  });

export const archiveMessageFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    enforceRateLimits();
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      throw new Error("ERR_UNAUTHORIZED");
    }

    const updated = await prisma.messageRecipient.update({
      where: { id: data.id, recipientId: userId },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });

    return serializeBigIntsAndDecimals(updated);
  });

export const deleteMessageFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    enforceRateLimits();
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      throw new Error("ERR_UNAUTHORIZED");
    }
    const msg = await prisma.message.findUnique({
      where: { id: data.id },
    });
    if (!msg) {
      throw new Error("ERR_NOT_FOUND");
    }
    if (msg.senderId !== userId) {
      throw new Error("ERR_FORBIDDEN");
    }
    await prisma.message.delete({
      where: { id: data.id },
    });
    return { success: true };
  });

// ==========================================
// REAL-TIME NOTIFICATIONS ENGINE
// ==========================================

export async function broadcastRealtimeNotification(payload: {
  userId?: string;
  role?: string;
  courseId?: string;
  examId?: string;
  teacherId?: string;
  liveSessionId?: string;
  room?: string;
  notification: any;
}) {
  try {
    await fetch("http://localhost:3001/api/broadcast-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("Failed to broadcast real-time notification via live-server:", err);
  }
}

async function sendLiveNotification(userId: string, notification: any) {
  await broadcastRealtimeNotification({ userId, notification });
}

export async function createNotification({
  userId,
  title,
  message,
  type = "SYSTEM",
  icon,
  actionUrl,
  priority = "NORMAL",
}: {
  userId: string;
  title: string;
  message: string;
  type?: string;
  icon?: string;
  actionUrl?: string;
  priority?: string;
}) {
  const notif = await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      body: message,
      type,
      icon,
      actionUrl,
      priority,
    },
  });

  await sendLiveNotification(userId, notif);
  return notif;
}

export const sendTeacherNotificationFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      targetType: z.enum(["STUDENTS", "COURSE"]),
      studentIds: z.array(z.string()).optional(),
      courseId: z.string().optional(),
      title: z.string().min(1, "العنوان مطلوب"),
      message: z.string().min(1, "محتوى التنبيه مطلوب"),
      actionUrl: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    enforceRateLimits();
    const senderId = await getAuthenticatedUserId();
    if (!senderId) {
      throw new Error("ERR_UNAUTHORIZED");
    }

    const sender = await prisma.user.findUnique({
      where: { id: senderId },
    });
    if (!sender || (sender.role !== "TEACHER" && sender.role !== "ADMIN" && sender.role !== "SUPER_ADMIN")) {
      throw new Error("ERR_FORBIDDEN: غير مصرح لغير المعلم أو المسؤول بإرسال التنبيهات");
    }

    let recipientUserIds: string[] = [];

    if (data.targetType === "STUDENTS") {
      if (!data.studentIds || data.studentIds.length === 0) {
        throw new Error("يرجى اختيار طالب واحد على الأقل");
      }
      recipientUserIds = data.studentIds;
    } else if (data.targetType === "COURSE") {
      if (!data.courseId) {
        throw new Error("يرجى اختيار الدورة التدريبية");
      }
      const enrollments = await prisma.enrollment.findMany({
        where: { courseId: data.courseId, deleted_at: null },
        select: { studentId: true },
      });
      recipientUserIds = enrollments.map((e) => e.studentId);
    }

    if (recipientUserIds.length === 0) {
      return { success: true, count: 0, message: "لا يوجد طلاب مسجلين لإرسال التنبيه لهم" };
    }

    const createdNotifications = [];
    for (const userId of recipientUserIds) {
      const notif = await prisma.notification.create({
        data: {
          userId,
          title: data.title,
          message: data.message,
          body: data.message,
          type: "SYSTEM",
          actionUrl: data.actionUrl || null,
        },
      });
      await sendLiveNotification(userId, notif);
      createdNotifications.push(notif);
    }

    return { success: true, count: createdNotifications.length };
  });

export const getNotificationsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      page: z.number().optional().default(1),
      limit: z.number().optional().default(10),
      filter: z.enum(["all", "unread", "COURSES", "EXAMS", "SYSTEM", "PAYMENTS", "LIVE", "starred", "archived"]).optional().default("all"),
    })
  )
  .handler(async ({ data }) => {
    enforceRateLimits();
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      throw new Error("ERR_UNAUTHORIZED");
    }

    const whereClause: any = {
      userId,
      deletedAt: null,
    };

    if (data.filter === "unread") {
      whereClause.isRead = false;
    } else if (data.filter === "starred") {
      whereClause.isStarred = true;
    } else if (data.filter === "archived") {
      whereClause.isArchived = true;
    } else if (data.filter !== "all") {
      if (data.filter === "COURSES") {
        whereClause.type = { in: ["NEW_LESSON", "COURSE"] };
      } else if (data.filter === "EXAMS") {
        whereClause.type = { in: ["EXAM_RESULT", "ASSIGNMENT"] };
      } else if (data.filter === "SYSTEM") {
        whereClause.type = "SYSTEM";
      } else if (data.filter === "PAYMENTS") {
        whereClause.type = "PAYMENT";
      } else if (data.filter === "LIVE") {
        whereClause.type = "LIVE_SESSION";
      }
    }

    if (data.filter !== "archived") {
      whereClause.isArchived = false;
    }

    const skip = (data.page - 1) * data.limit;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: [
          { isPinned: "desc" },
          { createdAt: "desc" }
        ],
        skip,
        take: data.limit,
      }),
      prisma.notification.count({ where: whereClause }),
    ]);

    return serializeBigIntsAndDecimals({
      notifications,
      total,
      hasMore: skip + notifications.length < total,
    });
  });

export const getUnreadNotificationsCountFn = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getAuthenticatedUserId();
  if (!userId) throw new Error("ERR_UNAUTHORIZED");
  const count = await prisma.notification.count({
    where: { userId, isRead: false, deletedAt: null, isArchived: false },
  });
  return { count };
});

export const getLatestNotificationsFn = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getAuthenticatedUserId();
  if (!userId) throw new Error("ERR_UNAUTHORIZED");
  const notifications = await prisma.notification.findMany({
    where: { userId, deletedAt: null, isArchived: false },
    orderBy: [
      { isPinned: "desc" },
      { createdAt: "desc" }
    ],
    take: 5,
  });
  return serializeBigIntsAndDecimals(notifications);
});

export const getUserNotificationsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      page: z.number().optional().default(1),
      limit: z.number().optional().default(10),
      filter: z.enum(["all", "unread", "COURSES", "EXAMS", "SYSTEM", "PAYMENTS", "LIVE", "starred", "archived"]).optional().default("all"),
      search: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    enforceRateLimits();
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new Error("ERR_UNAUTHORIZED");

    const whereClause: any = {
      userId,
      deletedAt: null,
    };

    if (data.filter === "unread") {
      whereClause.isRead = false;
    } else if (data.filter === "starred") {
      whereClause.isStarred = true;
    } else if (data.filter === "archived") {
      whereClause.isArchived = true;
    } else if (data.filter !== "all") {
      if (data.filter === "COURSES") {
        whereClause.type = { in: ["NEW_LESSON", "COURSE"] };
      } else if (data.filter === "EXAMS") {
        whereClause.type = { in: ["EXAM_RESULT", "ASSIGNMENT"] };
      } else if (data.filter === "SYSTEM") {
        whereClause.type = "SYSTEM";
      } else if (data.filter === "PAYMENTS") {
        whereClause.type = "PAYMENT";
      } else if (data.filter === "LIVE") {
        whereClause.type = "LIVE_SESSION";
      }
    }

    if (data.filter !== "archived") {
      whereClause.isArchived = false;
    }

    if (data.search) {
      whereClause.OR = [
        { title: { contains: data.search, mode: "insensitive" } },
        { message: { contains: data.search, mode: "insensitive" } },
      ];
    }

    const skip = (data.page - 1) * data.limit;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: [
          { isPinned: "desc" },
          { createdAt: "desc" }
        ],
        skip,
        take: data.limit,
      }),
      prisma.notification.count({ where: whereClause }),
    ]);

    return serializeBigIntsAndDecimals({
      notifications,
      total,
      hasMore: skip + notifications.length < total,
    });
  });

export const markNotificationAsReadFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new Error("ERR_UNAUTHORIZED");
    const updated = await prisma.notification.update({
      where: { id: data.id, userId },
      data: { isRead: true, read: true },
    });
    return serializeBigIntsAndDecimals(updated);
  });

export const markAllNotificationsAsReadFn = createServerFn({ method: "POST" }).handler(async () => {
  const userId = await getAuthenticatedUserId();
  if (!userId) throw new Error("ERR_UNAUTHORIZED");
  await prisma.notification.updateMany({
    where: { userId, isRead: false, deletedAt: null },
    data: { isRead: true, read: true },
  });
  return { success: true };
});

export const togglePinNotificationFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), isPinned: z.boolean() }))
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new Error("ERR_UNAUTHORIZED");
    const updated = await prisma.notification.update({
      where: { id: data.id, userId },
      data: { isPinned: data.isPinned },
    });
    return serializeBigIntsAndDecimals(updated);
  });

export const toggleStarNotificationFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), isStarred: z.boolean() }))
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new Error("ERR_UNAUTHORIZED");
    const updated = await prisma.notification.update({
      where: { id: data.id, userId },
      data: { isStarred: data.isStarred },
    });
    return serializeBigIntsAndDecimals(updated);
  });

export const toggleArchiveNotificationFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), isArchived: z.boolean() }))
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new Error("ERR_UNAUTHORIZED");
    const updated = await prisma.notification.update({
      where: { id: data.id, userId },
      data: { isArchived: data.isArchived },
    });
    return serializeBigIntsAndDecimals(updated);
  });

export const toggleNotificationReadFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), isRead: z.boolean() }))
  .handler(async ({ data }) => {
    enforceRateLimits();
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new Error("ERR_UNAUTHORIZED");

    const updated = await prisma.notification.update({
      where: { id: data.id, userId },
      data: {
        isRead: data.isRead,
        read: data.isRead,
      },
    });
    return serializeBigIntsAndDecimals(updated);
  });

export const toggleNotificationStarredFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), isStarred: z.boolean() }))
  .handler(async ({ data }) => {
    enforceRateLimits();
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new Error("ERR_UNAUTHORIZED");

    const updated = await prisma.notification.update({
      where: { id: data.id, userId },
      data: { isStarred: data.isStarred },
    });
    return serializeBigIntsAndDecimals(updated);
  });

export const toggleNotificationPinnedFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), isPinned: z.boolean() }))
  .handler(async ({ data }) => {
    enforceRateLimits();
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new Error("ERR_UNAUTHORIZED");

    const updated = await prisma.notification.update({
      where: { id: data.id, userId },
      data: { isPinned: data.isPinned },
    });
    return serializeBigIntsAndDecimals(updated);
  });

export const toggleNotificationArchivedFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), isArchived: z.boolean() }))
  .handler(async ({ data }) => {
    enforceRateLimits();
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new Error("ERR_UNAUTHORIZED");

    const updated = await prisma.notification.update({
      where: { id: data.id, userId },
      data: { isArchived: data.isArchived },
    });
    return serializeBigIntsAndDecimals(updated);
  });

export const deleteNotificationFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    enforceRateLimits();
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new Error("ERR_UNAUTHORIZED");

    const updated = await prisma.notification.update({
      where: { id: data.id, userId },
      data: {
        deletedAt: new Date(),
        deleted_at: new Date(),
      },
    });
    return serializeBigIntsAndDecimals(updated);
  });

export const markAllNotificationsReadFn = createServerFn({ method: "POST" }).handler(async () => {
  enforceRateLimits();
  const userId = await getAuthenticatedUserId();
  if (!userId) throw new Error("ERR_UNAUTHORIZED");

  await prisma.notification.updateMany({
    where: { userId, isRead: false, deletedAt: null },
    data: {
      isRead: true,
      read: true,
    },
  });
  return { success: true };
});

// ==========================================
// PREMIUM TEACHER BRANDING MODULE
// ==========================================

export const activateTeacherBrandingFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      teacherId: z.string().uuid(),
      enabled: z.boolean(),
      planType: z.enum([
        "1_WEEK",
        "1_MONTH",
        "3_MONTHS",
        "6_MONTHS",
        "1_YEAR",
        "LIFETIME",
        "UNTIL_CANCELLED",
      ]),
      featuresAllowed: z.any().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkSuperAdminAuth();
    const adminId = await getAuthenticatedUserId();

    let expiresAt: Date | null = null;
    const now = new Date();
    if (data.planType === "1_WEEK") {
      expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else if (data.planType === "1_MONTH") {
      expiresAt = new Date(now.setMonth(now.getMonth() + 1));
    } else if (data.planType === "3_MONTHS") {
      expiresAt = new Date(now.setMonth(now.getMonth() + 3));
    } else if (data.planType === "6_MONTHS") {
      expiresAt = new Date(now.setMonth(now.getMonth() + 6));
    } else if (data.planType === "1_YEAR") {
      expiresAt = new Date(now.setFullYear(now.getFullYear() + 1));
    }

    const branding = await prisma.instructorBranding.upsert({
      where: { instructorId: data.teacherId },
      update: {
        enabled: data.enabled,
        expiresAt,
        lifetimeSubscription: data.planType === "LIFETIME",
        featuresAllowed: data.featuresAllowed || undefined,
      },
      create: {
        instructorId: data.teacherId,
        enabled: data.enabled,
        expiresAt,
        lifetimeSubscription: data.planType === "LIFETIME",
        featuresAllowed: data.featuresAllowed || {
          videoIntro: true,
          watermark: true,
          pdf: true,
          notes: true,
          attachments: true,
          certificates: true,
          exams: true,
          homework: true,
          downloads: true,
          featuredBadge: true,
          featuredCourses: true,
          featuredHomePage: true,
        },
      },
    });

    await prisma.user.update({
      where: { id: data.teacherId },
      data: { canCustomizeBranding: data.enabled },
    });

    await logger.audit(adminId, "ACTIVATE_BRANDING", {
      resourceType: "Branding",
      resourceId: branding.id,
      actionType: "ACTIVATE_BRANDING",
      performedBy: adminId || "SYSTEM",
      targetUserId: data.teacherId,
      payload: { enabled: data.enabled, planType: data.planType, expiresAt },
    });

    return serializeBigIntsAndDecimals(branding);
  });

export const getBrandingSubscriptionsFn = createServerFn({ method: "GET" }).handler(async () => {
  await checkSuperAdminAuth();
  const brandings = await prisma.instructorBranding.findMany({
    include: {
      instructor: {
        include: { profile: true },
      },
    },
  });
  return serializeBigIntsAndDecimals(brandings);
});

export const extendBrandingSubscriptionFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      teacherId: z.string().uuid(),
      planType: z.enum([
        "1_WEEK",
        "1_MONTH",
        "3_MONTHS",
        "6_MONTHS",
        "1_YEAR",
        "LIFETIME",
        "UNTIL_CANCELLED",
      ]),
    }),
  )
  .handler(async ({ data }) => {
    await checkSuperAdminAuth();
    const adminId = await getAuthenticatedUserId();

    const branding = await prisma.instructorBranding.findUnique({
      where: { instructorId: data.teacherId },
    });
    if (!branding) throw new Error("Branding settings not found.");

    let currentExpiry = branding.expiresAt ? new Date(branding.expiresAt) : new Date();
    if (currentExpiry.getTime() < Date.now()) {
      currentExpiry = new Date();
    }

    let newExpiry: Date | null = new Date(currentExpiry);
    if (data.planType === "1_WEEK") {
      newExpiry.setTime(newExpiry.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else if (data.planType === "1_MONTH") {
      newExpiry.setMonth(newExpiry.getMonth() + 1);
    } else if (data.planType === "3_MONTHS") {
      newExpiry.setMonth(newExpiry.getMonth() + 3);
    } else if (data.planType === "6_MONTHS") {
      newExpiry.setMonth(newExpiry.getMonth() + 6);
    } else if (data.planType === "1_YEAR") {
      newExpiry.setFullYear(newExpiry.getFullYear() + 1);
    } else {
      newExpiry = null; // Lifetime
    }

    const updated = await prisma.instructorBranding.update({
      where: { instructorId: data.teacherId },
      data: {
        expiresAt: newExpiry,
        lifetimeSubscription: data.planType === "LIFETIME",
        enabled: true,
      },
    });

    await prisma.user.update({
      where: { id: data.teacherId },
      data: { canCustomizeBranding: true },
    });

    await logger.audit(adminId, "EXTEND_BRANDING", {
      resourceType: "Branding",
      resourceId: updated.id,
      actionType: "EXTEND_BRANDING",
      performedBy: adminId || "SYSTEM",
      targetUserId: data.teacherId,
      payload: { planType: data.planType, newExpiry },
    });

    return serializeBigIntsAndDecimals(updated);
  });

export const toggleFeaturedTeacherFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      teacherId: z.string().uuid(),
      featuredTeacher: z.boolean(),
      featuredCoursePriority: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkSuperAdminAuth();
    const adminId = await getAuthenticatedUserId();

    const updatedBranding = await prisma.instructorBranding.upsert({
      where: { instructorId: data.teacherId },
      update: {
        featuredTeacher: data.featuredTeacher,
        featuredCoursePriority: data.featuredCoursePriority ?? false,
      },
      create: {
        instructorId: data.teacherId,
        featuredTeacher: data.featuredTeacher,
        featuredCoursePriority: data.featuredCoursePriority ?? false,
        enabled: false,
      },
    });

    await prisma.featuredInstructor.upsert({
      where: { instructorId: data.teacherId },
      update: { enabled: data.featuredTeacher },
      create: {
        instructorId: data.teacherId,
        enabled: data.featuredTeacher,
        createdBy: adminId || null,
      },
    });

    await logger.audit(adminId, "TOGGLE_FEATURED_TEACHER", {
      resourceType: "Branding",
      resourceId: updatedBranding.id,
      actionType: "TOGGLE_FEATURED_TEACHER",
      performedBy: adminId || "SYSTEM",
      targetUserId: data.teacherId,
      payload: {
        featuredTeacher: data.featuredTeacher,
        featuredCoursePriority: data.featuredCoursePriority,
      },
    });

    return serializeBigIntsAndDecimals(updatedBranding);
  });

// ==========================================
// REPUTATION & STUDENT REVIEWS MODULE
// ==========================================

export const submitTeacherReviewFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      teacherId: z.string().uuid(),
      rating: z.number().int().min(1).max(5),
      comment: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const studentId = await getAuthenticatedUserId();
    if (!studentId) throw new Error("ERR_UNAUTHORIZED");

    // Rate Limit / Spam Protection
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await prisma.teacherReview.count({
      where: {
        studentId,
        teacherId: data.teacherId,
        created_at: { gte: last24h },
      },
    });
    if (recentCount > 0) {
      throw new Error("ERR_RATE_LIMIT: لا يمكنك ترك أكثر من تقييم واحد للمدرس خلال 24 ساعة.");
    }

    const ip = getRequestIP() || "unknown";
    const recentIpCount = await prisma.teacherReview.count({
      where: {
        teacherId: data.teacherId,
        created_at: { gte: last24h },
      },
    });
    const isSuspicious = recentIpCount > 10;

    const review = await prisma.teacherReview.create({
      data: {
        teacherId: data.teacherId,
        studentId,
        rating: data.rating,
        comment: data.comment,
        isSuspicious,
        isApproved: false, // Moderated by default
      },
    });

    return serializeBigIntsAndDecimals(review);
  });

export const getTeacherReviewsFn = createServerFn({ method: "GET" })
  .validator(z.object({ teacherId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const reviews = await prisma.teacherReview.findMany({
      where: {
        teacherId: data.teacherId,
        deleted_at: null,
        isApproved: true,
      },
      include: {
        student: {
          include: { profile: true, enrollments: true },
        },
      },
      orderBy: [{ isPinned: "desc" }, { created_at: "desc" }],
    });

    const weightedReviews = reviews.map((rev: any) => {
      const hasCompletedCourse = rev.student?.enrollments?.some(
        (e: any) => e.progressPercent === 100,
      );
      return {
        ...rev,
        verifiedStudent: rev.student?.enrollments?.length > 0,
        hasCompletedCourse,
        weight: hasCompletedCourse ? 1.5 : 1.0,
      };
    });

    return serializeBigIntsAndDecimals(weightedReviews);
  });

export const getAdminAllReviewsFn = createServerFn({ method: "GET" }).handler(async () => {
  await checkSuperAdminAuth();
  const reviews = await prisma.teacherReview.findMany({
    where: { deleted_at: null },
    include: {
      student: { include: { profile: true } },
      teacher: { include: { profile: true } },
    },
    orderBy: { created_at: "desc" },
  });
  return serializeBigIntsAndDecimals(reviews);
});

export const moderateReviewFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      reviewId: z.string().uuid(),
      action: z.enum(["APPROVE", "HIDE", "DELETE", "PIN", "UNPIN"]),
    }),
  )
  .handler(async ({ data }) => {
    await checkSuperAdminAuth();
    const adminId = await getAuthenticatedUserId();

    let review;
    if (data.action === "DELETE") {
      review = await prisma.teacherReview.update({
        where: { id: data.reviewId },
        data: { deleted_at: new Date() },
      });
    } else {
      review = await prisma.teacherReview.update({
        where: { id: data.reviewId },
        data: {
          isApproved: data.action === "APPROVE" ? true : data.action === "HIDE" ? false : undefined,
          isPinned: data.action === "PIN" ? true : data.action === "UNPIN" ? false : undefined,
        },
      });
    }

    // Recalculate stats
    const allApproved = await prisma.teacherReview.findMany({
      where: { teacherId: review.teacherId, isApproved: true, deleted_at: null },
      select: { rating: true },
    });
    const reviewsCount = allApproved.length;
    const totalRating = allApproved.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = reviewsCount > 0 ? Number((totalRating / reviewsCount).toFixed(2)) : 5.0;

    await prisma.user.update({
      where: { id: review.teacherId },
      data: { averageRating, reviewsCount },
    });

    await logger.audit(adminId, `MODERATE_REVIEW_${data.action}`, {
      resourceType: "Review",
      resourceId: review.id,
      actionType: "MODERATE_REVIEW",
      performedBy: adminId || "SYSTEM",
      targetUserId: review.teacherId,
      payload: { action: data.action },
    });

    return serializeBigIntsAndDecimals(review);
  });

export const reportReviewFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      reviewId: z.string().uuid(),
      reason: z.string().min(3),
    }),
  )
  .handler(async ({ data }) => {
    const reporterId = await getAuthenticatedUserId();
    if (!reporterId) throw new Error("ERR_UNAUTHORIZED");

    const report = await prisma.reviewReport.create({
      data: {
        reviewId: data.reviewId,
        reporterId,
        reason: data.reason,
      },
    });

    return serializeBigIntsAndDecimals(report);
  });

export const getReviewAnalyticsFn = createServerFn({ method: "GET" })
  .validator(z.object({ teacherId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkSuperAdminAuth();
    const reviews = await prisma.teacherReview.findMany({
      where: { teacherId: data.teacherId, deleted_at: null },
    });

    const distribution = [0, 0, 0, 0, 0];
    reviews.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) {
        distribution[r.rating - 1]++;
      }
    });

    const total = reviews.length;
    const average = total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 5.0;

    return serializeBigIntsAndDecimals({
      totalReviews: total,
      averageRating: Number(average.toFixed(2)),
      distribution: {
        oneStar: distribution[0],
        twoStar: distribution[1],
        threeStar: distribution[2],
        fourStar: distribution[3],
        fiveStar: distribution[4],
      },
      suspiciousCount: reviews.filter((r) => r.isSuspicious).length,
    });
  });

// ==========================================
// TEACHER & STUDENT MANAGEMENT MODULES
// ==========================================

export const adminGetTeachersListFn = createServerFn({ method: "GET" }).handler(async () => {
  await checkSuperAdminAuth();
  const teachers = await prisma.user.findMany({
    where: { role: UserRole.TEACHER, deleted_at: null },
    include: {
      profile: true,
      instructorBranding: true,
      courseInstructors: {
        include: { course: { include: { enrollments: true } } },
      },
      loginHistories: { orderBy: { created_at: "desc" }, take: 10 },
      devices: true,
    },
  });
  return serializeBigIntsAndDecimals(teachers);
});

export const adminGetStudentsListFn = createServerFn({ method: "GET" }).handler(async () => {
  await checkSuperAdminAuth();
  const students = await prisma.user.findMany({
    where: { role: UserRole.STUDENT, deleted_at: null },
    include: {
      profile: true,
      enrollments: { include: { course: true } },
      progress: true,
      orders: true,
      certificates: true,
      loginHistories: { orderBy: { created_at: "desc" }, take: 10 },
      devices: true,
    },
  });
  return serializeBigIntsAndDecimals(students);
});

export const adminImpersonateTeacherFn = createServerFn({ method: "POST" })
  .validator(z.object({ teacherId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkSuperAdminAuth();
    const adminId = await getAuthenticatedUserId();

    const teacher = await prisma.user.findUnique({
      where: { id: data.teacherId, role: UserRole.TEACHER },
      include: { profile: true },
    });
    if (!teacher) throw new Error("ERR_NOT_FOUND: المدرس غير موجود.");

    const sessionToken = `IMPERSONATE-${crypto.randomBytes(32).toString("hex")}`;
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    await prisma.userSession.create({
      data: {
        user_id: data.teacherId,
        session_id: sessionToken,
        status: "ACTIVE",
        device_id: "IMPERSONATION",
        fingerprint_hash: "IMPERSONATION",
      },
    });

    await logger.audit(adminId, "LOGIN_AS_TEACHER", {
      resourceType: "User",
      resourceId: data.teacherId,
      actionType: "LOGIN_AS_TEACHER",
      performedBy: adminId || "SYSTEM",
      targetUserId: data.teacherId,
      payload: { email: teacher.email },
    });

    return {
      token: sessionToken,
      user: {
        id: teacher.id,
        email: teacher.email,
        role: teacher.role,
        name: teacher.profile?.name || "",
        avatarUrl: teacher.profile?.avatarUrl || null,
      },
    };
  });

export const adminResetPasswordFn = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().uuid(), newPassword: z.string().min(6) }))
  .handler(async ({ data }) => {
    await checkSuperAdminAuth();
    const adminId = await getAuthenticatedUserId();

    const bcrypt = await import("bcryptjs");
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.newPassword, salt);

    await prisma.user.update({
      where: { id: data.userId },
      data: { passwordHash },
    });

    await logger.audit(adminId, "RESET_PASSWORD", {
      resourceType: "User",
      resourceId: data.userId,
      actionType: "RESET_PASSWORD",
      performedBy: adminId || "SYSTEM",
      targetUserId: data.userId,
      payload: {},
    });

    return { success: true };
  });

export const adminUpdateDeviceLimitFn = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().uuid(), deviceLimit: z.number().int().nonnegative() }))
  .handler(async ({ data }) => {
    await checkSuperAdminAuth();
    const adminId = await getAuthenticatedUserId();

    const updated = await prisma.user.update({
      where: { id: data.userId },
      data: { deviceLimit: data.deviceLimit },
    });

    await logger.audit(adminId, "CHANGE_DEVICE_LIMIT", {
      resourceType: "User",
      resourceId: data.userId,
      actionType: "CHANGE_DEVICE_LIMIT",
      performedBy: adminId || "SYSTEM",
      targetUserId: data.userId,
      payload: { deviceLimit: data.deviceLimit },
    });

    return serializeBigIntsAndDecimals(updated);
  });

export const adminToggleBanUserFn = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().uuid(), isBanned: z.boolean() }))
  .handler(async ({ data }) => {
    await checkSuperAdminAuth();
    const adminId = await getAuthenticatedUserId();

    const updated = await prisma.user.update({
      where: { id: data.userId },
      data: { isBanned: data.isBanned },
    });

    if (data.isBanned) {
      await prisma.userSession.updateMany({
        where: { user_id: data.userId, status: "ACTIVE" },
        data: { status: "REVOKED", revoked_at: new Date() },
      });
    }

    await logger.audit(adminId, data.isBanned ? "BAN_USER" : "UNBAN_USER", {
      resourceType: "User",
      resourceId: data.userId,
      actionType: data.isBanned ? "BAN_USER" : "UNBAN_USER",
      performedBy: adminId || "SYSTEM",
      targetUserId: data.userId,
      payload: { isBanned: data.isBanned },
    });

    return serializeBigIntsAndDecimals(updated);
  });

export const adminForceLogoutFn = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().uuid(), deviceId: z.string().optional() }))
  .handler(async ({ data }) => {
    await checkSuperAdminAuth();
    const adminId = await getAuthenticatedUserId();

    if (data.deviceId) {
      await prisma.userSession.updateMany({
        where: { user_id: data.userId, device_id: data.deviceId, status: "ACTIVE" },
        data: { status: "REVOKED", revoked_at: new Date() },
      });
      await prisma.userDevice.updateMany({
        where: { user_id: data.userId, device_id: data.deviceId },
        data: { revoked: true },
      });
    } else {
      await prisma.userSession.updateMany({
        where: { user_id: data.userId, status: "ACTIVE" },
        data: { status: "REVOKED", revoked_at: new Date() },
      });
    }

    await logger.audit(adminId, "FORCE_LOGOUT", {
      resourceType: "User",
      resourceId: data.userId,
      actionType: "FORCE_LOGOUT",
      performedBy: adminId || "SYSTEM",
      targetUserId: data.userId,
      payload: { deviceId: data.deviceId },
    });

    return { success: true };
  });

export const adminUnlockAccountFn = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkSuperAdminAuth();
    return { success: true };
  });

export const adminVerifyUserAccountFn = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkSuperAdminAuth();
    await prisma.profile.update({
      where: { userId: data.userId },
      data: { credentials: "VERIFIED" },
    });
    return { success: true };
  });

export const adminDisable2FAFn = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkSuperAdminAuth();
    return { success: true };
  });

export const adminResendVerificationFn = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkSuperAdminAuth();
    return { success: true };
  });

// ==========================================
// SYSTEM ANALYTICS
// ==========================================

export const getPlatformAnalyticsFn = createServerFn({ method: "GET" }).handler(async () => {
  await checkSuperAdminAuth();
  const totalStudents = await prisma.user.count({
    where: { role: UserRole.STUDENT, deleted_at: null },
  });
  const totalTeachers = await prisma.user.count({
    where: { role: UserRole.TEACHER, deleted_at: null },
  });
  const totalCourses = await prisma.course.count({ where: { isArchived: false } });
  const totalExams = await prisma.exam.count({ where: { deleted_at: null } });
  const activeDevices = await prisma.userDevice.count({ where: { revoked: false } });

  const orders = await prisma.order.findMany({
    where: { status: OrderStatus.COMPLETED },
    select: { totalAmount: true },
  });
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

  const topTeachers = await prisma.user.findMany({
    where: { role: UserRole.TEACHER, deleted_at: null },
    orderBy: { averageRating: "desc" },
    take: 5,
    include: { profile: true },
  });

  return serializeBigIntsAndDecimals({
    totalStudents,
    totalTeachers,
    totalCourses,
    totalExams,
    activeDevices,
    totalRevenue,
    topTeachers,
  });
});

// ==========================================
// EXAM SECTIONS
// ==========================================

export const createExamSectionFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      examId: z.string().uuid(),
      name: z.string().min(1),
      description: z.string().optional().nullable(),
      mark: z.number().optional().nullable(),
      duration: z.number().int().optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    await checkTeacherOrAdminAuth();
    const maxOrder = await prisma.examSection.aggregate({
      where: { examId: data.examId, deleted_at: null },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order || 0) + 1;

    const section = await prisma.examSection.create({
      data: {
        examId: data.examId,
        name: data.name,
        description: data.description,
        mark: data.mark ? new Prisma.Decimal(data.mark) : null,
        duration: data.duration,
        order: nextOrder,
      },
    });
    return serializeBigIntsAndDecimals(section);
  });

export const updateExamSectionFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      description: z.string().optional().nullable(),
      mark: z.number().optional().nullable(),
      duration: z.number().int().optional().nullable(),
      order: z.number().int().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkTeacherOrAdminAuth();
    const section = await prisma.examSection.update({
      where: { id: data.id },
      data: {
        name: data.name,
        description: data.description !== undefined ? data.description : undefined,
        mark: data.mark !== undefined ? (data.mark ? new Prisma.Decimal(data.mark) : null) : undefined,
        duration: data.duration !== undefined ? data.duration : undefined,
        order: data.order !== undefined ? data.order : undefined,
      },
    });
    return serializeBigIntsAndDecimals(section);
  });

export const deleteExamSectionFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkTeacherOrAdminAuth();
    const section = await prisma.examSection.update({
      where: { id: data.id },
      data: { deleted_at: new Date() },
    });
    // Set sectionId of all questions in this section to null
    await prisma.question.updateMany({
      where: { sectionId: data.id },
      data: { sectionId: null },
    });
    return serializeBigIntsAndDecimals(section);
  });

export const reorderExamSectionsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      examId: z.string().uuid(),
      sectionIds: z.array(z.string().uuid()),
    }),
  )
  .handler(async ({ data }) => {
    await checkTeacherOrAdminAuth();
    await prisma.$transaction(
      data.sectionIds.map((id, idx) =>
        prisma.examSection.update({
          where: { id },
          data: { order: idx + 1 },
        }),
      ),
    );
    return { success: true };
  });

// ==========================================
// EXAM VERSIONING
// ==========================================

export const createExamVersionFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      examId: z.string().uuid(),
      changeDescription: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    await checkTeacherOrAdminAuth();
    
    // Fetch exam settings
    const exam = await prisma.exam.findUnique({
      where: { id: data.examId, deleted_at: null },
      include: {
        sections: {
          where: { deleted_at: null },
        },
        questions: {
          where: { deleted_at: null },
          include: {
            choices: {
              where: { deleted_at: null },
            },
          },
        },
      },
    });

    if (!exam) throw new Error("الاختبار غير موجود");

    // Construct the snapshot
    const snapshot = {
      title: exam.title,
      description: exam.description,
      durationLimit: exam.durationLimit,
      passScore: exam.passScore ? Number(exam.passScore) : 50,
      maxAttempts: exam.maxAttempts,
      shuffleQuestions: exam.shuffleQuestions,
      shuffleChoices: exam.shuffleChoices,
      useRandomSubset: exam.useRandomSubset,
      subsetQuestionCount: exam.subsetQuestionCount,
      showResults: exam.showResults,
      sections: exam.sections.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        mark: s.mark ? Number(s.mark) : null,
        duration: s.duration,
        order: s.order,
      })),
      questions: exam.questions.map(q => ({
        id: q.id,
        text: q.text || q.questionText || "",
        type: q.type || "MCQ",
        qType: q.qType || "MULTIPLE_CHOICE",
        difficulty: q.difficulty || "MEDIUM",
        mark: q.mark ? Number(q.mark) : (q.points ? Number(q.points) : 1),
        explanation: q.explanation || "",
        imageUrl: q.imageUrl,
        pdfUrl: q.pdfUrl,
        sectionId: q.sectionId,
        order: q.order || q.sortOrder || 0,
        isImported: q.isImported || false,
        choices: q.choices.map(c => ({
          text: c.text,
          isCorrect: c.isCorrect,
        })),
      })),
    };

    // Find next version number
    const lastVersion = await prisma.examVersion.aggregate({
      where: { examId: data.examId },
      _max: { version: true },
    });
    const nextVer = (lastVersion._max.version || 0) + 1;

    // Create the version record
    const newVer = await prisma.examVersion.create({
      data: {
        examId: data.examId,
        version: nextVer,
        snapshot: snapshot as any,
        changeDescription: data.changeDescription || `تعديل النسخة ${nextVer}`,
      },
    });

    return serializeBigIntsAndDecimals(newVer);
  });

export const getExamVersionsFn = createServerFn({ method: "GET" })
  .validator(z.object({ examId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkTeacherOrAdminAuth();
    const versions = await prisma.examVersion.findMany({
      where: { examId: data.examId },
      orderBy: { created_at: "desc" },
    });
    return serializeBigIntsAndDecimals(versions);
  });

export const restoreExamVersionFn = createServerFn({ method: "POST" })
  .validator(z.object({ versionId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await checkTeacherOrAdminAuth();

    const ver = await prisma.examVersion.findUnique({
      where: { id: data.versionId },
    });
    if (!ver) throw new Error("النسخة غير موجودة");

    const snap = ver.snapshot as any;
    if (!snap) throw new Error("محتوى النسخة فارغ");

    // Perform database changes in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Revert exam settings
      await tx.exam.update({
        where: { id: ver.examId },
        data: {
          title: snap.title,
          description: snap.description,
          durationLimit: snap.durationLimit,
          passScore: new Prisma.Decimal(snap.passScore || 50),
          maxAttempts: snap.maxAttempts || 1,
          shuffleQuestions: !!snap.shuffleQuestions,
          shuffleChoices: !!snap.shuffleChoices,
          useRandomSubset: !!snap.useRandomSubset,
          subsetQuestionCount: snap.subsetQuestionCount || 0,
          showResults: snap.showResults !== false,
          published: false,
          isPublished: false,
        },
      });

      // 2. Soft-delete all current questions of the exam
      await tx.question.updateMany({
        where: { examId: ver.examId, deleted_at: null },
        data: { deleted_at: new Date() },
      });

      // 3. Soft-delete all current sections of the exam
      await tx.examSection.updateMany({
        where: { examId: ver.examId, deleted_at: null },
        data: { deleted_at: new Date() },
      });

      // 4. Create new sections and build mapping
      const sectionIdMap: Record<string, string> = {};
      if (snap.sections && Array.isArray(snap.sections)) {
        for (const s of snap.sections) {
          const newSec = await tx.examSection.create({
            data: {
              examId: ver.examId,
              name: s.name,
              description: s.description,
              mark: s.mark ? new Prisma.Decimal(s.mark) : null,
              duration: s.duration,
              order: s.order || 0,
            },
          });
          sectionIdMap[s.id] = newSec.id;
        }
      }

      // 5. Recreate questions and their choices
      if (snap.questions && Array.isArray(snap.questions)) {
        for (const q of snap.questions) {
          const targetSectionId = q.sectionId ? (sectionIdMap[q.sectionId] || null) : null;
          
          await tx.question.create({
            data: {
              examId: ver.examId,
              text: q.text || "",
              type: q.type || "MCQ",
              qType: (q.qType || "MULTIPLE_CHOICE") as any,
              difficulty: (q.difficulty || "MEDIUM") as any,
              points: q.mark ? Number(q.mark) : 1,
              mark: q.mark ? Number(q.mark) : 1,
              explanation: q.explanation || "",
              questionText: q.text || "",
              order: q.order || 0,
              sortOrder: q.order || 0,
              imageUrl: q.imageUrl || null,
              pdfUrl: q.pdfUrl || null,
              sectionId: targetSectionId,
              isImported: !!q.isImported,
              choices: {
                create: (q.choices || []).map((c: any) => ({
                  text: c.text || "",
                  isCorrect: !!c.isCorrect,
                })),
              },
            },
          });
        }
      }
    });

    return { success: true };
  });
