"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { HeartPulse, MessageSquarePlus, Check, Plus } from "lucide-react";
import { WellnessMood } from "@/lib/types";

interface MoodCheckInProps {
  primaryPhysician: string;
  existingQuestions: string[];
  onCompleted: (message: string) => void;
}

const SYMPTOM_TILES: Array<{
  mood: WellnessMood;
  emoji: string;
  label: string;
  sublabel: string;
  defaultNote: string;
}> = [
  {
    mood: "GREAT",
    emoji: "😊",
    label: "Feeling Great",
    sublabel: "Steady energy today",
    defaultNote: "Steady energy and feeling comfortable today.",
  },
  {
    mood: "OKAY",
    emoji: "🙂",
    label: "Doing Okay",
    sublabel: "Normal daily comfort",
    defaultNote: "Feeling normal and managing routine well.",
  },
  {
    mood: "DIZZY",
    emoji: "💫",
    label: "A Little Dizzy",
    sublabel: "Lightheaded standing up",
    defaultNote: "Felt lightheaded when standing up.",
  },
  {
    mood: "NAUSEOUS",
    emoji: "🤢",
    label: "Upset Stomach",
    sublabel: "Mild stomach discomfort",
    defaultNote: "Mild stomach discomfort after medication.",
  },
];

const QUICK_DOCTOR_QUESTIONS = [
  "Ask Dr. Vance if Lisinopril is making me dizzy in the morning.",
  "Can I take my evening cholesterol pill with dinner instead of 9:00 PM?",
  "Should I keep taking Vitamin D3 during the summer months?",
];

