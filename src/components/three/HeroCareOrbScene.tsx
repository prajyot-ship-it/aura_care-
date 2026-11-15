"use client";

import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { StudioLightingRig } from "./StudioLightingRig";

export interface HeroCareOrbSceneProps {
  pinLength: number;
  isUnlocking?: boolean;
  activePillIndex?: number;
  reducedMotion?: boolean;
}

interface OrbAssemblyProps {
  pinLength: number;
  isUnlocking: boolean;
  activePillIndex: number;
  reducedMotion: boolean;
}

function OrbitingCapsule({
  radius,
  speed,
  offsetAngle,
  yOffset,
  primaryColor,
  secondaryColor,
  isHighlighted,
  reducedMotion,
}: {
  radius: number;
  speed: number;
  offsetAngle: number;
  yOffset: number;
  primaryColor: string;
  secondaryColor: string;
  isHighlighted: boolean;
  reducedMotion: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = reducedMotion ? 0 : clock.getElapsedTime();
    const angle = offsetAngle + t * speed;
    groupRef.current.position.x = Math.cos(angle) * radius;
    groupRef.current.position.z = Math.sin(angle) * radius;
    groupRef.current.position.y =
      yOffset + Math.sin(t * 1.6 + offsetAngle) * 0.14;

    if (!reducedMotion) {
      groupRef.current.rotation.x = t * 0.8 + offsetAngle;
      groupRef.current.rotation.z = t * 0.5 + offsetAngle;
    }

    const targetScale = isHighlighted ? 1.22 : 1.0;
    groupRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.1
    );
  });

  return (
    <group ref={groupRef}>
      {/* Upper Capsule Half */}
      <mesh position={[0, 0.14, 0]}>
        <capsuleGeometry args={[0.14, 0.18, 16, 24]} />
        <meshPhysicalMaterial
          color={primaryColor}
          roughness={0.18}
          metalness={0.05}
          clearcoat={0.9}
          clearcoatRoughness={0.12}
        />
      </mesh>
      {/* Lower Capsule Half */}
      <mesh position={[0, -0.14, 0]}>
        <capsuleGeometry args={[0.135, 0.18, 16, 24]} />
        <meshPhysicalMaterial
          color={secondaryColor}
          roughness={0.22}
          metalness={0.02}
          clearcoat={0.85}
          clearcoatRoughness={0.15}
        />
      </mesh>
      {/* Center Seam Band */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.142, 0.014, 12, 32]} />
        <meshStandardMaterial color="#111827" roughness={0.4} />
      </mesh>
    </group>
  );
}

