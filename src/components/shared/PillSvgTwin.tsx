"use client";

import React, { useId } from "react";
import { PillShape } from "@/lib/types";

interface PillSvgTwinProps {
  shape: PillShape | string;
  primaryColor: string;
  secondaryColor: string;
  imprint: string;
  size?: "sm" | "md" | "lg";
  withPedestal?: boolean;
}

export function PillSvgTwin({
  shape,
  primaryColor,
  secondaryColor,
  imprint,
  size = "lg",
  withPedestal = true,
}: PillSvgTwinProps) {
  const uid = useId().replace(/:/g, "");
  const normalizedShape = (shape || "OVAL").toUpperCase();

  const dimensions =
    size === "lg"
      ? { width: 112, height: 68, pedestal: "w-28 h-28", fontSize: 12.5 }
      : size === "md"
        ? { width: 88, height: 54, pedestal: "w-20 h-20", fontSize: 11 }
        : { width: 64, height: 40, pedestal: "w-14 h-14", fontSize: 9 };

  const isDarkPrimary = [
    "#046A38",
    "#0F766E",
    "#1E40AF",
    "#2563EB",
    "#991B1B",
    "#EA580C",
    "#111827",
  ].includes((primaryColor || "").toUpperCase());
  const textFill = isDarkPrimary ? "#FFFFFF" : "#111827";

  const svgElement = (
    <svg
      width={dimensions.width}
      height={dimensions.height}
      viewBox="0 0 120 74"
      role="img"
      aria-label={`${normalizedShape} medication pill with imprint ${imprint}`}
      className="overflow-visible select-none"
    >
      <defs>
        {/* 3D Body Gradient */}
        <linearGradient id={`body-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={primaryColor || "#F8FAFC"} />
          <stop offset="65%" stopColor={primaryColor || "#F8FAFC"} />
          <stop offset="100%" stopColor={secondaryColor || "#CBD5E1"} />
        </linearGradient>

        {/* Top Specular 3D Highlight */}
        <linearGradient id={`spec-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
        </linearGradient>

        {/* Soft Ambient Contact Shadow */}
        <filter id={`shadow-${uid}`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow
            dx="0"
            dy="5"
            stdDeviation="4"
            floodColor="#111827"
            floodOpacity="0.16"
          />
        </filter>
      </defs>

      {normalizedShape === "ROUND" && (
        <g filter={`url(#shadow-${uid})`}>
          <circle
            cx="60"
            cy="36"
            r="29"
            fill={`url(#body-${uid})`}
            stroke="#1E293B"
            strokeWidth="2"
          />
          {/* 3D Inner Bevel Rim */}
          <circle
            cx="60"
            cy="36"
            r="25"
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity="0.55"
            strokeWidth="1.5"
          />
          {/* Specular Dome */}
          <ellipse
            cx="54"
            cy="24"
            rx="16"
            ry="8"
            fill={`url(#spec-${uid})`}
          />
          {/* Precision Score Line */}
          <line
            x1="60"
            y1="9"
            x2="60"
            y2="63"
            stroke="#475569"
            strokeWidth="1.75"
            strokeDasharray="3,2"
          />
          <text
            x="43"
            y="40"
            textAnchor="middle"
            fill={textFill}
            fontWeight="800"
            fontSize={dimensions.fontSize}
            fontFamily="var(--font-mono), monospace"
          >
            {imprint.slice(0, 4)}
          </text>
        </g>
      )}

      {normalizedShape === "OVAL" && (
        <g filter={`url(#shadow-${uid})`}>
          <rect
            x="10"
            y="14"
            width="100"
            height="44"
            rx="22"
            ry="22"
            fill={`url(#body-${uid})`}
            stroke="#1E293B"
            strokeWidth="2"
          />
          {/* Specular Highlight */}
          <rect
            x="18"
            y="18"
            width="84"
            height="16"
            rx="8"
            fill={`url(#spec-${uid})`}
          />
          {/* Score Line */}
          <line
            x1="60"
            y1="15"
            x2="60"
            y2="57"
            stroke="#64748B"
            strokeWidth="1.6"
          />
          <text
            x="37"
            y="40"
            textAnchor="middle"
            fill={textFill}
            fontWeight="800"
            fontSize={dimensions.fontSize}
            fontFamily="var(--font-mono), monospace"
          >
            {imprint.slice(0, 5)}
          </text>
        </g>
      )}

      {normalizedShape === "CAPSULE" && (
        <g filter={`url(#shadow-${uid})`}>
          {/* Left Cap */}
          <path
            d="M 32 15 L 60 15 L 60 57 L 32 57 A 21 21 0 0 1 32 15 Z"
            fill={primaryColor || "#38BDF8"}
            stroke="#1E293B"
            strokeWidth="2"
          />
          {/* Right Body */}
          <path
            d="M 60 15 L 88 15 A 21 21 0 0 1 88 57 L 60 57 Z"
            fill={secondaryColor || "#E0F2FE"}
            stroke="#1E293B"
            strokeWidth="2"
          />
          {/* 3D Gloss Reflection */}
          <rect
            x="22"
            y="19"
            width="76"
            height="13"
            rx="6.5"
            fill={`url(#spec-${uid})`}
          />
          {/* Capsule Seam Band */}
          <rect
            x="58"
            y="14.5"
            width="4"
            height="43"
            rx="1.5"
            fill="#1E293B"
            fillOpacity="0.8"
          />
          <text
            x="36"
            y="40"
            textAnchor="middle"
            fill={textFill}
            fontWeight="800"
            fontSize={dimensions.fontSize - 1}
            fontFamily="var(--font-mono), monospace"
          >
            {imprint.slice(0, 5)}
          </text>
        </g>
      )}

      {normalizedShape === "DIAMOND" && (
        <g filter={`url(#shadow-${uid})`}>
          <polygon
            points="60,8 108,36 60,64 12,36"
            fill={`url(#body-${uid})`}
            stroke="#1E293B"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <polygon
            points="60,13 98,36 60,36 22,36"
            fill={`url(#spec-${uid})`}
          />
          <text
            x="60"
            y="40"
            textAnchor="middle"
            fill={textFill}
            fontWeight="800"
            fontSize={dimensions.fontSize}
            fontFamily="var(--font-mono), monospace"
          >
            {imprint.slice(0, 5)}
          </text>
        </g>
      )}
    </svg>
  );

  if (!withPedestal) {
    return (
      <div
        className="inline-flex flex-col items-center justify-center shrink-0"
        title={`Visual Pill Twin: ${normalizedShape} tablet, imprint ${imprint}`}
      >
        {svgElement}
      </div>
    );
  }

  return (
    <div
      className="inline-flex flex-col items-center justify-center shrink-0"
      title={`Visual Pill Twin: ${normalizedShape} tablet, imprint ${imprint}`}
    >
      <div
        className={`${dimensions.pedestal} rounded-full bg-gradient-to-b from-[#FAF8F5] to-[#EFECE6] border border-[#E2DDD5] shadow-inner flex flex-col items-center justify-center relative p-2`}
      >
        {svgElement}
      </div>
      <span className="mt-1.5 px-2.5 py-0.5 rounded-full bg-[#F8F7F4] border border-[#E2DDD5] text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-700">
        {normalizedShape} • {imprint}
      </span>
    </div>
  );
}
