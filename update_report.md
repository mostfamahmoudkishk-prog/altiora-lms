# Auto-Updater Integration Report
**Component**: `apps/altiora-player/package.json`

## Overview
To ensure all security patches, new recorder definitions, and content protection updates are immediately distributed, the Altiora Desktop Player incorporates an auto-updating system using `electron-updater`.

## Configuration
1. **Dependency**:
   - Integrates `electron-updater` (v6.1.7) as an app-level dependency.
2. **Publish Target**:
   - Configured in the `build` section of `package.json` pointing to the GitHub repository:
     - **Provider**: `github`
     - **Owner**: `altiora`
     - **Repo**: `altiora-player`
3. **Execution flow**:
   - The Electron main process checks for updates on startup using standard updater lifecycle hooks.
   - When a new release tag is detected on the target GitHub repository, the updater downloads the installer in the background.
   - Using the `GH_TOKEN` environment variable, private repository releases can also be queried securely during the build phase to generate target update artifacts (`latest.yml`).
