import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seed...");

  // 1. Clean Up Existing Data
  console.log("Cleaning up old data...");
  await prisma.rolePermission.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.siteSetting.deleteMany({});
  await prisma.faq.deleteMany({});
  await prisma.profile.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create Roles
  console.log("Creating default roles...");
  const roleSuperAdmin = await prisma.role.create({
    data: { name: "SUPER_ADMIN", description: "المدير العام للمنصة - صلاحيات كاملة" },
  });
  const roleAdmin = await prisma.role.create({
    data: { name: "ADMIN", description: "مسؤول نظام - إدارة المحتوى والعمليات اليومية" },
  });
  const roleTeacher = await prisma.role.create({
    data: { name: "TEACHER", description: "مدرس - إدارة الدورات والدروس والطلاب والتقييمات" },
  });
  const roleStudent = await prisma.role.create({
    data: { name: "STUDENT", description: "طالب - تصفح، شراء، مشاهدة الدروس وحل الاختبارات" },
  });

  // 3. Create Permissions
  console.log("Creating default permissions...");
  const permissionsList = [
    { name: "view_super_admin_dashboard", description: "عرض لوحة المدير العام" },
    { name: "manage_admins", description: "إدارة المسؤولين والأدوار" },
    { name: "view_admin_dashboard", description: "عرض لوحة المسؤول" },
    { name: "manage_users", description: "إدارة حسابات المستخدمين والطلاب" },
    { name: "manage_teachers", description: "إعتماد وتعديل حسابات المعلمين" },
    { name: "manage_courses", description: "إدارة الدورات والمحتوى التعليمي" },
    { name: "view_teacher_dashboard", description: "عرض لوحة المعلم" },
    { name: "manage_assigned_courses", description: "تعديل محتوى الدورات المسندة" },
    { name: "manage_question_bank", description: "إدارة بنك الاختبارات والأسئلة" },
    { name: "manage_payments", description: "إدارة ومتابعة العمليات المالية" },
    { name: "manage_settings", description: "تعديل إعدادات المنصة العامة" },
  ];

  const permissions: Record<string, any> = {};
  for (const perm of permissionsList) {
    permissions[perm.name] = await prisma.permission.create({ data: perm });
  }

  // 4. Connect Roles to Permissions
  console.log("Mapping permissions to roles...");
  // Super Admin gets everything
  for (const permName of Object.keys(permissions)) {
    await prisma.rolePermission.create({
      data: {
        roleId: roleSuperAdmin.id,
        permissionId: permissions[permName].id,
      },
    });
  }

  // Admin permissions
  const adminPerms = [
    "view_admin_dashboard",
    "manage_users",
    "manage_teachers",
    "manage_courses",
    "manage_payments",
    "manage_settings",
  ];
  for (const permName of adminPerms) {
    await prisma.rolePermission.create({
      data: {
        roleId: roleAdmin.id,
        permissionId: permissions[permName].id,
      },
    });
  }

  // Teacher permissions
  const teacherPerms = [
    "view_teacher_dashboard",
    "manage_assigned_courses",
    "manage_question_bank",
  ];
  for (const permName of teacherPerms) {
    await prisma.rolePermission.create({
      data: {
        roleId: roleTeacher.id,
        permissionId: permissions[permName].id,
      },
    });
  }

  // 5. Create Seed Users & Profiles
  console.log("Creating seed users and profiles...");
  // We hash passwords. Here we just use mock text hashes or simple hashes.
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  const superAdminPasswordHash = process.env.SUPER_ADMIN_PASSWORD_HASH;

  if (!superAdminEmail || !superAdminPasswordHash) {
    throw new Error(
      "CONFIGURATION_ERROR: SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD_HASH environment variables must be defined.",
    );
  }

  const superadminUser = await prisma.user.create({
    data: {
      email: superAdminEmail,
      passwordHash: superAdminPasswordHash,
      role: UserRole.SUPER_ADMIN,
    },
  });
  await prisma.profile.create({
    data: {
      userId: superadminUser.id,
      name: "Mostafa Mahmoud Kishk",
      biography: "المدير العام والمطور الأساسي لمنصة التيورا التعليمية",
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: "admin@altiora.com",
      passwordHash: "admin123",
      role: UserRole.ADMIN,
    },
  });
  await prisma.profile.create({
    data: {
      userId: adminUser.id,
      name: "مسؤول النظام",
      biography: "مدير العمليات والدعم الفني للمنصة",
    },
  });

  const teacherUser = await prisma.user.create({
    data: {
      email: "teacher@altiora.com",
      passwordHash: "teacher123",
      role: UserRole.TEACHER,
    },
  });
  await prisma.profile.create({
    data: {
      userId: teacherUser.id,
      name: "أ. أحمد علي",
      biography: "مدرس خبير لمادة اللغة الإنجليزية بخبرة تزيد عن 15 عاماً",
      credentials: "ماجستير المناهج وطرق التدريس من جامعة عين شمس",
    },
  });

  const studentUser = await prisma.user.create({
    data: {
      email: "student@altiora.com",
      passwordHash: "student123",
      role: UserRole.STUDENT,
    },
  });
  await prisma.profile.create({
    data: {
      userId: studentUser.id,
      name: "عمر خالد",
      biography: "طالب بالصف الثالث الثانوي",
    },
  });

  // 6. Create Platform Settings
  console.log("Creating platform settings...");
  const settings = [
    { key: "site_name", value: "Altiora - التيورا" },
    {
      key: "site_logo",
      value:
        "https://storage.googleapis.com/gpt-engineer-file-uploads/AEsg1zggI4VE8xKalvu5HewFjSF2/social-images/social-1780788475646-image_(6).webp",
    },
    {
      key: "seo_description",
      value:
        "منصة التيورا التعليمية لتقديم أفضل الدورات لجميع المراحل الدراسية بأحدث الأساليب التفاعلية.",
    },
    { key: "maintenance_mode", value: "false" },
  ];
  for (const s of settings) {
    await prisma.siteSetting.create({ data: s });
  }

  // 7. Create FAQs
  console.log("Creating platform FAQs...");
  const faqs = [
    {
      question: "كيف يمكنني تفعيل الكود التعليمي الخاص بي؟",
      answer:
        "يمكنك إدخال الكود المستلم من المدرس مباشرة في صفحة تفعيل الأكواد لتفتح لك الدورة التعليمية فوراً.",
      category: "TECHNICAL",
      sortOrder: 1,
    },
    {
      question: "هل تعمل المنصة على الهواتف والأجهزة اللوحية؟",
      answer:
        "نعم، المنصة متوافقة 100% مع الهواتف الذكية والأجهزة اللوحية وتقدم تجربة استخدام ممتازة وسلسة.",
      category: "GENERAL",
      sortOrder: 2,
    },
  ];
  for (const f of faqs) {
    await prisma.faq.create({ data: f });
  }

  // 8. Create Categories and Courses
  console.log("Creating categories and courses...");
  const categoryEnglish = await prisma.category.create({
    data: {
      name: "اللغة الإنجليزية",
      description: "شرح شامل ومبسط لقواعد ومفردات اللغة الإنجليزية لجميع المستويات",
    },
  });

  const courseGrammar = await prisma.course.create({
    data: {
      title: "Epic Grammar 2026",
      description:
        "شرح قواعد اللغة الإنجليزية الشامل لجميع المراحل الثانوية والشهادة الإعدادية بالتفصيل وحل التدريبات المكثفة.",
      price: 500.0,
      coverImage:
        "https://storage.googleapis.com/gpt-engineer-file-uploads/AEsg1zggI4VE8xKalvu5HewFjSF2/social-images/social-1780788475646-image_(6).webp",
      categoryId: categoryEnglish.id,
      isFeatured: true,
      isArchived: false,
    },
  });

  // Connect Course to Teacher
  await prisma.courseInstructor.create({
    data: {
      courseId: courseGrammar.id,
      instructorId: teacherUser.id,
      commissionRate: 85.0, // 85% commission rate
    },
  });

  // Create Module
  const module1 = await prisma.module.create({
    data: {
      courseId: courseGrammar.id,
      title: "الوحدة الأولى: Present Tenses (الأزمنة الحاضرة)",
      sortOrder: 1,
    },
  });

  // Create Lesson
  const lesson1 = await prisma.lesson.create({
    data: {
      moduleId: module1.id,
      title: "Present Simple & Continuous",
      sortOrder: 1,
      isPreview: true,
    },
  });

  // Lesson attachment
  await prisma.pdfFile.create({
    data: {
      lessonId: lesson1.id,
      title: "ملخص شرح زمن المضارع البسيط والمستمر PDF",
      fileUrl: "http://example.com/grammar-pdf.pdf",
    },
  });

  // Video Metadata
  await prisma.videoMetadata.create({
    data: {
      lessonId: lesson1.id,
      videoUrl: "http://example.com/video1.mp4",
      duration: 1800, // 30 minutes
      size: BigInt(245670890),
    },
  });

  // 9. Create Sample Quiz
  console.log("Creating quiz questions...");
  const exam = await prisma.exam.create({
    data: {
      courseId: courseGrammar.id,
      lessonId: lesson1.id,
      title: "اختبار زمن المضارع البسيط",
      durationLimit: 15,
      passScore: 60.0,
      maxAttempts: 3,
    },
  });

  const question1 = await prisma.question.create({
    data: {
      examId: exam.id,
      text: "He _______ to school every day.",
      type: "MCQ",
      sortOrder: 1,
      points: 5,
    },
  });

  await prisma.choice.createMany({
    data: [
      { questionId: question1.id, text: "go", isCorrect: false, sortOrder: 1 },
      { questionId: question1.id, text: "goes", isCorrect: true, sortOrder: 2 },
      { questionId: question1.id, text: "going", isCorrect: false, sortOrder: 3 },
      { questionId: question1.id, text: "went", isCorrect: false, sortOrder: 4 },
    ],
  });

  console.log("Database seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
