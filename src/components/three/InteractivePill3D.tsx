"use client";

import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Box, X, CheckCircle2 } from "lucide-react";
import { StudioLightingRig } from "./StudioLightingRig";
import { PillSvgTwin } from "@/components/shared/PillSvgTwin";
import { PillShape } from "@/lib/types";

export interface InteractivePill3DProps {
  shape: PillShape | string;
  primaryColor: string;
  secondaryColor: string;
  imprint: string;
  medName?: string;
  dosage?: string;
  instructions?: string;
  isConfirmed?: boolean;
  size?: "sm" | "md" | "lg";
  reducedMotion?: boolean;
  allowModalInspect?: boolean;
}

function ProceduralPillMesh({
  shape,
  primaryColor,
  secondaryColor,
  isConfirmed,
  reducedMotion,
}: {
  shape: string;
  primaryColor: string;
  secondaryColor: string;
  isConfirmed: boolean;
  reducedMotion: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const normalizedShape = (shape || "OVAL").toUpperCase();

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = reducedMotion ? 0 : clock.getElapsedTime();

    // Gentle levitation + celebratory bounce when confirmed
    const bounce = isConfirmed ? Math.sin(t * 3.2) * 0.12 + 0.08 : Math.sin(t * 1.6) * 0.06;
    groupRef.current.position.y = bounce;

    if (!reducedMotion) {
      groupRef.current.rotation.y = t * (isConfirmed ? 0.85 : 0.45);
      groupRef.current.rotation.z = Math.sin(t * 0.9) * 0.14;
    }

    if (haloRef.current) {
      const targetScale = isConfirmed ? 1.05 + Math.sin(t * 3) * 0.05 : 0.001;
      haloRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        0.12
      );
      haloRef.current.rotation.x = Math.PI / 2 + Math.sin(t * 1.5) * 0.15;
    }
  });

  const primaryHex = primaryColor || "#F8FAFC";
  const secondaryHex = secondaryColor || "#CBD5E1";

  return (
    <group>
      <group ref={groupRef} rotation={[0.35, 0.4, 0.15]}>
        {normalizedShape === "CAPSULE" && (
          <group rotation={[0, 0, Math.PI / 2]}>
            {/* Left Cap */}
            <mesh position={[0, 0.34, 0]}>
              <capsuleGeometry args={[0.34, 0.42, 24, 36]} />
              <meshPhysicalMaterial
                color={primaryHex}
                roughness={0.16}
                metalness={0.04}
                clearcoat={0.95}
                clearcoatRoughness={0.1}
              />
            </mesh>
            {/* Right Body */}
            <mesh position={[0, -0.34, 0]}>
              <capsuleGeometry args={[0.328, 0.42, 24, 36]} />
              <meshPhysicalMaterial
                color={secondaryHex}
                roughness={0.22}
                metalness={0.02}
                clearcoat={0.88}
                clearcoatRoughness={0.14}
              />
            </mesh>
            {/* Interlocking Center Seam Ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.342, 0.025, 16, 48]} />
              <meshStandardMaterial color="#1E293B" roughness={0.35} />
            </mesh>
          </group>
        )}

        {normalizedShape === "ROUND" && (
          <group rotation={[Math.PI / 2.6, 0, 0]}>
            {/* Main Cylindrical Tablet Body */}
            <mesh>
              <cylinderGeometry args={[0.78, 0.78, 0.3, 48]} />
              <meshPhysicalMaterial
                color={primaryHex}
                roughness={0.34}
                metalness={0.02}
                clearcoat={0.35}
                clearcoatRoughness={0.25}
              />
            </mesh>
            {/* Top Chamfered Bevel Rim */}
            <mesh position={[0, 0.14, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.74, 0.045, 20, 48]} />
              <meshPhysicalMaterial
                color={secondaryHex}
                roughness={0.3}
                clearcoat={0.4}
              />
            </mesh>
            {/* Engraved Central Score-Line Groove */}
            <mesh position={[0, 0.155, 0]}>
              <boxGeometry args={[1.42, 0.028, 0.055]} />
              <meshStandardMaterial color="#475569" roughness={0.6} />
            </mesh>
          </group>
        )}

        {normalizedShape === "OVAL" && (
          <group scale={[1.38, 0.52, 0.86]}>
            {/* Smooth Ellipsoid Tablet */}
            <mesh>
              <sphereGeometry args={[0.68, 48, 36]} />
              <meshPhysicalMaterial
                color={primaryHex}
                roughness={0.28}
                metalness={0.03}
                clearcoat={0.55}
                clearcoatRoughness={0.18}
              />
            </mesh>
            {/* Equatorial Chamfer Band */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.66, 0.03, 16, 48]} />
              <meshPhysicalMaterial color={secondaryHex} roughness={0.3} />
            </mesh>
            {/* Central Score Groove */}
            <mesh position={[0, 0.65, 0]}>
              <boxGeometry args={[0.04, 0.08, 1.15]} />
              <meshStandardMaterial color="#475569" roughness={0.5} />
            </mesh>
          </group>
        )}

        {normalizedShape === "DIAMOND" && (
          <group scale={[1.25, 0.48, 0.92]}>
            {/* Faceted Rounded Diamond Tablet */}
            <mesh>
              <octahedronGeometry args={[0.82, 1]} />
              <meshPhysicalMaterial
                color={primaryHex}
                roughness={0.24}
                metalness={0.05}
                clearcoat={0.7}
                clearcoatRoughness={0.15}
              />
            </mesh>
          </group>
        )}
      </group>

      {/* Celebratory 3D Emerald Ring Halo when Dose is Confirmed */}
      <mesh ref={haloRef} position={[0, -0.55, 0]} scale={[0.001, 0.001, 0.001]}>
        <torusGeometry args={[1.05, 0.045, 20, 64]} />
        <meshStandardMaterial
          color="#10B981"
          emissive="#0F766E"
          emissiveIntensity={0.65}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

