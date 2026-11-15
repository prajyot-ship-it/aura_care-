"use client";

import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { StudioLightingRig } from "./StudioLightingRig";

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
  reducedMotion,
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
    const t = reducedMotion ? 0 : clock.getElapsedTime();

    const targetScale = isHovered ? 1.38 : 1.0;
    groupRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.14
    );

    if (pulseRef.current && !isTaken && !reducedMotion) {
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
      {/* Core Status Sphere */}
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

      {/* Shielded Gold Mutex Lock Halo if TAKEN, or Pulsing Amber Aura if PENDING */}
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
    const t = reducedMotion ? 0 : clock.getElapsedTime();

    // Subtle pointer tilt
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
      // Base clock angle + time-travel boost animation
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
      {/* Main Frosted 3D Circadian Ring */}
      <mesh>
        <torusGeometry args={[1.28, 0.06, 28, 100]} />
        <meshPhysicalMaterial
          color="#E2DDD5"
          roughness={0.25}
          metalness={0.05}
          clearcoat={0.8}
        />
      </mesh>

      {/* Inner Sovereign Core */}
      <mesh>
        <sphereGeometry args={[0.36, 32, 32]} />
        <meshPhysicalMaterial
          color="#0F766E"
          roughness={0.2}
          clearcoat={0.9}
        />
      </mesh>

      {/* Animated 3D Circadian Hand */}
      <group ref={handGroupRef}>
        <mesh position={[0, 0.56, 0.06]}>
          <capsuleGeometry args={[0.035, 0.85, 12, 20]} />
          <meshStandardMaterial color="#111827" roughness={0.3} />
        </mesh>
      </group>

      {/* Live Dose Nodes along the 3D Ring */}
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

  if (!webglReady) return null;

  return (
    <div
      aria-hidden="true"
      className="w-full h-44 rounded-2xl bg-gradient-to-b from-[#FAF8F5] to-[#F1EFEA] border border-[#E2DDD5] relative overflow-hidden"
    >
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 3.65], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
      >
        <StudioLightingRig shadowY={-1.6} shadowScale={6} shadowOpacity={0.18} />
        <CircadianRingStage {...props} />
      </Canvas>

      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between pointer-events-none text-[10px] font-mono text-slate-600">
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
