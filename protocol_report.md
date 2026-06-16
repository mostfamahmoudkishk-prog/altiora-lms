# Custom Protocol Routing (`altiora://`) Report
**Components**: `src/main/main.ts`, `src/main/preload.ts`, `src/renderer/App.tsx`

## Protocol Registration
To facilitate seamless launch handshakes directly from the web browser, the Altiora Desktop Player registers itself as the default handler for the `altiora://` custom protocol.

- **Windows Registry Setup**:
  - The Electron main process calls `app.setAsDefaultProtocolClient("altiora")` during setup.
  - In development environments, it appends the executable and script path to handle command line arguments correctly.

## Handler Architecture
1. **Single Instance Lock**:
   - `app.requestSingleInstanceLock()` prevents launching duplicate player windows.
   - If a student triggers a link while the app is already open, the `second-instance` event captures the URL args, focuses the existing window, and routes the request.
2. **URL Parsing & Segment Extraction**:
   - The deep link segments (`altiora://lesson/{lessonId}`) are parsed using regex or URL segments.
   - The lesson ID is extracted and dispatched via IPC (`mainWindow.webContents.send("open-lesson-link", lessonId)`).
3. **Renderer Navigation**:
   - The React UI listens to this event using the preload-exposed callback `window.electronAPI.onOpenLesson()`.
   - If the student is authenticated, it directly plays the lesson. If not, it stores the pending lesson ID in `localStorage` and routes the student to the login page first.
