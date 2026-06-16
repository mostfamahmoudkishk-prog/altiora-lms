import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  ChevronRight,
  Mail,
  Phone,
  User,
  Globe,
  MessageCircle,
  Facebook,
  Instagram,
  Send,
  Youtube,
  Linkedin,
  Star,
  Award,
  BookOpen,
  Users,
  Eye,
  Clock,
  ShieldCheck,
  Share2,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { getTeacherProfileFn } from "@/lib/api/db.functions";

export const Route = createFileRoute("/teacher-profile/$teacherId")({
  head: ({ data }: any) => ({
    meta: [
      {
        title: data?.teacher?.name
          ? `${data.teacher.name} | منصة ألتيورا`
          : "الملف الشخصي للمعلم | Altiora",
      },
      {
        name: "description",
        content: data?.teacher?.bio || "الملف الشخصي العام للمعلم في منصة ألتيورا",
      },
      {
        property: "og:title",
        content: data?.teacher?.name ? `${data.teacher.name} | منصة ألتيورا` : "معلم | Altiora",
      },
      {
        property: "og:description",
        content: data?.teacher?.bio || "الملف الشخصي العام للمعلم في منصة ألتيورا",
      },
      { property: "og:image", content: data?.teacher?.avatarUrl || "" },
      { property: "og:type", content: "profile" },
    ],
    links: [
      {
        rel: "canonical",
        href: data?.teacher?.id
          ? `https://altiora.app/teacher-profile/${data.teacher.id}`
          : "https://altiora.app/app/instructors",
      },
    ],
  }),
  loader: async ({ params }) => {
    try {
      return await getTeacherProfileFn({ data: { teacherId: params.teacherId } });
    } catch {
      return null;
    }
  },
  component: TeacherProfilePublic,
});

type Tab = "about" | "courses" | "reviews" | "achievements";

