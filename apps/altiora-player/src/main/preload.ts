import { contextBridge, ipcRenderer } from "electron";

// Safe API bridge configuration
contextBridge.exposeInMainWorld("electronAPI", {
  // Window management
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),

  // Hardware/Device Fingerprinting info
  getDeviceFingerprint: () => ipcRenderer.invoke("get-device-fingerprint"),

  // Security and Capture control
  toggleContentProtection: (enabled: boolean) => ipcRenderer.send("toggle-content-protection", enabled),
  
  // Custom deep link protocol events
  onOpenLesson: (callback: (lessonId: string) => void) => {
    // Clean old listeners
    ipcRenderer.removeAllListeners("open-lesson-link");
    ipcRenderer.on("open-lesson-link", (_event, lessonId) => callback(lessonId));
  },

  // Security violations logger
  logSecurityEvent: (event: string, details: string) => ipcRenderer.send("log-security-event", event, details),

  // Recording warning listener
  onRecordingDetected: (callback: (detected: boolean, appName: string) => void) => {
    ipcRenderer.on("recording-detected", (_event, detected, appName) => callback(detected, appName));
  }
});