export function MoodCheckIn({
  primaryPhysician,
  existingQuestions,
  onCompleted,
}: MoodCheckInProps) {
  const shouldReduceMotion = useReducedMotion();
  const [selectedMood, setSelectedMood] = useState<WellnessMood | null>(null);
  const [showQuestionPad, setShowQuestionPad] = useState(false);
  const [customQuestion, setCustomQuestion] = useState("");
  const [submittingMood, setSubmittingMood] = useState(false);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const doctorShort = primaryPhysician.split("(")[0].trim();

  async function handleTapMood(tile: (typeof SYMPTOM_TILES)[number]) {
    setSubmittingMood(true);
    setSelectedMood(tile.mood);
    try {
      const res = await fetch("/api/wellness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mood: tile.mood,
          note: tile.defaultNote,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { message: string };
      };
      if (json.success && json.data) {
        setStatusMessage(`Logged: "${tile.label}"`);
        onCompleted(json.data.message);
      }
    } finally {
      setSubmittingMood(false);
    }
  }

  async function handleAddQuestion(textToSave: string) {
    const trimmed = textToSave.trim();
    if (!trimmed) return;
    setSubmittingQuestion(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_QUESTION",
          question: trimmed,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { message: string };
      };
      if (json.success && json.data) {
        setCustomQuestion("");
        setStatusMessage(json.data.message);
        onCompleted(json.data.message);
      }
    } finally {
      setSubmittingQuestion(false);
    }
  }

  return (
    <section
      aria-label="One-Tap Symptom and Doctor Question Strip"
      className="mt-12 space-y-6"
    >
      <div className="bento-card p-7 sm:p-9">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#0F766E]/10 text-[#0F766E] flex items-center justify-center">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display text-[28px] sm:text-[32px] font-semibold text-[#111827]">
                One-Tap Daily Check-In &amp; Doctor Notes
              </h2>
              <p className="text-[20px] text-slate-600">
                Tap any tile to log how you feel or add a question for {doctorShort}:
              </p>
            </div>
          </div>

          {statusMessage && (
            <div className="px-4 py-2 rounded-full bg-emerald-50 border border-[#10B981] text-[#0F766E] font-semibold text-[18px] flex items-center gap-2">
              <Check className="w-5 h-5" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>

        {/* Horizontal Tactile Strip (5 Tiles: 4 Mood/Symptom Tiles + 1 Add Question for Dr. Vance Tile) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {SYMPTOM_TILES.map((tile) => {
            const active = selectedMood === tile.mood;
            return (
              <motion.button
                key={tile.mood}
                type="button"
                whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                disabled={submittingMood}
                onClick={() => handleTapMood(tile)}
                className={`min-h-[88px] min-w-[140px] p-5 rounded-2xl text-left transition-all border flex flex-col justify-between ${
                  active
                    ? "bg-[#0F766E] text-white border-[#0F766E] shadow-sm"
                    : "bg-[#FAF8F5] hover:bg-white text-[#111827] border-[#E2DDD5]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{tile.emoji}</span>
                  {active && <Check className="w-5 h-5" />}
                </div>
                <div className="mt-3">
                  <div className="font-display text-[20px] font-semibold leading-snug">
                    {tile.label}
                  </div>
                  <div
                    className={`text-sm mt-0.5 ${
                      active ? "text-emerald-100" : "text-slate-500"
                    }`}
                  >
                    {tile.sublabel}
                  </div>
                </div>
              </motion.button>
            );
          })}

          {/* 5th Tile: Add Question for Dr. Vance */}
          <motion.button
            type="button"
            whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
            onClick={() => setShowQuestionPad((prev) => !prev)}
            className={`min-h-[88px] min-w-[160px] p-5 rounded-2xl text-left transition-all border flex flex-col justify-between ${
              showQuestionPad
                ? "bg-[#2563EB] text-white border-[#2563EB]"
                : "bg-blue-50/70 hover:bg-blue-50 text-[#111827] border-blue-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <MessageSquarePlus
                className={`w-6 h-6 ${
                  showQuestionPad ? "text-white" : "text-[#2563EB]"
                }`}
              />
              <Plus className="w-5 h-5 opacity-75" />
            </div>
            <div className="mt-3">
              <div className="font-display text-[20px] font-semibold leading-snug">
                Add Question for {doctorShort}
              </div>
              <div
                className={`text-sm mt-0.5 ${
                  showQuestionPad ? "text-blue-100" : "text-slate-600"
                }`}
              >
                {existingQuestions.length} saved on brief
              </div>
            </div>
          </motion.button>
        </div>

        {/* Expandable Doctor Question Pad */}
        <AnimatePresence>
          {showQuestionPad && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-6 pt-6 border-t border-[#E2DDD5] space-y-5">
                <div>
                  <h3 className="font-display text-[22px] font-semibold text-[#111827] mb-3">
                    Tap a common question or type your own for {doctorShort}:
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {QUICK_DOCTOR_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        disabled={submittingQuestion}
                        onClick={() => handleAddQuestion(q)}
                        className="min-h-[68px] text-left p-4 rounded-2xl bg-[#FAF8F5] hover:bg-blue-50/60 border border-[#E2DDD5] text-[#111827] font-medium text-[18px] leading-snug transition-colors"
                      >
                        + “{q}”
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <input
                    type="text"
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    placeholder={`Write a question for ${doctorShort}...`}
                    className="flex-1 min-h-[64px] px-5 py-3 rounded-2xl border border-[#E2DDD5] bg-[#FAF8F5] text-[20px] text-[#111827]"
                  />
                  <button
                    type="button"
                    disabled={submittingQuestion || !customQuestion.trim()}
                    onClick={() => handleAddQuestion(customQuestion)}
                    className="min-h-[64px] min-w-[180px] px-7 py-3 rounded-2xl bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white font-display font-semibold text-[20px]"
                  >
                    Save to Visit Brief
                  </button>
                </div>

                {existingQuestions.length > 0 && (
                  <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#E2DDD5]">
                    <div className="text-[18px] font-semibold text-[#111827] mb-2">
                      Questions Queued for Your Next Visit ({existingQuestions.length}):
                    </div>
                    <ul className="space-y-1.5 text-[18px] text-slate-700 list-disc pl-6">
                      {existingQuestions.map((q, idx) => (
                        <li key={idx}>“{q}”</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
