import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  User,
  Image,
  Plus,
  Trash2,
  ShieldAlert,
  Phone,
  MessageSquare,
  Mail,
  Globe,
  Facebook,
  Instagram,
  Send,
  Youtube,
  Linkedin,
  Save,
  Eye,
  Upload,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { getCurrentUser } from "@/lib/auth";
import {
  getTeacherProfileFn,
  updateTeacherProfileFn,
  getInstructorBrandingFn,
  updateInstructorBrandingFn,
  uploadFileFn,
} from "@/lib/api/db.functions";

export const Route = createFileRoute("/teacher/profile")({
  component: TeacherProfile,
});

interface Experience {
  id: string;
  role: string;
  organization: string;
  duration: string;
}

type Tab = "basic" | "social" | "branding" | "security";

function TeacherProfile() {
  const currentUser = getCurrentUser();
  const [activeTab, setActiveTab] = useState<Tab>("basic");
  const [loading, setLoading] = useState(true);
  const [teacherId, setTeacherId] = useState("");

  // Tab 1: Basic Info & Biography
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [bio, setBio] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [certifications, setCertifications] = useState("");
  const [experiences, setExperiences] = useState<Experience[]>([]);

  // Experience Builders
  const [newRole, setNewRole] = useState("");
  const [newOrg, setNewOrg] = useState("");
  const [newDur, setNewDur] = useState("");

  // Tab 2: Contact Details & Social Links
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [publicEmail, setPublicEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [telegramUrl, setTelegramUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [showSocialLinks, setShowSocialLinks] = useState(true);

  // Tab 3: Custom Branding Settings
  const [brandName, setBrandName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#4f46e5");
  const [showLogoOnPdf, setShowLogoOnPdf] = useState(true);
  const [showLogoOnVideos, setShowLogoOnVideos] = useState(true);
  const [showLogoOnExams, setShowLogoOnExams] = useState(true);
  const [showLogoOnCertificates, setShowLogoOnCertificates] = useState(true);
  const [showLogoOnNotes, setShowLogoOnNotes] = useState(true);
  const [canCustomizeBranding, setCanCustomizeBranding] = useState(false);

  // Tab 4: Security
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Loading states for uploads
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Load teacher profile & branding data
  useEffect(() => {
    if (!currentUser?.email) return;
    setLoading(true);

    getTeacherProfileFn({ data: { teacherId: currentUser.email } })
      .then((res: any) => {
        if (res && res.teacher) {
          const t = res.teacher;
          setTeacherId(t.id);
          setName(t.name || "");
          setAvatar(t.avatarUrl || "");
          setBio(t.bio || "");
          setCoverImage(t.coverImage || "");
          setCertifications(t.certifications || "");
          setExperiences(t.experience || []);
          setShowSocialLinks(t.showSocialLinks !== false);
          setCanCustomizeBranding(t.canCustomizeBranding || false);
          setPhoneNumber(t.phoneNumber || "");
          setWhatsappUrl(t.whatsappUrl || "");
          setPublicEmail(t.publicEmail || "");
          setWebsiteUrl(t.websiteUrl || "");
          setFacebookUrl(t.facebookUrl || "");
          setTelegramUrl(t.telegramUrl || "");
          setInstagramUrl(t.instagramUrl || "");
          setYoutubeUrl(t.youtubeUrl || "");
          setLinkedinUrl(t.linkedinUrl || "");

          // Load Branding Info
          return getInstructorBrandingFn({ data: { instructorId: t.id } });
        }
      })
      .then((brandRes: any) => {
        if (brandRes) {
          setBrandName(brandRes.brandName || "");
          setLogoUrl(brandRes.logoUrl || "");
          setPrimaryColor(brandRes.primaryColor || "#4f46e5");
          setShowLogoOnPdf(brandRes.showLogoOnPdf !== false);
          setShowLogoOnVideos(brandRes.showLogoOnVideos !== false);
          setShowLogoOnExams(brandRes.showLogoOnExams !== false);
          setShowLogoOnCertificates(brandRes.showLogoOnCertificates !== false);
          setShowLogoOnNotes(brandRes.showLogoOnNotes !== false);
        }
      })
      .catch((err) => {
        toast.error("فشل تحميل البيانات: " + err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [currentUser?.email]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.email) return;

    try {
      await updateTeacherProfileFn({
        data: {
          email: currentUser.email,
          name,
          avatarUrl: avatar,
          biographyData: {
            bio,
            experience: experiences,
            certifications,
            coverImage,
            showSocialLinks,
            phoneNumber,
            whatsappUrl,
            publicEmail,
            websiteUrl,
            facebookUrl,
            telegramUrl,
            instagramUrl,
            youtubeUrl,
            linkedinUrl,
          },
        },
      });
      toast.success("تم تحديث الملف الشخصي بنجاح!");
    } catch (err: any) {
      toast.error("فشل التحديث: " + err.message);
    }
  };

  const handleUpdateBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.email) return;

    try {
      await updateInstructorBrandingFn({
        data: {
          email: currentUser.email,
          brandName: brandName || null,
          logoUrl: logoUrl || null,
          primaryColor,
          showLogoOnPdf,
          showLogoOnVideos,
          showLogoOnExams,
          showLogoOnCertificates,
          showLogoOnNotes,
        },
      });
      toast.success("تم تحديث الهوية التجارية الخاصة بك بنجاح!");
    } catch (err: any) {
      toast.error("فشل تحديث الهوية التجارية: " + err.message);
    }
  };

  const handleAddExperience = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRole || !newOrg || !newDur) {
      toast.error("يرجى ملء جميع حقول الخبرة");
      return;
    }
    const newExp: Experience = {
      id: "exp_" + Date.now(),
      role: newRole,
      organization: newOrg,
      duration: newDur,
    };
    setExperiences((prev) => [...prev, newExp]);
    setNewRole("");
    setNewOrg("");
    setNewDur("");
    toast.success("تمت إضافة الخبرة مؤقتاً، اضغط على حفظ التعديلات لحفظها نهائياً");
  };

  const handleDeleteExperience = (id: string) => {
    setExperiences((prev) => prev.filter((exp) => exp.id !== id));
    toast.success("تم حذف الخبرة، اضغط على حفظ التعديلات لتأكيد التغيير");
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("يرجى تعبئة جميع حقول كلمة المرور");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("كلمة المرور الجديدة غير متطابقة مع تأكيد كلمة المرور");
      return;
    }
    toast.success("تم تغيير كلمة المرور بنجاح (محاكاة)");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "avatar" | "cover" | "logo",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === "avatar") setUploadingAvatar(true);
    if (type === "cover") setUploadingCover(true);
    if (type === "logo") setUploadingLogo(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        const res = await uploadFileFn({
          data: {
            name: file.name,
            base64,
            category: type === "logo" ? "avatar" : type, // Use avatar folder for logo as well
          },
        });

        if (!res.success) {
          throw new Error(res.message || "فشل رفع الصورة");
        }

        if (type === "avatar") setAvatar(res.data.url);
        if (type === "cover") setCoverImage(res.data.url);
        if (type === "logo") setLogoUrl(res.data.url);

        toast.success("تم رفع الصورة بنجاح!");
      } catch (err: any) {
        toast.error("فشل رفع الملف: " + err.message);
      } finally {
        setUploadingAvatar(false);
        setUploadingCover(false);
        setUploadingLogo(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="size-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm font-bold text-muted-foreground font-display">
            جاري تحميل بيانات الملف الشخصي...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-end" dir="rtl">
      {/* Header Banner */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-card sm:flex-row">
        <div className="text-sm text-muted-foreground text-start sm:text-end">
          قم بإدارة بياناتك الشخصية والنبذة والروابط الاجتماعية وتخصيص علامتك التجارية المخصصة.
        </div>
        <div className="flex items-center gap-3">
          {teacherId && (
            <a
              href={`/teacher-profile/${teacherId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground hover:bg-secondary transition-all"
            >
              <Eye className="size-3.5 text-primary" /> معاينة الملف العام
            </a>
          )}
          <h2 className="font-display text-xl font-bold text-foreground">الملف الشخصي للمدرس</h2>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex flex-wrap justify-end gap-2 rounded-xl bg-secondary/50 p-1">
        <button
          onClick={() => setActiveTab("security")}
          className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "security"
              ? "bg-card text-primary shadow-sm"
              : "text-foreground/80 hover:bg-card/40"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <ShieldAlert className="size-3.5" /> كلمة المرور والأمان
          </span>
        </button>
        {canCustomizeBranding && (
          <button
            onClick={() => setActiveTab("branding")}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "branding"
                ? "bg-card text-primary shadow-sm"
                : "text-foreground/80 hover:bg-card/40"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Award className="size-3.5" /> العلامة التجارية الخاصة بي
            </span>
          </button>
        )}
        <button
          onClick={() => setActiveTab("social")}
          className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "social"
              ? "bg-card text-primary shadow-sm"
              : "text-foreground/80 hover:bg-card/40"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Globe className="size-3.5" /> بيانات التواصل والروابط
          </span>
        </button>
        <button
          onClick={() => setActiveTab("basic")}
          className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "basic"
              ? "bg-card text-primary shadow-sm"
              : "text-foreground/80 hover:bg-card/40"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <User className="size-3.5" /> النبذة والخبرات والنبذة التعريفية
          </span>
        </button>
      </div>

      {/* Profile content tabs */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Forms columns */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === "basic" && (
            <div className="space-y-6">
              {/* Profile Banners, Avatar & Basic Fields */}
              <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
                <h3 className="mb-6 font-display text-base font-bold text-foreground">
                  النبذة والخبرات والنبذة التعريفية
                </h3>
                <form onSubmit={handleUpdateProfile} className="space-y-5">
                  {/* Banner & Avatar Upload Row */}
                  <div className="space-y-4">
                    <span className="block text-xs font-bold text-muted-foreground">
                      الصور والظهور
                    </span>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* Avatar Upload Box */}
                      <div className="flex items-center justify-between border border-border rounded-xl p-3 bg-secondary/10">
                        <div className="flex items-center gap-3">
                          <div className="relative size-14 overflow-hidden rounded-full border border-border bg-secondary">
                            {avatar ? (
                              <img src={avatar} alt="Avatar" className="size-full object-cover" />
                            ) : (
                              <div className="flex size-full items-center justify-center text-muted-foreground">
                                <User className="size-6" />
                              </div>
                            )}
                          </div>
                          <div className="text-end">
                            <span className="block text-xs font-bold text-foreground">
                              الصورة الشخصية
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              صورة مربعة ممتازة دائرية
                            </span>
                          </div>
                        </div>

                        <label className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground hover:bg-secondary transition-all">
                          <Upload className="size-3.5" />
                          <span>{uploadingAvatar ? "جاري الرفع..." : "تحديث"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, "avatar")}
                            disabled={uploadingAvatar}
                          />
                        </label>
                      </div>

                      {/* Cover Banner Upload Box */}
                      <div className="flex items-center justify-between border border-border rounded-xl p-3 bg-secondary/10">
                        <div className="flex items-center gap-3">
                          <div className="relative h-14 w-20 overflow-hidden rounded-lg border border-border bg-secondary">
                            {coverImage ? (
                              <img
                                src={coverImage}
                                alt="Cover"
                                className="size-full object-cover"
                              />
                            ) : (
                              <div className="flex size-full items-center justify-center text-muted-foreground">
                                <Image className="size-6" />
                              </div>
                            )}
                          </div>
                          <div className="text-end">
                            <span className="block text-xs font-bold text-foreground">
                              صورة الغلاف البانر
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              أبعاد مثالية 1200x400
                            </span>
                          </div>
                        </div>

                        <label className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground hover:bg-secondary transition-all">
                          <Upload className="size-3.5" />
                          <span>{uploadingCover ? "جاري الرفع..." : "تحديث"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, "cover")}
                            disabled={uploadingCover}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      الاسم الكامل
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      النبذة التعريفية (Biography)
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      required
                      rows={4}
                      className="w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary"
                      placeholder="اكتب نبذة مختصرة عن نفسك وخبرتك التعليمية للطلاب..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      الشهادات والاعتمادات (Certifications)
                    </label>
                    <textarea
                      value={certifications}
                      onChange={(e) => setCertifications(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary"
                      placeholder="مثال: بكالوريوس في التربية واللغات، شهادة تدريس آيلتس معتمدة..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-card hover:opacity-95 transition-all inline-flex items-center gap-1.5"
                  >
                    <Save className="size-4" /> حفظ التعديلات الأساسية
                  </button>
                </form>
              </div>

              {/* Experience list and builder */}
              <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-6">
                <h3 className="font-display text-base font-bold text-foreground">
                  الخبرات المهنية (Dynamic Experience Builder)
                </h3>

                <div className="space-y-3">
                  {experiences.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4 bg-secondary/5 rounded-xl border border-dashed border-border">
                      لم تقم بإضافة أي خبرات بعد
                    </p>
                  ) : (
                    experiences.map((exp) => (
                      <div
                        key={exp.id}
                        className="flex items-center justify-between border border-border bg-secondary/20 p-4 rounded-xl"
                      >
                        <button
                          onClick={() => handleDeleteExperience(exp.id)}
                          className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10"
                          title="حذف الخبرة"
                        >
                          <Trash2 className="size-4" />
                        </button>
                        <div className="text-end">
                          <h4 className="font-bold text-foreground text-sm">{exp.role}</h4>
                          <span className="text-xs text-muted-foreground">
                            {exp.organization} — {exp.duration}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Experience form */}
                <form
                  onSubmit={handleAddExperience}
                  className="border-t border-border pt-5 space-y-4"
                >
                  <span className="block text-xs font-bold text-muted-foreground">
                    إضافة خبرة جديدة
                  </span>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <input
                      type="text"
                      placeholder="المسمى الوظيفي (role)"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="h-10 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                    />
                    <input
                      type="text"
                      placeholder="المنظمة / المدرسة (organization)"
                      value={newOrg}
                      onChange={(e) => setNewOrg(e.target.value)}
                      className="h-10 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                    />
                    <input
                      type="text"
                      placeholder="المدة (duration) (مثال: 2018 - 2020)"
                      value={newDur}
                      onChange={(e) => setNewDur(e.target.value)}
                      className="h-10 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                    />
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 rounded-xl bg-secondary px-4 py-2.5 text-xs font-bold text-primary hover:bg-secondary-foreground/20 transition-all"
                  >
                    <Plus className="size-4" /> إضافة الخبرة إلى القائمة
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === "social" && (
            <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
              <h3 className="mb-6 font-display text-base font-bold text-foreground">
                بيانات التواصل والروابط الاجتماعية
              </h3>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                {/* Show social toggle */}
                <div className="flex items-center justify-between border border-border rounded-xl p-4 bg-secondary/10 mb-4">
                  <button
                    type="button"
                    onClick={() => setShowSocialLinks(!showSocialLinks)}
                    className={`flex h-6 w-11 items-center rounded-full transition-colors ${showSocialLinks ? "bg-primary" : "bg-muted"}`}
                  >
                    <span
                      className={`size-4 rounded-full bg-white transition-transform ${showSocialLinks ? "-translate-x-6" : "-translate-x-1"}`}
                    />
                  </button>
                  <div className="text-end">
                    <span className="block text-sm font-bold text-foreground">
                      عرض روابط التواصل الاجتماعي
                    </span>
                    <span className="text-xs text-muted-foreground">
                      تفعيل هذا الخيار يعرض الروابط والرموز أسفل اسمك في صفحتك العامة.
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      الهاتف العام
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="01xxxxxxxxx"
                        className="h-10 w-full rounded-xl border border-border bg-card pe-10 ps-3 text-sm outline-none focus:border-primary text-left"
                        dir="ltr"
                      />
                      <Phone className="absolute right-3 size-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      رقم الواتساب (WhatsApp)
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={whatsappUrl}
                        onChange={(e) => setWhatsappUrl(e.target.value)}
                        placeholder="2010xxxxxxxx"
                        className="h-10 w-full rounded-xl border border-border bg-card pe-10 ps-3 text-sm outline-none focus:border-primary text-left"
                        dir="ltr"
                      />
                      <MessageSquare className="absolute right-3 size-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      البريد الإلكتروني العام
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="email"
                        value={publicEmail}
                        onChange={(e) => setPublicEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="h-10 w-full rounded-xl border border-border bg-card pe-10 ps-3 text-sm outline-none focus:border-primary text-left"
                        dir="ltr"
                      />
                      <Mail className="absolute right-3 size-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      الموقع الإلكتروني الشخصي
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="www.yourwebsite.com"
                        className="h-10 w-full rounded-xl border border-border bg-card pe-10 ps-3 text-sm outline-none focus:border-primary text-left"
                        dir="ltr"
                      />
                      <Globe className="absolute right-3 size-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      رابط فيسبوك (Facebook)
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={facebookUrl}
                        onChange={(e) => setFacebookUrl(e.target.value)}
                        placeholder="facebook.com/username"
                        className="h-10 w-full rounded-xl border border-border bg-card pe-10 ps-3 text-sm outline-none focus:border-primary text-left"
                        dir="ltr"
                      />
                      <Facebook className="absolute right-3 size-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      رابط تيليجرام (Telegram)
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={telegramUrl}
                        onChange={(e) => setTelegramUrl(e.target.value)}
                        placeholder="t.me/username"
                        className="h-10 w-full rounded-xl border border-border bg-card pe-10 ps-3 text-sm outline-none focus:border-primary text-left"
                        dir="ltr"
                      />
                      <Send className="absolute right-3 size-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      رابط انستجرام (Instagram)
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={instagramUrl}
                        onChange={(e) => setInstagramUrl(e.target.value)}
                        placeholder="instagram.com/username"
                        className="h-10 w-full rounded-xl border border-border bg-card pe-10 ps-3 text-sm outline-none focus:border-primary text-left"
                        dir="ltr"
                      />
                      <Instagram className="absolute right-3 size-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      رابط يوتيوب (YouTube)
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        placeholder="youtube.com/channel"
                        className="h-10 w-full rounded-xl border border-border bg-card pe-10 ps-3 text-sm outline-none focus:border-primary text-left"
                        dir="ltr"
                      />
                      <Youtube className="absolute right-3 size-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    رابط لينكد إن (LinkedIn)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="linkedin.com/in/username"
                      className="h-10 w-full rounded-xl border border-border bg-card pe-10 ps-3 text-sm outline-none focus:border-primary text-left"
                      dir="ltr"
                    />
                    <Linkedin className="absolute right-3 size-4 text-muted-foreground" />
                  </div>
                </div>

                <button
                  type="submit"
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-card hover:opacity-95 transition-all inline-flex items-center gap-1.5 mt-4"
                >
                  <Save className="size-4" /> حفظ روابط التواصل
                </button>
              </form>
            </div>
          )}

          {activeTab === "branding" && canCustomizeBranding && (
            <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
                <p className="text-xs text-muted-foreground">
                  صمم هويتك التجارية الخاصة التي تظهر للطلاب في الملفات والامتحانات والفيديوهات.
                </p>
                <h3 className="font-display text-base font-bold text-foreground">
                  العلامة التجارية الخاصة بي 🎨
                </h3>
              </div>

              <form onSubmit={handleUpdateBranding} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      اسم العلامة التجارية
                    </label>
                    <input
                      type="text"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="مثال: د. أحمد علي للغة الإنجليزية"
                      className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      لون العلامة التجارية (اختياري)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="size-10 rounded-lg cursor-pointer border border-border"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary text-left font-mono"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

                {/* Logo upload Transparent PNG */}
                <div className="flex items-center justify-between border border-border rounded-xl p-4 bg-secondary/10">
                  <div className="flex items-center gap-4">
                    <div className="relative size-16 overflow-hidden rounded-xl border border-border bg-card flex items-center justify-center p-1">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Brand Logo" className="size-full object-contain" />
                      ) : (
                        <div className="text-[10px] text-muted-foreground text-center">
                          لا يوجد شعار
                        </div>
                      )}
                    </div>
                    <div className="text-end">
                      <span className="block text-sm font-bold text-foreground">
                        شعار المعلم المخصص
                      </span>
                      <span className="text-xs text-muted-foreground">
                        يرجى رفع صورة PNG بخلفية شفافة وتصميم مميز.
                      </span>
                    </div>
                  </div>

                  <label className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold text-foreground hover:bg-secondary transition-all">
                    <Upload className="size-3.5 text-primary" />
                    <span>{uploadingLogo ? "جاري الرفع..." : "رفع شعار جديد"}</span>
                    <input
                      type="file"
                      accept="image/png"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, "logo")}
                      disabled={uploadingLogo}
                    />
                  </label>
                </div>

                {/* Where to show branding toggles */}
                <div className="space-y-4">
                  <span className="block text-xs font-bold text-muted-foreground border-b border-border pb-1">
                    أين تود إظهار شعارك؟
                  </span>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* PDF */}
                    <div className="flex items-center justify-between border border-border/80 p-3 rounded-xl hover:bg-secondary/5 transition-all">
                      <button
                        type="button"
                        onClick={() => setShowLogoOnPdf(!showLogoOnPdf)}
                        className={`flex h-6 w-11 items-center rounded-full transition-colors ${showLogoOnPdf ? "bg-primary" : "bg-muted"}`}
                      >
                        <span
                          className={`size-4 rounded-full bg-white transition-transform ${showLogoOnPdf ? "-translate-x-6" : "-translate-x-1"}`}
                        />
                      </button>
                      <div className="text-end">
                        <span className="block text-xs font-bold text-foreground">
                          على ملفات الـ PDF وملخصات الواجبات
                        </span>
                      </div>
                    </div>

                    {/* Videos */}
                    <div className="flex items-center justify-between border border-border/80 p-3 rounded-xl hover:bg-secondary/5 transition-all">
                      <button
                        type="button"
                        onClick={() => setShowLogoOnVideos(!showLogoOnVideos)}
                        className={`flex h-6 w-11 items-center rounded-full transition-colors ${showLogoOnVideos ? "bg-primary" : "bg-muted"}`}
                      >
                        <span
                          className={`size-4 rounded-full bg-white transition-transform ${showLogoOnVideos ? "-translate-x-6" : "-translate-x-1"}`}
                        />
                      </button>
                      <div className="text-end">
                        <span className="block text-xs font-bold text-foreground">
                          في بداية مشغل الفيديوهات (3-5 ثوانٍ)
                        </span>
                      </div>
                    </div>

                    {/* Exams */}
                    <div className="flex items-center justify-between border border-border/80 p-3 rounded-xl hover:bg-secondary/5 transition-all">
                      <button
                        type="button"
                        onClick={() => setShowLogoOnExams(!showLogoOnExams)}
                        className={`flex h-6 w-11 items-center rounded-full transition-colors ${showLogoOnExams ? "bg-primary" : "bg-muted"}`}
                      >
                        <span
                          className={`size-4 rounded-full bg-white transition-transform ${showLogoOnExams ? "-translate-x-6" : "-translate-x-1"}`}
                        />
                      </button>
                      <div className="text-end">
                        <span className="block text-xs font-bold text-foreground">
                          أعلى صفحات الامتحانات والواجبات
                        </span>
                      </div>
                    </div>

                    {/* Certificates */}
                    <div className="flex items-center justify-between border border-border/80 p-3 rounded-xl hover:bg-secondary/5 transition-all">
                      <button
                        type="button"
                        onClick={() => setShowLogoOnCertificates(!showLogoOnCertificates)}
                        className={`flex h-6 w-11 items-center rounded-full transition-colors ${showLogoOnCertificates ? "bg-primary" : "bg-muted"}`}
                      >
                        <span
                          className={`size-4 rounded-full bg-white transition-transform ${showLogoOnCertificates ? "-translate-x-6" : "-translate-x-1"}`}
                        />
                      </button>
                      <div className="text-end">
                        <span className="block text-xs font-bold text-foreground">
                          على شهادات إكمال المقررات للطلاب
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="flex items-center justify-between border border-border/80 p-3 rounded-xl hover:bg-secondary/5 transition-all sm:max-w-md">
                    <button
                      type="button"
                      onClick={() => setShowLogoOnNotes(!showLogoOnNotes)}
                      className={`flex h-6 w-11 items-center rounded-full transition-colors ${showLogoOnNotes ? "bg-primary" : "bg-muted"}`}
                    >
                      <span
                        className={`size-4 rounded-full bg-white transition-transform ${showLogoOnNotes ? "-translate-x-6" : "-translate-x-1"}`}
                      />
                    </button>
                    <div className="text-end">
                      <span className="block text-xs font-bold text-foreground">
                        داخل ملاحظات الدروس وملخصات المرفقات
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-card hover:opacity-95 transition-all inline-flex items-center gap-1.5"
                >
                  <Save className="size-4" /> حفظ إعدادات الهوية التجارية
                </button>
              </form>
            </div>
          )}

          {activeTab === "security" && (
            <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
              <h3 className="mb-6 font-display text-base font-bold text-foreground">
                تغيير كلمة المرور
              </h3>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    كلمة المرور الحالية
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    كلمة المرور الجديدة
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    تأكيد كلمة المرور الجديدة
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-card hover:opacity-95 transition-all"
                >
                  تحديث كلمة المرور
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Profile Card Preview Column */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-card space-y-4">
            <span className="block text-xs font-bold text-muted-foreground border-b border-border pb-2">
              معاينة بطاقة المدرس الشخصية
            </span>

            {/* Card preview layout */}
            <div className="overflow-hidden rounded-2xl border border-border bg-secondary/10 pb-4 shadow-sm text-center">
              {/* Cover */}
              <div className="relative h-24 bg-gradient-to-r from-primary/20 to-secondary/20">
                {coverImage && (
                  <img
                    src={coverImage}
                    alt="Cover Preview"
                    className="size-full object-cover opacity-70"
                  />
                )}
              </div>

              {/* Avatar floating */}
              <div className="relative -mt-10 mx-auto size-20 overflow-hidden rounded-full border-4 border-card bg-secondary shadow">
                {avatar ? (
                  <img src={avatar} alt="Avatar Preview" className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-muted-foreground">
                    <User className="size-8" />
                  </div>
                )}
              </div>

              {/* Name */}
              <h4 className="mt-2 font-display text-base font-bold text-foreground">
                {name || "اسم المعلم"}
              </h4>
              <p className="text-xs text-primary font-semibold">مدرس في منصة ألتيورا</p>

              {/* Bio summary */}
              <p className="mt-2 text-xs text-muted-foreground px-4 line-clamp-3 leading-relaxed">
                {bio || "لم يتم كتابة نبذة تعريفية بعد..."}
              </p>

              {/* Social links preview if toggle enabled */}
              {showSocialLinks && (
                <div className="flex items-center justify-center gap-1.5 mt-3 flex-wrap px-4">
                  {phoneNumber && (
                    <span className="size-7 rounded-full bg-secondary text-primary flex items-center justify-center text-[10px]">
                      <Phone className="size-3.5" />
                    </span>
                  )}
                  {whatsappUrl && (
                    <span className="size-7 rounded-full bg-secondary text-primary flex items-center justify-center text-[10px]">
                      <MessageSquare className="size-3.5" />
                    </span>
                  )}
                  {publicEmail && (
                    <span className="size-7 rounded-full bg-secondary text-primary flex items-center justify-center text-[10px]">
                      <Mail className="size-3.5" />
                    </span>
                  )}
                  {websiteUrl && (
                    <span className="size-7 rounded-full bg-secondary text-primary flex items-center justify-center text-[10px]">
                      <Globe className="size-3.5" />
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Brand Logo preview if logo uploaded */}
            {brandName && (
              <div className="border border-border/60 rounded-xl p-3 bg-secondary/5 space-y-2 text-center">
                <span className="block text-[10px] font-bold text-muted-foreground">
                  شعار علامتك التجارية
                </span>
                <div className="flex items-center justify-center gap-2">
                  {logoUrl && (
                    <img src={logoUrl} alt="Logo Brand Preview" className="h-8 object-contain" />
                  )}
                  <span className="font-bold text-xs" style={{ color: primaryColor }}>
                    {brandName}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
