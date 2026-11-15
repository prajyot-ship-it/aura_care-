"use client";

import React, { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Volume2, Square } from "lucide-react";

interface VoiceReaderButtonProps {
  scriptText: string;
  label?: string;
}

export function VoiceReaderButton({
  scriptText,
  label = "Read My Schedule Aloud",
}: VoiceReaderButtonProps) {
  const shouldReduceMotion = useReducedMotion();
  const [speaking, setSpeaking] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function handleToggleSpeak() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setStatusNote(
        "Voice readout is not available in this browser, displaying text clearly on screen."
      );
      return;
    }

    // RULE-UX-04: Cancel any active utterance before starting a new readout
    window.speechSynthesis.cancel();

    if (speaking) {
      setSpeaking(false);
      setStatusNote(null);
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(scriptText);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.onend = () => {
        setSpeaking(false);
        setStatusNote(null);
      };
      utterance.onerror = () => {
        setSpeaking(false);
        setStatusNote(null);
      };

      setSpeaking(true);
      setStatusNote("Speaking schedule aloud...");
      window.speechSynthesis.speak(utterance);
    } catch {
      setSpeaking(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start">
      <motion.button
        type="button"
        whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
        onClick={handleToggleSpeak}
        className={`min-h-[64px] min-w-[240px] px-7 py-3.5 rounded-full font-display font-semibold text-[20px] flex items-center justify-center gap-3.5 shadow-sm transition-all border ${
          speaking
            ? "bg-[#D97706] text-white border-[#B45309]"
            : "bg-[#111827] hover:bg-slate-800 text-white border-[#111827]"
        }`}
        aria-live="polite"
      >
        {speaking ? (
          <>
            {/* Animated SVG Soundwave Equalizer */}
            <svg
              width="28"
              height="24"
              viewBox="0 0 28 24"
              fill="none"
              aria-hidden="true"
              className="shrink-0"
            >
              {[0, 1, 2, 3, 4].map((barIdx) => (
                <motion.rect
                  key={barIdx}
                  x={barIdx * 6}
                  y={4}
                  width="3.5"
                  rx="1.75"
                  fill="#FFFFFF"
                  animate={
                    shouldReduceMotion
                      ? { height: 14, y: 5 }
                      : {
                          height: [6, 20, 10, 18, 6],
                          y: [9, 2, 7, 3, 9],
                        }
                  }
                  transition={{
                    duration: 0.9,
                    repeat: Infinity,
                    delay: barIdx * 0.12,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </svg>
            <span>Stop Voice Readout</span>
            <Square className="w-5 h-5 fill-current opacity-85" />
          </>
        ) : (
          <>
            <Volume2 className="w-6 h-6 text-[#10B981]" />
            <span>{label}</span>
          </>
        )}
      </motion.button>
      {statusNote && (
        <span className="mt-1.5 text-sm font-mono font-semibold text-[#0F766E] pl-3">
          ● {statusNote}
        </span>
      )}
    </div>
  );
}
