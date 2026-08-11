"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "development") {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        });
        return;
      }
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[PWA] Service Worker registered:", registration.scope);

          // Check for updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed") {
                  if (navigator.serviceWorker.controller) {
                    // New content available
                    console.log("[PWA] New content available, refresh to update");
                  } else {
                    // Content is cached for the first time
                    console.log("[PWA] Content cached for offline use");
                  }
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error("[PWA] Service Worker registration failed:", error);
        });

      // Listen for controlling change
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        console.log("[PWA] Service Worker took control");
      });
    }
  }, []);

  return null;
}
