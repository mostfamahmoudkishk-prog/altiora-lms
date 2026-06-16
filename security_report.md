# Security & Anti-Tampering Integration Report
**Component**: `apps/altiora-player/src/main/main.ts`

## Overview
To defend the player client from code injection, memory sniffing, and dynamic inspections, multiple app-level security constraints are enabled.

## Security Configurations
1. **Context Isolation**:
   - The Electron window is loaded with `contextIsolation: true` and `nodeIntegration: false`.
   - This decouples the browser page's JavaScript execution context from the Node.js main process context, ensuring that compromised scripts running in the UI cannot access sensitive Node modules or shell commands.
2. **Preload IPC Bridge**:
   - The renderer communicates only through a minimal, explicitly exposed `window.electronAPI` bridge (using `contextBridge`). No raw IPC channels can be accessed from the renderer.
3. **DevTools Exclusivity**:
   - DevTools is disabled and blocked in packaged builds. It is only accessible during development.
4. **Window Content Protection**:
   - Screen-capture block is locked at the OS level on launch.
