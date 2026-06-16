import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Paperclip, Smile, Mic, StopCircle, X, Check, CheckCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Msg = {
  id: string;
  from: "me" | "agent";
  kind: "text" | "file" | "voice";
  text?: string;
  fileName?: string;
  fileUrl?: string;
  voiceUrl?: string;
  duration?: number;
  at: number;
  read?: boolean;
};

const EMOJIS = [
  "😀",
  "😂",
  "😊",
  "😍",
  "👍",
  "🙏",
  "🎉",
  "🔥",
  "💯",
  "❤️",
  "😢",
  "😮",
  "🤔",
  "👏",
  "🙌",
  "✨",
];

export function SupportChat({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "w",
      from: "agent",
      kind: "text",
      text: "مرحبًا بك في الدعم الفني لمنصة ألتيورا 👋 كيف يمكننا مساعدتك؟",
      at: Date.now() - 60000,
      read: true,
    },
  ]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recStart, setRecStart] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [messages, typing]);

  const fakeReply = (userMsg: string) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          from: "agent",
          kind: "text",
          text:
            userMsg.length > 80
              ? "شكرًا لتواصلك! تم استلام رسالتك وسيتواصل معك أحد ممثلي الدعم خلال دقائق."
              : "تم الاستلام ✅ كيف يمكنني المساعدة أكثر؟",
          at: Date.now(),
          read: true,
        },
      ]);
      // mark previous as read
      setMessages((m) => m.map((x) => (x.from === "me" ? { ...x, read: true } : x)));
    }, 1200);
  };

  const sendText = () => {
    const t = text.trim();
    if (!t) return;
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), from: "me", kind: "text", text: t, at: Date.now(), read: false },
    ]);
    setText("");
    setShowEmoji(false);
    fakeReply(t);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setMessages((m) => [
      ...m,
      {
        id: crypto.randomUUID(),
        from: "me",
        kind: "file",
        fileName: f.name,
        fileUrl: url,
        at: Date.now(),
        read: false,
      },
    ]);
    fakeReply(f.name);
    e.target.value = "";
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (ev) => chunksRef.current.push(ev.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        const dur = recStart ? Math.round((Date.now() - recStart) / 1000) : 0;
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            from: "me",
            kind: "voice",
            voiceUrl: url,
            duration: dur,
            at: Date.now(),
            read: false,
          },
        ]);
        stream.getTracks().forEach((t) => t.stop());
        fakeReply("voice");
      };
      mediaRef.current = mr;
      mr.start();
      setRecStart(Date.now());
      setRecording(true);
    } catch {
      alert("تعذّر الوصول للميكروفون");
    }
  };

  const stopRec = () => {
    mediaRef.current?.stop();
    setRecording(false);
    setRecStart(null);
  };

  const fmtTime = (t: number) =>
    new Date(t).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[80vh] max-h-[640px] max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-elevated sm:max-w-md"
        dir="rtl"
      >
        <DialogHeader className="flex flex-row items-center justify-between gap-3 border-b border-border bg-primary px-4 py-3 text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-white/20 text-base font-bold">
              A
            </div>
            <div className="text-end">
              <DialogTitle className="text-sm font-bold text-primary-foreground">
                دعم ألتيورا
              </DialogTitle>
              <div className="flex items-center gap-1.5 text-[11px] opacity-90">
                <span className="size-1.5 rounded-full bg-green-400" /> متصل الآن
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Messages */}
        <div ref={scrollerRef} className="flex-1 space-y-3 overflow-y-auto bg-secondary/30 p-4">
          {messages.map((m) => (
            <Bubble key={m.id} m={m} fmtTime={fmtTime} />
          ))}
          {typing && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1 rounded-2xl bg-card px-4 py-3 shadow-card">
                <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.2s]" />
                <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.1s]" />
                <span className="size-2 animate-bounce rounded-full bg-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Emoji picker */}
        <AnimatePresence>
          {showEmoji && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="grid grid-cols-8 gap-1 border-t border-border bg-card p-2"
            >
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setText((t) => t + e)}
                  className="rounded-lg p-1.5 text-xl transition-colors hover:bg-secondary"
                >
                  {e}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Composer */}
        <div className="border-t border-border bg-card p-3">
          {recording ? (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary p-3">
              <button
                onClick={stopRec}
                className="flex items-center gap-2 rounded-lg bg-destructive px-3 py-2 text-xs font-bold text-destructive-foreground"
              >
                <StopCircle className="size-4" /> إنهاء التسجيل
              </button>
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className="size-2 animate-pulse rounded-full bg-destructive" />
                جارٍ التسجيل…
              </div>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <button
                onClick={sendText}
                disabled={!text.trim()}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <Send className="size-4" />
              </button>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendText();
                  }
                }}
                placeholder="اكتب رسالتك…"
                rows={1}
                className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
              />
              <button
                onClick={() => setShowEmoji((v) => !v)}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <Smile className="size-5" />
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <Paperclip className="size-5" />
              </button>
              <button
                onClick={startRec}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <Mic className="size-5" />
              </button>
              <input ref={fileRef} type="file" className="hidden" onChange={onFile} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Bubble({ m, fmtTime }: { m: Msg; fmtTime: (t: number) => string }) {
  const mine = m.from === "me";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm shadow-card ${mine ? "bg-primary text-primary-foreground" : "bg-card text-foreground"}`}
      >
        {m.kind === "text" && <div className="whitespace-pre-wrap break-words">{m.text}</div>}
        {m.kind === "file" && (
          <a href={m.fileUrl} download={m.fileName} className="flex items-center gap-2 underline">
            <Paperclip className="size-4" /> {m.fileName}
          </a>
        )}
        {m.kind === "voice" && (
          <div className="flex items-center gap-2">
            <audio controls src={m.voiceUrl} className="h-8" />
            {m.duration ? <span className="text-[11px] opacity-80">{m.duration}s</span> : null}
          </div>
        )}
        <div
          className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}
        >
          <span>{fmtTime(m.at)}</span>
          {mine && (m.read ? <CheckCheck className="size-3" /> : <Check className="size-3" />)}
        </div>
      </div>
    </div>
  );
}
