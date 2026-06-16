import fs from "fs";
import path from "path";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { exec } from "child_process";
import { PrismaClient } from "@prisma/client";
import {
  createWorkers,
  createWebRtcTransport,
  connectWebRtcTransport,
  produce as mediasoupProduce,
  consume as mediasoupConsume,
  resumeConsumer,
  cleanupPeer as mediasoupCleanupPeer,
  getOrCreateRouter,
  getSessionProducers
} from "./mediasoup-server";

// ------------------------------------------------
// 1. ENVIRONMENT VARIABLES LOADER
// ------------------------------------------------
try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf-8");
    envConfig.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        // Remove quotes and carriage returns
        value = value.replace(/\r/g, "").trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    });
    console.log("Loaded environment variables from .env manually.");
  }
} catch (err) {
  console.error("Failed to load .env file manually:", err);
}

const prisma = new PrismaClient();

// Create HTTP Server
const httpServer = createServer((req, res) => {
  if (req.url === "/api/broadcast-notification" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const { userId, role, courseId, examId, teacherId, liveSessionId, room, notification } = data;

        let targetRoom = room;
        if (userId) targetRoom = userId;
        else if (role) targetRoom = `role-${role}`;
        else if (courseId) targetRoom = `course-${courseId}`;
        else if (examId) targetRoom = `exam-${examId}`;
        else if (teacherId) targetRoom = `teacher-${teacherId}`;
        else if (liveSessionId) targetRoom = `live-${liveSessionId}`;

        if (targetRoom) {
          io.to(targetRoom).emit("notification", notification);
          console.log(`Broadcasted notification to room ${targetRoom}:`, notification.title);
        } else {
          // Broadcast to all
          io.emit("notification", notification);
          console.log("Broadcasted notification to all:", notification.title);
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch (err: any) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else if (req.url === "/api/send-notification" && req.method === "POST") {
    // Keep backward compatibility for send-notification just in case
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const { userId, notification } = data;
        io.to(userId).emit("notification", notification);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch (err: any) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Altiora Live Streaming Signaling Server is running.\n");
  }
});

// Configure Socket.IO Server
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins for dev simplicity
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: 1e8, // Allow up to 100MB buffer sizes for video chunks
});

// ------------------------------------------------
// 2. IN-MEMORY LIVE STATE CACHE
// ------------------------------------------------
interface LiveSessionState {
  sessionId: string;
  teacherSocketId: string | null;
  admittedStudents: Set<string>; // userIds
  waitingStudents: Array<{ userId: string; socketId: string; name: string }>;
  raisedHands: Array<{ studentId: string; socketId: string; name: string; raisedAt: number }>;
  chatMuted: boolean;
  whiteboardStrokes: Array<any>;
  whiteboardBackground: string | null; // PDF slide or bg image
  activePolls: Array<any>;
  recordingFile: string | null;
}

const sessionStates = new Map<string, LiveSessionState>();

function getOrCreateSessionState(sessionId: string): LiveSessionState {
  if (!sessionStates.has(sessionId)) {
    sessionStates.set(sessionId, {
      sessionId,
      teacherSocketId: null,
      admittedStudents: new Set<string>(),
      waitingStudents: [],
      raisedHands: [],
      chatMuted: false,
      whiteboardStrokes: [],
      whiteboardBackground: null,
      activePolls: [],
      recordingFile: null,
    });
  }
  return sessionStates.get(sessionId)!;
}

