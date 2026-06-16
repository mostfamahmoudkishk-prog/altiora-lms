import { Link } from "@tanstack/react-router";
import { PlayCircle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import heroEmblem from "@/assets/hero-emblem.png";

export function Hero() {
  return (
    <section className="gradient-hero relative overflow-hidden">
      <div className="container mx-auto grid items-center gap-10 px-4 py-14 md:grid-cols-2 md:gap-8 md:px-6 md:py-24">
        {/* Welcome text column */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="order-2 text-center md:text-start"
        >
          <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-foreground md:text-5xl lg:text-[3.4rem]">
            ابدأ رحلتك، طوّر مهاراتك ووصّل <span className="text-brand-orange">لأعلى</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-loose text-muted-foreground md:mx-0">
            في ألتيورا بنقدم لك كورسات عملية ومبسطة تساعدك تتعلم بسهولة وتطبّق اللي بتتعلمه في شغلك
            أو دراستك او مشاريعك الخاصة. مهارات جديدة، فرص أكبر، ومستقبل أحسن… الخطوة الأولى تبدأ
            منك.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row md:justify-start">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-xl bg-primary px-6 text-base text-primary-foreground shadow-elevated transition-all hover:opacity-95 hover:scale-105"
            >
              <a href="#courses">
                <PlayCircle className="size-5" />
                تصفح الدورات
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-xl border-2 border-accent bg-card px-6 text-base text-accent transition-all hover:bg-accent/10 hover:text-accent hover:scale-105"
            >
              <Link to="/register">
                <UserPlus className="size-5" />
                انضم لينا
              </Link>
            </Button>
          </div>
        </motion.div>

        {/* Hero illustration column */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative order-1 w-full max-w-sm md:max-w-xl mx-auto flex items-center justify-center"
        >
          <motion.div
            className="absolute inset-0 -z-10 mx-auto h-72 w-72 rounded-full bg-accent/15 blur-3xl md:h-[28rem] md:w-[28rem]"
            animate={{ scale: [1, 1.06, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />

          <img
            src={heroEmblem}
            alt="Altiora Learning"
            className="w-full h-auto object-contain select-none pointer-events-none"
          />
        </motion.div>
      </div>
    </section>
  );
}
