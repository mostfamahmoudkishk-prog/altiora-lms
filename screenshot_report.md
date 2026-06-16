# Screenshot and Screen Capture Protection Report
**Components**: `src/main/main.ts`, `src/routes/api.player.log-security-event.ts`

## Native Content Protection
To prevent screenshots, screen sharing, and recording software from capturing the protected lecture content:

- The Electron window calls `mainWindow.setContentProtection(true)` immediately upon creation.
- This instructs the operating system (Windows Desktop Window Manager / macOS Quartz Composer) to render the window content as entirely **blacked out** or **invisible** to any capture API, print-screen command, or screenshot application.
- Applications like Discord, Zoom, Microsoft Teams, Snipping Tool, and direct OS screen-capture APIs (DXGI/GDI) receive empty black pixels when grabbing frames from the Altiora Player window bounds.

## Violation Logging
- If a screen capture is attempted or debugger tools intercept the process, the client triggers `window.electronAPI.logSecurityEvent()`.
- The event is sent to `/api/player/log-security-event` which logs the action in the `SecurityEvent` and `SuspiciousActivity` tables for administrator auditing.