export function TeacherProfilePublic({ teacherIdOverride }: { teacherIdOverride?: string }) {
  const params = useParams({ strict: false }) as any;
  const loaderData = Route.useLoaderData() as any;
  const teacherId = teacherIdOverride || params?.teacherId || params?.instructorId || "";

  const [data, setData] = useState<any>(loaderData || null);
  const [loading, setLoading] = useState(!loaderData);
  const [activeTab, setActiveTab] = useState<Tab>("about");

  // Load teacher profile data from server (only if loader data was not resolved on mount)
  useEffect(() => {
    if (loaderData) {
      setData(loaderData);
      setLoading(false);
      return;
    }
    if (!teacherId) return;
    setLoading(true);
    getTeacherProfileFn({ data: { teacherId } })
      .then((res: any) => {
        setData(res);
      })
      .catch((err) => {
        toast.error("فشل تحميل ملف المعلم: " + err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [teacherId, loaderData]);

  // Star Distribution Calculator
  const starDistribution = useMemo(() => {
    if (!data || !data.reviews) return { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let total = 0;
    data.reviews.forEach((r: any) => {
      const rating = Math.round(r.rating) as 5 | 4 | 3 | 2 | 1;
      if (dist[rating] !== undefined) {
        dist[rating]++;
        total++;
      }
    });
    return {
      5: total > 0 ? Math.round((dist[5] / total) * 100) : 0,
      4: total > 0 ? Math.round((dist[4] / total) * 100) : 0,
      3: total > 0 ? Math.round((dist[3] / total) * 100) : 0,
      2: total > 0 ? Math.round((dist[2] / total) * 100) : 0,
      1: total > 0 ? Math.round((dist[1] / total) * 100) : 0,
    };
  }, [data]);

  // Share profile handler
  const handleShareProfile = () => {
    const profileUrl = window.location.href;
    navigator.clipboard
      .writeText(profileUrl)
      .then(() => {
        toast.success("تم نسخ رابط الملف الشخصي للمعلم!");
      })
      .catch(() => {
        toast.error("فشل نسخ الرابط تلقائياً.");
      });
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="size-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm font-bold text-muted-foreground font-display">
            جاري تحميل ملف المعلم...
          </p>
        </div>
      </div>
    );
  }

  if (!data || !data.teacher) {
    return (
      <div
        className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 text-center shadow-card"
        dir="rtl"
      >
        <p className="text-foreground font-bold">المعلم غير موجود في المنصة</p>
        <Link
          to="/app/instructors"
          className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          العودة للمعلمين
        </Link>
      </div>
    );
  }

  const t = data.teacher;
  const s = data.stats;

  // Social Links List helper
  const socialLinks = [
    {
      key: "phoneNumber",
      icon: <Phone className="size-5" />,
      href: t.phoneNumber ? `tel:${t.phoneNumber}` : null,
      color: "text-blue-500 bg-blue-500/10 hover:bg-blue-500 hover:text-white",
    },
    {
      key: "whatsappUrl",
      icon: <MessageCircle className="size-5" />,
      href: t.whatsappUrl ? `https://wa.me/${t.whatsappUrl.replace(/\D/g, "")}` : null,
      color: "text-[#25D366] bg-[#25D366]/10 hover:bg-[#25D366] hover:text-white",
    },
    {
      key: "publicEmail",
      icon: <Mail className="size-5" />,
      href: t.publicEmail ? `mailto:${t.publicEmail}` : null,
      color: "text-primary bg-primary/10 hover:bg-primary hover:text-white",
    },
    {
      key: "facebookUrl",
      icon: <Facebook className="size-5" />,
      href: t.facebookUrl
        ? t.facebookUrl.startsWith("http")
          ? t.facebookUrl
          : `https://${t.facebookUrl}`
        : null,
      color: "text-[#1877F2] bg-[#1877F2]/10 hover:bg-[#1877F2] hover:text-white",
    },
    {
      key: "telegramUrl",
      icon: <Send className="size-5" />,
      href: t.telegramUrl
        ? t.telegramUrl.startsWith("http")
          ? t.telegramUrl
          : `https://t.me/${t.telegramUrl}`
        : null,
      color: "text-[#229ED9] bg-[#229ED9]/10 hover:bg-[#229ED9] hover:text-white",
    },
    {
      key: "instagramUrl",
      icon: <Instagram className="size-5" />,
      href: t.instagramUrl
        ? t.instagramUrl.startsWith("http")
          ? t.instagramUrl
          : `https://instagram.com/${t.instagramUrl}`
        : null,
      color: "text-[#E1306C] bg-[#E1306C]/10 hover:bg-[#E1306C] hover:text-white",
    },
    {
      key: "youtubeUrl",
      icon: <Youtube className="size-5" />,
      href: t.youtubeUrl
        ? t.youtubeUrl.startsWith("http")
          ? t.youtubeUrl
          : `https://youtube.com/${t.youtubeUrl}`
        : null,
      color: "text-[#FF0000] bg-[#FF0000]/10 hover:bg-[#FF0000] hover:text-white",
    },
    {
      key: "linkedinUrl",
      icon: <Linkedin className="size-5" />,
      href: t.linkedinUrl
        ? t.linkedinUrl.startsWith("http")
          ? t.linkedinUrl
          : `https://linkedin.com/in/${t.linkedinUrl}`
        : null,
      color: "text-[#0A66C2] bg-[#0A66C2]/10 hover:bg-[#0A66C2] hover:text-white",
    },
    {
      key: "websiteUrl",
      icon: <Globe className="size-5" />,
      href: t.websiteUrl
        ? t.websiteUrl.startsWith("http")
          ? t.websiteUrl
          : `https://${t.websiteUrl}`
        : null,
      color: "text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white",
    },
  ].filter((link) => link.href !== null);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: t.name,
    image: t.avatarUrl,
    description: t.bio,
    jobTitle: "Instructor",
    email: t.publicEmail || undefined,
    telephone: t.phoneNumber || undefined,
    sameAs: socialLinks.map((l) => l.href).filter(Boolean),
    award: t.certifications || undefined,
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 text-end" dir="rtl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {/* Breadcrumbs / SEO Sitemap info */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary transition-all">
            الرئيسية
          </Link>
          <ChevronRight className="size-3" />
          <Link to="/app/instructors" className="hover:text-primary transition-all">
            المعلمون
          </Link>
          <ChevronRight className="size-3" />
          <span className="text-foreground font-semibold">{t.name}</span>
        </div>

        <button
          onClick={handleShareProfile}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground hover:bg-secondary transition-all"
        >
          <span>مشاركة الملف</span>
          <Share2 className="size-3.5 text-primary" />
        </button>
      </div>

      {/* Hero section banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-card">
        {/* Cover image banner */}
        <div className="relative h-64 md:h-80 w-full overflow-hidden bg-gradient-to-r from-primary/30 to-secondary/30">
          <img
            src={t.coverImage}
            alt="Cover Banner"
            className="size-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent"></div>
        </div>

        {/* Floating Profile Info Card */}
        <div className="relative -mt-24 px-6 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-5">
            {/* Circular Avatar */}
            <div className="relative size-32 overflow-hidden rounded-full border-4 border-card bg-secondary shadow-lg">
              <img src={t.avatarUrl} alt={t.name} className="size-full object-cover" />
            </div>

            {/* Name & Specialization */}
            <div className="text-center md:text-end space-y-1 mb-2">
              <div className="flex items-center justify-center md:justify-end gap-1.5 flex-wrap">
                {t.isFeatured && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 border border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                    ⭐ {t.featuredBadgeLabel}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-500/20">
                  <ShieldCheck className="size-3.5" /> معلم موثق
                </span>
                <h1 className="font-display text-2xl font-bold text-foreground">{t.name}</h1>
              </div>
              <p className="text-sm font-semibold text-primary">مدرس للمرحلة الثانوية والقدرات</p>
              <p className="text-xs text-muted-foreground max-w-md line-clamp-2">{t.bio}</p>
            </div>
          </div>

          {/* Social icons block */}
          {t.showSocialLinks && socialLinks.length > 0 && (
            <div
              className="flex items-center justify-center gap-2 overflow-x-auto pb-2 max-w-full md:pb-0 scrollbar-none"
              dir="ltr"
            >
              {socialLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.href!}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex size-10 items-center justify-center rounded-full border border-border shadow-sm transition-all duration-300 scale-100 hover:scale-110 ${link.color}`}
                  aria-label={link.key}
                >
                  {link.icon}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Aggregate Statistics Cards Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard
          icon={<Users className="text-blue-500 size-6" />}
          label="إجمالي الطلاب"
          value={s.studentsCount}
        />
        <StatCard
          icon={<BookOpen className="text-emerald-500 size-6" />}
          label="الكورسات"
          value={s.coursesCount}
        />
        <StatCard
          icon={<Eye className="text-indigo-500 size-6" />}
          label="المشاهدات"
          value={s.totalViews > 1000 ? `${(s.totalViews / 1000).toFixed(1)}K` : s.totalViews}
        />
        <StatCard
          icon={<Clock className="text-amber-500 size-6" />}
          label="ساعات المشاهدة"
          value={Math.round(s.totalViews / 3600)}
        />
        <StatCard
          icon={<Star className="text-yellow-500 size-6" />}
          label="التقييم العام"
          value={`${s.avgRating} / 5`}
        />
        <StatCard
          icon={<Award className="text-purple-500 size-6" />}
          label="الشهادات الممنوحة"
          value={132}
        />
      </div>

      {/* Tab system navigation */}
      <div className="flex gap-1 border-b border-border bg-card/40 p-1 rounded-2xl">
        <TabBtn
          active={activeTab === "achievements"}
          onClick={() => setActiveTab("achievements")}
          label="الإنجازات والشهادات"
        />
        <TabBtn
          active={activeTab === "reviews"}
          onClick={() => setActiveTab("reviews")}
          label="التقييمات والآراء"
        />
        <TabBtn
          active={activeTab === "courses"}
          onClick={() => setActiveTab("courses")}
          label="الدورات التدريبية"
        />
        <TabBtn
          active={activeTab === "about"}
          onClick={() => setActiveTab("about")}
          label="نبذة عن المعلم"
        />
      </div>

      {/* Tabs panels */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-card min-h-[200px]">
        {activeTab === "about" && (
          <div className="space-y-6">
            <div>
              <h3 className="font-display text-base font-bold text-foreground mb-3">
                السيرة الذاتية
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {t.bio}
              </p>
            </div>
            {t.experience && t.experience.length > 0 && (
              <div>
                <h3 className="font-display text-base font-bold text-foreground mb-4">
                  الخبرات المهنية
                </h3>
                <div className="relative border-r-2 border-primary/20 pr-5 space-y-6">
                  {t.experience.map((exp: any, idx: number) => (
                    <div key={exp.id || idx} className="relative">
                      <div className="absolute -right-[27px] top-1.5 size-3.5 rounded-full border-2 border-primary bg-card"></div>
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {exp.duration}
                      </span>
                      <h4 className="font-bold text-foreground text-sm mt-1">{exp.role}</h4>
                      <p className="text-xs text-muted-foreground">{exp.organization}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "courses" && (
          <div className="space-y-6">
            <h3 className="font-display text-base font-bold text-foreground">
              الدورات والبرامج المتاحة
            </h3>
            {data.courses && data.courses.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {data.courses.map((c: any) => (
                  <div
                    key={c.id}
                    className="overflow-hidden rounded-2xl border border-border bg-card/60 shadow-sm transition-all hover:shadow-md"
                  >
                    <img
                      src={
                        c.coverImage ||
                        "https://storage.googleapis.com/gpt-engineer-file-uploads/AEsg1zggI4VE8xKalvu5HewFjSF2/social-images/social-1780788475646-image_(6).webp"
                      }
                      alt={c.title}
                      className="aspect-[16/10] w-full object-cover"
                    />
                    <div className="p-4 space-y-3">
                      <span className="inline-block rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary">
                        {c.category}
                      </span>
                      <h4 className="font-display text-sm font-bold text-foreground line-clamp-1">
                        {c.title}
                      </h4>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-bold text-primary">{c.price} ج.م</span>
                        <span className="flex items-center gap-1">
                          <Star className="size-3 fill-yellow-400 text-yellow-400" />{" "}
                          {c.rating.toFixed(1)}
                        </span>
                      </div>
                      <Link
                        to="/app/courses/$courseId"
                        params={{ courseId: c.id }}
                        className="w-full text-center inline-block rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-95"
                      >
                        عرض الدورة
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">
                لا توجد دورات مسجلة باسم هذا المعلم حالياً.
              </p>
            )}
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="space-y-6">
            <h3 className="font-display text-base font-bold text-foreground">
              تقييمات وآراء الطلاب
            </h3>

            {/* Rating distribution summary */}
            <div className="grid gap-6 md:grid-cols-3 rounded-2xl border border-border bg-secondary/5 p-5 items-center">
              <div className="text-center space-y-1">
                <span className="block text-4xl font-extrabold text-primary">{s.avgRating}</span>
                <div className="flex justify-center items-center gap-0.5 text-yellow-400">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      className={`size-4 ${idx < Math.round(s.avgRating) ? "fill-current" : ""}`}
                    />
                  ))}
                </div>
                <span className="block text-[10px] text-muted-foreground">
                  تقييم عام بناء على {data.reviews?.length || 0} تقييم
                </span>
              </div>

              {/* Progress bars for stars */}
              <div className="md:col-span-2 space-y-2">
                {[5, 4, 3, 2, 1].map((stars) => (
                  <div key={stars} className="flex items-center gap-3 text-xs">
                    <span className="w-12 text-muted-foreground text-start">{stars} نجوم</span>
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        style={{ width: `${(starDistribution as any)[stars]}%` }}
                        className="h-full bg-yellow-400 rounded-full"
                      ></div>
                    </div>
                    <span className="w-8 text-end font-semibold">
                      {(starDistribution as any)[stars]}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews list */}
            {data.reviews && data.reviews.length > 0 ? (
              <div className="space-y-4 divide-y divide-border/60">
                {data.reviews.map((r: any) => (
                  <div key={r.id} className="pt-4 flex items-start gap-4">
                    <img
                      src={r.studentAvatar}
                      alt={r.studentName}
                      className="size-10 rounded-full border border-border object-cover"
                    />
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">{r.createdAt}</span>
                        <div className="flex items-center gap-1.5">
                          <div className="flex text-yellow-400">
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <Star
                                key={idx}
                                className={`size-3 ${idx < r.rating ? "fill-current" : ""}`}
                              />
                            ))}
                          </div>
                          <h5 className="font-bold text-foreground text-xs">{r.studentName}</h5>
                        </div>
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {r.comment || "تقييم بدون تعليق"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">
                لا توجد تقييمات مسجلة بعد.
              </p>
            )}
          </div>
        )}

        {activeTab === "achievements" && (
          <div className="space-y-6">
            <div>
              <h3 className="font-display text-base font-bold text-foreground mb-3">
                الشهادات والاعتمادات المهنية
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {t.certifications || "لا توجد شهادات معلنة حالياً."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: any }) {
  return (
    <article className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
      <div className="rounded-full bg-secondary/35 p-2 mb-2">{icon}</div>
      <span className="text-[10px] font-bold text-muted-foreground">{label}</span>
      <span className="text-base font-extrabold text-foreground mt-1">{value}</span>
    </article>
  );
}

function TabBtn({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition-all ${
        active
          ? "bg-card text-primary shadow border border-border/40"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
