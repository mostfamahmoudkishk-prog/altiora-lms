import { z } from "zod";

// User Schemas
export const UserRoleSchema = z.enum(["STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN"]);

export const RegisterUserSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح"),
  password: z.string().min(6, "كلمة المرور يجب ألا تقل عن 6 أحرف"),
  name: z.string().min(2, "الاسم يجب أن يحتوي على حرفين على الأقل"),
  role: UserRoleSchema.optional().default("STUDENT"),
});

export const LoginUserSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
  deviceFingerprint: z.string().optional(),
});

// Profile Schema
export const UpdateProfileSchema = z.object({
  name: z.string().min(2, "الاسم يجب أن يحتوي على حرفين على الأقل").optional(),
  avatarUrl: z.string().url("رابط الصورة غير صالح").optional().nullable(),
  biography: z.string().optional().nullable(),
  credentials: z.string().optional().nullable(),
});

// Category & Course Schemas
export const CategorySchema = z.object({
  name: z.string().min(2, "اسم التصنيف مطلوب"),
  description: z.string().optional(),
});

export const CourseSchema = z.object({
  title: z.string().min(3, "عنوان الدورة مطلوب"),
  description: z.string().optional(),
  price: z.number().min(0, "السعر يجب أن يكون 0 أو أكثر"),
  coverImage: z.string().url().optional().nullable(),
  categoryId: z.string().uuid("التصنيف غير صحيح"),
  isFeatured: z.boolean().optional().default(false),
  isArchived: z.boolean().optional().default(false),
});

export const ModuleSchema = z.object({
  courseId: z.string().uuid("رقم الدورة غير صحيح"),
  title: z.string().min(2, "عنوان الوحدة مطلوب"),
  sortOrder: z.number().int().optional().default(0),
});

export const LessonSchema = z.object({
  moduleId: z.string().uuid("رقم الوحدة غير صحيح"),
  title: z.string().min(2, "عنوان الدرس مطلوب"),
  sortOrder: z.number().int().optional().default(0),
  isPreview: z.boolean().optional().default(false),
});

// Access Code Schema
export const StudentAccessCodeSchema = z.object({
  code: z.string().min(6, "الكود يجب ألا يقل عن 6 رموز"),
  courseId: z.string().uuid(),
  maxUsage: z.number().int().positive().optional().default(1),
  expiresAt: z.string().datetime().optional().nullable(),
});

// Exam & Anti-Cheat Schemas
export const QuestionTypeSchema = z.enum(["MCQ", "TRUE_FALSE", "ORDERING"]);

export const ChoiceSchema = z.object({
  text: z.string().min(1, "محتوى الخيار مطلوب"),
  isCorrect: z.boolean().optional().default(false),
  sortOrder: z.number().int().optional().default(0),
});

export const QuestionSchema = z.object({
  text: z.string().min(2, "محتوى السؤال مطلوب"),
  type: QuestionTypeSchema,
  sortOrder: z.number().int().optional().default(0),
  points: z.number().int().positive().optional().default(1),
  choices: z.array(ChoiceSchema).min(2, "يجب إدخال خيارين على الأقل"),
});

export const ExamSchema = z.object({
  courseId: z.string().uuid(),
  lessonId: z.string().uuid().optional().nullable(),
  title: z.string().min(3, "عنوان الاختبار مطلوب"),
  durationLimit: z.number().int().nonnegative("وقت الاختبار بالدقائق"),
  passScore: z.number().min(0).max(100),
  maxAttempts: z.number().int().positive().optional().default(1),
  questions: z.array(QuestionSchema).optional(),
});

export const AntiCheatEventSchema = z.object({
  examId: z.string().uuid(),
  attemptId: z.string().uuid(),
  eventType: z.enum(["TAB_SWITCH", "ESCAPE_FULLSCREEN", "MINIMIZE"]),
  details: z.string().optional(),
});

// Payments
export const CreateOrderSchema = z.object({
  courseId: z.string().uuid(),
  couponCode: z.string().optional(),
  gateway: z.enum(["STRIPE", "PAYPAL", "FAWRY"]),
});

// Community
export const CommentSchema = z.object({
  lessonId: z.string().uuid(),
  text: z.string().min(1, "التعليق لا يمكن أن يكون فارغاً"),
  parentId: z.string().uuid().optional().nullable(),
});

export const DiscussionSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(4, "عنوان النقاش مطلوب"),
  content: z.string().min(10, "محتوى النقاش قصير جداً"),
});

// Support Ticket Schema
export const SupportTicketSchema = z.object({
  title: z.string().min(4, "عنوان التذكرة مطلوب"),
  description: z.string().min(10, "محتوى التذكرة مطلوب"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional().default("LOW"),
});

export const TicketReplySchema = z.object({
  ticketId: z.string().uuid(),
  message: z.string().min(1, "الرد مطلوب"),
});

// Settings
export const SiteSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
});
