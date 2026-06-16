// Lightweight client-side session helper. Real auth is mocked for now.
const KEY = "altiora_session";

export type UserRole = "STUDENT" | "TEACHER" | "ADMIN" | "SUPER_ADMIN";

export interface UserSession {
  email: string;
  role: UserRole;
  name: string;
  avatarUrl?: string;
  at: number;
  sessionId?: string;
  studentCode?: string;
  id?: string;
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return !!localStorage.getItem("altiora_simulation_session") || !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}

export function getCurrentUser(): UserSession | null {
  if (typeof window === "undefined") return null;
  try {
    const simData = localStorage.getItem("altiora_simulation_session");
    if (simData) {
      return JSON.parse(simData) as UserSession;
    }
    const data = localStorage.getItem(KEY);
    if (!data) return null;
    return JSON.parse(data) as UserSession;
  } catch {
    return null;
  }
}

export function hasRole(role: UserRole): boolean {
  const user = getCurrentUser();
  return user?.role === role;
}

export function setAuthenticatedSession(
  email: string,
  role: UserRole,
  name: string,
  avatarUrl?: string,
  sessionId?: string,
  studentCode?: string,
  id?: string,
) {
  if (typeof window === "undefined") return;
  try {
    const session: UserSession = {
      email,
      role,
      name,
      avatarUrl: avatarUrl ?? "",
      at: Date.now(),
      sessionId: sessionId ?? "",
      studentCode: studentCode ?? "",
      id: id ?? "",
    };
    localStorage.setItem(KEY, JSON.stringify(session));
    if (sessionId) {
      document.cookie = `altiora_session_id=${sessionId}; path=/; max-age=86400; SameSite=Strict; Secure`;
    }
  } catch {
    /* no-op */
  }
}

/** @deprecated Use setAuthenticatedSession instead */
export function setAuthenticated(email?: string) {
  setAuthenticatedSession(email ?? "", "STUDENT", email?.split("@")[0] || "طالب");
}

export function isSimulating(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return !!localStorage.getItem("altiora_simulation_session");
  } catch {
    return false;
  }
}

export function getSimulationMode(): "READ_ONLY" | "INTERACTIVE_TEST" | "LIVE_CONTROL" | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem("altiora_simulation_session_meta");
    if (!data) return null;
    const parsed = JSON.parse(data);
    return parsed.mode || null;
  } catch {
    return null;
  }
}

export function getSimulationTargetUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem("altiora_simulation_session_meta");
    if (!data) return null;
    const parsed = JSON.parse(data);
    return parsed.targetUserId || null;
  } catch {
    return null;
  }
}

export function exitSimulation() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("altiora_simulation_session");
    localStorage.removeItem("altiora_simulation_session_meta");
    localStorage.removeItem("altiora_simulation_last_active");
    
    document.cookie = "altiora_simulation_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    
    // Import and call stop simulation function on server
    import("@/lib/api/simulation.functions").then(({ stopSimulationFn }) => {
      stopSimulationFn().catch(() => {});
    }).finally(() => {
      window.location.href = "/super-admin";
    });
  } catch {
    window.location.href = "/super-admin";
  }
}

let syncChannel: BroadcastChannel | null = null;

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function generateToken(): string {
  if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
    try {
      return window.crypto.randomUUID();
    } catch {}
  }
  return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
}

if (typeof window !== "undefined") {
  // Enforce CSRF token presence on load
  let csrfToken = getCookieValue("altiora_csrf_token");
  if (!csrfToken) {
    csrfToken = generateToken();
    const isSecure = window.location.protocol === "https:";
    document.cookie = `altiora_csrf_token=${csrfToken}; path=/; max-age=86400; SameSite=Strict${isSecure ? "; Secure" : ""}`;
  }

  // Intercept window.fetch globally to append the x-csrf-token header
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    const currentToken = getCookieValue("altiora_csrf_token") || csrfToken;
    if (currentToken) {
      init = init || {};
      init.headers = init.headers || {};
      
      if (init.headers instanceof Headers) {
        if (!init.headers.has("x-csrf-token")) {
          init.headers.set("x-csrf-token", currentToken);
        }
      } else if (Array.isArray(init.headers)) {
        const hasHeader = init.headers.some(h => h[0].toLowerCase() === "x-csrf-token");
        if (!hasHeader) {
          init.headers.push(["x-csrf-token", currentToken]);
        }
      } else {
        const keys = Object.keys(init.headers);
        const hasHeader = keys.some(k => k.toLowerCase() === "x-csrf-token");
        if (!hasHeader) {
          (init.headers as Record<string, string>)["x-csrf-token"] = currentToken;
        }
      }
    }
    return originalFetch.call(this, input, init);
  };

  try {
    syncChannel = new BroadcastChannel("altiora-auth");
    syncChannel.onmessage = (event) => {
      if (event.data === "logout") {
        performLocalLogout(false);
      }
    };
  } catch (err) {
    console.warn("BroadcastChannel not supported:", err);
  }

  // Storage listener fallback for cross-tab sync
  window.addEventListener("storage", (event) => {
    if (event.key === KEY && !event.newValue) {
      performLocalLogout(false);
    }
  });

  // Pageshow listener for BFCache restoration prevention
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      window.location.reload();
    }
  });

  // Popstate listener to prevent viewing stale dashboard page
  window.addEventListener("popstate", () => {
    if (!isAuthenticated()) {
      window.location.href = "/login";
    }
  });

  // User activity tracker for 30-minute simulation inactivity timeout
  let lastActiveTime = Date.now();
  const updateActivity = () => {
    lastActiveTime = Date.now();
    try {
      localStorage.setItem("altiora_simulation_last_active", String(lastActiveTime));
    } catch {}
  };

  window.addEventListener("mousemove", updateActivity);
  window.addEventListener("keydown", updateActivity);
  window.addEventListener("click", updateActivity);
  window.addEventListener("scroll", updateActivity);

  setInterval(() => {
    if (!localStorage.getItem("altiora_simulation_session")) return;
    
    let lastActive = lastActiveTime;
    try {
      const saved = localStorage.getItem("altiora_simulation_last_active");
      if (saved) lastActive = parseInt(saved, 10);
    } catch {}

    const thirtyMinutes = 30 * 60 * 1000;
    if (Date.now() - lastActive > thirtyMinutes) {
      console.warn("Simulation session timed out due to 30-minute inactivity.");
      exitSimulation();
    }
  }, 60 * 1000);
}

function performLocalLogout(broadcast = true) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem("altiora_profile");
    localStorage.removeItem("altiora_simulation_session");
    localStorage.removeItem("altiora_simulation_session_meta");
    localStorage.removeItem("altiora_simulation_last_active");
    sessionStorage.clear();

    document.cookie = "altiora_session_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "altiora_csrf_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "altiora_simulation_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

    if (broadcast && syncChannel) {
      syncChannel.postMessage("logout");
    }

    // Force full page reload redirect to destroy all in-memory React/Query states
    window.location.href = "/login";
  } catch {
    /* no-op */
  }
}

export function clearAuth() {
  if (typeof window === "undefined") return;

  const user = getCurrentUser();
  const sessionId = user?.sessionId;

  // Clear local storage and cookies immediately in this tab
  performLocalLogout(true);

  // Revoke session in background
  if (sessionId) {
    import("@/lib/api/auth.functions").then(({ logoutServerFn }) => {
      logoutServerFn({ data: { sessionId } }).catch(() => {});
    });
  }
}