function OrbAssembly({
  pinLength,
  isUnlocking,
  activePillIndex,
  reducedMotion,
}: OrbAssemblyProps) {
  const rootRef = useRef<THREE.Group>(null);
  const outerRingRef = useRef<THREE.Mesh>(null);
  const middleRingRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const pulseValueRef = useRef(0);
  const prevPinLenRef = useRef(pinLength);

  useEffect(() => {
    if (pinLength !== prevPinLenRef.current) {
      pulseValueRef.current = 1.0;
      prevPinLenRef.current = pinLength;
    }
  }, [pinLength]);

  useFrame(({ clock, pointer }) => {
    if (!rootRef.current) return;
    const t = reducedMotion ? 0 : clock.getElapsedTime();

    // Smooth decay of keypress kinetic pulse wave
    pulseValueRef.current = THREE.MathUtils.lerp(
      pulseValueRef.current,
      0,
      0.07
    );

    const pulseBoost = pulseValueRef.current * 0.16;
    const unlockExpand = isUnlocking || pinLength === 6 ? 0.25 : 0;

    // Sinusoidal harmonic levitation + damped mouse pointer parallax
    const targetRotY = pointer.x * 0.42;
    const targetRotX = -pointer.y * 0.32;
    rootRef.current.rotation.y = THREE.MathUtils.lerp(
      rootRef.current.rotation.y,
      targetRotY,
      0.06
    );
    rootRef.current.rotation.x = THREE.MathUtils.lerp(
      rootRef.current.rotation.x,
      targetRotX,
      0.06
    );
    rootRef.current.position.y = Math.sin(t * 1.2) * 0.08;

    const ringScale = 1 + pulseBoost + unlockExpand + pinLength * 0.025;

    if (outerRingRef.current) {
      outerRingRef.current.rotation.x = Math.PI * 0.28 + t * 0.22;
      outerRingRef.current.rotation.y = t * 0.18;
      outerRingRef.current.scale.lerp(
        new THREE.Vector3(ringScale, ringScale, ringScale),
        0.12
      );
    }

    if (middleRingRef.current) {
      middleRingRef.current.rotation.x = -Math.PI * 0.35 - t * 0.28;
      middleRingRef.current.rotation.z = t * 0.24;
      const midScale = 1 + pulseBoost * 1.2 + unlockExpand * 0.8;
      middleRingRef.current.scale.lerp(
        new THREE.Vector3(midScale, midScale, midScale),
        0.12
      );
    }

    if (innerRingRef.current) {
      innerRingRef.current.rotation.y = Math.PI * 0.4 + t * 0.35;
      innerRingRef.current.rotation.z = -t * 0.2;
    }

    if (coreRef.current) {
      const coreScale = 1 + pulseValueRef.current * 0.22 + (pinLength / 6) * 0.12;
      coreRef.current.scale.lerp(
        new THREE.Vector3(coreScale, coreScale, coreScale),
        0.14
      );
    }
  });

  return (
    <group ref={rootRef}>
      {/* Central Elder Sovereign Core Orb */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.52, 48, 48]} />
        <meshPhysicalMaterial
          color={pinLength === 6 ? "#10B981" : "#0F766E"}
          roughness={0.18}
          metalness={0.08}
          clearcoat={1}
          clearcoatRoughness={0.1}
          emissive={pinLength > 0 ? "#0F766E" : "#000000"}
          emissiveIntensity={0.15 + pinLength * 0.08}
        />
      </mesh>

      {/* Inner Matte-Ceramic Ring */}
      <mesh ref={innerRingRef}>
        <torusGeometry args={[0.88, 0.048, 24, 96]} />
        <meshPhysicalMaterial
          color="#FAF8F5"
          roughness={0.28}
          metalness={0.04}
          clearcoat={0.6}
        />
      </mesh>

      {/* Middle Frosted-Glass Care-Circle Ring */}
      <mesh ref={middleRingRef}>
        <torusGeometry args={[1.24, 0.055, 28, 100]} />
        <meshPhysicalMaterial
          color="#CCFBF1"
          roughness={0.15}
          metalness={0.05}
          transmission={0.55}
          thickness={0.6}
          clearcoat={0.9}
        />
      </mesh>

      {/* Outer Warm-Gold Sovereign Halo Ring */}
      <mesh ref={outerRingRef}>
        <torusGeometry args={[1.62, 0.032, 24, 110]} />
        <meshPhysicalMaterial
          color="#D97706"
          roughness={0.25}
          metalness={0.2}
          clearcoat={0.8}
        />
      </mesh>

      {/* 3 Orbiting Glossy 3D Medication Capsules */}
      <OrbitingCapsule
        radius={1.92}
        speed={0.45}
        offsetAngle={0}
        yOffset={0.28}
        primaryColor="#0F766E"
        secondaryColor="#FFFFFF"
        isHighlighted={activePillIndex === 0}
        reducedMotion={reducedMotion}
      />
      <OrbitingCapsule
        radius={1.85}
        speed={0.38}
        offsetAngle={(Math.PI * 2) / 3}
        yOffset={-0.25}
        primaryColor="#F59E0B"
        secondaryColor="#FEF3C7"
        isHighlighted={activePillIndex === 1}
        reducedMotion={reducedMotion}
      />
      <OrbitingCapsule
        radius={1.98}
        speed={0.42}
        offsetAngle={(Math.PI * 4) / 3}
        yOffset={0.12}
        primaryColor="#2563EB"
        secondaryColor="#EFF6FF"
        isHighlighted={activePillIndex === 2}
        reducedMotion={reducedMotion}
      />
    </group>
  );
}

export default function HeroCareOrbScene({
  pinLength,
  isUnlocking = false,
  activePillIndex = 0,
  reducedMotion = false,
}: HeroCareOrbSceneProps) {
  const [webglReady, setWebglReady] = useState(true);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) setWebglReady(false);
    } catch {
      setWebglReady(false);
    }
  }, []);

  if (!webglReady) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="w-full h-full min-h-[280px] pointer-events-auto select-none"
    >
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0.2, 4.6], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <StudioLightingRig shadowY={-1.85} shadowScale={8} shadowOpacity={0.18} />
        <OrbAssembly
          pinLength={pinLength}
          isUnlocking={isUnlocking}
          activePillIndex={activePillIndex}
          reducedMotion={reducedMotion}
        />
      </Canvas>
    </div>
  );
}
