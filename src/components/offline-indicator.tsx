"use client";

import { useState, useEffect, useRef } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [showBanner, setShowBanner] = useState(false);
  // Tracked via ref so the effect can subscribe once (avoid F-8 listener
  // churn from re-binding listeners on every `wasOffline` change).
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    let bannerTimer: ReturnType<typeof setTimeout> | null = null;

    const handleOnline = () => {
      setIsOnline(true);
      if (wasOfflineRef.current) {
        setShowBanner(true);
        // Clear any in-flight banner timer before scheduling a new one.
        if (bannerTimer) clearTimeout(bannerTimer);
        bannerTimer = setTimeout(() => setShowBanner(false), 3000);
        wasOfflineRef.current = false;
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      wasOfflineRef.current = true;
      setShowBanner(true);
      if (bannerTimer) {
        clearTimeout(bannerTimer);
        bannerTimer = null;
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      // Closes BUG-068: timer leak if the component unmounts within 3s of
      // coming back online.
      if (bannerTimer) clearTimeout(bannerTimer);
    };
  }, []);

  return (
    <>
      {/* Offline banner */}
      {showBanner && (
        <div
          className={cn(
            "fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-300",
            isOnline
              ? "bg-[oklch(0.65_0.2_155)] text-[oklch(0.13_0_0)]"
              : "bg-red-500 text-white",
          )}
        >
          {isOnline ? (
            <>
              <Wifi className="size-4" />
              Back online — syncing...
            </>
          ) : (
            <>
              <WifiOff className="size-4" />
              You&apos;re offline — changes will sync when connected
            </>
          )}
        </div>
      )}

      {/* Persistent offline dot indicator */}
      {!isOnline && (
        <div className="fixed bottom-20 right-4 z-50">
          <div className="flex items-center gap-2 rounded-full border border-red-500/30 bg-red-950/90 px-3 py-1.5 shadow-lg backdrop-blur-xl">
            <div className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-red-500" />
            </div>
            <span className="text-xs font-medium text-red-400">Offline</span>
          </div>
        </div>
      )}
    </>
  );
}

// Hook for components to check online status
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      setTimeout(() => setWasOffline(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline, wasOffline };
}
