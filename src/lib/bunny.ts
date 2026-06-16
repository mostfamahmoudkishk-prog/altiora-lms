import crypto from "crypto";

// Load configurations from environment variables
const getBunnyConfig = () => {
  const libraryId = process.env.BUNNY_LIBRARY_ID;
  const apiKey = process.env.BUNNY_API_KEY;
  const cdnHost = process.env.BUNNY_CDN_HOST || "vz-4e8e38f7-1c1.b-cdn.net";
  const streamHostname = process.env.BUNNY_STREAM_HOSTNAME || "video.bunnycdn.com";
  const tokenKey = process.env.BUNNY_TOKEN_KEY || apiKey || "";

  return {
    libraryId,
    apiKey,
    cdnHost,
    streamHostname,
    tokenKey,
  };
};

/**
 * Generates a signed URL for secure HLS video playback
 */
export function generateSignedPlaybackUrl(videoId: string, expirationSeconds: number = 3600): string {
  const { cdnHost, tokenKey } = getBunnyConfig();
  if (!tokenKey) {
    console.warn("[Bunny] TokenKey is missing. Returning unsigned playback URL.");
    return `https://${cdnHost}/${videoId}/playlist.m3u8`;
  }

  const expires = Math.floor(Date.now() / 1000) + expirationSeconds;
  const path = `/${videoId}/playlist.m3u8`;
  
  // Standard Bunny Stream path token authentication signature
  const signatureInput = tokenKey + path + expires;
  const hash = crypto.createHash("sha256").update(signatureInput).digest("hex");

  return `https://${cdnHost}${path}?token=${hash}&expires=${expires}`;
}

/**
 * Creates a new video placeholder in the Bunny Stream library
 */
export async function createBunnyVideoPlaceholder(title: string): Promise<string> {
  const { libraryId, apiKey, streamHostname } = getBunnyConfig();
  if (!libraryId || !apiKey) {
    throw new Error("[Bunny] Missing libraryId or apiKey credentials.");
  }

  const res = await fetch(`https://${streamHostname}/library/${libraryId}/videos`, {
    method: "POST",
    headers: {
      AccessKey: apiKey,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({ title }),
  });

  if (!res.ok) {
    throw new Error(`[Bunny] Failed to create video placeholder: ${await res.text()}`);
  }

  const data: any = await res.json();
  return data.guid;
}

/**
 * Uploads a video buffer or file stream to a specific Bunny video ID
 */
export async function uploadVideoToBunny(videoId: string, fileBufferOrStream: any): Promise<any> {
  const { libraryId, apiKey, streamHostname } = getBunnyConfig();
  if (!libraryId || !apiKey) {
    throw new Error("[Bunny] Missing libraryId or apiKey credentials.");
  }

  const res = await fetch(`https://${streamHostname}/library/${libraryId}/videos/${videoId}`, {
    method: "PUT",
    headers: {
      AccessKey: apiKey,
      "Content-Type": "application/octet-stream",
    },
    body: fileBufferOrStream,
  });

  if (!res.ok) {
    throw new Error(`[Bunny] Failed to upload video content: ${await res.text()}`);
  }

  return await res.json();
}

/**
 * Retrieves the transcoding and encoding progress for a Bunny video
 */
export async function getVideoEncodingStatus(videoId: string) {
  const { libraryId, apiKey, streamHostname } = getBunnyConfig();
  if (!libraryId || !apiKey) {
    throw new Error("[Bunny] Missing libraryId or apiKey credentials.");
  }

  const res = await fetch(`https://${streamHostname}/library/${libraryId}/videos/${videoId}`, {
    method: "GET",
    headers: {
      AccessKey: apiKey,
      accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`[Bunny] Failed to fetch video status: ${await res.text()}`);
  }

  const data: any = await res.json();
  return {
    status: data.status, // 0 = Queued, 1 = Processing, 2 = Encoding, 3 = Completed, 4 = Failed
    isCompleted: data.status === 3,
    isFailed: data.status === 4,
    progress: data.encodeProgress,
  };
}

/**
 * Tracks and synchronizes lesson watch history progress in the DB
 */
export async function trackLessonWatchProgress(
  userId: string,
  lessonId: string,
  watchedSeconds: number,
  totalSeconds: number
) {
  const { prisma } = await import("./db");
  const percentage = totalSeconds > 0 ? (watchedSeconds / totalSeconds) * 100 : 0;
  const isCompleted = percentage >= 90; // Mark completed at 90%+ watch time

  // Find the course ID for the lesson
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: true,
    },
  });
  if (!lesson) {
    throw new Error(`Lesson not found: ${lessonId}`);
  }
  const courseId = lesson.module.courseId;

  // Upsert studentProgress (completed status)
  await prisma.studentProgress.upsert({
    where: {
      studentId_lessonId: { studentId: userId, lessonId },
    },
    create: {
      studentId: userId,
      lessonId,
      courseId,
      completed: isCompleted,
      completedAt: isCompleted ? new Date() : null,
    },
    update: {
      completed: isCompleted,
      completedAt: isCompleted ? new Date() : null,
    },
  });

  // Track progress in UserWatchProgress
  await prisma.userWatchProgress.upsert({
    where: {
      user_id_lesson_id: { user_id: userId, lesson_id: lessonId },
    },
    create: {
      user_id: userId,
      lesson_id: lessonId,
      current_second: Math.round(watchedSeconds),
      duration: Math.round(totalSeconds),
      watched_percentage: percentage,
    },
    update: {
      current_second: Math.round(watchedSeconds),
      duration: Math.round(totalSeconds),
      watched_percentage: percentage,
    },
  });

  // Track progress in ContinueWatching
  await prisma.continueWatching.upsert({
    where: {
      studentId_lessonId: { studentId: userId, lessonId },
    },
    create: {
      studentId: userId,
      lessonId,
      courseId,
      currentSecond: Math.round(watchedSeconds),
      lastViewed: new Date(),
    },
    update: {
      currentSecond: Math.round(watchedSeconds),
      lastViewed: new Date(),
    },
  });

  // Log completion timeline event
  if (isCompleted) {
    const existingActivities = await prisma.activityTimeline.findMany({
      where: {
        studentId: userId,
        activityType: "COMPLETED_LESSON",
      },
    });

    const alreadyLogged = existingActivities.some((act: any) => {
      if (!act.metadata) return false;
      const meta = typeof act.metadata === "string" ? JSON.parse(act.metadata) : act.metadata;
      return meta.lessonId === lessonId;
    });

    if (!alreadyLogged) {
      await prisma.activityTimeline.create({
        data: {
          studentId: userId,
          activityType: "COMPLETED_LESSON",
          metadata: { lessonId },
        },
      }).catch(console.error);
    }
  }
}
