"use client";

import React from "react";

interface StudioLightingRigProps {
  shadowY?: number;
  shadowScale?: number;
  shadowOpacity?: number;
}

export function StudioLightingRig({
  shadowY = -1.35,
  shadowScale = 7,
  shadowOpacity = 0.16,
}: StudioLightingRigProps) {
  return (
    <>
      {/* Warm Alabaster Ambient Fill */}
      <ambientLight intensity={0.95} color="#FAF8F5" />

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

      {/* Lightweight Zero-FBO Studio Pedestal Disc Shadow (prevents WebGL context exhaustion) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, shadowY, 0]}
        scale={[shadowScale * 0.22, shadowScale * 0.22, 1]}
      >
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial
          color="#0F172A"
          transparent
          opacity={shadowOpacity}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}
