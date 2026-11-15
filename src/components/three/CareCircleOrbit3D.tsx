"use client";

import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { StudioLightingRig } from "./StudioLightingRig";
import { WebGLErrorBoundary } from "./WebGLErrorBoundary";

export interface CircadianDoseNode {
  id: string;
  label: string;
  scheduledFor: string;
  status: string;
  lockVersion: number;
}

export interface CareCircleOrbit3DProps {
  doses: CircadianDoseNode[];
  hoveredDoseId: string | null;
  onHoverDoseId: (id: string | null) => void;
  timeTravelStep?: number;
  reducedMotion?: boolean;
}

function DoseOrbitNode({
  dose,
  index,
  total,
  isHovered,
  onHover,
}: {
  dose: CircadianDoseNode;
  index: number;
  total: number;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  reducedMotion: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  const angle = (index / Math.max(1, total)) * Math.PI * 2 - Math.PI / 2;
  const radius = 1.28;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  const isTaken = dose.status === "TAKEN";

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();

    const targetScale = isHovered ? 1.38 : 1.0;
    groupRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.14
    );

    if (pulseRef.current && !isTaken) {
      const s = 1 + Math.sin(t * 3.5 + index) * 0.22;
      pulseRef.current.scale.set(s, s, s);
    }
  });

  return (
    <group
      ref={groupRef}
      position={[x, y, 0.08]}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(dose.id);
      }}
      onPointerOut={() => onHover(null)}
    >
      <mesh>
        <sphereGeometry args={[0.17, 28, 28]} />
        <meshPhysicalMaterial
          color={isTaken ? "#10B981" : "#D97706"}
          emissive={isTaken ? "#0F766E" : "#B45309"}
          emissiveIntensity={isHovered ? 0.85 : 0.4}
          roughness={0.18}
          clearcoat={0.9}
        />
      </mesh>

      {isTaken ? (
        <mesh rotation={[0.4, 0.4, 0]}>
          <torusGeometry args={[0.25, 0.028, 16, 40]} />
          <meshPhysicalMaterial
            color="#F59E0B"
            metalness={0.35}
            roughness={0.2}
            clearcoat={0.9}
          />
        </mesh>
      ) : (
        <mesh ref={pulseRef}>
          <torusGeometry args={[0.24, 0.018, 12, 36]} />
          <meshStandardMaterial
            color="#F59E0B"
            transparent
            opacity={0.65}
          />
        </mesh>
      )}
    </group>
  );
}

function CircadianRingStage({
  doses,
  hoveredDoseId,
  onHoverDoseId,
  timeTravelStep = 0,
  reducedMotion = false,
}: CareCircleOrbit3DProps) {
  const stageRef = useRef<THREE.Group>(null);
  const handGroupRef = useRef<THREE.Group>(null);

  useFrame(({ clock, pointer }) => {
    if (!stageRef.current) return;
    const t = clock.getElapsedTime();

    stageRef.current.rotation.y = THREE.MathUtils.lerp(
      stageRef.current.rotation.y,
      pointer.x * 0.28,
      0.08
    );
    stageRef.current.rotation.x = THREE.MathUtils.lerp(
      stageRef.current.rotation.x,
      -0.22 - pointer.y * 0.2,
      0.08
    );

    if (handGroupRef.current) {
      const targetAngle = -t * 0.15 - timeTravelStep * (Math.PI / 3);
      handGroupRef.current.rotation.z = THREE.MathUtils.lerp(
        handGroupRef.current.rotation.z,
        targetAngle,
        0.07
      );
    }
  });

  return (
    <group ref={stageRef} rotation={[-0.22, 0, 0]}>
      <mesh>
        <torusGeometry args={[1.28, 0.06, 28, 100]} />
        <meshPhysicalMaterial
          color="#E2DDD5"
          roughness={0.25}
          metalness={0.05}
          clearcoat={0.8}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[0.36, 32, 32]} />
        <meshPhysicalMaterial
          color="#0F766E"
          roughness={0.2}
          clearcoat={0.9}
        />
      </mesh>

      <group ref={handGroupRef}>
        <mesh position={[0, 0.56, 0.06]}>
          <capsuleGeometry args={[0.035, 0.85, 12, 20]} />
          <meshStandardMaterial color="#111827" roughness={0.3} />
        </mesh>
      </group>

      {doses.map((dose, idx) => (
        <DoseOrbitNode
          key={dose.id}
          dose={dose}
          index={idx}
          total={doses.length}
          isHovered={hoveredDoseId === dose.id}
          onHover={onHoverDoseId}
          reducedMotion={reducedMotion}
        />
      ))}
    </group>
  );
}

