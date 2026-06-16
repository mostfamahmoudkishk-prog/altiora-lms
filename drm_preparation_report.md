# DRM Architecture & Platform Preparation Report
**Component**: `src/lib/drm_service.ts`

## Overview
This report details the architectural preparation to support Google Widevine and Apple FairPlay DRM (Digital Rights Management) licensing systems on Altiora.

## Implementation Details
1. **DRM Data Models**:
   - Outlined `DrmLicenseRequest` representing client-to-server challenge metadata containing `challenge`, `deviceId`, and `provider` type.
   - Outlined `DrmLicenseResponse` carrying the base64-encoded license key payload.
2. **Device Registration Interfaces**:
   - `DrmDeviceRegistration` maps verified devices to students, enabling validation of active DRM certificates.
3. **`DrmService` Interface**:
   - Stubbed licensing handler ready to negotiate keys with CDM (Content Decryption Module) licensing server brokers (such as EZDRM or PallyCon) using HTTPS endpoints.
