# Notification System Audit Report - Altiora Platform

This report logs the verification of real-time and database notifications, read tracking, and audio-visual cues.

---

## 1. Architecture Overview

Real-time notifications are powered by the live server [live-server.ts](file:///d:/%D9%85%D8%B5%D8%B7%D9%81%D9%89/altiora-path-forward-main/altiora-path-forward-main/src/live-server.ts) and backed by PostgreSQL tables:
- **Real-Time Gateway**: Live server exposes POST endpoints:
  - `/api/broadcast-notification`: Routes live notifications based on rooms (`userId`, `role-${role}`, `course-${courseId}`, `teacher-${teacherId}`, or `live-${liveSessionId}`).
  - `/api/send-notification`: Directly targets single users.
- **Database Model**: Notifications are persisted in the `Notification` table. Unread status is calculated using `NotificationReadLog` or read timestamps.

---

## 2. Verification Checklist

| Feature | Status | Details |
| :--- | :---: | :--- |
| **Real-Time Pushes** | ✅ **VERIFIED** | Socket rooms receive instant pushes when events (like new lectures, live sessions, or exam releases) are triggered. |
| **Room-Based Routing**| ✅ **VERIFIED** | Correctly targets course participants (`course-${id}`), teachers (`teacher-${id}`), and roles (`role-${id}`). |
| **Read/Unread Tracking**| ✅ **VERIFIED** | Tracks counts and updates timestamps dynamically via API mutations. |
| **UI Notifications Bell**| ✅ **VERIFIED** | Features a notification count badge, active shake/pulse bell micro-animations on incoming events, and unread listing. |
| **Sound Alerts** | ✅ **VERIFIED** | Plays notification sound chimes when dynamic real-time pushes are received in the dashboard. |

---

## 3. Findings & Auto-Repairs
- Checked API parameters and mapped Socket event listeners to ensure perfect sync between database writes and WebSocket broadcasts.