export default function CareCircleOrbit3D(props: CareCircleOrbit3DProps) {
  const { doses, hoveredDoseId, onHoverDoseId, timeTravelStep = 0 } = props;
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

  const handRotationDeg = (timeTravelStep * 60) % 360;

  return (
    <div
      className="w-full h-44 rounded-2xl bg-gradient-to-b from-[#FAF8F5] to-[#F1EFEA] border border-[#E2DDD5] relative overflow-hidden"
    >
      {/* Interactive 3D-Styled Circadian Orbital Network SVG Layer (Guarantees Zero Blank Canvas + Interactive Nodes) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          viewBox="0 0 320 176"
          className="w-full h-full max-w-[320px] max-h-[176px] overflow-visible"
        >
          <defs>
            <radialGradient id="circadianCoreGrad" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="65%" stopColor="#0F766E" />
              <stop offset="100%" stopColor="#064E3B" />
            </radialGradient>
          </defs>

          {/* Outer Tilted 3D Circadian Orbit Ring */}
          <ellipse
            cx="160"
            cy="82"
            rx="104"
            ry="52"
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="6"
          />
          <ellipse
            cx="160"
            cy="82"
            rx="104"
            ry="52"
            fill="none"
            stroke="#0F766E"
            strokeOpacity="0.4"
            strokeWidth="2"
            strokeDasharray="6 4"
          />

          {/* Rotating Circadian Clock Hand */}
          <g
            transform={`translate(160, 82) rotate(${handRotationDeg})`}
            className="transition-transform duration-500"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="-44"
              stroke="#0F766E"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </g>

          {/* Central Sovereign Hub Sphere */}
          <circle cx="160" cy="82" r="20" fill="url(#circadianCoreGrad)" />
          <text
            x="160"
            y="85"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="8"
            fontFamily="monospace"
            fontWeight="bold"
          >
            24H
          </text>

          {/* Interactive Orbital Dose Nodes */}
          {doses.map((dose, idx) => {
            const angle =
              (idx / Math.max(1, doses.length)) * Math.PI * 2 - Math.PI / 2;
            const nx = 160 + Math.cos(angle) * 104;
            const ny = 82 + Math.sin(angle) * 52;
            const isTaken = dose.status === "TAKEN";
            const isHovered = hoveredDoseId === dose.id;

            return (
              <g
                key={dose.id}
                transform={`translate(${nx}, ${ny})`}
                className="cursor-pointer"
                onMouseEnter={() => onHoverDoseId(dose.id)}
                onMouseLeave={() => onHoverDoseId(null)}
              >
                {/* Halo Ring */}
                <circle
                  cx="0"
                  cy="0"
                  r={isHovered ? 16 : 13}
                  fill="none"
                  stroke={isTaken ? "#F59E0B" : "#D97706"}
                  strokeWidth={isHovered ? "2.5" : "1.8"}
                  strokeDasharray={isTaken ? "none" : "3 2"}
                />
                {/* Node Sphere */}
                <circle
                  cx="0"
                  cy="0"
                  r={isHovered ? 11 : 9}
                  fill={isTaken ? "#10B981" : "#D97706"}
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
                <text
                  x="0"
                  y="3"
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="7"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  v{dose.lockVersion}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Live WebGL 3D Layer */}
      {webglReady && (
        <WebGLErrorBoundary fallback={null}>
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
            <Canvas
              dpr={[1, 1.5]}
              camera={{ position: [0, 0, 3.65], fov: 42 }}
              gl={{ antialias: true, alpha: true }}
              onCreated={({ gl }) => {
                gl.setClearColor(0x000000, 0);
                gl.domElement.addEventListener("webglcontextlost", (e) => {
                  e.preventDefault();
                  setWebglReady(false);
                });
              }}
            >
              <StudioLightingRig
                shadowY={-1.6}
                shadowScale={6}
                shadowOpacity={0.14}
              />
              <CircadianRingStage {...props} />
            </Canvas>
          </div>
        </WebGLErrorBoundary>
      )}

      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between pointer-events-none text-[10px] font-mono text-slate-600 z-10">
        <span className="px-2 py-0.5 rounded-full bg-white/90 border border-[#E2DDD5]">
          ● Emerald+Gold = LOCKED
        </span>
        <span className="px-2 py-0.5 rounded-full bg-white/90 border border-[#E2DDD5]">
          ● Pulsing Amber = PENDING
        </span>
      </div>
    </div>
  );
}
