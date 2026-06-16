# Secure Backend API Routes Report
**Folder Path**: `src/routes/`

## Overview
A set of dedicated REST API endpoints are implemented to handle requests from the Altiora Desktop Player client. These are designed using TanStack Router's server-side route handlers.

## Implemented API Contracts
1. **Authentication (`POST /api/player/auth`)**:
   - Accepts email and password.
   - Generates a cryptographically secure JWT token valid for 30 days.
2. **Profile Fetch (`GET /api/player/auth/profile`)**:
   - Validates the Authorization Bearer token.
   - Returns details of the logged-in student.
3. **Device Verification (`POST /api/player/verify-device`)**:
   - Registers new hardware and enforces device limit checks.
4. **Course Listings (`GET /api/player/courses`)**:
   - Returns the student's active enrolled courses.
5. **Syllabus Details (`GET /api/player/course/:id`)**:
   - Returns modules and lessons for a given course ID.
6. **Deep Linking Helper (`GET /api/player/open-lesson/:id`)**:
   - Resolves a lesson and its course context on custom protocol launch.
7. **Secure Video Stream (`POST /api/player/get-video-url`)**:
   - Returns a 5-minute signed Bunny HLS stream playlist URL.
8. **Watch Progress Sync (`POST /api/player/progress`)**:
   - Records student playback progress to UserWatchProgress and ContinueWatching tables.
9. **Security Audit Log (`POST /api/player/log-security-event`)**:
   - Logs security/tampering violations to AuditLog and SuspiciousActivity.
