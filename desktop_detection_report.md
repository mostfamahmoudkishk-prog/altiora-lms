# Browser Playback Restriction & Player Detection Report
**Component**: `src/components/app/LectureModal.tsx`

## Overview
To enforce video streaming exclusivity on the desktop player, the web application intercepts all playback requests. It validates if the secure desktop client is running on the student's machine by pinging a local loopback status server.

## Detection Mechanism
1. **Loopback Status Check**:
   - The desktop app runs a local HTTP server listening on `127.0.0.1:12480`.
   - When a student opens a lecture modal in their web browser, `LectureModal.tsx` fires a background `fetch("http://127.0.0.1:12480/status")` request with a `1.2s` timeout.
2. **Exclusivity Blocking**:
   - If the player is **not detected** (fetch fails or times out), browser-side playback is disabled.
   - The iframe and HTML5 video elements are completely omitted from the DOM to prevent inspecting the HTML source to steal raw HLS video urls.
   - A secure warning/download interface is loaded instead, directing the student to download the app or launch it.
3. **Deep Linking Protocol**:
   - If the player **is active**, the web client displays an activation prompt with a direct deep-link action (`altiora://lesson/{lessonId}`) to transition the lecture stream directly to the desktop player.
