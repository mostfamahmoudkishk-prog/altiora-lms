import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("=========================================");
  console.log("🚀 Starting Demo Course Seed Script...");
  console.log("=========================================");

  // 1. Create or Retrieve Teacher Account (قاسم)
  const teacherEmail = "qasem@altiora.com";
  let teacherUser = await prisma.user.findUnique({ where: { email: teacherEmail } });
  
  if (teacherUser) {
    console.log(`Teacher account found: ${teacherEmail}. Reusing.`);
    // Ensure role is correct
    await prisma.user.update({
      where: { id: teacherUser.id },
      data: { role: UserRole.TEACHER },
    });
  } else {
    console.log(`Creating teacher account: ${teacherEmail}`);
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("password123", salt);
    teacherUser = await prisma.user.create({
      data: {
        email: teacherEmail,
        passwordHash,
        role: UserRole.TEACHER,
      },
    });
  }

  // Create/Update Teacher Profile
  await prisma.profile.upsert({
    where: { userId: teacherUser.id },
    create: {
      userId: teacherUser.id,
      name: "قاسم",
      biography: "أستاذ ومطور برمجيات ذو خبرة تزيد عن 10 سنوات في لغة بايثون والذكاء الاصطناعي.",
      credentials: "ماجستير علوم الحاسب وتطوير النظم التفاعلية",
    },
    update: {
      name: "قاسم",
      biography: "أستاذ ومطور برمجيات ذو خبرة تزيد عن 10 سنوات في لغة بايثون والذكاء الاصطناعي.",
    },
  });

  // 2. Create or Retrieve Student Account (أحمد)
  const studentEmail = "ahmed@altiora.com";
  let studentUser = await prisma.user.findUnique({ where: { email: studentEmail } });
  
  if (studentUser) {
    console.log(`Student account found: ${studentEmail}. Reusing.`);
    await prisma.user.update({
      where: { id: studentUser.id },
      data: { role: UserRole.STUDENT },
    });
  } else {
    console.log(`Creating student account: ${studentEmail}`);
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("password123", salt);
    studentUser = await prisma.user.create({
      data: {
        email: studentEmail,
        passwordHash,
        role: UserRole.STUDENT,
      },
    });
  }

  // Create/Update Student Profile
  await prisma.profile.upsert({
    where: { userId: studentUser.id },
    create: {
      userId: studentUser.id,
      name: "أحمد",
      biography: "طالب طموح يسعى لتعلم البرمجة وتطوير مهاراته لحل مشكلات العالم الحقيقي.",
    },
    update: {
      name: "أحمد",
    },
  });

  // 3. Create or Retrieve Category (Programming)
  const categoryName = "Programming";
  let category = await prisma.category.findFirst({ where: { name: categoryName } });
  if (!category) {
    console.log(`Creating category: ${categoryName}`);
    category = await prisma.category.create({
      data: {
        name: categoryName,
        description: "كورسات متخصصة في البرمجة وهندسة البرمجيات وقواعد البيانات",
      },
    });
  }

  // 4. Clean up any existing Demo Course to avoid duplicates
  const courseTitle = "أساسيات البرمجة باستخدام Python";
  const existingCourse = await prisma.course.findFirst({ where: { title: courseTitle } });
  if (existingCourse) {
    console.log(`Found existing demo course: "${courseTitle}". Removing old structure to prevent duplication...`);
    await prisma.course.delete({ where: { id: existingCourse.id } });
  }

  // 5. Create Demo Course
  console.log(`Creating course: "${courseTitle}"`);
  const course = await prisma.course.create({
    data: {
      title: courseTitle,
      description: "دورة تجريبية ممتازة وتفاعلية لاختبار جميع خصائص المنصة من دروس مباشرة، اختبارات ذكية وواجبات عملية.",
      price: 199.00,
      coverImage: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=60",
      categoryId: category.id,
      isFeatured: true,
      isArchived: false,
    },
  });

  // Link Course to Teacher
  await prisma.courseInstructor.create({
    data: {
      courseId: course.id,
      instructorId: teacherUser.id,
      commissionRate: 85.00,
    },
  });

  // 6. Create 4 Modules
  const moduleTitles = [
    "الوحدة الأولى: المقدمة وإعداد بيئة العمل",
    "الوحدة الثانية: المتغيرات وأساسيات التخزين",
    "الوحدة الثالثة: الهياكل الشرطية وحلقات التكرار",
    "الوحدة الرابعة: الدوال والمصفوفات البرمجية",
  ];

  const modules = [];
  for (let i = 0; i < moduleTitles.length; i++) {
    console.log(`Creating module: ${moduleTitles[i]}`);
    const mod = await prisma.module.create({
      data: {
        courseId: course.id,
        title: moduleTitles[i],
        sortOrder: i + 1,
      },
    });
    modules.push(mod);
  }

  // 7. Create 12 Lessons (3 per module)
  const lessonDefinitions = [
    // Module 1
    { title: "تثبيت بايثون وإعداد VS Code", isPreview: true, moduleId: modules[0].id },
    { title: "كتابة أول برنامج Hello World", isPreview: true, moduleId: modules[0].id },
    { title: "فهم بيئة تشغيل بايثون وتفسير الأكواد", isPreview: true, moduleId: modules[0].id },
    // Module 2
    { title: "المتغيرات وطرق تعريفها وحجز الذاكرة", isPreview: false, moduleId: modules[1].id },
    { title: "أنواع البيانات الرقمية والنصية في بايثون", isPreview: false, moduleId: modules[1].id },
    { title: "العمليات الحسابية والمنطقية الأساسية", isPreview: false, moduleId: modules[1].id },
    // Module 3
    { title: "الجمل الشرطية واتخاذ القرار If - Else", isPreview: false, moduleId: modules[2].id },
    { title: "حلقات التكرار For Loops والتحكم في العد", isPreview: false, moduleId: modules[2].id },
    { title: "حلقات التكرار While Loops والشرط المستمر", isPreview: false, moduleId: modules[2].id },
    // Module 4
    { title: "تعريف الدوال def وكتابة كود يعاد استخدامه", isPreview: false, moduleId: modules[3].id },
    { title: "البارامترات المدخلة والقيم المسترجعة return", isPreview: false, moduleId: modules[3].id },
    { title: "المصفوفات والقوائم Lists والعمليات عليها", isPreview: false, moduleId: modules[3].id },
  ];

  const lessons = [];
  for (let i = 0; i < lessonDefinitions.length; i++) {
    const def = lessonDefinitions[i];
    console.log(`Creating lesson ${i + 1}/12: ${def.title}`);
    const les = await prisma.lesson.create({
      data: {
        moduleId: def.moduleId,
        title: def.title,
        sortOrder: i + 1,
        isPreview: def.isPreview,
      },
    });
    lessons.push(les);

    // Create Video Metadata
    await prisma.videoMetadata.create({
      data: {
        lessonId: les.id,
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        duration: 240, // 4 minutes
        size: BigInt(12500000),
      },
    });

    // Create Lesson Settings stored inside SiteSetting table
    const key = `lesson_settings_${les.id}`;
    const settingsValue = JSON.stringify({
      mustFinishExamBeforeVideo: false,
      pdfUrl: `https://example.com/python_lesson_${i + 1}.pdf`,
      homework: `الواجب العملي للدرس رقم ${i + 1}: قم بكتابة الكود وتجريبه عملياً.`,
      notes: `شرح وتلخيص مكتوب لمحتويات المحاضرة ${i + 1}`,
      summary: `تلخيص سريع لأهم نقاط الدرس ${i + 1}`,
    });
    await prisma.siteSetting.upsert({
      where: { key },
      create: { key, value: settingsValue },
      update: { value: settingsValue },
    });
  }

  // 8. Attach Resources to Lessons
  console.log("Attaching resources (PDF, Docx, Pptx, ZIP)...");
  // PDF
  await prisma.pdfFile.create({
    data: {
      lessonId: lessons[0].id,
      title: "دليل تثبيت بايثون وإعداد بيئة العمل PDF",
      fileUrl: "https://example.com/python-install.pdf",
    },
  });
  // Word Document
  await prisma.attachment.create({
    data: {
      lessonId: lessons[1].id,
      title: "ملخص نص البرمجة الأول Docx",
      fileUrl: "https://example.com/helloworld-summary.docx",
      fileType: "docx",
    },
  });
  // PowerPoint Presentation
  await prisma.attachment.create({
    data: {
      lessonId: lessons[3].id,
      title: "عرض تقديمي عن أنواع البيانات PPTX",
      fileUrl: "https://example.com/variables.pptx",
      fileType: "pptx",
    },
  });
  // ZIP File
  await prisma.attachment.create({
    data: {
      lessonId: lessons[5].id,
      title: "حزمة تدريبات ومشاريع عملية ZIP",
      fileUrl: "https://example.com/exercises.zip",
      fileType: "zip",
    },
  });

  // 9. Create Exams (Quizzes)
  console.log("Creating Quiz 1 (Basics)...");
  const quiz1 = await prisma.exam.create({
    data: {
      courseId: course.id,
      lessonId: lessons[2].id, // Module 1 Lesson 3
      title: "اختبار أساسيات بايثون",
      description: "اختبار تجريبي مكون من 5 أسئلة اختيار من متعدد لقياس فهمك لأساسيات بايثون وبيئة العمل.",
      durationLimit: 10,
      passScore: 60.00,
      maxAttempts: 3,
      isPublished: true,
      published: true,
      shuffleQuestions: true,
    },
  });

  const quiz1Questions = [
    {
      text: "ما هي الجملة الصحيحة لطباعة نص في لغة بايثون؟",
      choices: [
        { text: "print('Hello World')", isCorrect: true },
        { text: "echo('Hello World')", isCorrect: false },
        { text: "system.out.print('Hello World')", isCorrect: false },
        { text: "console.log('Hello World')", isCorrect: false },
      ],
    },
    {
      text: "كيف يتم كتابة تعليق (Comment) ذو سطر واحد في بايثون؟",
      choices: [
        { text: "# هذا تعليق", isCorrect: true },
        { text: "// هذا تعليق", isCorrect: false },
        { text: "/* هذا تعليق */", isCorrect: false },
        { text: "<!-- هذا تعليق -->", isCorrect: false },
      ],
    },
    {
      text: "أي من الأسماء التالية غير صالح كاسم متغير في بايثون؟",
      choices: [
        { text: "2myVariable", isCorrect: true },
        { text: "my_variable_2", isCorrect: false },
        { text: "_myVariable", isCorrect: false },
        { text: "myVariable2", isCorrect: false },
      ],
    },
    {
      text: "ما هي صيغة الامتداد الصحيحة لملفات بايثون البرمجية؟",
      choices: [
        { text: ".py", isCorrect: true },
        { text: ".python", isCorrect: false },
        { text: ".pt", isCorrect: false },
        { text: ".pyt", isCorrect: false },
      ],
    },
    {
      text: "ما هي وظيفة الدالة input() المدمجة في بايثون؟",
      choices: [
        { text: "استقبال المدخلات النصية من المستخدم", isCorrect: true },
        { text: "طباعة المخرجات على الشاشة", isCorrect: false },
        { text: "تحويل النص إلى رقم صحيح", isCorrect: false },
        { text: "إيقاف البرنامج فوراً", isCorrect: false },
      ],
    },
  ];

  for (let i = 0; i < quiz1Questions.length; i++) {
    const qData = quiz1Questions[i];
    const q = await prisma.question.create({
      data: {
        examId: quiz1.id,
        text: qData.text,
        type: "MCQ",
        qType: "MULTIPLE_CHOICE",
        points: 2,
        sortOrder: i + 1,
      },
    });

    for (let cIdx = 0; cIdx < qData.choices.length; cIdx++) {
      const c = qData.choices[cIdx];
      await prisma.choice.create({
        data: {
          questionId: q.id,
          text: c.text,
          isCorrect: c.isCorrect,
          sortOrder: cIdx + 1,
        },
      });
    }
  }

  console.log("Creating Quiz 2 (MCQ + True/False)...");
  const quiz2 = await prisma.exam.create({
    data: {
      courseId: course.id,
      lessonId: lessons[5].id, // Module 2 Lesson 3
      title: "اختبار العمليات والمتغيرات",
      description: "اختبار تفاعلي يدمج بين الاختيار من متعدد وصح أو خطأ لقياس فهم العمليات الرياضية.",
      durationLimit: 15,
      passScore: 50.00,
      maxAttempts: 3,
      isPublished: true,
      published: true,
    },
  });

  // MCQ
  const q2_1 = await prisma.question.create({
    data: {
      examId: quiz2.id,
      text: "ما هي قيمة المتغير x بعد تنفيذ السطر التالي: x = 10 - 2 * 3 ؟",
      type: "MCQ",
      qType: "MULTIPLE_CHOICE",
      points: 4,
      sortOrder: 1,
    },
  });
  await prisma.choice.createMany({
    data: [
      { questionId: q2_1.id, text: "4", isCorrect: true, sortOrder: 1 },
      { questionId: q2_1.id, text: "24", isCorrect: false, sortOrder: 2 },
      { questionId: q2_1.id, text: "8", isCorrect: false, sortOrder: 3 },
      { questionId: q2_1.id, text: "16", isCorrect: false, sortOrder: 4 },
    ],
  });

  // True/False
  const q2_2 = await prisma.question.create({
    data: {
      examId: quiz2.id,
      text: "لغة بايثون هي لغة حساسة لحالة الأحرف الكبيرة والصغيرة (Case Sensitive) للمتغيرات.",
      type: "TRUE_FALSE",
      qType: "TRUE_FALSE",
      points: 3,
      sortOrder: 2,
    },
  });
  await prisma.choice.createMany({
    data: [
      { questionId: q2_2.id, text: "صح", isCorrect: true, sortOrder: 1 },
      { questionId: q2_2.id, text: "خطأ", isCorrect: false, sortOrder: 2 },
    ],
  });

  // True/False
  const q2_3 = await prisma.question.create({
    data: {
      examId: quiz2.id,
      text: "لا يمكن تعديل قيمة متغير أو تغيير نوع البيانات المخزنة فيه بعد تعريفه الأول في بايثون.",
      type: "TRUE_FALSE",
      qType: "TRUE_FALSE",
      points: 3,
      sortOrder: 3,
    },
  });
  await prisma.choice.createMany({
    data: [
      { questionId: q2_3.id, text: "صح", isCorrect: false, sortOrder: 1 },
      { questionId: q2_3.id, text: "خطأ", isCorrect: true, sortOrder: 2 },
    ],
  });

  console.log("Creating Quiz 3 (Essay + Short Answer)...");
  const quiz3 = await prisma.exam.create({
    data: {
      courseId: course.id,
      lessonId: lessons[11].id, // Module 4 Lesson 3 (Course Final)
      title: "الاختبار النهائي للدورة",
      description: "الاختبار التجميعي النهائي ويحتوي على أسئلة مقالية وقصيرة لقياس الفهم الكلي للدورة.",
      durationLimit: 30,
      passScore: 70.00,
      maxAttempts: 2,
      isPublished: true,
      published: true,
    },
  });

  // Essay Question
  const q3_1 = await prisma.question.create({
    data: {
      examId: quiz3.id,
      text: "اشرح بالتفصيل مفهوم الدوال (Functions) في بايثون، واذكر ثلاثة فوائد برمجية لاستخدامها في تنظيم الكود.",
      type: "MCQ", // mapped for database constraint compatibility
      qType: "ESSAY",
      points: 10,
      sortOrder: 1,
      explanation: "الدوال تمنع التكرار وتسهل الصيانة وتزيد مقروئية الكود.",
    },
  });

  // Short Answer Question
  const q3_2 = await prisma.question.create({
    data: {
      examId: quiz3.id,
      text: "ما هي الدالة المدمجة المستخدمة لحساب عدد العناصر أو طول القائمة (List) في بايثون؟",
      type: "MCQ",
      qType: "SHORT_ANSWER",
      points: 5,
      sortOrder: 2,
      explanation: "الدالة len()",
    },
  });

  // 10. Create 2 Assignments (mapped as essay exams for file uploads)
  console.log("Creating Assignment 1...");
  const assignment1 = await prisma.exam.create({
    data: {
      courseId: course.id,
      lessonId: lessons[1].id, // Module 1 Lesson 2
      title: "الواجب العملي الأول: حساب مساحة الدائرة",
      description: "قم بكتابة برنامج بايثون يستقبل نصف القطر من المستخدم ثم يطبع مساحة الدائرة. ارفع الكود كملف أو اكتبه.",
      durationLimit: 0,
      passScore: 50.00,
      maxAttempts: 5,
      isPublished: true,
      published: true,
    },
  });
  const qAsg1 = await prisma.question.create({
    data: {
      examId: assignment1.id,
      text: "اكتب برنامجاً بلغة بايثون يستقبل نصف قطر الدائرة من المستخدم ثم يحسب ويطبع مساحتها. قم برفع ملف الكود (.py) أو كتابة الكود هنا.",
      type: "MCQ",
      qType: "ESSAY",
      points: 20,
      sortOrder: 1,
    },
  });

  console.log("Creating Assignment 2...");
  const assignment2 = await prisma.exam.create({
    data: {
      courseId: course.id,
      lessonId: lessons[7].id, // Module 3 Lesson 2
      title: "الواجب العملي الثاني: عكس النصوص",
      description: "اكتب دالة تستقبل نصاً وتطبع النص معكوساً. ارفع الكود كملف.",
      durationLimit: 0,
      passScore: 50.00,
      maxAttempts: 5,
      isPublished: true,
      published: true,
    },
  });
  const qAsg2 = await prisma.question.create({
    data: {
      examId: assignment2.id,
      text: "اكتب دالة تستقبل نصاً وتقوم بإرجاع هذا النص معكوساً. على سبيل المثال: 'python' تصبح 'nohtyp'. قم برفع الملف أو كتابة الكود هنا.",
      type: "MCQ",
      qType: "ESSAY",
      points: 20,
      sortOrder: 1,
    },
  });

  // 11. Enroll Student احمد automatically in the Course
  console.log(`Enrolling student Ahmed (${studentEmail}) in the Python course...`);
  const enrollment = await prisma.enrollment.upsert({
    where: {
      studentId_courseId: {
        studentId: studentUser.id,
        courseId: course.id,
      },
    },
    create: {
      studentId: studentUser.id,
      courseId: course.id,
      completionRate: 66.67, // احمد completed 8 out of 12 lessons
      watchTime: 2400,
      lastActivity: new Date(),
    },
    update: {
      completionRate: 66.67,
      watchTime: 2400,
      lastActivity: new Date(),
    },
  });

  // 12. Create Ahmed's Lesson Progress
  console.log("Populating Ahmed's progress (Completed 8 lessons, 1 partial)...");
  // Completed lessons: index 0 to 7
  for (let i = 0; i < 8; i++) {
    const les = lessons[i];
    await prisma.studentProgress.upsert({
      where: {
        studentId_lessonId: { studentId: studentUser.id, lessonId: les.id },
      },
      create: {
        studentId: studentUser.id,
        lessonId: les.id,
        courseId: course.id,
        completed: true,
        completedAt: new Date(Date.now() - (8 - i) * 3600 * 1000),
      },
      update: {
        completed: true,
        completedAt: new Date(Date.now() - (8 - i) * 3600 * 1000),
      },
    });

    await prisma.userWatchProgress.upsert({
      where: {
        user_id_lesson_id: { user_id: studentUser.id, lesson_id: les.id },
      },
      create: {
        user_id: studentUser.id,
        lesson_id: les.id,
        current_second: 240,
        duration: 240,
        watched_percentage: 100.0,
      },
      update: {
        current_second: 240,
        duration: 240,
        watched_percentage: 100.0,
      },
    });

    await prisma.continueWatching.upsert({
      where: {
        studentId_lessonId: { studentId: studentUser.id, lessonId: les.id },
      },
      create: {
        studentId: studentUser.id,
        lessonId: les.id,
        courseId: course.id,
        currentSecond: 240,
        lastViewed: new Date(),
      },
      update: {
        currentSecond: 240,
        lastViewed: new Date(),
      },
    });
  }

  // Partial Lesson: index 8 (Lesson 9)
  const partialLes = lessons[8];
  await prisma.studentProgress.upsert({
    where: {
      studentId_lessonId: { studentId: studentUser.id, lessonId: partialLes.id },
    },
    create: {
      studentId: studentUser.id,
      lessonId: partialLes.id,
      courseId: course.id,
      completed: false,
    },
    update: {
      completed: false,
    },
  });

  await prisma.userWatchProgress.upsert({
    where: {
      user_id_lesson_id: { user_id: studentUser.id, lesson_id: partialLes.id },
    },
    create: {
      user_id: studentUser.id,
      lesson_id: partialLes.id,
      current_second: 96,
      duration: 240,
      watched_percentage: 40.0,
    },
    update: {
      current_second: 96,
      duration: 240,
      watched_percentage: 40.0,
    },
  });

  await prisma.continueWatching.upsert({
    where: {
      studentId_lessonId: { studentId: studentUser.id, lessonId: partialLes.id },
    },
    create: {
      studentId: studentUser.id,
      lessonId: partialLes.id,
      courseId: course.id,
      currentSecond: 96,
      lastViewed: new Date(),
    },
    update: {
      currentSecond: 96,
      lastViewed: new Date(),
    },
  });

  // 13. Create Exam Attempts for احمد
  console.log("Generating exam and quiz attempts...");
  // Attempt Quiz 1 (Score: 80.00 / 80%, Passed)
  const quiz1Choices = await prisma.choice.findMany({
    where: { question: { examId: quiz1.id } },
  });

  const attempt1 = await prisma.examAttempt.create({
    data: {
      examId: quiz1.id,
      studentId: studentUser.id,
      score: 80.00,
      passed: true,
      startedAt: new Date(Date.now() - 2 * 3600 * 1000),
      completedAt: new Date(Date.now() - 2 * 3600 * 1000 + 5 * 60 * 1000),
      isPendingManualReview: false,
      isPublished: true,
      publishedAt: new Date(),
    },
  });

  // Add answers for Quiz 1
  const quiz1QuestionsList = await prisma.question.findMany({ where: { examId: quiz1.id } });
  for (let idx = 0; idx < quiz1QuestionsList.length; idx++) {
    const q = quiz1QuestionsList[idx];
    const qChoices = quiz1Choices.filter((c) => c.questionId === q.id);
    
    // Choose correct choice for first 4 questions, incorrect for the last
    const correctC = qChoices.find((c) => c.isCorrect);
    const incorrectC = qChoices.find((c) => !c.isCorrect);
    const selectedC = (idx < 4) ? correctC : incorrectC;

    await prisma.examAttemptAnswer.create({
      data: {
        attemptId: attempt1.id,
        questionId: q.id,
        selectedChoiceId: selectedC?.id || null,
      },
    });
  }

  // Attempt Assignment 1 (Submitted code, manually reviewed with teacher feedback)
  const attemptAsg1 = await prisma.examAttempt.create({
    data: {
      examId: assignment1.id,
      studentId: studentUser.id,
      score: 95.00,
      passed: true,
      startedAt: new Date(Date.now() - 24 * 3600 * 1000),
      completedAt: new Date(Date.now() - 24 * 3600 * 1000 + 10 * 60 * 1000),
      isPendingManualReview: false,
      manualScore: 95.00,
      teacherFeedback: "عمل رائع ومتميز يا أحمد! الكود منظم جداً، والحل سليم وخالٍ من الأخطاء المنطقية. أحسنت استخدام الدالة وتطبيق مدخلات المستخدم.",
      isPublished: true,
      publishedAt: new Date(),
      reviewedById: teacherUser.id,
      reviewedAt: new Date(),
    },
  });

  await prisma.examAttemptAnswer.create({
    data: {
      attemptId: attemptAsg1.id,
      questionId: qAsg1.id,
      essayAnswerText: "import math\nradius = float(input('أدخل نصف القطر: '))\narea = math.pi * (radius ** 2)\nprint('مساحة الدائرة هي:', area)\n\n# رابط رفع الملف: https://supabase.altiora.com/storage/v1/object/public/assignments/ahmed-circle.py",
    },
  });

  await prisma.essayAnswer.create({
    data: {
      attemptId: attemptAsg1.id,
      questionId: qAsg1.id,
      answerText: "import math\nradius = float(input('أدخل نصف القطر: '))\narea = math.pi * (radius ** 2)\nprint('مساحة الدائرة هي:', area)\n\n# رابط المرفق: https://supabase.altiora.com/storage/v1/object/public/assignments/ahmed-circle.py",
      teacherGrade: 95.00,
      teacherFeedback: "ممتاز جداً يا أحمد، طريقة ممتازة لحساب المساحة.",
    },
  });

  // Attempt Assignment 2 (Pending Manual Review)
  const attemptAsg2 = await prisma.examAttempt.create({
    data: {
      examId: assignment2.id,
      studentId: studentUser.id,
      score: 0.00,
      passed: false,
      startedAt: new Date(Date.now() - 3 * 3600 * 1000),
      completedAt: new Date(Date.now() - 3 * 3600 * 1000 + 15 * 60 * 1000),
      isPendingManualReview: true,
      isPublished: false,
    },
  });

  await prisma.examAttemptAnswer.create({
    data: {
      attemptId: attemptAsg2.id,
      questionId: qAsg2.id,
      essayAnswerText: "def reverse_string(text):\n    return text[::-1]\n\nprint(reverse_string('python'))\n# ملف الكود البرمجي المرفق: reverse.py",
    },
  });

  await prisma.essayAnswer.create({
    data: {
      attemptId: attemptAsg2.id,
      questionId: qAsg2.id,
      answerText: "def reverse_string(text):\n    return text[::-1]\n\nprint(reverse_string('python'))\n# ملف الكود البرمجي المرفق: reverse.py",
    },
  });

  // 14. Create Certificate for Student Ahmed
  console.log("Issuing certificate for Ahmed...");
  await prisma.certificate.create({
    data: {
      studentId: studentUser.id,
      courseId: course.id,
      certificateNumber: `ALT-${studentUser.id.substring(0, 6).toUpperCase()}-${course.id.substring(0, 6).toUpperCase()}`,
      qrCodeUrl: "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://altiora.academy/verify/ALT-DEMO",
      pdfFileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      issuedAt: new Date(Date.now() - 12 * 3600 * 1000),
    },
  });

  // 15. Create Notifications for أحمد
  console.log("Generating notifications...");
  const notificationsData = [
    {
      title: "مرحباً بك في دورة أساسيات بايثون! 🎉",
      message: "تم تسجيلك بنجاح في دورة أساسيات البرمجة باستخدام Python مع الأستاذ قاسم. ابدأ رحلتك التعليمية الآن!",
      type: "SUCCESS",
      isRead: false,
    },
    {
      title: "تم تقييم الواجب الأول: مساحة الدائرة ✅",
      message: "قام الأستاذ قاسم بتقييم تسليمك للواجب الأول. حصلت على 95/100 مع ملاحظات ممتازة. أحسنت!",
      type: "EXAM_RESULT",
      isRead: true,
    },
    {
      title: "بث مباشر مجدول غداً 🗓️",
      message: "لديك محاضرة مباشرة غداً لمراجعة أساسيات البرمجة وحل تمارين المحاضرة الأولى مع الأستاذ قاسم.",
      type: "LIVE_SESSION",
      isRead: false,
    },
  ];

  for (const n of notificationsData) {
    await prisma.notification.create({
      data: {
        userId: studentUser.id,
        title: n.title,
        message: n.message,
        body: n.message,
        type: n.type,
        isRead: n.isRead,
        read: n.isRead,
        createdAt: new Date(),
        created_at: new Date(),
      },
    });
  }

  // 16. Create Leaderboard and Entry for Ahmed (XP points)
  console.log("Populating Leaderboard statistics...");
  const leaderboard = await prisma.leaderboard.create({
    data: {
      courseId: course.id,
      displayMode: "REAL_NAMES",
      isHidden: false,
    },
  });

  await prisma.leaderboardEntry.create({
    data: {
      leaderboardId: leaderboard.id,
      studentId: studentUser.id,
      points: 850.00, // Ahmed's XP Points
      rank: 1,
      medal: "GOLD",
      examsPoints: 280.00,
      courseCompPoints: 400.00,
      assignmentsPoints: 170.00,
      attendancePoints: 0.00,
    },
  });

  // 17. Create Timeline Activities & Badges (ActivityTimeline)
  console.log("Logging timeline activities and achievements...");
  const timelineEvents = [
    {
      activityType: "ENROLLED_COURSE",
      metadata: { courseTitle: courseTitle, courseId: course.id },
    },
    {
      activityType: "COMPLETED_LESSON",
      metadata: { lessonTitle: "تثبيت بايثون وإعداد VS Code", lessonId: lessons[0].id },
    },
    {
      activityType: "EARNED_BADGE",
      metadata: {
        badgeName: "مستكشف بايثون الأول",
        badgeIcon: "Award",
        description: "أكملت أول وحدة بنجاح وحصلت على شارة البداية!",
      },
    },
    {
      activityType: "EARNED_BADGE",
      metadata: {
        badgeName: "بطل القوائم",
        badgeIcon: "List",
        description: "أكملت وحدة المصفوفات والقوائم بنجاح!",
      },
    },
    {
      activityType: "EARNED_XP",
      metadata: { amount: 100, reason: "إكمال اختبار أساسيات بايثون بدرجة ممتازة" },
    },
  ];

  for (const ev of timelineEvents) {
    await prisma.activityTimeline.create({
      data: {
        studentId: studentUser.id,
        activityType: ev.activityType,
        metadata: ev.metadata,
      },
    });
  }

  // 18. Create LiveSession Event (Calendar Event)
  console.log("Creating LiveSession calendar event...");
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(18, 0, 0, 0); // 6:00 PM tomorrow

  await prisma.liveSession.create({
    data: {
      courseId: course.id,
      teacherId: teacherUser.id,
      title: "مراجعة وحل تمارين المحاضرة الأولى والمفاهيم الأساسية",
      description: "بث مباشر تفاعلي لمراجعة تثبيت بايثون وحل أول واجب عملي والرد على أسئلة الطلاب.",
      status: "WAITING",
      countdownEnd: tomorrow,
      startedAt: tomorrow,
    },
  });

  // 19. Create Sample Discussion Comments in Lesson 1.1
  console.log("Adding lesson discussion comments...");
  const rootComment = await prisma.comment.create({
    data: {
      lessonId: lessons[0].id,
      authorId: studentUser.id,
      text: "الدرس ممتاز ومبسط جداً يا أستاذ قاسم، لقد تغلبت على مشكلة تثبيت بايثون أخيراً بفضل الشرح!",
    },
  });

  await prisma.comment.create({
    data: {
      lessonId: lessons[0].id,
      authorId: teacherUser.id,
      parentId: rootComment.id,
      text: "بالتوفيق لك يا أحمد، يسعدني جداً سماع ذلك! تذكر دائماً ممارسة الكود عملياً لتثبيت المعلومة.",
    },
  });

  console.log("=========================================");
  console.log("🎉 Database seeding completed successfully!");
  console.log("Demo Course and Ahmed's test progress are live.");
  console.log("=========================================");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