export default function InteractivePill3D({
  shape,
  primaryColor,
  secondaryColor,
  imprint,
  medName,
  dosage,
  instructions,
  isConfirmed = false,
  size = "lg",
  reducedMotion = false,
  allowModalInspect = true,
}: InteractivePill3DProps) {
  const [webglSupported, setWebglSupported] = useState(true);
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) setWebglSupported(false);
    } catch {
      setWebglSupported(false);
    }
  }, []);

  const normalizedShape = (shape || "OVAL").toUpperCase();
  const containerSizeClass =
    size === "lg"
      ? "w-32 h-32"
      : size === "md"
        ? "w-24 h-24"
        : "w-16 h-16";

  if (!webglSupported) {
    return (
      <PillSvgTwin
        shape={shape}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        imprint={imprint}
        size={size}
      />
    );
  }

  return (
    <div className="inline-flex flex-col items-center justify-center shrink-0">
      <div
        className={`${containerSizeClass} rounded-full bg-gradient-to-b from-[#FAF8F5] to-[#EFECE6] border ${
          isConfirmed ? "border-[#10B981] ring-2 ring-[#10B981]/30" : "border-[#E2DDD5]"
        } shadow-inner relative overflow-hidden cursor-grab active:cursor-grabbing`}
        title={`Interactive 3D Pill Twin: Drag to rotate ${normalizedShape} (${imprint})`}
      >
        <div aria-hidden="true" className="w-full h-full">
          <Canvas
            dpr={[1, 2]}
            camera={{ position: [0, 0.4, 2.55], fov: 40 }}
            gl={{ antialias: true, alpha: true }}
          >
            <StudioLightingRig shadowY={-0.82} shadowScale={3.5} shadowOpacity={0.24} />
            <ProceduralPillMesh
              shape={normalizedShape}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              isConfirmed={isConfirmed}
              reducedMotion={reducedMotion}
            />
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              rotateSpeed={0.85}
            />
          </Canvas>
        </div>

        {/* Subtle 3D Badge */}
        <span className="absolute bottom-1.5 right-2 px-1.5 py-0.2 rounded-full bg-black/65 text-white font-mono text-[9px] font-bold pointer-events-none">
          3D
        </span>
      </div>

      {/* Imprint + Optional Inspect in 3D Modal Trigger */}
      <div className="mt-1.5 flex items-center gap-1.5">
        <span className="px-2.5 py-0.5 rounded-full bg-[#F8F7F4] border border-[#E2DDD5] text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-700">
          {normalizedShape} • {imprint}
        </span>

        {allowModalInspect && size === "lg" && (
          <button
            type="button"
            onClick={() => setIsInspectModalOpen(true)}
            className="px-2.5 py-0.5 rounded-full bg-white hover:bg-slate-100 border border-[#E2DDD5] text-[11px] font-semibold text-[#0F766E] flex items-center gap-1 shadow-2xs"
            title="Open Large 3D Pill Inspector"
          >
            <Box className="w-3 h-3" />
            <span>Inspect 3D</span>
          </button>
        )}
      </div>

      {/* Large Interactive 3D Pill Studio Modal */}
      {isInspectModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Inspect ${medName || normalizedShape} Pill in 3D`}
        >
          <div className="bg-white rounded-3xl max-w-xl w-full p-7 border border-[#E2DDD5] shadow-2xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E2DDD5]">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#0F766E] font-semibold">
                  INTERACTIVE 3D PILL-BOX TWIN
                </span>
                <h3 className="font-display text-2xl font-bold text-[#111827]">
                  {medName ? `${medName} (${dosage || ""})` : `${normalizedShape} Tablet`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInspectModalOpen(false)}
                className="min-h-[48px] min-w-[48px] rounded-full bg-[#FAF8F5] hover:bg-slate-200 flex items-center justify-center text-[#111827]"
                aria-label="Close 3D Pill Inspector"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              aria-hidden="true"
              className="w-full h-72 rounded-2xl bg-gradient-to-b from-[#FAF8F5] to-[#EFECE6] border border-[#E2DDD5] relative overflow-hidden cursor-grab active:cursor-grabbing"
            >
              <Canvas
                dpr={[1, 2]}
                camera={{ position: [0, 0.45, 2.35], fov: 38 }}
                gl={{ antialias: true, alpha: true }}
              >
                <StudioLightingRig shadowY={-0.85} shadowScale={4.5} shadowOpacity={0.28} />
                <ProceduralPillMesh
                  shape={normalizedShape}
                  primaryColor={primaryColor}
                  secondaryColor={secondaryColor}
                  isConfirmed={isConfirmed}
                  reducedMotion={reducedMotion}
                />
                <OrbitControls
                  enableZoom={false}
                  enablePan={false}
                  rotateSpeed={1.0}
                />
              </Canvas>

              <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-white/90 border border-[#E2DDD5] text-xs font-mono font-semibold text-[#111827]">
                Shape: {normalizedShape} • Imprint Code: {imprint}
              </div>
            </div>

            {instructions && (
              <p className="mt-4 text-lg text-[#111827] leading-relaxed">
                {instructions}
              </p>
            )}

            <div className="mt-5 flex items-center justify-between">
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#0F766E]" />
                Drag with 1 finger or mouse to inspect from any angle
              </span>
              <button
                type="button"
                onClick={() => setIsInspectModalOpen(false)}
                className="min-h-[52px] px-6 py-2.5 rounded-full bg-[#111827] text-white font-display font-semibold text-base"
              >
                Done Inspecting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
