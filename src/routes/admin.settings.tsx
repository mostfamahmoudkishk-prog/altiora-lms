import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Settings,
  Image,
  Globe,
  Palette,
  Layout,
  HelpCircle,
  Plus,
  Trash2,
  Edit,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

interface BannerItem {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  isDeleted?: boolean;
}

const initialBanners: BannerItem[] = [
  {
    id: "b-1",
    title: "بانر الصيف الكومبو 20%",
    imageUrl:
      "https://storage.googleapis.com/gpt-engineer-file-uploads/AEsg1zggI4VE8xKalvu5HewFjSF2/social-images/social-1780788475646-image_(6).webp",
    linkUrl: "/register",
  },
];

const initialFaqs: FaqItem[] = [
  {
    id: "f-1",
    question: "كيف يمكنني الاشتراك في الكورسات؟",
    answer:
      "يمكنك إنشاء حساب طالب أولاً، ثم تصفح الدورات والضغط على زر شراء الدورة والدفع عن طريق بوابات فوري أو كروت الائتمان.",
  },
  {
    id: "f-2",
    question: "هل تتوفر شهادات إتمام للدورات؟",
    answer:
      "نعم، بمجرد إكمال مشاهدة جميع محاضرات الدورة وحل الاختبارات بنسبة نجاح تفوق 50%، تصدر لك شهادة تلقائية يمكنك التحقق منها بالمنصة.",
  },
];

