"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  ariaLabelledBy?: string;
  ariaLabel?: string;
  children: React.ReactNode;
  variant?: "center" | "drawer-right";
  overlayClassName?: string;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Reusable WCAG-compliant Portal Modal/Drawer mounted directly on `document.body` (`z-[100]`).
 * Provides automatic focus trap (Tab/Shift+Tab), Escape key dismissal, backdrop-click close,
 * body scroll lock, and focus restoration to the triggering element upon close.
 */
export function AccessibleModal({
  isOpen,
  onClose,
  ariaLabelledBy,
  ariaLabel,
  children,
  variant = "center",
  overlayClassName,
}: AccessibleModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move initial focus inside the dialog
    const focusTimer = window.setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      const firstFocusable = focusables[0];
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        container.focus();
      }
    }, 10);

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key === "Tab" && containerRef.current) {
        const focusables = Array.from(
          containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!first || !last) return;

        if (e.shiftKey) {
          if (document.activeElement === first || !containerRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last || !containerRef.current.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  const baseOverlay =
    variant === "drawer-right"
      ? "fixed inset-0 z-[100] flex justify-end bg-slate-950/60 backdrop-blur-xs"
      : "fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 overflow-y-auto";

  return createPortal(
    <div
      ref={containerRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
      aria-label={ariaLabel}
      className={overlayClassName ?? baseOverlay}
      onClick={() => onCloseRef.current()}
    >
      {children}
    </div>,
    document.body
  );
}