// ------------------------------------------------
// 3. SOCKET CONNECTION & SIGNALING HANDLERS
// ------------------------------------------------
// Cookie parser helper
function parseCookie(cookieString: string | undefined, name: string): string | null {
  if (!cookieString) return null;
  const match = cookieString.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

// Authentication Middleware
io.use(async (socket: Socket, next) => {
  try {
    let sessionId = socket.handshake.auth?.sessionId || socket.handshake.query?.sessionId;
    if (!sessionId) {
      const cookieHeader = socket.handshake.headers.cookie;
      sessionId = parseCookie(cookieHeader, "altiora_session_id");
    }

    if (sessionId && typeof sessionId === "string") {
      const session = await prisma.userSession.findFirst({
        where: {
          session_id: sessionId,
          status: "ACTIVE",
        },
        include: {
          user: {
            include: {
              enrollments: true,
              courseInstructors: true,
            },
          },
        },
      });

      if (session && session.user) {
        socket.data.user = session.user;
        socket.data.userId = session.user.id;
        socket.data.userRole = session.user.role;
        socket.data.sessionId = sessionId;
        return next();
      }
    }

    // Dev/Fallback mode
    const devUserId = socket.handshake.query.userId || socket.handshake.auth?.userId;
    if (devUserId && typeof devUserId === "string") {
      const user = await prisma.user.findUnique({
        where: { id: devUserId },
        include: {
          enrollments: true,
          courseInstructors: true,
        },
      });
      if (user) {
        socket.data.user = user;
        socket.data.userId = user.id;
        socket.data.userRole = user.role;
        return next();
      }
    }

    console.warn(`[Socket Auth] Unauthenticated connection from socket ID ${socket.id}`);
    return next(new Error("Authentication failed"));
  } catch (err) {
    console.error("[Socket Auth] Error in middleware:", err);
    return next(new Error("Authentication server error"));
  }
});

// ------------------------------------------------
// 3. SOCKET CONNECTION & SIGNALING HANDLERS
// ------------------------------------------------
io.on("connection", async (socket: Socket) => {
  const userId = socket.data.userId;
  const user = socket.data.user;
  const role = socket.data.userRole;

  console.log(`Socket connected: ${socket.id} (User: ${userId}, Role: ${role})`);

  if (userId && user) {
    // Join user room
    socket.join(`user-${userId}`);
    socket.join(userId); // Compatibility
    console.log(`Socket ${socket.id} joined user room: user-${userId}`);

    // Join role room
    socket.join(`role-${role}`);
    console.log(`Socket ${socket.id} joined role room: role-${role}`);

    // Join enrolled courses
    if (user.enrollments) {
      for (const enrollment of user.enrollments) {
        socket.join(`course-${enrollment.courseId}`);
        console.log(`Socket ${socket.id} joined course room: course-${enrollment.courseId}`);
      }
    }

    // Join teacher rooms (instructor assignments)
    if (user.courseInstructors) {
      for (const ci of user.courseInstructors) {
        socket.join(`teacher-${ci.instructorId}`);
        console.log(`Socket ${socket.id} joined teacher room: teacher-${ci.instructorId}`);
      }
    }

    // If teacher role, join their own teacher room
    if (role === "TEACHER" || role === "ADMIN" || role === "SUPER_ADMIN") {
      socket.join(`teacher-${userId}`);
      console.log(`Socket ${socket.id} joined self teacher room: teacher-${userId}`);
    }
  }

  // Join specific rooms from connection parameters if present
  const examId = socket.handshake.query.examId || socket.handshake.auth?.examId;
  if (examId && typeof examId === "string") {
    socket.join("exam-" + examId);
    console.log(`Socket ${socket.id} joined exam room: exam-${examId}`);
  }

  const teacherId = socket.handshake.query.teacherId || socket.handshake.auth?.teacherId;
  if (teacherId && typeof teacherId === "string") {
    socket.join("teacher-" + teacherId);
    console.log(`Socket ${socket.id} joined teacher room: teacher-${teacherId}`);
  }

  const liveSessionId = socket.handshake.query.liveSessionId || socket.handshake.auth?.liveSessionId;
  if (liveSessionId && typeof liveSessionId === "string") {
    socket.join("live-" + liveSessionId);
    console.log(`Socket ${socket.id} joined live room: live-${liveSessionId}`);
  }

  // Join session request (waiting room or live)
  socket.on(
    "join-live",
    async (data: { sessionId: string; userId: string; name: string; isTeacher: boolean }) => {
      const { sessionId, userId, name, isTeacher } = data;
      socket.data = { sessionId, userId, name, isTeacher };

      const state = getOrCreateSessionState(sessionId);

      // One Device Restriction - Check if this user is already active in another socket
      const sockets = await io.in(`session:${sessionId}`).fetchSockets();
      const duplicate = sockets.find((s) => s.data.userId === userId && s.id !== socket.id);
      if (duplicate) {
        console.log(`Rejecting duplicate login session for userId: ${userId}`);
        socket.emit("one-device-conflict", { message: "هذا الحساب مسجل بالفعل من جهاز آخر." });
        socket.disconnect();
        return;
      }

      if (isTeacher) {
        state.teacherSocketId = socket.id;
        socket.join(`session:${sessionId}`);
        console.log(`Teacher joined live session: ${sessionId}`);

        // Update session status in DB
        await prisma.liveSession
          .update({
            where: { id: sessionId },
            data: { status: "LIVE" },
          })
          .catch((err) => console.error("DB update failed:", err));

        // Broadcast to waiting room that stream has started
        io.to(`waiting:${sessionId}`).emit("stream-started");

        // Sync state back to teacher
        socket.emit("sync-state", {
          admittedStudents: Array.from(state.admittedStudents),
          waitingStudents: state.waitingStudents,
          raisedHands: state.raisedHands,
          chatMuted: state.chatMuted,
          whiteboardStrokes: state.whiteboardStrokes,
          whiteboardBackground: state.whiteboardBackground,
          activePolls: state.activePolls,
        });

        // Audit Log stream started
        await prisma.auditLog
          .create({
            data: {
              userId,
              action: "LIVE_STREAM_STARTED",
              payload: { sessionId },
            },
          })
          .catch((err) => console.error("AuditLog creation failed:", err));
      } else {
        // It's a student - Check if session status is WAITING or LIVE
        const liveSession = await prisma.liveSession.findUnique({
          where: { id: sessionId },
        });

        if (!liveSession || liveSession.status === "ENDED") {
          socket.emit("session-error", { message: "عذراً، هذا البث المباشر غير نشط حالياً." });
          socket.disconnect();
          return;
        }

        // Check DB or memory if this student was already admitted
        const isDbAdmitted = await prisma.liveParticipant.findFirst({
          where: { sessionId, userId, isAdmitted: true, leftAt: null },
        });

        if (state.admittedStudents.has(userId) || isDbAdmitted) {
          // Admitted student - directly join main stream
          state.admittedStudents.add(userId);
          socket.join(`session:${sessionId}`);
          socket.emit("admitted");
          console.log(`Admitted student joined main session: ${name} (${userId})`);

          // Send current whiteboard & chat history to recover state on reconnect
          socket.emit("sync-state", {
            chatMuted: state.chatMuted,
            whiteboardStrokes: state.whiteboardStrokes,
            whiteboardBackground: state.whiteboardBackground,
            activePolls: state.activePolls,
            activeProducers: getSessionProducers(sessionId),
          });

          // Notify teacher of participant join
          if (state.teacherSocketId) {
            io.to(state.teacherSocketId).emit("student-joined", {
              userId,
              socketId: socket.id,
              name,
            });
          }

          // Audit Log
          await prisma.auditLog
            .create({
              data: {
                userId,
                action: "STUDENT_JOINED_LIVE",
                payload: { sessionId },
              },
            })
            .catch((err) => console.error(err));
        } else {
          // Not admitted yet - place in waitroom
          socket.join(`waiting:${sessionId}`);

          // Add to waiting queue if not present
          if (!state.waitingStudents.some((s) => s.userId === userId)) {
            state.waitingStudents.push({ userId, socketId: socket.id, name });
          }

          // Notify teacher of new waiting student
          if (state.teacherSocketId) {
            io.to(state.teacherSocketId).emit("waiting-list-update", state.waitingStudents);
          }

          socket.emit("waiting-room", { waitingCount: state.waitingStudents.length });
          console.log(`Student joined waiting room: ${name} (${userId})`);
        }
      }
    },
  );

  // Admit Student (Teacher action)
  socket.on("admit-student", async (data: { studentId: string }) => {
    const { sessionId, userId: teacherId, isTeacher } = socket.data;
    if (!isTeacher) return;

    const state = getOrCreateSessionState(sessionId);
    state.admittedStudents.add(data.studentId);

    // Find student in waiting queue
    const studentIndex = state.waitingStudents.findIndex((s) => s.userId === data.studentId);
    if (studentIndex !== -1) {
      const student = state.waitingStudents[studentIndex];
      state.waitingStudents.splice(studentIndex, 1);

      // Save to database live_participants table
      await prisma.liveParticipant
        .upsert({
          where: { id: student.userId }, // Assuming uuid is userId or unique index
          create: {
            sessionId,
            userId: student.userId,
            socketId: student.socketId,
            isAdmitted: true,
          },
          update: {
            isAdmitted: true,
            isRejected: false,
            leftAt: null,
          },
        })
        .catch(() => {
          // Fallback create
          prisma.liveParticipant
            .create({
              data: {
                sessionId,
                userId: student.userId,
                socketId: student.socketId,
                isAdmitted: true,
              },
            })
            .catch((err) => console.error("Participant save failed:", err));
        });

      // Send event to student socket to join main session
      io.to(student.socketId).emit("admitted");

      // Update waiting list for teacher
      socket.emit("waiting-list-update", state.waitingStudents);
      console.log(`Teacher ${teacherId} admitted student ${student.name}`);
    }
  });

  // Reject Student (Teacher action)
  socket.on("reject-student", (data: { studentId: string }) => {
    const { sessionId, isTeacher } = socket.data;
    if (!isTeacher) return;

    const state = getOrCreateSessionState(sessionId);
    const studentIndex = state.waitingStudents.findIndex((s) => s.userId === data.studentId);
    if (studentIndex !== -1) {
      const student = state.waitingStudents[studentIndex];
      state.waitingStudents.splice(studentIndex, 1);

      // Save rejected state
      prisma.liveParticipant
        .create({
          data: {
            sessionId,
            userId: student.userId,
            socketId: student.socketId,
            isAdmitted: false,
            isRejected: true,
            leftAt: new Date(),
          },
        })
        .catch((err) => console.error(err));

      io.to(student.socketId).emit("rejected");
      socket.emit("waiting-list-update", state.waitingStudents);
    }
  });

  // Signaling broker for WebRTC (Peer-to-Peer forwarding)
  socket.on("signal", (data: { to: string; signal: any }) => {
    io.to(data.to).emit("signal", {
      from: socket.id,
      userId: socket.data.userId,
      name: socket.data.name,
      signal: data.signal,
    });
  });

  // Chat message broadcasting
  socket.on("chat-message", async (data: { message: string }) => {
    const { sessionId, userId, name, isTeacher } = socket.data;
    const state = getOrCreateSessionState(sessionId);

    if (state.chatMuted && !isTeacher) {
      socket.emit("chat-error", { message: "المحادثة مغلقة حالياً من قبل المعلم." });
      return;
    }

    const chatMsg = {
      id: Math.random().toString(36).substring(2, 9),
      userId,
      userName: name,
      message: data.message,
      created_at: new Date(),
    };

    // Save to DB
    await prisma.liveChatMessage
      .create({
        data: {
          sessionId,
          userId,
          userName: name,
          message: data.message,
        },
      })
      .catch((err) => console.error("Chat save failed:", err));

    // Broadcast to room
    io.to(`session:${sessionId}`).emit("chat-message", chatMsg);
  });

  // Mute Chat Control (Teacher action)
  socket.on("mute-chat", (data: { mute: boolean }) => {
    const { sessionId, isTeacher } = socket.data;
    if (!isTeacher) return;

    const state = getOrCreateSessionState(sessionId);
    state.chatMuted = data.mute;
    io.to(`session:${sessionId}`).emit("chat-mute-status", { muted: state.chatMuted });
  });

  // Clear Chat (Teacher action)
  socket.on("clear-chat", async () => {
    const { sessionId, isTeacher } = socket.data;
    if (!isTeacher) return;

    // Delete chat messages in DB
    await prisma.liveChatMessage
      .deleteMany({
        where: { sessionId },
      })
      .catch((err) => console.error(err));

    io.to(`session:${sessionId}`).emit("chat-cleared");
  });

  // Whiteboard drawing synchronization
  socket.on("whiteboard-draw", (strokeData: any) => {
    const { sessionId } = socket.data;
    const state = getOrCreateSessionState(sessionId);
    state.whiteboardStrokes.push(strokeData);

    // Broadcast to other participants
    socket.to(`session:${sessionId}`).emit("whiteboard-draw", strokeData);
  });

  socket.on("whiteboard-clear", () => {
    const { sessionId } = socket.data;
    const state = getOrCreateSessionState(sessionId);
    state.whiteboardStrokes = [];
    state.whiteboardBackground = null;
    io.to(`session:${sessionId}`).emit("whiteboard-clear");
  });

  socket.on("whiteboard-bg", (bgUrl: string | null) => {
    const { sessionId } = socket.data;
    const state = getOrCreateSessionState(sessionId);
    state.whiteboardBackground = bgUrl;
    io.to(`session:${sessionId}`).emit("whiteboard-bg", bgUrl);
  });

  // Poll creation & voting
  socket.on("create-poll", async (data: { question: string; options: string[] }) => {
    const { sessionId, isTeacher } = socket.data;
    if (!isTeacher) return;

    const state = getOrCreateSessionState(sessionId);

    const dbPoll = await prisma.livePoll
      .create({
        data: {
          sessionId,
          question: data.question,
          options: JSON.stringify(data.options),
          results: JSON.stringify({}),
        },
      })
      .catch((err) => {
        console.error(err);
        return null;
      });

    if (dbPoll) {
      const poll = {
        id: dbPoll.id,
        question: dbPoll.question,
        options: data.options,
        results: {},
        status: "ACTIVE",
      };
      state.activePolls.push(poll);
      io.to(`session:${sessionId}`).emit("poll-created", poll);
    }
  });

  socket.on("vote-poll", async (data: { pollId: string; optionIndex: number }) => {
    const { sessionId, userId } = socket.data;
    const state = getOrCreateSessionState(sessionId);

    const poll = state.activePolls.find((p) => p.id === data.pollId);
    if (poll && poll.status === "ACTIVE") {
      poll.results[userId] = data.optionIndex;
      io.to(`session:${sessionId}`).emit("poll-update", poll);

      // Save to DB
      await prisma.livePoll
        .update({
          where: { id: data.pollId },
          data: { results: JSON.stringify(poll.results) },
        })
        .catch((err) => console.error(err));
    }
  });

  // Raise hand queue
  socket.on("raise-hand", async () => {
    const { sessionId, userId, name } = socket.data;
    const state = getOrCreateSessionState(sessionId);

    if (!state.raisedHands.some((h) => h.studentId === userId)) {
      const hand = { studentId: userId, socketId: socket.id, name, raisedAt: Date.now() };
      state.raisedHands.push(hand);

      await prisma.liveRaisedHand
        .create({
          data: { sessionId, studentId: userId },
        })
        .catch((err) => console.error(err));

      io.to(`session:${sessionId}`).emit("raised-hands-update", state.raisedHands);
    }
  });

  socket.on("lower-hand", async () => {
    const { sessionId, userId } = socket.data;
    const state = getOrCreateSessionState(sessionId);

    state.raisedHands = state.raisedHands.filter((h) => h.studentId !== userId);

    await prisma.liveRaisedHand
      .updateMany({
        where: { sessionId, studentId: userId, isHandled: false },
        data: { isHandled: true },
      })
      .catch((err) => console.error(err));

    io.to(`session:${sessionId}`).emit("raised-hands-update", state.raisedHands);
  });

  // Reactions
  socket.on("reaction", async (data: { type: string }) => {
    const { sessionId, userId } = socket.data;
    io.to(`session:${sessionId}`).emit("reaction", { userId, type: data.type });

    await prisma.liveReaction
      .create({
        data: { sessionId, studentId: userId, type: data.type },
      })
      .catch((err) => console.error(err));
  });

  // ------------------------------------------------
  // 4. REAL-TIME RECORDING INGESTION (MediaRecorder webm chunks)
  // ------------------------------------------------
  socket.on("record-chunk", async (data: { base64Data: string; chunkIndex: number }) => {
    const { sessionId, isTeacher } = socket.data;
    if (!isTeacher) return;

    const state = getOrCreateSessionState(sessionId);
    const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || false;
    const recordingsDir = isServerless
      ? path.join("/tmp", "recordings", sessionId)
      : path.resolve(process.cwd(), "public", "recordings", sessionId);

    // Ensure recording folder exists
    try {
      if (!fs.existsSync(recordingsDir)) {
        fs.mkdirSync(recordingsDir, { recursive: true });
      }
    } catch (err) {
      console.warn("Failed to create recordings directory:", err);
    }

    const chunkFilePath = path.join(recordingsDir, "recording.webm");
    const buffer = Buffer.from(data.base64Data, "base64");

    // Append chunk to the single recording webm file
    fs.appendFile(chunkFilePath, buffer, (err) => {
      if (err) {
        console.error(`Failed to save recording chunk ${data.chunkIndex}:`, err);
      } else {
        state.recordingFile = chunkFilePath;
      }
    });
  });

  // End stream session (Teacher ends stream)
  socket.on("end-session", async () => {
    const { sessionId, userId: teacherId, isTeacher } = socket.data;
    if (!isTeacher) return;

    console.log(`Ending session: ${sessionId}`);
    const state = getOrCreateSessionState(sessionId);

    // Update session status to ended
    await prisma.liveSession
      .update({
        where: { id: sessionId },
        data: { status: "ENDED", endedAt: new Date() },
      })
      .catch((err) => console.error(err));

    io.to(`session:${sessionId}`).emit("session-ended");

    // Process video recording async
    if (state.recordingFile && fs.existsSync(state.recordingFile)) {
      console.log(`Compiling live stream recording for session: ${sessionId}`);
      const recordingsDir = path.resolve(process.cwd(), "public", "recordings", sessionId);
      const outputMp4 = path.join(recordingsDir, "recording.mp4");

      // Compile using FFmpeg
      const ffmpegCmd = `ffmpeg -y -i "${state.recordingFile}" -c:v libx264 -preset fast -crf 28 -c:a aac -b:a 128k "${outputMp4}"`;

      // Update LiveRecording record in DB to PROCESSING
      const dbRecording = await prisma.liveRecording
        .create({
          data: {
            sessionId,
            streamId: sessionId,
            teacherId,
            courseId:
              (await prisma.liveSession.findUnique({ where: { id: sessionId } }))?.courseId || "",
            recordingStatus: "PROCESSING",
          },
        })
        .catch((err) => {
          console.error(err);
          return null;
        });

      exec(ffmpegCmd, async (ffmpegErr) => {
        let finalVideoFile = state.recordingFile!; // Fallback to raw webm if ffmpeg fails
        let compiledStatus = "COMPLETED";

        if (ffmpegErr) {
          console.error("FFmpeg recording compilation failed, preserving raw chunks:", ffmpegErr);
          compiledStatus = "FAILED";
          if (dbRecording) {
            await prisma.liveRecording
              .update({
                where: { id: dbRecording.id },
                data: { recordingStatus: "FAILED" },
              })
              .catch((err) => console.error(err));
          }
        } else {
          console.log(`FFmpeg recording compiled successfully: ${outputMp4}`);
          finalVideoFile = outputMp4;
          if (dbRecording) {
            await prisma.liveRecording
              .update({
                where: { id: dbRecording.id },
                data: { recordingStatus: "COMPLETED" },
              })
              .catch((err) => console.error(err));
          }
        }

        // Upload Video to Bunny Stream
        try {
          const libraryId = process.env.BUNNY_LIBRARY_ID;
          const apiKey = process.env.BUNNY_API_KEY;
          const cdnHost = process.env.BUNNY_CDN_HOST;

          if (!libraryId || !apiKey || !cdnHost) {
            throw new Error("Bunny Stream keys not configured.");
          }

          // Create Bunny video placeholder
          const sessionModel = await prisma.liveSession.findUnique({ where: { id: sessionId } });
          const title = sessionModel?.title || "تسجيل بث مباشر";

          const createRes = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
            method: "POST",
            headers: {
              AccessKey: apiKey,
              "Content-Type": "application/json",
              accept: "application/json",
            },
            body: JSON.stringify({ title }),
          });

          if (!createRes.ok) {
            throw new Error(`Bunny video creation failed: ${await createRes.text()}`);
          }

          const createData = await createRes.json();
          const videoId = createData.guid;

          // Read file stream and upload
          const fileStream = fs.createReadStream(finalVideoFile);

          const uploadRes = await fetch(
            `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`,
            {
              method: "PUT",
              headers: {
                AccessKey: apiKey,
                "Content-Type": "application/octet-stream",
              },
              body: fileStream as any,
              ...({ duplex: "half" } as any),
            },
          );

          if (!uploadRes.ok) {
            throw new Error(`Bunny upload PUT failed: ${await uploadRes.text()}`);
          }

          console.log(`Uploaded live stream recording to Bunny. Video ID: ${videoId}`);

          // Create Course module if not exists, and create new lesson
          const courseId = sessionModel?.courseId || "";
          let courseModule = await prisma.module.findFirst({
            where: { courseId, deleted_at: null },
            orderBy: { sortOrder: "asc" },
          });

          if (!courseModule) {
            courseModule = await prisma.module.create({
              data: {
                courseId,
                title: "المحاضرات المسجلة",
                sortOrder: 0,
              },
            });
          }

          const lesson = await prisma.lesson.create({
            data: {
              moduleId: courseModule.id,
              title: title,
              isPreview: false,
            },
          });

          const videoUrl = `https://${cdnHost}/${videoId}/playlist.m3u8`;
          const thumbnailUrl = `https://${cdnHost}/${videoId}/thumbnail.jpg`;

          await prisma.videoMetadata.create({
            data: {
              lessonId: lesson.id,
              videoUrl,
              videoId,
              thumbnailUrl,
              status: "COMPLETED",
            },
          });

          console.log(`Successfully compiled session ${sessionId} to course lesson ${lesson.id}`);
        } catch (uploadErr) {
          console.error("Failed to upload recording to Bunny Stream:", uploadErr);
        }
      });
    }

    sessionStates.delete(sessionId);
  });

  // ------------------------------------------------
  // Mediasoup Signaling Events
  // ------------------------------------------------
  socket.on("getRouterRtpCapabilities", async (data: { sessionId: string }, callback: any) => {
    try {
      const router = await getOrCreateRouter(data.sessionId);
      callback({ rtpCapabilities: router.rtpCapabilities });
    } catch (err: any) {
      console.error("getRouterRtpCapabilities failed:", err);
      callback({ error: err.message });
    }
  });

  socket.on("get-active-producers", (data: { sessionId: string }, callback: any) => {
    try {
      callback({ producers: getSessionProducers(data.sessionId) });
    } catch (err: any) {
      console.error("get-active-producers failed:", err);
      callback({ error: err.message });
    }
  });

  socket.on("createWebRtcTransport", async (data: { sessionId: string; direction: "send" | "recv" }, callback: any) => {
    try {
      const transportParams = await createWebRtcTransport(data.sessionId, socket.id, data.direction);
      callback(transportParams);
    } catch (err: any) {
      console.error("createWebRtcTransport failed:", err);
      callback({ error: err.message });
    }
  });

  socket.on("connectWebRtcTransport", async (data: { transportId: string; dtlsParameters: any }, callback: any) => {
    try {
      await connectWebRtcTransport(data.transportId, data.dtlsParameters);
      callback({ success: true });
    } catch (err: any) {
      console.error("connectWebRtcTransport failed:", err);
      callback({ error: err.message });
    }
  });

  socket.on("produce", async (data: { transportId: string; kind: "audio" | "video"; rtpParameters: any; appData?: any }, callback: any) => {
    try {
      const { sessionId } = socket.data || {};
      if (!sessionId) {
        throw new Error("No live session ID associated with this socket connection.");
      }
      const producerParams = await mediasoupProduce(sessionId, socket.id, data.transportId, data.kind, data.rtpParameters, data.appData || {});
      
      socket.to(`session:${sessionId}`).emit("new-producer", { producerId: producerParams.id, kind: data.kind, appData: data.appData });
      
      callback(producerParams);
    } catch (err: any) {
      console.error("produce failed:", err);
      callback({ error: err.message });
    }
  });

  socket.on("consume", async (data: { sessionId: string; transportId: string; producerId: string; rtpCapabilities: any }, callback: any) => {
    try {
      const consumerParams = await mediasoupConsume(data.sessionId, socket.id, data.transportId, data.producerId, data.rtpCapabilities);
      callback(consumerParams);
    } catch (err: any) {
      console.error("consume failed:", err);
      callback({ error: err.message });
    }
  });

  socket.on("resumeConsumer", (data: { consumerId: string }, callback: any) => {
    try {
      resumeConsumer(data.consumerId);
      if (callback) callback({ success: true });
    } catch (err: any) {
      console.error("resumeConsumer failed:", err);
      if (callback) callback({ error: err.message });
    }
  });

  // Client disconnect cleanup
  socket.on("disconnect", async () => {
    console.log(`Socket disconnected: ${socket.id}`);
    
    // Cleanup mediasoup resources for this peer
    mediasoupCleanupPeer(socket.id);

    const { sessionId, userId, isTeacher, name } = socket.data || {};
    if (!sessionId) return;

    const state = sessionStates.get(sessionId);
    if (!state) return;

    if (isTeacher) {
      state.teacherSocketId = null;
      console.log(`Teacher disconnected from session: ${sessionId}`);
    } else {
      // Remove student from waiting list if they were waiting
      state.waitingStudents = state.waitingStudents.filter((s) => s.userId !== userId);

      // Update leftAt timestamp for participant in DB
      await prisma.liveParticipant
        .updateMany({
          where: { sessionId, userId, leftAt: null },
          data: { leftAt: new Date() },
        })
        .catch((err) => console.error(err));

      // Notify teacher
      if (state.teacherSocketId) {
        io.to(state.teacherSocketId).emit("student-left", { userId, socketId: socket.id });
        io.to(state.teacherSocketId).emit("waiting-list-update", state.waitingStudents);
      }
      console.log(`Student disconnected: ${name} (${userId})`);
    }
  });
});

// Start live server on port 3001
const PORT = 3001;
createWorkers().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Altiora Live Signaling Server (with Mediasoup SFU) is listening on port ${PORT}`);
  });
}).catch((err) => {
  console.error("Failed to start Mediasoup workers:", err);
  process.exit(1);
});
