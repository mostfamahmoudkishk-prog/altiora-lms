# Hardware Fingerprinting & Device Limit Report
**Components**: `src/main/main.ts`, `src/routes/api.player.verify-device.ts`

## Overview
Altiora enforces strict device concurrency caps. Each student account is bound to a specific maximum number of active hardware instances (defaulting to 1).

## Native Fingerprint Extraction
The Electron main process exposes a `get-device-fingerprint` IPC handler:
1. **Windows System Query**: Executes `wmic csproduct get uuid` to retrieve the motherboard's BIOS UUID.
2. **System Specs**: Extracts `os.cpus()`, `os.userInfo()`, `os.arch()`, and `os.hostname()`.
3. **Hashing**: Combines the raw variables and computes a secure SHA-256 hash. This represents the unique, stable, hardware-bound **Device ID**.

## Limit Validation & DB Verification
On application launch/profile fetch:
- The Device ID is sent to the `/api/player/verify-device` endpoint.
- The server checks if the user's `deviceLimit` is exceeded.
- If it's a new device and the count of active devices is at the limit, the server responds with a `403 Forbidden` error, blocking access.
- If the device is approved, the server registers it in `UserDevice` and maintains its session state.
