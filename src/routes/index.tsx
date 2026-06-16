import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Navbar } from "@/components/site/Navbar";
import { Hero } from "@/components/site/Hero";
import { FeaturedCourses } from "@/components/site/FeaturedCourses";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Altiora — نحو القمة | منصتك التعليمية" },
      {
        name: "description",
        content: "ألتيورا — منصة تعليمية عربية بكورسات عملية ومدرسين محترفين تساعدك توصل لأعلى.",
      },
      { property: "og:title", content: "Altiora — نحو القمة" },
      {
        property: "og:description",
        content: "منصة تعليمية متميزة للطلاب والمعلمين. ابدأ رحلتك التعليمية اليوم.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  component: Index,
});

function Index() {
  useEffect(() => {
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <FeaturedCourses />
      </main>
      <Footer />
    </div>
  );
}
