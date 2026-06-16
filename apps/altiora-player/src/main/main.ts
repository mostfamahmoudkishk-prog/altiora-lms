import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import http from "http";
import os from "os";
import { exec } from "child_process";
import crypto from "crypto";

let mainWindow: BrowserWindow | null = null;
let statusServer: http.Server | null = null;
let processCheckInterval: NodeJS.Timeout | null = null;

// Register deep link custom protocol client
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("altiora", process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient("altiora");
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, commandLine) => {
    // Someone tried to run a second instance, focus our window instead.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    // Parse protocol link from command line arguments
    const url = commandLine.find((arg) => arg.startsWith("altiora://"));
    if (url) {
      handleDeepLink(url);
    }
  });
}

function handleDeepLink(url: string) {
  console.log("Incoming custom protocol deep link:", url);
  try {
    const parsedUrl = new URL(url);
    const pathSegments = parsedUrl.pathname.replace(/^\/+/, "").split("/");
    const action = parsedUrl.host || pathSegments[0];
    const parameter = pathSegments[0] === action ? pathSegments[1] : pathSegments[0];

    if (action === "lesson" && parameter) {
      if (mainWindow) {
        mainWindow.webContents.send("open-lesson-link", parameter);
      }
    }
  } catch (err) {
    // Fallback parsing for altiora://lesson/123 (without host)
    const match = url.match(/altiora:\/\/lesson\/([\w-]+)/);
    if (match && match[1]) {
      if (mainWindow) {
        mainWindow.webContents.send("open-lesson-link", match[1]);
      }
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    frame: false, // frameless for custom player UI control
    backgroundColor: "#0b0f19",
    icon: path.join(__dirname, "../icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load standard Vite dev url or compiled static assets
  const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // Enforce screen protection immediately
  mainWindow.setContentProtection(true);

  // Monitor recording programs every 3 seconds
  startScreenRecordingMonitor();

  mainWindow.on("closed", () => {
    mainWindow = null;
    if (processCheckInterval) {
      clearInterval(processCheckInterval);
    }
  });
}

// 1. Local HTTP status server to support browser checking
function startStatusServer() {
  statusServer = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.url === "/status") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ active: true, version: "1.0.0" }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  statusServer.listen(12480, "127.0.0.1", () => {
    console.log("[Status Server] Listening on http://127.0.0.1:12480/status");
  });
}

// 2. Query hardware csproduct UUID or fall back to system hash fingerprinting
function getWindowsUuid(): Promise<string> {
  return new Promise((resolve) => {
    if (process.platform !== "win32") return resolve("");
    exec("wmic csproduct get uuid", (err, stdout) => {
      if (err || !stdout) return resolve("");
      const lines = stdout.trim().split("\r\n");
      if (lines.length > 1) {
        resolve(lines[1].trim());
      } else {
        const spaceLines = stdout.trim().split("\n");
        if (spaceLines.length > 1) {
          resolve(spaceLines[1].trim());
        } else {
          resolve("");
        }
      }
    });
  });
}

// 3. Screen recording program detection process scanner
function startScreenRecordingMonitor() {
  const recorders = [
    { process: "obs64.exe", name: "OBS Studio" },
    { process: "obs32.exe", name: "OBS Studio" },
    { process: "Bandicam.exe", name: "Bandicam" },
    { process: "CamtasiaStudio.exe", name: "Camtasia" },
    { process: "ShareX.exe", name: "ShareX" },
    { process: "GameBar.exe", name: "Xbox Game Bar" },
    { process: "GameBarft.exe", name: "Xbox Game Bar" },
  ];

  processCheckInterval = setInterval(() => {
    if (!mainWindow) return;

    if (process.platform === "win32") {
      exec("tasklist /NH /FI \"STATUS eq RUNNING\" /FO CSV", (err, stdout) => {
        if (err || !stdout) return;
        
        let detected = false;
        let detectedAppName = "";

        for (const rec of recorders) {
          if (stdout.toLowerCase().includes(rec.process.toLowerCase())) {
            detected = true;
            detectedAppName = rec.name;
            break;
          }
        }

        if (mainWindow) {
          mainWindow.webContents.send("recording-detected", detected, detectedAppName);
        }
      });
    }
  }, 3000);
}

// IPC handlers for window UI controls
ipcMain.on("window-minimize", () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on("window-maximize", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on("window-close", () => {
  if (mainWindow) mainWindow.close();
});

// Enforce content protection toggles
ipcMain.on("toggle-content-protection", (_event, enabled) => {
  if (mainWindow) {
    mainWindow.setContentProtection(enabled);
    console.log(`[Security] Content protection toggled: ${enabled}`);
  }
});

// Log security events
ipcMain.on("log-security-event", (_event, eventName, details) => {
  console.warn(`[SECURITY VIOLATION] Event: ${eventName}, Details: ${details}`);
});

// Device fingerprinting invoke resolver
ipcMain.handle("get-device-fingerprint", async () => {
  const hardwareUuid = await getWindowsUuid();
  const cpus = os.cpus();
  const cpuModel = cpus.length > 0 ? cpus[0].model : "unknown_cpu";
  const platform = os.platform();
  const arch = os.arch();
  const username = os.userInfo().username;
  const hostname = os.hostname();

  // Unique hash based on hardware UUID, platform, cpu, and username
  const rawInput = `${hardwareUuid}_${platform}_${arch}_${cpuModel}_${username}_${hostname}`;
  const deviceHash = crypto.createHash("sha256").update(rawInput).digest("hex");

  return {
    deviceId: deviceHash,
    cpu: cpuModel,
    os: `${platform} (${arch})`,
    hostname,
    username,
    isWindows: platform === "win32",
  };
});

app.whenReady().then(() => {
  createWindow();
  startStatusServer();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
  if (statusServer) {
    statusServer.close();
  }
});

// URL open capture for macOS/Linux custom protocol link
app.on("open-url", (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});
