"use client";

import React from "react";
import { ContactShadows } from "@react-three/drei";

interface StudioLightingRigProps {
  shadowY?: number;
  shadowScale?: number;
  shadowOpacity?: number;
}

export function StudioLightingRig({
  shadowY = -1.35,
  shadowScale = 7,
  shadowOpacity = 0.22,
}: StudioLightingRigProps) {
  return (
    <>
      {/* Warm Alabaster Ambient Fill */}
      <ambientLight intensity={0.85} color="#FAF8F5" />

      {/* Studio Key Light (Warm Daylight) */}
      <directionalLight
        position={[4, 6, 5]}
        intensity={1.65}
        color="#FFFDF9"
      />

      {/* Botanical Sage Fill Light */}
      <directionalLight
        position={[-5, 3, 2]}
        intensity={0.9}
        color="#CCFBF1"
      />

      {/* Warm Terracotta/Gold Rim Light */}
      <pointLight
        position={[0, 4, -4]}
        intensity={1.1}
        color="#FDE68A"
        distance={14}
      />

      {/* Subtle Bottom Bounce Light */}
      <directionalLight
        position={[0, -4, 2]}
        intensity={0.45}
        color="#E0F2FE"
      />

      {/* Soft Studio Pedestal Contact Shadow */}
      <ContactShadows
        position={[0, shadowY, 0]}
        opacity={shadowOpacity}
        scale={shadowScale}
        blur={2.4}
        far={4}
        color="#111827"
      />
    </>
  );
}
