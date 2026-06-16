# Screen Recorder Detection & Monitoring Report
**Components**: `src/main/main.ts`, `src/renderer/App.tsx`

## Overview
While OS-level content protection blocks standard screenshot APIs, dedicated screen recording software can sometimes run hooks. To neutralize this, the Altiora Desktop Player actively scans running background processes.

## Process Scanner Implementation
1. **Background Loop**:
   - The Electron main process initiates a periodic interval running every **3 seconds**.
2. **Process List Query**:
   - On Windows, it executes the system utility:
     `tasklist /NH /FI "STATUS eq RUNNING" /FO CSV`
3. **Blacklisted Recorders**:
   - It searches the command output for known recording process binaries:
     - `obs64.exe` / `obs32.exe` (OBS Studio)
     - `Bandicam.exe` (Bandicam)
     - `CamtasiaStudio.exe` (Camtasia)
     - `ShareX.exe` (ShareX)
     - `GameBar.exe` / `GameBarft.exe` (Xbox Game Bar)
4. **Detection Reaction**:
   - If any listed process is running, the main process broadcasts the event via IPC (`recording-detected`).
   - The React renderer pauses the video player instantly.
   - It overlays a modal blocking the interface, stating that recording program (`{appName}`) is running.
   - It logs the event to the server database.
