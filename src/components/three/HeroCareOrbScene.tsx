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
    const t = clock.getElapsedTime();
    const angle = offsetAngle + t * speed;
    groupRef.current.position.x = Math.cos(angle) * radius;
    groupRef.current.position.z = Math.sin(angle) * radius;
    groupRef.current.position.y =
      yOffset + Math.sin(t * 1.6 + offsetAngle) * 0.14;

    groupRef.current.rotation.x = t * 0.95 + offsetAngle;
    groupRef.current.rotation.z = t * 0.65 + offsetAngle;

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
    const t = clock.getElapsedTime();

    pulseValueRef.current = THREE.MathUtils.lerp(
      pulseValueRef.current,
      0,
      0.07
    );

    const pulseBoost = pulseValueRef.current * 0.16;
    const unlockExpand = isUnlocking || pinLength === 6 ? 0.25 : 0;

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
      const coreScale =
        1 + pulseValueRef.current * 0.22 + (pinLength / 6) * 0.12;
      coreRef.current.scale.lerp(
        new THREE.Vector3(coreScale, coreScale, coreScale),
        0.14
      );
    }
  });

  return (
    <group ref={rootRef}>
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

      <mesh ref={innerRingRef}>
        <torusGeometry args={[0.88, 0.048, 24, 96]} />
        <meshPhysicalMaterial
          color="#FAF8F5"
          roughness={0.28}
          metalness={0.04}
          clearcoat={0.6}
        />
      </mesh>

      <mesh ref={middleRingRef}>
        <torusGeometry args={[1.24, 0.055, 28, 100]} />
        <meshPhysicalMaterial
          color="#CCFBF1"
          roughness={0.15}
          metalness={0.05}
          clearcoat={0.9}
        />
      </mesh>

      <mesh ref={outerRingRef}>
        <torusGeometry args={[1.62, 0.032, 24, 110]} />
        <meshPhysicalMaterial
          color="#D97706"
          roughness={0.25}
          metalness={0.2}
          clearcoat={0.8}
        />
      </mesh>

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
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

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

  const scaleBoost = 1 + pinLength * 0.04 + (isUnlocking ? 0.12 : 0);

  return (
    <div
      aria-hidden="true"
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 24;
        const ny = ((e.clientY - rect.top) / rect.height - 0.5) * -18;
        setTilt({ x: nx, y: ny });
      }}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      className="w-full h-[240px] relative overflow-hidden select-none"
    >
      {/* Always-Visible 3D Studio PBR Vector & CSS 3D Stage Underlay (Guarantees Zero Blank Canvas) */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-300 ease-out"
        style={{
          transform: `perspective(600px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg) scale(${scaleBoost})`,
        }}
      >
        <svg
          viewBox="0 0 320 220"
          className="w-full h-full max-w-[310px] max-h-[210px] overflow-visible"
        >
          <defs>
            <radialGradient id="orbCoreGrad" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="55%" stopColor="#0F766E" />
              <stop offset="100%" stopColor="#064E3B" />
            </radialGradient>
            <linearGradient id="ringGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#2DD4BF" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="ringGlassGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.7" />
            </linearGradient>
          </defs>

          {/* Pedestal Soft Studio Shadow */}
          <ellipse
            cx="160"
            cy="192"
            rx="84"
            ry="12"
            fill="rgba(15, 23, 42, 0.14)"
          />

          {/* Outer Warm-Gold Sovereign Gyro Ring */}
          <g
            style={{
              transformOrigin: "160px 106px",
              animation: "spin 18s linear infinite",
            }}
          >
            <ellipse
              cx="160"
              cy="106"
              rx="116"
              ry="46"
              fill="none"
              stroke="url(#ringGoldGrad)"
              strokeWidth="3.5"
              strokeDasharray="10 5"
              transform="rotate(-18 160 106)"
            />
          </g>

          {/* Middle Frosted-Glass Care-Circle Ring */}
          <g
            style={{
              transformOrigin: "160px 106px",
              animation: "spin 12s linear infinite reverse",
            }}
          >
            <ellipse
              cx="160"
              cy="106"
              rx="88"
              ry="58"
              fill="none"
              stroke="url(#ringGlassGrad)"
              strokeWidth="5"
              transform="rotate(24 160 106)"
            />
          </g>

          {/* Inner Matte-Ceramic Ring */}
          <ellipse
            cx="160"
            cy="106"
            rx="62"
            ry="28"
            fill="none"
            stroke="#0F766E"
            strokeOpacity="0.38"
            strokeWidth="3"
            transform="rotate(-8 160 106)"
          />

          {/* Central Sovereign Elder Core Sphere */}
          <circle
            cx="160"
            cy="106"
            r={30 + pinLength * 1.8}
            fill="url(#orbCoreGrad)"
          />
          <ellipse
            cx="150"
            cy="95"
            rx="11"
            ry="6"
            fill="rgba(255,255,255,0.45)"
            transform="rotate(-25 150 95)"
          />

          {/* Orbiting 3D Pill Capsule 1 (Eliquis Pink Oval) */}
          <g
            transform={`translate(${activePillIndex === 0 ? 52 : 58}, 64) scale(${
              activePillIndex === 0 ? 1.18 : 0.95
            })`}
          >
            <rect
              x="-18"
              y="-9"
              width="36"
              height="18"
              rx="9"
              fill="#F472B6"
              stroke="#FFFFFF"
              strokeWidth="2"
            />
            <text
              x="0"
              y="3"
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="7.5"
              fontFamily="monospace"
              fontWeight="bold"
            >
              894
            </text>
          </g>

          {/* Orbiting 3D Pill Capsule 2 (Levothyroxine Sky Capsule) */}
          <g
            transform={`translate(256, 68) scale(${
              activePillIndex === 1 ? 1.18 : 0.95
            })`}
          >
            <rect
              x="-18"
              y="-9"
              width="18"
              height="18"
              rx="9"
              fill="#38BDF8"
            />
            <rect
              x="0"
              y="-9"
              width="18"
              height="18"
              rx="9"
              fill="#E0F2FE"
            />
            <rect
              x="-18"
              y="-9"
              width="36"
              height="18"
              rx="9"
              fill="none"
              stroke="#0284C7"
              strokeWidth="1.5"
            />
            <text
              x="0"
              y="3"
              textAnchor="middle"
              fill="#0F172A"
              fontSize="7"
              fontFamily="monospace"
              fontWeight="bold"
            >
              LV75
            </text>
          </g>

          {/* Orbiting 3D Pill Tablet 3 (Lisinopril Round) */}
          <g
            transform={`translate(234, 154) scale(${
              activePillIndex === 2 ? 1.18 : 0.95
            })`}
          >
            <circle
              cx="0"
              cy="0"
              r="12"
              fill="#FFFFFF"
              stroke="#0F766E"
              strokeWidth="2"
            />
            <text
              x="0"
              y="3"
              textAnchor="middle"
              fill="#0F766E"
              fontSize="7"
              fontFamily="monospace"
              fontWeight="bold"
            >
              L10
            </text>
          </g>
        </svg>
      </div>

      {/* Live WebGL 3D Layer on Top */}
      {webglReady && (
        <div className="absolute inset-0">
          <Canvas
            dpr={[1, 1.5]}
            camera={{ position: [0, 0.2, 4.6], fov: 42 }}
            gl={{ antialias: true, alpha: true }}
            onCreated={({ gl }) => {
              gl.setClearColor(0x000000, 0);
            }}
          >
            <StudioLightingRig
              shadowY={-1.85}
              shadowScale={8}
              shadowOpacity={0.14}
            />
            <OrbAssembly
              pinLength={pinLength}
              isUnlocking={isUnlocking}
              activePillIndex={activePillIndex}
              reducedMotion={reducedMotion}
            />
          </Canvas>
        </div>
      )}
    </div>
  );
}
