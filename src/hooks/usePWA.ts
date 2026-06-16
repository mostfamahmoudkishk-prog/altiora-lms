import { useState, useEffect } from "react";

let deferredPrompt: any = null;
const promptListeners = new Set<() => void>();
let registrationWaiting: ServiceWorker | null = null;
const updateListeners = new Set<() => void>();

if (typeof window !== "undefined") {
  // Listen for beforeinstallprompt
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    promptListeners.forEach((listener) => listener());
  });

  // Listen for service worker controller change to force reload
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  }
}

export function usePWA() {
  const [isInstallable, setIsInstallable] = useState(!!deferredPrompt);
  const [hasUpdate, setHasUpdate] = useState(!!registrationWaiting);

  useEffect(() => {
    const handlePromptChange = () => {
      setIsInstallable(!!deferredPrompt);
    };

    const handleUpdateChange = () => {
      setHasUpdate(!!registrationWaiting);
    };

    promptListeners.add(handlePromptChange);
    updateListeners.add(handleUpdateChange);

    return () => {
      promptListeners.delete(handlePromptChange);
      updateListeners.delete(handleUpdateChange);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return false;
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        deferredPrompt = null;
        setIsInstallable(false);
        promptListeners.forEach((listener) => listener());
        return true;
      }
    } catch (err) {
      console.error("PWA install prompt failed:", err);
    }
    return false;
  };

  const updateApp = () => {
    if (registrationWaiting) {
      registrationWaiting.postMessage({ type: "SKIP_WAITING" });
    }
  };

  // Static helper to set waiting worker
  const setWaitingWorker = (worker: ServiceWorker | null) => {
    registrationWaiting = worker;
    updateListeners.forEach((listener) => listener());
  };

  return { isInstallable, installApp, hasUpdate, updateApp, setWaitingWorker };
}
export type PWAHookResult = ReturnType<typeof usePWA>;
