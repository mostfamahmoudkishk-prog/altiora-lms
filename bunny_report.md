# Bunny Stream Video Hosting Integration Report

This report summarizes the design and implementation of Bunny Stream's video hosting integration in Altiora, supporting adaptive playback, token signing security, uploading, and progress tracking.

---

## 1. Environment Configurations

All Bunny Stream credentials are securely loaded from system environment variables:
*   `BUNNY_LIBRARY_ID`: The unique storage library ID for videos.
*   `BUNNY_API_KEY`: API access key for mutating operations (video creation and PUT uploads).
*   `BUNNY_CDN_HOST`: The secure CDN hostname serving compiled video playlists (`.m3u8`).
*   `BUNNY_STREAM_HOSTNAME`: The base API endpoint (`video.bunnycdn.com`) used for uploads and status polls.
*   `BUNNY_TOKEN_KEY`: The secure security signature key used for URL signing (falls back to `BUNNY_API_KEY` if not set separately).

---

## 2. API Services

The [bunny.ts](file:///d:/%D9%85%D8%B5%D8%B7%D9%81%D9%89/altiora-path-forward-main/altiora-path-forward-main/src/lib/bunny.ts) library provides high-level async methods:
*   `createBunnyVideoPlaceholder(title)`: Registers a new video record in the library, returning a unique `guid` (videoId) to hold the upload.
*   `uploadVideoToBunny(videoId, bufferOrStream)`: Streams binary chunks (`application/octet-stream`) via PUT to Bunny's ingestion endpoints.
*   `getVideoEncodingStatus(videoId)`: Polls Bunny Stream to fetch the current encoding progress. Maps standard states (0 = Queued, 1 = Processing, 2 = Encoding, 3 = Completed, 4 = Failed).

---

## 3. Playback Security & Signed URLs

To prevent hotlinking and unauthorized video sharing, playback links are dynamically signed using a SHA256 hashing signature:
1.  We extract the target HLS path: `/${videoId}/playlist.m3u8`.
2.  We append a future expiration Unix timestamp (e.g. `now() + 3600 seconds`).
3.  We hash the concatenation of `tokenKey + path + expires` using SHA256.
4.  The secure playback link is constructed as:
    `https://<cdn-host>/<video-id>/playlist.m3u8?token=<hash>&expires=<timestamp>`
5.  Bunny Stream edge nodes verify this token on every request, rejecting any requests where the link has expired or the token is incorrect.

---

## 4. Progress Tracking & Watch History Sync

*   **Student Progress Tracking**: The player component emits periodic watch time markers to the backend.
*   **Database Synchronization**: Watch times are stored in the `StudentProgress` table, tracking `percentage` watched and completion state.
*   **Completion Trigger**: Once a student watches 90% or more of the video, `isCompleted` is marked `true`, and an activity log entry is generated to unlock subsequent course units.
