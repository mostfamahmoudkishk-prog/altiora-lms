/**
 * Resend Email Service Integration
 */

interface SendEmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

/**
 * Sends a transactional email using the Resend REST API
 */
export async function sendEmail(payload: SendEmailPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[Resend] RESEND_API_KEY is not configured. Email broadcast was skipped.");
    return { success: false, error: "RESEND_API_KEY missing" };
  }

  const toAddresses = Array.isArray(payload.to) ? payload.to : [payload.to];

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Altiora Academy <noreply@altiora.academy>",
        to: toAddresses,
        subject: payload.subject,
        html: payload.html,
        text: payload.text || payload.subject,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`[Resend] API Error response: ${errBody}`);
      return { success: false, error: errBody };
    }

    const data: any = await response.json();
    console.log(`[Resend] Email sent successfully, messageId: ${data.id}`);
    return { success: true, messageId: data.id };
  } catch (error: any) {
    console.error("[Resend] Call failed with connection error:", error);
    return { success: false, error: error.message };
  }
}

// Altiora CSS Black & Gold email wrapper template
const wrapWithAltioraTheme = (contentHtml: string) => `
<div style="font-family: system-ui, -apple-system, sans-serif; background-color: #0b0f19; color: #f3f4f6; padding: 40px 20px; text-align: right; direction: rtl;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-top: 4px solid #f59e0b; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
    <div style="text-align: center; margin-bottom: 25px;">
      <h1 style="color: #f59e0b; font-size: 28px; margin: 0; font-weight: 800; letter-spacing: 1px;">ALTIORA</h1>
      <p style="color: #9ca3af; font-size: 14px; margin: 5px 0 0 0;">منصة التعليم المتقدمة</p>
    </div>
    <hr style="border: 0; border-top: 1px solid #1f2937; margin-bottom: 25px;" />
    
    ${contentHtml}
    
    <hr style="border: 0; border-top: 1px solid #1f2937; margin: 25px 0;" />
    <div style="text-align: center; font-size: 12px; color: #6b7280; line-height: 1.5;">
      <p>هذا البريد الإلكتروني مرسل تلقائياً من منصة Altiora. من فضلك لا تقم بالرد على هذه الرسالة.</p>
      <p>© ${new Date().getFullYear()} Altiora Academy. جميع الحقوق محفوظة.</p>
    </div>
  </div>
</div>
`;

/**
 * Dispatches a welcoming email to new users
 */
export async function sendWelcomeEmail(email: string, name: string) {
  const html = wrapWithAltioraTheme(`
    <h2 style="color: #f3f4f6; font-size: 20px; margin-top: 0;">أهلاً بك في Altiora يا ${name}! 👋</h2>
    <p style="font-size: 16px; line-height: 1.6; color: #d1d5db;">يسعدنا جداً انضمامك إلى أكاديمية Altiora للتعليم المتميز والحديث.</p>
    <p style="font-size: 16px; line-height: 1.6; color: #d1d5db;">الآن يمكنك البدء في استعراض الكورسات المتوفرة، والاشتراك بالدروس المباشرة، وحل الامتحانات التفاعلية لتحسين مهاراتك.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://altiora.academy/app" style="background-color: #f59e0b; color: #0b0f19; font-weight: bold; text-decoration: none; padding: 12px 25px; border-radius: 6px; font-size: 16px; display: inline-block;">تصفح لوحة التحكم الخاصة بك</a>
    </div>
  `);

  return sendEmail({
    to: email,
    subject: "أهلاً بك في أكاديمية Altiora! 🎉",
    html,
  });
}

/**
 * Sends a verification code or link email
 */
export async function sendVerificationEmail(email: string, code: string) {
  const html = wrapWithAltioraTheme(`
    <h2 style="color: #f3f4f6; font-size: 20px; margin-top: 0;">تأكيد البريد الإلكتروني 🔒</h2>
    <p style="font-size: 16px; line-height: 1.6; color: #d1d5db;">لتفعيل حسابك بشكل كامل والتمكن من تسجيل الدخول بأمان، يرجى استخدام رمز التحقق التالي:</p>
    <div style="background-color: #1f2937; border-radius: 8px; padding: 15px; text-align: center; margin: 25px 0;">
      <span style="font-family: monospace; font-size: 32px; font-weight: bold; color: #f59e0b; letter-spacing: 5px;">${code}</span>
    </div>
    <p style="font-size: 14px; color: #9ca3af; line-height: 1.5;">هذا الرمز صالح لمدة 15 دقيقة فقط. إذا لم تكن قد طلبت هذا الرمز، يمكنك تجاهل هذا البريد الإلكتروني بأمان.</p>
  `);

  return sendEmail({
    to: email,
    subject: `رمز تأكيد البريد الإلكتروني: ${code} 🛡️`,
    html,
  });
}

/**
 * Sends a password reset request email
 */
export async function sendPasswordResetEmail(email: string, token: string) {
  const resetLink = `https://altiora.academy/reset-password?token=${token}`;
  const html = wrapWithAltioraTheme(`
    <h2 style="color: #f3f4f6; font-size: 20px; margin-top: 0;">طلب إعادة تعيين كلمة المرور 🔑</h2>
    <p style="font-size: 16px; line-height: 1.6; color: #d1d5db;">لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك على Altiora.</p>
    <p style="font-size: 16px; line-height: 1.6; color: #d1d5db;">اضغط على الزر بالأسفل لتعيين كلمة مرور جديدة:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetLink}" style="background-color: #f59e0b; color: #0b0f19; font-weight: bold; text-decoration: none; padding: 12px 25px; border-radius: 6px; font-size: 16px; display: inline-block;">إعادة تعيين كلمة المرور</a>
    </div>
    <p style="font-size: 14px; color: #9ca3af; line-height: 1.5;">أو قم بنسخ هذا الرابط ولصقه في متصفحك إذا لم يعمل الزر:</p>
    <p style="font-size: 12px; color: #f59e0b; word-break: break-all; text-align: left; direction: ltr;">${resetLink}</p>
    <p style="font-size: 14px; color: #9ca3af; line-height: 1.5; margin-top: 20px;">إذا لم تطلب هذا التغيير، فيرجى تجاهل هذا البريد وتأمين حسابك.</p>
  `);

  return sendEmail({
    to: email,
    subject: "إعادة تعيين كلمة المرور - Altiora 🔒",
    html,
  });
}

/**
 * Sends generic system notifications via email
 */
export async function sendSystemNotificationEmail(email: string, title: string, message: string) {
  const html = wrapWithAltioraTheme(`
    <h2 style="color: #f3f4f6; font-size: 20px; margin-top: 0;">${title} 🔔</h2>
    <p style="font-size: 16px; line-height: 1.6; color: #d1d5db;">${message}</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://altiora.academy/app/notifications" style="background-color: #374151; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; display: inline-block;">عرض كل الإشعارات</a>
    </div>
  `);

  return sendEmail({
    to: email,
    subject: `${title} - إشعارات Altiora`,
    html,
  });
}