function AdminSettings() {
  const [activeTab, setActiveTab] = useState<"general" | "colors" | "banners" | "faqs">("general");

  // General settings states
  const [platformName, setPlatformName] = useState("Altiora Learning Studio");
  const [platformLogo, setPlatformLogo] = useState(
    "https://storage.googleapis.com/gpt-engineer-file-uploads/AEsg1zggI4VE8xKalvu5HewFjSF2/social-images/social-1780788475646-image_(6).webp",
  );
  const [metaTitle, setMetaTitle] = useState("منصة ألتيورا التعليمية — نحو القمة");
  const [metaDesc, setMetaDesc] = useState(
    "منصة تعليمية متطورة توفر أفضل الكورسات لطلاب الثانوي والإعدادي مع نخبة من الأساتذة.",
  );

  // Brand colors states
  const [primaryColor, setPrimaryColor] = useState("#0d1b2a"); // Deep navy
  const [accentColor, setAccentColor] = useState("#f4a261"); // Orange
  const [bgColor, setBgColor] = useState("#fafaff");

  // Banners states
  const [banners, setBanners] = useState<BannerItem[]>(initialBanners);
  const [bannerTitle, setBannerTitle] = useState("");
  const [bannerImage, setBannerImage] = useState("");
  const [bannerLink, setBannerLink] = useState("");

  // FAQs states
  const [faqs, setFaqs] = useState<FaqItem[]>(initialFaqs);
  const [faqQ, setFaqQ] = useState("");
  const [faqA, setFaqA] = useState("");
  const [editFaqId, setEditFaqId] = useState<string | null>(null);

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("تم حفظ إعدادات الهوية والـ SEO بنجاح");
  };

  const handleSaveColors = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("تم تحديث ألوان المنصة بنجاح وإعادة بناء ملف التنسيقات");
  };

  // Banner Actions
  const handleAddBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitle || !bannerImage) return;
    const newBanner = {
      id: "b_" + Date.now(),
      title: bannerTitle,
      imageUrl: bannerImage,
      linkUrl: bannerLink || "#",
    };
    setBanners((prev) => [...prev, newBanner]);
    setBannerTitle("");
    setBannerImage("");
    setBannerLink("");
    toast.success("تمت إضافة البانر الترويجي الجديد بنجاح");
  };

  const handleDeleteBanner = (id: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== id));
    toast.success("تم حذف البانر");
  };

  // FAQ Actions
  const handleSaveFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqQ || !faqA) return;

    if (editFaqId) {
      setFaqs((prev) =>
        prev.map((f) => (f.id === editFaqId ? { ...f, question: faqQ, answer: faqA } : f)),
      );
      toast.success("تم تعديل السؤال الشائع بنجاح");
      setEditFaqId(null);
    } else {
      const newFaq = {
        id: "f_" + Date.now(),
        question: faqQ,
        answer: faqA,
      };
      setFaqs((prev) => [...prev, newFaq]);
      toast.success("تمت إضافة سؤال شائع جديد");
    }

    setFaqQ("");
    setFaqA("");
  };

  const handleStartEditFaq = (f: FaqItem) => {
    setEditFaqId(f.id);
    setFaqQ(f.question);
    setFaqA(f.answer);
  };

  const handleSoftDeleteFaq = (id: string) => {
    if (!confirm("هل تريد حذف هذا السؤال الشائع؟")) return;
    setFaqs((prev) => prev.map((f) => (f.id === id ? { ...f, isDeleted: true } : f)));
    toast.success("تم حذف السؤال الشائع (حذف مؤقت)");
  };

  return (
    <div className="space-y-6 text-end">
      {/* Header */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-card sm:flex-row">
        <div className="text-sm text-muted-foreground">
          تعديل الاسم والرموز وخصائص التهيئة والأسئلة الشائعة للمنصة
        </div>
        <h2 className="font-display text-xl font-bold text-foreground">إعدادات وتهيئة المنصة</h2>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap justify-end gap-2 rounded-xl bg-secondary/50 p-1">
        <button
          onClick={() => setActiveTab("faqs")}
          className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "faqs"
              ? "bg-card text-primary shadow-sm"
              : "text-foreground/80 hover:bg-card/40"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <HelpCircle className="size-3.5" /> الأسئلة الشائعة (FAQ)
          </span>
        </button>
        <button
          onClick={() => setActiveTab("banners")}
          className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "banners"
              ? "bg-card text-primary shadow-sm"
              : "text-foreground/80 hover:bg-card/40"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Layout className="size-3.5" /> البانرات الإعلانية
          </span>
        </button>
        <button
          onClick={() => setActiveTab("colors")}
          className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "colors"
              ? "bg-card text-primary shadow-sm"
              : "text-foreground/80 hover:bg-card/40"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Palette className="size-3.5" /> ألوان المنصة
          </span>
        </button>
        <button
          onClick={() => setActiveTab("general")}
          className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "general"
              ? "bg-card text-primary shadow-sm"
              : "text-foreground/80 hover:bg-card/40"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Globe className="size-3.5" /> الهوية و SEO
          </span>
        </button>
      </div>

      {/* Details settings panels */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
        {activeTab === "general" && (
          <form onSubmit={handleSaveGeneral} className="space-y-4">
            <h3 className="font-display text-base font-bold text-foreground">
              بيانات الهوية وتهيئة محركات البحث
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  اسم المنصة
                </label>
                <input
                  type="text"
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  required
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  شعار المنصة (رابط الصورة)
                </label>
                <input
                  type="text"
                  value={platformLogo}
                  onChange={(e) => setPlatformLogo(e.target.value)}
                  required
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                عنوان الـ Meta (Meta Title)
              </label>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                required
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                وصف المنصة للـ SEO (Meta Description)
              </label>
              <textarea
                value={metaDesc}
                onChange={(e) => setMetaDesc(e.target.value)}
                required
                rows={3}
                className="w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary"
              />
            </div>

            <button
              type="submit"
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-card hover:opacity-95"
            >
              حفظ الهوية و SEO
            </button>
          </form>
        )}

        {activeTab === "colors" && (
          <form onSubmit={handleSaveColors} className="space-y-4">
            <h3 className="font-display text-base font-bold text-foreground">
              تخصيص ألوان وتنسيقات العلامة التجارية
            </h3>
            <p className="text-xs text-muted-foreground">
              اختر ألوان الهوية الرئيسية التي تنعكس على الأزرار والخلفيات والتنسيقات.
            </p>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  اللون الرئيسي (Primary Navy)
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
                    className="h-10 flex-1 rounded-xl border border-border bg-card px-3 text-sm font-mono text-center outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  اللون المساعد (Accent Orange)
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="size-10 rounded-lg cursor-pointer border border-border"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-10 flex-1 rounded-xl border border-border bg-card px-3 text-sm font-mono text-center outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  خلفية الموقع (Background)
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="size-10 rounded-lg cursor-pointer border border-border"
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="h-10 flex-1 rounded-xl border border-border bg-card px-3 text-sm font-mono text-center outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-card hover:opacity-95"
            >
              حفظ الألوان وتطبيق الثيم
            </button>
          </form>
        )}

        {activeTab === "banners" && (
          <div className="space-y-6">
            <h3 className="font-display text-base font-bold text-foreground">
              إدارة البانرات والشرائح الإعلانية بالرئيسية
            </h3>

            {/* Form */}
            <form
              onSubmit={handleAddBanner}
              className="rounded-xl border border-border bg-secondary/15 p-4 space-y-4"
            >
              <span className="block text-xs font-bold text-muted-foreground">
                إضافة بانر إعلاني جديد
              </span>

              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  type="text"
                  placeholder="عنوان البانر الإعلاني"
                  value={bannerTitle}
                  onChange={(e) => setBannerTitle(e.target.value)}
                  required
                  className="h-10 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                />
                <input
                  type="text"
                  placeholder="رابط الصورة المعروضة"
                  value={bannerImage}
                  onChange={(e) => setBannerImage(e.target.value)}
                  required
                  className="h-10 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                />
                <input
                  type="text"
                  placeholder="رابط الانتقال عند الضغط"
                  value={bannerLink}
                  onChange={(e) => setBannerLink(e.target.value)}
                  className="h-10 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-card hover:opacity-95"
              >
                <Plus className="size-4" /> إضافة البانر الترويجي
              </button>
            </form>

            {/* List */}
            <div className="space-y-3">
              {banners.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-col items-center justify-between border border-border bg-card p-4 rounded-xl sm:flex-row gap-4"
                >
                  <button
                    onClick={() => handleDeleteBanner(b.id)}
                    className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
                    title="حذف البانر"
                  >
                    <Trash2 className="size-4" />
                  </button>
                  <div className="text-end flex-1">
                    <h4 className="font-bold text-foreground text-sm">{b.title}</h4>
                    <span className="text-xs text-muted-foreground">الرابط: {b.linkUrl}</span>
                  </div>
                  <img
                    src={b.imageUrl}
                    alt={b.title}
                    className="h-16 w-32 object-cover rounded bg-secondary"
                  />
                </div>
              ))}
              {banners.length === 0 && (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  لا توجد بانرات معروضة حالياً
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "faqs" && (
          <div className="space-y-6">
            <h3 className="font-display text-base font-bold text-foreground">
              الأسئلة الشائعة المعروضة لزوار المنصة (FAQ)
            </h3>

            {/* Form */}
            <form
              onSubmit={handleSaveFaq}
              className="rounded-xl border border-border bg-secondary/15 p-4 space-y-4"
            >
              <span className="block text-xs font-bold text-muted-foreground">
                {editFaqId ? "تعديل السؤال الشائع" : "إضافة سؤال وجواب جديد"}
              </span>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="نص السؤال (باللغة العربية)"
                  value={faqQ}
                  onChange={(e) => setFaqQ(e.target.value)}
                  required
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                />
                <textarea
                  placeholder="نص الإجابة الشاملة..."
                  value={faqA}
                  onChange={(e) => setFaqA(e.target.value)}
                  required
                  rows={3}
                  className="w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-card hover:opacity-95"
                >
                  {editFaqId ? "حفظ التعديل" : "إضافة إلى القائمة"}
                </button>
                {editFaqId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditFaqId(null);
                      setFaqQ("");
                      setFaqA("");
                    }}
                    className="rounded-xl border border-border bg-card px-4 text-xs font-bold text-foreground hover:bg-secondary"
                  >
                    إلغاء
                  </button>
                )}
              </div>
            </form>

            {/* List */}
            <div className="space-y-4">
              {faqs
                .filter((f) => !f.isDeleted)
                .map((f) => (
                  <div key={f.id} className="border border-border p-4 rounded-xl space-y-2">
                    <div className="flex items-center justify-between border-b border-border/60 pb-2 gap-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSoftDeleteFaq(f.id)}
                          className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                          title="حذف"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleStartEditFaq(f)}
                          className="rounded-md p-1.5 text-primary hover:bg-secondary"
                          title="تعديل"
                        >
                          <Edit className="size-3.5" />
                        </button>
                      </div>
                      <h4 className="font-bold text-foreground text-sm">{f.question}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.answer}</p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
