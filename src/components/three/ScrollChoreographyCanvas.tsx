"use client";

import React, { useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
  useReducedMotion,
} from "framer-motion";

interface TiltBentoCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function TiltBentoCard({
  children,
  className = "",
  onClick,
}: TiltBentoCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const [sheenPos, setSheenPos] = useState({ x: 50, y: 50, opacity: 0 });

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 260, damping: 20, mass: 0.7 });
  const springY = useSpring(mouseY, { stiffness: 260, damping: 20, mass: 0.7 });

  const rotateX = useTransform(springY, [-0.5, 0.5], ["5deg", "-5deg"]);
  const rotateY = useTransform(springX, [-0.5, 0.5], ["-5deg", "5deg"]);

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (shouldReduceMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width - 0.5;
    const normY = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(normX);
    mouseY.set(normY);
    setSheenPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
      opacity: 1,
    });
  }

  function handlePointerLeave() {
    mouseX.set(0);
    mouseY.set(0);
    setSheenPos((prev) => ({ ...prev, opacity: 0 }));
  }

  return (
    <div style={{ perspective: "1000px" }} className="h-full">
      <motion.div
        ref={cardRef}
        onClick={onClick}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        whileHover={
          shouldReduceMotion ? {} : { scaleX: 1.012, scaleY: 1.01, y: -3 }
        }
        whileTap={
          shouldReduceMotion ? {} : { scaleX: 1.032, scaleY: 0.965 }
        }
        transition={{
          type: "spring",
          stiffness: 380,
          damping: 17,
          mass: 0.65,
        }}
        style={
          shouldReduceMotion
            ? {}
            : {
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
              }
        }
        className={`bento-card relative overflow-hidden h-full ${
          onClick ? "cursor-pointer" : ""
        } ${className}`}
      >
        {/* Living Flow Luminous Effect Specular Highlight */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            opacity: sheenPos.opacity,
            background: `radial-gradient(380px circle at ${sheenPos.x}% ${sheenPos.y}%, rgba(56, 189, 248, 0.14), rgba(16, 185, 129, 0.08) 40%, transparent 72%)`,
          }}
        />
        <div className="relative z-10 h-full">{children}</div>
      </motion.div>
    </div>
  );
}

export function ScrollChoreographySection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.94", "start 0.32"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 160,
    damping: 22,
    mass: 0.7,
  });

  const y = useTransform(smoothProgress, [0, 1], [22, 0]);
  const scale = useTransform(smoothProgress, [0, 1], [0.98, 1]);

  return (
    <motion.div
      ref={ref}
      style={shouldReduceMotion ? {} : { y, scale }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
