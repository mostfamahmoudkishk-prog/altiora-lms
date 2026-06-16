# Secure Video Playback & HLS Stream Report
**Components**: `src/renderer/App.tsx`, `hls.js`

## Overview
Video playback is conducted exclusively within the desktop client using HTTP Live Streaming (HLS) wrapped in multiple layers of token authorization, signed URLs, and auto-refresh intervals.

## Core Implementation
1. **Signed URLs**:
   - The desktop app requests a secure, 5-minute signed Bunny Stream playback URL from `/api/player/get-video-url`.
   - The server validates the student's active enrollment and returns a signed `.m3u8` path.
2. **Auto-Regeneration Loop**:
   - Because signed Bunny URLs expire after 5 minutes, a client-side timer refreshes the signed URL token every **4 minutes** in the background, updating the HLS source pointer without interrupting video playback.
3. **HLS Stream Integration**:
   - Utilizes `hls.js` for playback rendering.
   - Inject headers dynamically: the `xhrSetup` callback appends the student's JWT token in the `Authorization` header for all chunk requests.
4. **Playback Progress Tracking**:
   - Tracks the student's `currentTime` and `duration`.
   - Sends a progress sync call to the server `/api/player/progress` every **15 seconds** to ensure continuity across platforms.
