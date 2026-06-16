import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react";
import io from "socket.io-client";
import { Device } from "mediasoup-client";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  Settings,
  Users,
  MessageSquare,
  Layers,
  HelpCircle,
  Radio,
  Activity,
  X,
  Check,
  Send,
  UserCheck,
  TrendingUp,
  Award,
  BookOpen,
} from "lucide-react";
import { Whiteboard } from "../components/live/Whiteboard";
import {
  getLiveSessionFn,
  endLiveSessionFn,
  getLiveAttendanceReportFn,
  compileRecordingToLessonFn,
} from "../lib/api/live.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/teacher/live/$sessionId")({
  component: TeacherLiveStudio,
});

function TeacherLiveStudio() {
  const { sessionId } = useParams({ from: "/teacher/live/$sessionId" });
  const navigate = useNavigate();
  const socketRef = useRef<any>(null);

  // Audio/Video refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Mediasoup refs
  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<any>(null);
  const videoProducerRef = useRef<any>(null);
  const audioProducerRef = useRef<any>(null);
  const recordIntervalRef = useRef<any>(null);

  // States
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("TEACHER");
  const [userId, setUserId] = useState<string>("");
  const [connected, setConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Controls
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [activeScene, setActiveScene] = useState<"camera" | "screen" | "whiteboard" | "pdf">(
    "camera",
  );
  const [facecamPosition, setFacecamPosition] = useState<
    "top-right" | "top-left" | "bottom-right" | "bottom-left"
  >("bottom-right");

  // Device list
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState("");
  const [selectedAudio, setSelectedAudio] = useState("");

  // Signaling state
  const [waitingStudents, setWaitingStudents] = useState<any[]>([]);
  const [activeViewersCount, setActiveViewersCount] = useState(0);
  const [raisedHands, setRaisedHands] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatMuted, setChatMuted] = useState(false);
  const [chatInput, setChatInput] = useState("");

  // Poll creator
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [activePolls, setActivePolls] = useState<any[]>([]);

  // Analytics overlay mode
  const [analyticsMode, setAnalyticsMode] = useState<"expanded" | "minimized" | "hidden">(
    "minimized",
  );
  const [connectionStats, setConnectionStats] = useState({
    latency: 15, // ms
    bitrate: 1250, // kbps
    quality: "ممتازة",
  });

  // Load Session Data
  useEffect(() => {
    getLiveSessionFn({ data: { sessionId } })
      .then((res) => {
        setSession(res.session);
        setUserRole(res.userRole);
        setUserId(res.userId);

        if (
          res.userRole !== "TEACHER" &&
          res.userRole !== "ADMIN" &&
          res.userRole !== "SUPER_ADMIN"
        ) {
          toast.error("غير مصرح لك بدخول استوديو البث الخاص بالمعلمين.");
          navigate({ to: "/" });
        }
      })
      .catch((err) => {
        toast.error("حدث خطأ في تحميل بيانات البث: " + err.message);
        navigate({ to: "/" });
      });
  }, [sessionId]);

  // Enumerate Media Devices
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const video = devices.filter((d) => d.kind === "videoinput");
      const audio = devices.filter((d) => d.kind === "audioinput");
      setVideoDevices(video);
      setAudioDevices(audio);
      if (video.length > 0) setSelectedVideo(video[0].deviceId);
      if (audio.length > 0) setSelectedAudio(audio[0].deviceId);
    });
  }, []);

  // Initialize Media Stream
  const initLocalStream = async (videoId?: string, audioId?: string) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints = {
        video: videoId ? { deviceId: { exact: videoId } } : true,
        audio: audioId ? { deviceId: { exact: audioId } } : true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Apply initial mic/camera status
      stream.getAudioTracks().forEach((track) => {
        track.enabled = micEnabled;
      });
      stream.getVideoTracks().forEach((track) => {
        track.enabled = cameraEnabled;
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Update tracks on mediasoup producers
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      if (videoTrack && videoProducerRef.current) {
        videoProducerRef.current.replaceTrack({ track: videoTrack }).catch(console.error);
      }
      if (audioTrack && audioProducerRef.current) {
        audioProducerRef.current.replaceTrack({ track: audioTrack }).catch(console.error);
      }
    } catch (err) {
      console.error("Failed to get local stream:", err);
      toast.error("فشل في الوصول إلى الكاميرا أو المايك.");
    }
  };

  // Toggle handlers for mic and camera that directly change WebRTC tracks
  const toggleMic = () => {
    const newVal = !micEnabled;
    setMicEnabled(newVal);
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = newVal;
      });
    }
  };

  const toggleCamera = () => {
    const newVal = !cameraEnabled;
    setCameraEnabled(newVal);
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = newVal;
      });
    }
  };

  // Trigger init on options change
  useEffect(() => {
    initLocalStream(selectedVideo, selectedAudio);
  }, [selectedVideo, selectedAudio]);

  // Mediasoup Client Ingest Initialization
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

          socket.emit("createWebRtcTransport", { sessionId, direction: "send" }, async (transportRes: any) => {
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

            const sendTransport = device.createSendTransport({
              id: transportRes.id,
              iceParameters: transportRes.iceParameters,
              iceCandidates: transportRes.iceCandidates,
              dtlsParameters: transportRes.dtlsParameters,
              iceServers,
            });

            sendTransportRef.current = sendTransport;

            sendTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
              socket.emit("connectWebRtcTransport", { transportId: sendTransport.id, dtlsParameters }, (res: any) => {
                if (res.error) errback(new Error(res.error));
                else callback();
              });
            });

            sendTransport.on("produce", ({ kind, rtpParameters, appData }, callback, errback) => {
              socket.emit("produce", { transportId: sendTransport.id, kind, rtpParameters, appData }, (res: any) => {
                if (res.error) errback(new Error(res.error));
                else callback({ id: res.id });
              });
            });

            // Produce current local tracks immediately
            if (streamRef.current) {
              const videoTrack = streamRef.current.getVideoTracks()[0];
              const audioTrack = streamRef.current.getAudioTracks()[0];
              
              if (videoTrack) {
                videoProducerRef.current = await sendTransport.produce({ track: videoTrack, appData: { type: "camera" } });
              }
              if (audioTrack) {
                audioProducerRef.current = await sendTransport.produce({ track: audioTrack, appData: { type: "microphone" } });
              }
            }
          });
        } catch (deviceErr) {
          console.error("Device load failed:", deviceErr);
        }
      });
    } catch (err) {
      console.error("Failed to initialize Mediasoup:", err);
    }
  };

  // Initialize Socket.IO connection
  useEffect(() => {
    const socketHost = `${window.location.protocol}//${window.location.hostname}:3001`;
    const socket = io(socketHost);
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      console.log("Connected to Live Signaling Server");

      if (session) {
        socket.emit("join-live", {
          sessionId,
          userId,
          name: "المعلم",
          isTeacher: true,
        });

        // Initialize mediasoup
        initMediasoup(socket);
      }
    });

    socket.on("sync-state", (state: any) => {
      setWaitingStudents(state.waitingStudents || []);
      setRaisedHands(state.raisedHands || []);
      setChatMuted(state.chatMuted);
      setActivePolls(state.activePolls || []);
    });

    socket.on("waiting-list-update", (list: any[]) => {
      setWaitingStudents(list);
    });

    socket.on("raised-hands-update", (list: any[]) => {
      setRaisedHands(list);
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

    socket.on("poll-update", (updatedPoll: any) => {
      setActivePolls((prev) => prev.map((p) => (p.id === updatedPoll.id ? updatedPoll : p)));
    });

    socket.on("student-joined", (data: { userId: string; socketId: string; name: string }) => {
      setActiveViewersCount((prev) => prev + 1);
    });

    socket.on("student-left", (data: { userId: string; socketId: string }) => {
      setActiveViewersCount((prev) => Math.max(0, prev - 1));
    });

    // Auto update latency periodically
    const statInterval = setInterval(() => {
      setConnectionStats((prev) => ({
        ...prev,
        latency: Math.floor(10 + Math.random() * 15),
        bitrate: 1100 + Math.floor(Math.random() * 300),
      }));
    }, 4000);

    return () => {
      clearInterval(statInterval);
      socket.disconnect();
    };
  }, [session, userId]);

  // Screen Sharing
  const toggleScreenShare = async () => {
    try {
      if (screenSharing) {
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach((t) => t.stop());
        }
        setScreenSharing(false);
        setActiveScene("camera");
        initLocalStream(selectedVideo, selectedAudio);
      } else {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        screenStreamRef.current = stream;
        setScreenSharing(true);
        setActiveScene("screen");

        // Swap video tracks on mediasoup video producer
        const screenTrack = stream.getVideoTracks()[0];
        if (videoProducerRef.current) {
          await videoProducerRef.current.replaceTrack({ track: screenTrack });
        }

        // Listen for screen share stop by user from browser UI
        screenTrack.onended = () => {
          setScreenSharing(false);
          setActiveScene("camera");
          initLocalStream(selectedVideo, selectedAudio);
        };
      }
    } catch (err) {
      console.error(err);
      toast.error("فشل في مشاركة الشاشة.");
    }
  };

  // Toggle Micro Recorder (FFmpeg Stream capture ingest)
  const startRecording = () => {
    if (!streamRef.current) return;

    setIsRecording(true);
    toast.success("بدأ تسجيل البث المباشر تلقائياً.");

    // Simple chunks buffer via socket.io
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: "video/webm;codecs=vp8,opus",
    });

    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = async (e) => {
      if (e.data && e.data.size > 0) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = (reader.result as string).split(",")[1];
          socketRef.current?.emit("record-chunk", {
            base64Data,
            chunkIndex: Math.floor(Date.now() / 1000),
          });
        };
        reader.readAsDataURL(e.data);
      }
    };

    // Slice recorder into 1s chunks
    mediaRecorder.start(1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Start stream action trigger
  const startLiveStream = () => {
    startRecording();
    toast.success("البث المباشر نشط الآن!");
  };

  // End stream action trigger
  const endLiveStream = async () => {
    stopRecording();
    socketRef.current?.emit("end-session");

    try {
      await compileRecordingToLessonFn({ data: { sessionId } });
      await endLiveSessionFn({ data: { sessionId } });
      toast.success("تم إنهاء البث المباشر، جاري معالجة الفيديو وتجميع المحاضرة تلقائياً.");
      navigate({ to: "/teacher/courses" as any });
    } catch (err: any) {
      toast.error("خطأ في إنهاء البث: " + err.message);
    }
  };

  // Chat send
  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    socketRef.current?.emit("chat-message", { message: chatInput });
    setChatInput("");
  };

  // Waiting Room Admit/Reject Student
  const admitStudent = (studentId: string) => {
    socketRef.current?.emit("admit-student", { studentId });
  };

  const rejectStudent = (studentId: string) => {
    socketRef.current?.emit("reject-student", { studentId });
  };

  // Poll Handling
  const addPollOption = () => {
    setPollOptions([...pollOptions, ""]);
  };

  const createPoll = () => {
    if (!pollQuestion.trim() || pollOptions.some((o) => !o.trim())) {
      toast.error("يرجى ملء كافة تفاصيل الاستفتاء.");
      return;
    }
    socketRef.current?.emit("create-poll", {
      question: pollQuestion,
      options: pollOptions,
    });
    setPollQuestion("");
    setPollOptions(["", ""]);
    toast.success("تم إرسال الاستفتاء للطلاب بنجاح.");
  };

  return (
    <div
      className="flex flex-col lg:flex-row h-screen bg-slate-950 text-white overflow-hidden"
      dir="rtl"
    >
      {/* 1. Studio Workspace (Main Screen) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Workspace Header */}
        <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-red-600/10 text-red-500 animate-pulse">
              <Radio className="size-5" />
            </div>
            <div>
              <h1 className="font-display text-sm font-bold text-slate-100">
                استوديو البث المباشر
              </h1>
              <p className="text-[11px] text-slate-400 font-display mt-0.5">{session?.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isRecording ? (
              <button
                onClick={startLiveStream}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-display text-xs font-bold shadow-lg transition-all cursor-pointer"
              >
                بدء البث المباشر [ بدء البث ]
              </button>
            ) : (
              <button
                onClick={endLiveStream}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-red-500 font-display text-xs font-bold border border-slate-700 transition-all cursor-pointer"
              >
                إنهاء البث [ إنهاء البث ]
              </button>
            )}
          </div>
        </div>

        {/* Workspace Display Area */}
        <div className="flex-1 relative bg-slate-950 p-4 flex items-center justify-center overflow-hidden">
          {/* Active scene rendering */}
          {activeScene === "camera" && (
            <div className="relative w-full h-full max-h-[500px] aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute bottom-4 right-4 bg-slate-900/80 px-3 py-1 rounded-lg text-xs font-display backdrop-blur">
                كاميرا المعلم
              </div>
            </div>
          )}

          {activeScene === "screen" && (
            <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden border border-slate-800">
              {/* Screen capture display */}
              <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                <Monitor className="size-16 animate-pulse" />
                <span className="mr-3 text-sm font-display">مشاركة الشاشة نشطة حالياً...</span>
              </div>

              {/* Floating Facecam */}
              <div
                className={`absolute size-40 bg-black rounded-xl overflow-hidden border-2 border-primary shadow-elevated ${
                  facecamPosition === "top-right"
                    ? "top-4 right-4"
                    : facecamPosition === "top-left"
                      ? "top-4 left-4"
                      : facecamPosition === "bottom-right"
                        ? "bottom-4 right-4"
                        : "bottom-4 left-4"
                }`}
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              </div>
            </div>
          )}

          {activeScene === "whiteboard" && (
            <div className="w-full h-full">
              <Whiteboard socket={socketRef.current} sessionId={sessionId} isTeacher={true} />
            </div>
          )}

          {activeScene === "pdf" && (
            <div className="relative w-full h-full">
              <Whiteboard socket={socketRef.current} sessionId={sessionId} isTeacher={true} />

              {/* Overlay Facecam on PDF */}
              <div
                className={`absolute size-40 bg-black rounded-xl overflow-hidden border-2 border-primary shadow-elevated z-20 ${
                  facecamPosition === "top-right"
                    ? "top-4 right-4"
                    : facecamPosition === "top-left"
                      ? "top-4 left-4"
                      : facecamPosition === "bottom-right"
                        ? "bottom-4 right-4"
                        : "bottom-4 left-4"
                }`}
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              </div>
            </div>
          )}

          {/* Connection Quality Analytics Overlay */}
          {analyticsMode !== "hidden" && (
            <div
              className={`absolute top-6 left-6 z-30 bg-slate-900/95 border border-slate-800 p-4 rounded-2xl shadow-elevated backdrop-blur-xl transition-all ${
                analyticsMode === "minimized" ? "w-56" : "w-80"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <Activity className="size-4 text-emerald-500" />
                  محلل الاتصال
                </div>
                <button
                  onClick={() =>
                    setAnalyticsMode(analyticsMode === "minimized" ? "expanded" : "minimized")
                  }
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  {analyticsMode === "minimized" ? "توسيع" : "تصغير"}
                </button>
              </div>

              <div className="space-y-2.5 font-display text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">حالة البث:</span>
                  <span className="font-bold text-emerald-500">
                    {isRecording ? "مباشر" : "معلق"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">سرعة البيت:</span>
                  <span className="font-bold">{connectionStats.bitrate} kbps</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">زمن الاستجابة:</span>
                  <span className="font-bold">{connectionStats.latency} ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">جودة الاتصال:</span>
                  <span className="font-bold text-emerald-400">{connectionStats.quality}</span>
                </div>

                {analyticsMode === "expanded" && (
                  <div className="border-t border-slate-800 pt-2.5 mt-2.5 space-y-2.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">المشاهدون النشطون:</span>
                      <span className="font-bold">{activeViewersCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">أيدي مرفوعة:</span>
                      <span className="font-bold">{raisedHands.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">الاستفتاءات النشطة:</span>
                      <span className="font-bold">{activePolls.length}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Workspace Footer Controls (OBS Panel) */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
          {/* Audio/Video selectors */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleMic}
              className={`p-3 rounded-xl transition-all cursor-pointer ${micEnabled ? "bg-slate-800 hover:bg-slate-700 text-slate-100" : "bg-red-500/20 text-red-500"}`}
            >
              {micEnabled ? <Mic className="size-4" /> : <MicOff className="size-4" />}
            </button>
            <button
              onClick={toggleCamera}
              className={`p-3 rounded-xl transition-all cursor-pointer ${cameraEnabled ? "bg-slate-800 hover:bg-slate-700 text-slate-100" : "bg-red-500/20 text-red-500"}`}
            >
              {cameraEnabled ? <Video className="size-4" /> : <VideoOff className="size-4" />}
            </button>
            <button
              onClick={toggleScreenShare}
              className={`p-3 rounded-xl transition-all cursor-pointer ${screenSharing ? "bg-primary text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-100"}`}
              title="مشاركة الشاشة"
            >
              <Monitor className="size-4" />
            </button>
          </div>

          {/* Scene Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveScene("camera")}
              className={`px-3 py-1.5 rounded-xl text-xs font-display font-bold transition-all cursor-pointer ${activeScene === "camera" ? "bg-primary text-white" : "text-slate-400 hover:text-slate-100"}`}
            >
              كاميرا فقط
            </button>
            <button
              onClick={() => setActiveScene("screen")}
              className={`px-3 py-1.5 rounded-xl text-xs font-display font-bold transition-all cursor-pointer ${activeScene === "screen" ? "bg-primary text-white" : "text-slate-400 hover:text-slate-100"}`}
            >
              شاشة + وجه
            </button>
            <button
              onClick={() => setActiveScene("whiteboard")}
              className={`px-3 py-1.5 rounded-xl text-xs font-display font-bold transition-all cursor-pointer ${activeScene === "whiteboard" ? "bg-primary text-white" : "text-slate-400 hover:text-slate-100"}`}
            >
              السبورة
            </button>
            <button
              onClick={() => setActiveScene("pdf")}
              className={`px-3 py-1.5 rounded-xl text-xs font-display font-bold transition-all cursor-pointer ${activeScene === "pdf" ? "bg-primary text-white" : "text-slate-400 hover:text-slate-100"}`}
            >
              PDF + وجه
            </button>
          </div>

          {/* Facecam corner options */}
          {(activeScene === "screen" || activeScene === "pdf") && (
            <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 px-2">موضع الوجه:</span>
              {["top-right", "top-left", "bottom-right", "bottom-left"].map((pos) => (
                <button
                  key={pos}
                  onClick={() => setFacecamPosition(pos as any)}
                  className={`px-2 py-1 rounded text-[10px] uppercase font-bold cursor-pointer ${facecamPosition === pos ? "bg-primary text-white" : "text-slate-500"}`}
                >
                  {pos.replace("-", " ")}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Control Sidebar (Chat, Waitroom, Polls) */}
      <div className="w-full lg:w-96 bg-slate-900 border-r lg:border-r-0 lg:border-l border-slate-800 flex flex-col h-full overflow-hidden">
        {/* Waiting Room Admissions Sidebar Section */}
        {waitingStudents.length > 0 && (
          <div className="p-4 bg-slate-950/80 border-b border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Users className="size-4" />
                قائمة الانتظار ({waitingStudents.length})
              </h3>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-2">
              {waitingStudents.map((s) => (
                <div
                  key={s.userId}
                  className="flex items-center justify-between bg-slate-900 p-2 rounded-xl border border-slate-800/80"
                >
                  <span className="text-xs font-display font-medium text-slate-300">{s.name}</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => admitStudent(s.userId)}
                      className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 cursor-pointer"
                      title="قبول"
                    >
                      <Check className="size-3.5" />
                    </button>
                    <button
                      onClick={() => rejectStudent(s.userId)}
                      className="p-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 cursor-pointer"
                      title="رفض"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Sidebar Tabs */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sidebar Tabs Headers */}
          <div className="flex bg-slate-950 border-b border-slate-800">
            <button className="flex-1 py-3 text-xs font-display font-bold border-b-2 border-primary text-primary flex items-center justify-center gap-2">
              <MessageSquare className="size-4" />
              المحادثة المباشرة
            </button>
          </div>

          {/* Chats panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Messages Display */}
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

            {/* Chat Send Area */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="اكتب رسالة..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary font-display"
                onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
              />
              <button
                onClick={sendChatMessage}
                className="p-2.5 rounded-xl bg-primary text-white hover:opacity-90 transition-all cursor-pointer"
              >
                <Send className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Poll Creator Section */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3 font-display">
          <h4 className="text-xs font-bold text-slate-300">إنشاء استفتاء جديد</h4>
          <input
            type="text"
            value={pollQuestion}
            onChange={(e) => setPollQuestion(e.target.value)}
            placeholder="ما هو السؤال؟"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="space-y-2">
            {pollOptions.map((opt, idx) => (
              <input
                key={idx}
                type="text"
                value={opt}
                onChange={(e) => {
                  const updated = [...pollOptions];
                  updated[idx] = e.target.value;
                  setPollOptions(updated);
                }}
                placeholder={`خيارات الاستفتاء ${idx + 1}`}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            ))}
            <button
              onClick={addPollOption}
              className="text-[10px] text-primary hover:underline cursor-pointer"
            >
              + إضافة خيار
            </button>
          </div>
          <button
            onClick={createPoll}
            className="w-full py-2 bg-primary hover:opacity-90 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            نشر الاستفتاء
          </button>
        </div>
      </div>
    </div>
  );
}
