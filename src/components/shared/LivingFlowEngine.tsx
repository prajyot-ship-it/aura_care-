"use client";

import React, { useEffect } from "react";

const INTERACTIVE_SELECTOR =
  'button, a, [role="button"], input[type="text"], select, textarea, .bento-card, .living-flow-item';

/**
 * LivingFlowEngine
 * 1. Tracks pointer/touch coordinates globally to power the Luminous Effect
 *    (soft specular highlights on translucent surfaces and borders).
 * 2. Attaches a physics-based Flexible Feedback touch & drag system to all
 *    buttons and interactive elements: elastic squash-and-stretch on press,
 *    directional rubber-band stretch on pointer move, and underdamped harmonic
 *    spring-back on release.
 * 3. Renders continuous ambient fluid aurora blooms behind translucent layers.
 */
export function LivingFlowEngine() {
  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    let activeEl: HTMLElement | null = null;
    let startX = 0;
    let startY = 0;

    function updateLuminousCoordinates(clientX: number, clientY: number) {
      document.documentElement.style.setProperty("--flow-x", `${clientX}px`);
      document.documentElement.style.setProperty("--flow-y", `${clientY}px`);

      const hovered = document
        .elementFromPoint(clientX, clientY)
        ?.closest<HTMLElement>(INTERACTIVE_SELECTOR);

      if (hovered) {
        const rect = hovered.getBoundingClientRect();
        hovered.style.setProperty("--el-x", `${clientX - rect.left}px`);
        hovered.style.setProperty("--el-y", `${clientY - rect.top}px`);
      }
    }

    function handlePointerDown(e: PointerEvent) {
      updateLuminousCoordinates(e.clientX, e.clientY);

      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        'button, a, [role="button"], .bento-card-interactive'
      );
      if (!target || (target as HTMLButtonElement).disabled) return;

      activeEl = target;
      startX = e.clientX;
      startY = e.clientY;

      const rect = target.getBoundingClientRect();
      target.style.setProperty("--el-x", `${e.clientX - rect.left}px`);
      target.style.setProperty("--el-y", `${e.clientY - rect.top}px`);
      target.setAttribute("data-flow-pressed", "true");

      target.animate(
        [
          { transform: "scale3d(1, 1, 1)" },
          { transform: "scale3d(1.05, 0.93, 1)" },
        ],
        {
          duration: 135,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "forwards",
        }
      );
    }

    function handlePointerMove(e: PointerEvent) {
      updateLuminousCoordinates(e.clientX, e.clientY);

      if (!activeEl) return;
      const dx = Math.max(-14, Math.min(14, (e.clientX - startX) * 0.18));
      const dy = Math.max(-10, Math.min(10, (e.clientY - startY) * 0.18));
      const stretchX = 1.045 + Math.abs(dx) * 0.004;
      const stretchY = 0.94 + Math.abs(dy) * 0.003;

      activeEl.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(
        1
      )}px, 0) scale3d(${stretchX.toFixed(3)}, ${stretchY.toFixed(3)}, 1)`;
    }

    function releaseActiveElement() {
      if (!activeEl) return;
      const el = activeEl;
      activeEl = null;
      el.removeAttribute("data-flow-pressed");
      el.style.transform = "";

      // Physics-based harmonic spring-back sequence (elastic overshoot -> settle)
      el.animate(
        [
          { transform: "scale3d(1.05, 0.93, 1)" },
          { transform: "scale3d(0.96, 1.04, 1)" },
          { transform: "scale3d(1.018, 0.99, 1)" },
          { transform: "scale3d(1, 1, 1)" },
        ],
        {
          duration: 460,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "forwards",
        }
      );
    }

    window.addEventListener("pointerdown", handlePointerDown, {
      passive: true,
    });
    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    window.addEventListener("pointerup", releaseActiveElement, {
      passive: true,
    });
    window.addEventListener("pointercancel", releaseActiveElement, {
      passive: true,
    });

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", releaseActiveElement);
      window.removeEventListener("pointercancel", releaseActiveElement);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="living-flow-ambient pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div className="living-flow-orb living-flow-orb-1" />
      <div className="living-flow-orb living-flow-orb-2" />
      <div className="living-flow-orb living-flow-orb-3" />
      <div className="living-flow-luminous-cursor" />
    </div>
  );
}
