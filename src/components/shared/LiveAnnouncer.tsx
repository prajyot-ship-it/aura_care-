"use client";

import React, { useEffect, useState } from "react";

const ANNOUNCE_EVENT = "aura:announce";

/**
 * Dispatches a polite screen-reader announcement to the global `aria-live="polite"` region.
 */
export function announceToScreenReader(message: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<string>(ANNOUNCE_EVENT, { detail: message }));
}

/**
 * Global polite live region mounted in `RootLayout` for medication, mutex, and clinical alerts.
 */
export function GlobalLiveAnnouncer() {
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    function handleAnnounce(e: Event) {
      const custom = e as CustomEvent<string>;
      if (typeof custom.detail === "string" && custom.detail.trim().length > 0) {
        setAnnouncement("");
        window.requestAnimationFrame(() => {
          setAnnouncement(custom.detail);
        });
      }
    }
    window.addEventListener(ANNOUNCE_EVENT, handleAnnounce);
    return () => window.removeEventListener(ANNOUNCE_EVENT, handleAnnounce);
  }, []);

  return (
    <div
      id="aura-live-announcer"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}
