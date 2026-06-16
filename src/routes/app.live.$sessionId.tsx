import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { Device } from "mediasoup-client";
import {
  Radio,
  MessageSquare,
  Hand,
  Smile,
  Heart,
  ThumbsUp,
  Flame,
  Activity,
  HelpCircle,
  X,
  Volume2,
  VolumeX,
  Clock,
  Send,
  Eye,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { Whiteboard } from "../components/live/Whiteboard";
import {
  getLiveSessionFn,
  submitPollVoteFn,
  raiseHandFn,
  lowerHandFn,
  trackAttendanceFn,
  incrementReconnectCountFn,
} from "../lib/api/live.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/app/live/$sessionId")({
  component: StudentLiveView,
});

function StudentLiveView() {
  const { sessionId } = useParams({ from: "/app/live/$sessionId" });
  const navigate = useNavigate();
  const socketRef = useRef<any>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Mediasoup refs
  const deviceRef = useRef<any>(null);
  const recvTransportRef = useRef<any>(null);
  const consumersRef = useRef<Map<string, any>>(new Map());
  const remoteStreamRef = useRef<MediaStream | null>(null);

  // User & Session state
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("STUDENT");
  const [studentCode, setStudentCode] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  // UI state
  const [status, setStatus] = useState<"WAITING" | "ADMITTED" | "REJECTED">("WAITING");
  const [countdownString, setCountdownString] = useState("Starting Soon");
  const [waitingCount, setWaitingCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);

  // Chat & Polls
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatMuted, setChatMuted] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [activePolls, setActivePolls] = useState<any[]>([]);
  const [votedPollIds, setVotedPollIds] = useState<Set<string>>(new Set());

  // Interactive controls
  const [handRaised, setHandRaised] = useState(false);
  const [activeTab, setActiveTab] = useState<"whiteboard" | "stream">("stream");
  const [activeViewers, setActiveViewers] = useState(0);

  // Watermarks positioning
  const [watermarks, setWatermarks] = useState<
    Array<{ id: number; top: number; left: number; opacity: number }>
  >([
    { id: 1, top: 20, left: 15, opacity: 0.2 },
    { id: 2, top: 50, left: 60, opacity: 0.15 },
    { id: 3, top: 80, left: 40, opacity: 0.25 },
  ]);

  // Sync state & drawing history
  const [whiteboardStrokes, setWhiteboardStrokes] = useState<any[]>([]);

  // Attendance Tracker intervals
  const attendanceTimerRef = useRef<any>(null);
  const connectionTimerRef = useRef<any>(null);

  // 1. Fetch Session info & Validate Enrollment
  useEffect(() => {
    getLiveSessionFn({ data: { sessionId } })
      .then((res) => {
        setSession(res.session);
        setUserRole(res.userRole);
        setStudentCode(res.studentCode || "00000");
        setUserId(res.userId);

        // Calculate countdown timer if countdownEnd is in future
        if (res.session.countdownEnd) {
          const timer = setInterval(() => {
            const diff = new Date(res.session.countdownEnd).getTime() - Date.now();
            if (diff <= 0) {
              setCountdownString("ابدأ الدرس المباشر الآن");
              clearInterval(timer);
            } else {
              const minutes = Math.floor(diff / 60000);
              const seconds = Math.floor((diff % 60000) / 1000);
              setCountdownString(`يبدأ الدرس المباشر خلال: ${minutes} دقيقة و ${seconds} ثانية`);
            }
          }, 1000);
          return () => clearInterval(timer);
        }
      })
      .catch((err) => {
        toast.error("خطأ في التحقق من التسجيل: " + err.message);
        navigate({ to: "/app/courses" as any });
      });
  }, [sessionId]);

  // 2. Watermark overlay movement loop (moves every 5 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setWatermarks(
        watermarks.map((w) => ({
          id: w.id,
          top: Math.floor(Math.random() * 80) + 10,
          left: Math.floor(Math.random() * 80) + 10,
          opacity: Math.random() * 0.25 + 0.05,
        })),
      );
    }, 5000);
    return () => clearInterval(timer);
  }, [watermarks]);

  // 3. Socket.IO signaling, reconnect recovery, and state restore
  useEffect(() => {
    const socketHost = `${window.location.protocol}//${window.location.hostname}:3001`;
    const socket = io(socketHost, {
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to live server");
      if (session) {
        socket.emit("join-live", {
          sessionId,
          userId,
          name: studentCode ? `طالب ${studentCode}` : "طالب",
          isTeacher: false,
        });
      }
    });

    socket.on("one-device-conflict", (data: { message: string }) => {
      toast.error(data.message);
      navigate({ to: "/" as any });
    });

    socket.on("waiting-room", (data: { waitingCount: number }) => {
      setStatus("WAITING");
      setWaitingCount(data.waitingCount);
    });

    const consumeProducer = async (producerId: string, kind: string) => {
      if (!deviceRef.current || !recvTransportRef.current || !socketRef.current) return;
      if (consumersRef.current.has(producerId)) return;

      socketRef.current.emit(
        "consume",
        {
          sessionId,
          transportId: recvTransportRef.current.id,
          producerId,
          rtpCapabilities: deviceRef.current.rtpCapabilities,
        },
        async (consumerParams: any) => {
          if (consumerParams.error) {
            console.error("Failed to consume producer:", consumerParams.error);
            return;
          }

          try {
            const consumer = await recvTransportRef.current.consume({
              id: consumerParams.id,
              producerId: consumerParams.producerId,
              kind: consumerParams.kind,
              rtpParameters: consumerParams.rtpParameters,
            });

            consumersRef.current.set(producerId, consumer);

            if (!remoteStreamRef.current) {
              remoteStreamRef.current = new MediaStream();
            }
            remoteStreamRef.current.addTrack(consumer.track);

            if (videoRef.current) {
              videoRef.current.srcObject = remoteStreamRef.current;
            }

            socketRef.current?.emit("resumeConsumer", { consumerId: consumer.id });

            consumer.on("transportclose", () => {
              console.log("Consumer transport closed");
              consumer.close();
              consumersRef.current.delete(producerId);
              if (remoteStreamRef.current) {
                remoteStreamRef.current.removeTrack(consumer.track);
              }
            });

            consumer.on("producerclose", () => {
              console.log("Producer closed");
              consumer.close();
              consumersRef.current.delete(producerId);
              if (remoteStreamRef.current) {
                remoteStreamRef.current.removeTrack(consumer.track);
              }
            });
          } catch (consumeErr) {
            console.error("Failed to consume track:", consumeErr);
          }
        }
      );
    };

    const initMediasoup = async (socket: any) => {
      try {
        socket.emit("getRouterRtpCapabilities", { sessionId }, async (routerRes: any) => {
          if (routerRes.error) {
            console.error("Failed to get router capabilities:", routerRes.error);
            return;
          }

          try {
            const device = new Device();
            await device.load({ routerRtpCapabilities: routerRes.rtpCapabilities });
            deviceRef.current = device;

            socket.emit("createWebRtcTransport", { sessionId, direction: "recv" }, async (transportRes: any) => {
              if (transportRes.error) {
                console.error("Failed to create WebRtcTransport:", transportRes.error);
                return;
              }

              const iceServers = [
                { urls: "stun:stun.relay.metered.ca:80" },
                {
                  urls: "turn:global.relay.metered.ca:80",
                  username: import.meta.env.VITE_METERED_TURN_USERNAME || "",
                  credential: import.meta.env.VITE_METERED_TURN_CREDENTIAL || "",
                },
                {
                  urls: "turn:global.relay.metered.ca:80?transport=tcp",
                  username: import.meta.env.VITE_METERED_TURN_USERNAME || "",
                  credential: import.meta.env.VITE_METERED_TURN_CREDENTIAL || "",
                },
                {
                  urls: "turn:global.relay.metered.ca:443",
                  username: import.meta.env.VITE_METERED_TURN_USERNAME || "",
                  credential: import.meta.env.VITE_METERED_TURN_CREDENTIAL || "",
                },
                {
                  urls: "turns:global.relay.metered.ca:443?transport=tcp",
                  username: import.meta.env.VITE_METERED_TURN_USERNAME || "",
                  credential: import.meta.env.VITE_METERED_TURN_CREDENTIAL || "",
                },
                { urls: "stun:stun.l.google.com:19302" }
              ];

              const recvTransport = device.createRecvTransport({
                id: transportRes.id,
                iceParameters: transportRes.iceParameters,
                iceCandidates: transportRes.iceCandidates,
                dtlsParameters: transportRes.dtlsParameters,
                iceServers,
              });

              recvTransportRef.current = recvTransport;

              recvTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
                socket.emit("connectWebRtcTransport", { transportId: recvTransport.id, dtlsParameters }, (res: any) => {
                  if (res.error) errback(new Error(res.error));
                  else callback();
                });
              });

              // Fetch active producers from server
              socket.emit("get-active-producers", { sessionId }, async (producersRes: any) => {
                if (producersRes && producersRes.producers) {
                  for (const prod of producersRes.producers) {
                    await consumeProducer(prod.producerId, prod.kind);
                  }
                }
              });
            });
          } catch (deviceErr) {
            console.error("Device load failed:", deviceErr);
          }
        });
      } catch (err) {
        console.error("Failed to initialize Mediasoup:", err);
      }
    };

    socket.on("admitted", () => {
      setStatus("ADMITTED");
      toast.success("تم قبول دخولك من قبل المعلم.");

      // Start background attendance tracking (registers duration every 10s)
      startAttendanceTracking();

      // Initialize Mediasoup
      initMediasoup(socket);
    });

    socket.on("new-producer", async (data: { producerId: string; kind: "audio" | "video"; appData?: any }) => {
      await consumeProducer(data.producerId, data.kind);
    });

    socket.on("rejected", () => {
      setStatus("REJECTED");
      toast.error("تم رفض طلب دخولك أو إزالتك من البث.");
      stopAttendanceTracking();
      socket.disconnect();
    });

    socket.on("session-ended", () => {
      toast.info("انتهى البث المباشر المرفوع من المعلم.");
      stopAttendanceTracking();
      navigate({ to: "/" as any });
    });

    socket.on("sync-state", async (state: any) => {
      setChatMuted(state.chatMuted);
      setActivePolls(state.activePolls || []);
      setWhiteboardStrokes(state.whiteboardStrokes || []);

      // Consume active producers if sync-state returned any
      if (state.activeProducers && recvTransportRef.current) {
        for (const prod of state.activeProducers) {
          await consumeProducer(prod.producerId, prod.kind);
        }
      }
    });

    socket.on("chat-message", (msg: any) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    socket.on("chat-mute-status", (data: { muted: boolean }) => {
      setChatMuted(data.muted);
    });

    socket.on("chat-cleared", () => {
      setChatMessages([]);
    });

    socket.on("poll-created", (poll: any) => {
      setActivePolls((prev) => [poll, ...prev]);
      toast.info("تم نشر استفتاء جديد من المعلم.");
    });

    socket.on("poll-update", (updatedPoll: any) => {
      setActivePolls((prev) => prev.map((p) => (p.id === updatedPoll.id ? updatedPoll : p)));
    });

    // Reconnect recovery helper
    socket.on("reconnect", () => {
      console.log("Socket reconnected!");
      incrementReconnectCountFn({ data: { sessionId } }).catch(console.error);

      // Re-trigger live session join
      socket.emit("join-live", {
        sessionId,
        userId,
        name: `طالب ${studentCode}`,
        isTeacher: false,
      });

      // Re-initialize Mediasoup if admitted
      if (status === "ADMITTED") {
        initMediasoup(socket);
      }
    });

    return () => {
      socket.disconnect();
      stopAttendanceTracking();
    };
  }, [session, userId, studentCode, status]);

  // 4. Background Attendance Tracking (runs every 10s)
  const startAttendanceTracking = () => {
    if (attendanceTimerRef.current) return;
    attendanceTimerRef.current = setInterval(() => {
      trackAttendanceFn({ data: { sessionId, durationSeconds: 10 } }).catch((err) => {
        console.error("Failed to track attendance:", err);
      });
    }, 10000);
  };

  const stopAttendanceTracking = () => {
    if (attendanceTimerRef.current) {
      clearInterval(attendanceTimerRef.current);
      attendanceTimerRef.current = null;
    }
  };

  // Chat send
  const sendChatMessage = () => {
    if (!chatInput.trim() || chatMuted) return;
    socketRef.current?.emit("chat-message", { message: chatInput });
    setChatInput("");
  };

  // Hand raising toggle
  const toggleHand = async () => {
    if (handRaised) {
      await lowerHandFn({ data: { sessionId } });
      socketRef.current?.emit("lower-hand");
      setHandRaised(false);
    } else {
      await raiseHandFn({ data: { sessionId } });
      socketRef.current?.emit("raise-hand");
      setHandRaised(true);
    }
  };

  // Reaction broadcaster
  const emitReaction = (type: string) => {
    socketRef.current?.emit("reaction", { type });
  };

  // Vote poll
  const submitVote = async (pollId: string, optionIndex: number) => {
    try {
      await submitPollVoteFn({ data: { pollId, optionIndex } });
      socketRef.current?.emit("vote-poll", { pollId, optionIndex });
      setVotedPollIds((prev) => new Set([...prev, pollId]));
      toast.success("تم إرسال صوتك بنجاح.");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Fullscreen support for video
  const toggleFullscreen = () => {
    const container = videoContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(console.error);
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(console.error);
    }
  };

  // ------------------------------------------------
  // 5. RENDER STAGES
  // ------------------------------------------------

  // Rejected View
  if (status === "REJECTED") {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 px-4" dir="rtl">
        <div className="max-w-md text-center bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-elevated">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-red-500/10 text-red-500 mb-6">
            <X className="size-8" />
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-100">تم رفض الانضمام</h1>
          <p className="mt-3 text-sm text-slate-400 leading-relaxed font-display">
            عذراً، لقد تم رفض طلب انضمامك إلى البث المباشر من قبل المعلم أو تم إنهاء جلستك.
          </p>
          <div className="mt-8">
            <Link
              to="/app/courses"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-card transition-all hover:scale-105"
            >
              العودة للمقررات
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Waiting Room View
  if (status === "WAITING") {
    return (
      <div
        className="flex h-screen items-center justify-center bg-slate-950 px-4 text-white"
        dir="rtl"
      >
        <div className="max-w-md w-full text-center bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-elevated relative overflow-hidden">
          {/* Animated visual radio background */}
          <div className="absolute -top-12 -left-12 size-36 bg-primary/10 rounded-full blur-2xl animate-pulse" />

          <div className="mx-auto flex size-20 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6 animate-pulse">
            <Radio className="size-10" />
          </div>

          <h1 className="font-display text-2xl font-bold text-slate-100">غرفة الانتظار المباشر</h1>
          <p className="text-sm font-display text-primary mt-1">{session?.title}</p>

          <div className="mt-6 p-4 rounded-2xl bg-slate-950/50 border border-slate-800/80 font-display">
            <h4 className="text-slate-200 text-xs font-bold mb-2">حالة الاتصال</h4>
            <p className="text-sm text-amber-500 font-bold">{countdownString}</p>
            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-400">
              <Eye className="size-4 text-primary" />
              <span>الطلاب في قائمة الانتظار حالياً: {waitingCount} طالب</span>
            </div>
          </div>

          <p className="mt-6 text-xs text-slate-500 leading-relaxed font-display">
            سيبدأ البث فور قيام المعلم بقبول دخولك وتفعيل البث المباشر. يرجى الانتظار في هذه الصفحة
            دون تحديث.
          </p>

          <div className="mt-8">
            <Link
              to="/app/courses"
              className="text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              إلغاء والعودة للمقررات
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Admitted / Stream View
  return (
    <div
      className="flex flex-col lg:flex-row h-screen bg-slate-950 text-white overflow-hidden"
      dir="rtl"
    >
      {/* Dynamic Watermark overlay mapping (Anti-piracy screen recorder protection) */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
        {watermarks.map((w) => (
          <div
            key={w.id}
            className="absolute select-none font-display text-xs font-black tracking-widest text-slate-400/90 select-none transition-all duration-1000 ease-in-out"
            style={{
              top: `${w.top}%`,
              left: `${w.left}%`,
              opacity: w.opacity,
            }}
          >
            ID: {studentCode}
          </div>
        ))}
      </div>

      {/* 1. Main Live Stream player Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Stream Workspace Header */}
        <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Radio className="size-5" />
            </div>
            <div>
              <h1 className="font-display text-sm font-bold text-slate-100">{session?.title}</h1>
              <p className="text-[10px] text-slate-400 font-display mt-0.5">
                البث المباشر نشط الآن
              </p>
            </div>
          </div>

          {/* Toggle Display Tabs */}
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab("stream")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-display font-bold transition-all cursor-pointer ${activeTab === "stream" ? "bg-primary text-white" : "text-slate-400 hover:text-white"}`}
            >
              البث المباشر
            </button>
            <button
              onClick={() => setActiveTab("whiteboard")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-display font-bold transition-all cursor-pointer ${activeTab === "whiteboard" ? "bg-primary text-white" : "text-slate-400 hover:text-white"}`}
            >
              السبورة التفاعلية
            </button>
          </div>
        </div>

        {/* Stream / Whiteboard View Area */}
        <div className="flex-1 bg-slate-950 relative flex items-center justify-center p-4 overflow-hidden">
          {activeTab === "stream" && (
            <div
              ref={videoContainerRef}
              className="relative w-full h-full max-h-[500px] aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 group"
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                controls={false}
                muted={isMuted}
                className="w-full h-full object-contain"
              />

              {/* Watermark inside video container to survive standard browser fullscreen */}
              <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
                {watermarks.map((w) => (
                  <div
                    key={w.id}
                    className="absolute font-display text-[10px] font-bold text-white select-none transition-all duration-1000"
                    style={{
                      top: `${w.top}%`,
                      left: `${w.left}%`,
                      opacity: w.opacity * 2.5,
                    }}
                  >
                    ID: {studentCode}
                  </div>
                ))}
              </div>

              {/* Player Overlay Controls */}
              <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white cursor-pointer"
                  >
                    {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                  </button>
                </div>

                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white cursor-pointer"
                >
                  {isFullscreen ? (
                    <Minimize2 className="size-4" />
                  ) : (
                    <Maximize2 className="size-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === "whiteboard" && (
            <div className="w-full h-full">
              <Whiteboard
                socket={socketRef.current}
                sessionId={sessionId}
                isTeacher={false}
                initialStrokes={whiteboardStrokes}
              />
            </div>
          )}
        </div>

        {/* Interaction Panel (Raise Hand, Reactions Bar) */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleHand}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-display text-xs font-bold transition-all cursor-pointer ${
                handRaised
                  ? "bg-amber-500 text-slate-900"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-100"
              }`}
            >
              <Hand className="size-4" />
              {handRaised ? "خفض اليد" : "رفع اليد"}
            </button>
          </div>

          {/* Quick Reaction Bar */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-display">تفاعل:</span>
            <button
              onClick={() => emitReaction("like")}
              className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="أعجبني"
            >
              <ThumbsUp className="size-4 text-sky-400" />
            </button>
            <button
              onClick={() => emitReaction("heart")}
              className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="حب"
            >
              <Heart className="size-4 text-red-500" />
            </button>
            <button
              onClick={() => emitReaction("clap")}
              className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="تصفيق"
            >
              <Flame className="size-4 text-amber-500" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Control Sidebar (Chat & Polls) */}
      <div className="w-full lg:w-96 bg-slate-900 border-r lg:border-r-0 lg:border-l border-slate-800 flex flex-col h-full overflow-hidden">
        {/* Live Active Poll display inside sidebar */}
        {activePolls.length > 0 && (
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 font-display">
            <h3 className="text-xs font-bold text-primary mb-3">الاستفتاءات النشطة</h3>
            <div className="space-y-3">
              {activePolls.map((poll) => {
                const isVoted = votedPollIds.has(poll.id);
                // Calculate total votes
                const totalVotes = Object.keys(poll.results || {}).length;

                return (
                  <div
                    key={poll.id}
                    className="bg-slate-900 p-3 rounded-xl border border-slate-800"
                  >
                    <p className="text-xs font-bold text-slate-200 mb-2">{poll.question}</p>
                    <div className="space-y-2">
                      {poll.options.map((opt: string, idx: number) => {
                        // Count votes for this option
                        const optionVotes = Object.values(poll.results || {}).filter(
                          (v) => v === idx,
                        ).length;
                        const pct =
                          totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;

                        return (
                          <div key={idx}>
                            {isVoted ? (
                              <div className="text-xs">
                                <div className="flex justify-between text-slate-300 mb-1">
                                  <span>{opt}</span>
                                  <span>
                                    {pct}% ({optionVotes})
                                  </span>
                                </div>
                                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-primary h-full" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => submitVote(poll.id, idx)}
                                className="w-full py-2 px-3 text-right bg-slate-800 hover:bg-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                              >
                                {opt}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Chat Component */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex bg-slate-950 border-b border-slate-800 p-3 items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <MessageSquare className="size-4 text-primary" />
              الدردشة المباشرة
            </h3>
            {chatMuted && (
              <span className="text-[10px] bg-red-500/10 text-red-400 px-2.5 py-0.5 rounded-full font-bold">
                المحادثة معلقة
              </span>
            )}
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs font-display">
                لا توجد رسائل دردشة بعد
              </div>
            ) : (
              chatMessages.map((m) => (
                <div key={m.id} className="flex flex-col text-right">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-primary">{m.userName}</span>
                    <span className="text-[9px] text-slate-500">
                      {new Date(m.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-200 bg-slate-800 px-3 py-2 rounded-2xl inline-block max-w-[85%] self-start rounded-tr-none">
                    {m.message}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Chat send box */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={chatMuted}
              placeholder={chatMuted ? "المحادثة مغلقة من قبل المعلم" : "اكتب رسالة..."}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary font-display disabled:opacity-40"
              onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
            />
            <button
              onClick={sendChatMessage}
              disabled={chatMuted}
              className="p-2.5 rounded-xl bg-primary text-white hover:opacity-90 transition-all cursor-pointer disabled:opacity-40"
            >
              <Send className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
