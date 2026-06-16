# Altiora Branding & PWA Application Identity Report

This report outlines the updates made to embed the official Altiora branding and configure the Progressive Web Application (PWA) identity across the web platform and standalone desktop player client.

---

## 1. Icon Assets Generation
We used the provided official Altiora logo (`media__1781618104613.png`) and wrote a dynamic PowerShell script to resize and generate the complete set of required application icon formats into the `public/` directory:
- **`favicon.ico`**: 32x32 Multi-resolution favicon for browser tabs.
- **`favicon.png`**: 512x512 PNG.
- **`favicon-16x16.png`**: 16x16 PNG for standard layout tabs.
- **`favicon-32x32.png`**: 32x32 PNG for layout tabs.
- **`apple-touch-icon.png`**: 180x180 PNG optimized for iOS Safari homescreen shortcuts.
- **`icon-192.png`**: 192x192 PNG for standard Android/PWA shortcut placements.
- **`icon-512.png`**: 512x512 PNG for high-resolution splash screens.
- **`maskable-icon-512.png`**: 512x512 PNG with safe margins for adaptive Android launch circles/squares.

---

## 2. PWA Identity & Metadata Configuration
1. **`public/manifest.json`**:
   - Configured app name to **Altiora** (short name: **Altiora**).
   - Set theme color to **`#0B3A8F`** (Official Altiora branding blue).
   - Set background color to **`#ffffff`**.
   - Set display mode to `standalone` and direction to `rtl` for RTL language support.
   - Declared the complete list of generated icon assets, explicitly marking `maskable-icon-512.png` with purpose `maskable`.
2. **`src/routes/__root.tsx`**:
   - Updated the `theme-color` meta tag value to **`#0B3A8F`**.
   - Expanded the `links` function to register `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, and `apple-touch-icon.png` for correct tab rendering across safari, chrome, and edge browsers.

---

## 3. Desktop Installation Branding
To configure the standalone Electron player installer and shortcuts with the Altiora brand:
1. **Packaging (`apps/altiora-player/package.json`)**:
   - Added `"icon": "icon.ico"` under the Windows (`win`) electron-builder configurations to ensure that compiled setups (`.exe`) display the Altiora book-mountain logo.
   - Bundled the icon for the desktop shortcut, taskbar icon, and start menu items.
2. **Window Instance (`apps/altiora-player/src/main/main.ts`)**:
   - Set the `icon` property when instantiating the frameless `BrowserWindow`, loading `icon.ico` directly.

---

## 4. Video Player Branding Integration
To replace default play icons with official branding:
1. **Browser Blocker Modal (`LectureModal.tsx`)**:
   - Replaced generic player and warning icons (`Shield` and `PlayCircle`) with the official Altiora logo image `/favicon.png`.
   - Fullscreen warning modal keeps the official branding active.
2. **Electron Player UI (`App.tsx`)**:
   - Embedded the Altiora logo image on the secure login screen.
   - Replaced the loading HLS player spinner with a branded pulse loader displaying the logo above connection state labels.
