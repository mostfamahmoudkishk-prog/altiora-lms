/**
 * Types and interfaces for Altiora DRM Protection System
 * Supporting future integrations with Widevine (Google) and FairPlay (Apple)
 */

export type DrmProviderType = "WIDEVINE" | "FAIRPLAY" | "CLEARKEY";

export interface DrmLicenseRequest {
  userId: string;
  lessonId: string;
  deviceId: string;
  provider: DrmProviderType;
  challenge: string; // Base64 encoded DRM challenge from player
  timestamp: string;
}

export interface DrmLicenseResponse {
  success: boolean;
  license: string; // Base64 encoded license payload
  customData?: string;
  error?: string;
}

export interface DrmDeviceRegistration {
  deviceId: string;
  userId: string;
  drmClientId: string;
  registeredAt: Date;
  status: "ACTIVE" | "SUSPENDED";
}

/**
 * Service class preparing licensing logic for Widevine/FairPlay
 */
export class DrmService {
  private static jwtSecret = process.env.JWT_SECRET || "altiora_secure_player_secret_2026";

  /**
   * Request DRM License payload
   * Generates license response based on student session validity and challenge
   */
  public static async requestLicense(req: DrmLicenseRequest): Promise<DrmLicenseResponse> {
    try {
      console.log(`[DRM Service] Processing license challenge for user: ${req.userId}, provider: ${req.provider}`);
      
      // Future Integration:
      // 1. Verify student eligibility (enrollment and active status)
      // 2. Forward the DRM challenge payload to licensing servers (e.g. EZDRM, PallyCon, or self-hosted CDM)
      // 3. Return license payload. For now, returning clear signature or stub.
      
      if (!req.challenge) {
        return {
          success: false,
          license: "",
          error: "ERR_DRM_CHALLENGE_MISSING: The DRM challenge body is missing.",
        };
      }

      // Placeholder license stub signature
      const mockLicense = Buffer.from(JSON.stringify({
        status: "GRANTED",
        policy: {
          allowPlayback: true,
          expireAfterSeconds: 7200,
          allowPersistentLicense: false,
        },
        signature: "altiora_mock_drm_license_signature_2026",
      })).toString("base64");

      return {
        success: true,
        license: mockLicense,
      };
    } catch (err: any) {
      console.error("[DRM Service] License acquisition failure:", err);
      return {
        success: false,
        license: "",
        error: `ERR_DRM_LICENSE_FAILURE: ${err.message || err}`,
      };
    }
  }

  /**
   * Register DRM client credentials bound to a device
   */
  public static async registerClient(deviceId: string, userId: string): Promise<DrmDeviceRegistration> {
    console.log(`[DRM Service] Registering device ${deviceId} to user ${userId}`);
    return {
      deviceId,
      userId,
      drmClientId: `drm_client_${deviceId.substring(0, 8)}`,
      registeredAt: new Date(),
      status: "ACTIVE",
    };
  }
}
