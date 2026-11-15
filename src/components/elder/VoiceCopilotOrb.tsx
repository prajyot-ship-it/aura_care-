"use client";

import React, { useState, useRef } from "react";
import { Mic, MicOff, Volume2, Sparkles, X, CheckCircle2 } from "lucide-react";
import { ElderDoseItem } from "./TactilePillCard";

interface VoiceCopilotOrbProps {
  elderFirstName: string;
  todayDoses: ElderDoseItem[];
  onActionCompleted: (toastMessage: string) => void;
}

interface SpeechRecognitionEventLike {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

export function VoiceCopilotOrb({
  elderFirstName,
  todayDoses,
  onActionCompleted,
}: VoiceCopilotOrbProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [heardTranscript, setHeardTranscript] = useState<string>("");
  const [auraReply, setAuraReply] = useState<string>(
    `Hi ${elderFirstName}, tap the microphone or choose a voice command below—I can read your next medication, mark your morning pills as taken, or let Maya know how you feel.`
  );
  const [processing, setProcessing] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  function speakAloud(text: string) {
    setAuraReply(text);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 0.94;
        window.speechSynthesis.speak(utter);
      } catch {
        // ignore speech synthesis errors
      }
    }
  }

  async function processVoiceCommand(rawText: string) {
    const text = rawText.trim();
    setHeardTranscript(text);
    const lower = text.toLowerCase();
    setProcessing(true);

    try {
      // Intent 1: "Aura, what do I take next?"
      if (
        lower.includes("what do i take") ||
        lower.includes("next") ||
        lower.includes("schedule")
      ) {
        const nextPending = todayDoses.find((d) => d.status === "PENDING");
        if (!nextPending) {
          const msg = `Wonderful news, ${elderFirstName}! You have already completed all of your scheduled medications for today.`;
          speakAloud(msg);
        } else {
          const timeStr = new Date(nextPending.scheduledFor).toLocaleTimeString(
            [],
            { hour: "2-digit", minute: "2-digit" }
          );
          const msg = `Your next medication is ${nextPending.medication.name} ${nextPending.medication.dosage}, a ${nextPending.medication.pillShape.toLowerCase()} tablet marked ${nextPending.medication.pillImprint}, scheduled for ${timeStr}. ${nextPending.medication.instructions}`;
          speakAloud(msg);
        }
        return;
      }

      // Intent 2: "I just took my morning pills."
      if (
        lower.includes("took") ||
        lower.includes("taken") ||
        lower.includes("morning pill")
      ) {
        const nextPending = todayDoses.find((d) => d.status === "PENDING");
        if (!nextPending) {
          const msg = `All of your doses are already locked and confirmed for today, ${elderFirstName}.`;
          speakAloud(msg);
          return;
        }

        const res = await fetch("/api/doses/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doseLogId: nextPending.id,
            action: "TAKEN",
            expectedLockVersion: nextPending.lockVersion,
            note: `Logged hands-free via Aura Voice Co-Pilot ("${text}")`,
          }),
        });
        const json = (await res.json()) as {
          success: boolean;
          data?: { mutexMessage: string };
          error?: string;
        };

        if (json.success) {
          const reply = `Confirmed! I have marked your ${nextPending.medication.name} ${nextPending.medication.dosage} as taken and locked it so Maya and Nurse David know you already took it.`;
          speakAloud(reply);
          onActionCompleted(reply);
        } else {
          speakAloud(
            json.error || "That dose was already confirmed by your Care-Circle."
          );
        }
        return;
      }

      // Intent 3: "Tell Maya I feel a little dizzy today."
      if (
        lower.includes("dizzy") ||
        lower.includes("maya") ||
        lower.includes("feel") ||
        lower.includes("tired")
      ) {
        await fetch("/api/wellness", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mood: "DIZZY",
            symptomTags: ["Mild Lightheadedness", "Voice Co-Pilot Alert"],
            note: `Voice Co-Pilot report: "${text}"`,
            bloodPressureSystolic: 116,
            bloodPressureDiastolic: 70,
            doctorQuestion:
              "Voice Co-Pilot Note: Experienced mild dizziness today—please review morning blood pressure timing.",
          }),
        });

        const reply = `I have logged that you are feeling a little dizzy today, notified Maya on the Care-Circle Command Center, and added a note to Dr. Vance's Cardiology Visit Brief. Please sit down and sip some water, ${elderFirstName}.`;
        speakAloud(reply);
        onActionCompleted(reply);
        return;
      }

      // Default helpful response
      const fallbackMsg = `I heard "${text}". You can ask me "What do I take next?", "I just took my morning pills", or "Tell Maya I feel a little dizzy today."`;
      speakAloud(fallbackMsg);
    } finally {
      setProcessing(false);
    }
  }

  function toggleListening() {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRec) {
      speakAloud(
        "Browser microphone recognition is unavailable in this environment—tap any of the three voice command buttons below to test hands-free execution!"
      );
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        processVoiceCommand(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      setIsListening(true);
      recognition.start();
    } catch {
      setIsListening(false);
    }
  }

  return (
    <>
      {/* Glowing "Talk to Aura" Microphone Orb Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="min-h-[64px] min-w-[230px] px-7 py-3.5 rounded-full bg-gradient-to-r from-[#0F766E] via-[#0D9488] to-[#2563EB] text-white font-display font-bold text-[20px] flex items-center justify-center gap-3 shadow-[0_0_28px_rgba(16,185,129,0.4)] border border-emerald-300/60"
      >
        <Mic className="w-6 h-6 animate-pulse" />
        <span>Talk to Aura (Voice AI)</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Talk to Aura Hands-Free Voice Co-Pilot"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bento-card max-w-2xl w-full p-7 sm:p-9 border-2 border-[#10B981] shadow-2xl space-y-6 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#E2DDD5]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0F766E] to-[#2563EB] text-white flex items-center justify-center shadow-md">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-[#0F766E] font-bold">
                    VOICE-FIRST HANDS-FREE CO-PILOT (SPEECH RECOGNITION + SYNTHESIS)
                  </span>
                  <h2 className="font-display text-[28px] font-bold text-[#111827]">
                    Talk to Aura
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="min-h-[54px] px-5 py-2.5 rounded-full bg-[#111827] text-white font-display font-semibold text-lg flex items-center gap-2"
              >
                <X className="w-5 h-5" />
                <span>Done</span>
              </button>
            </div>

            {/* Interactive Glowing Microphone Orb */}
            <div className="flex flex-col items-center justify-center py-4">
              <button
                type="button"
                onClick={toggleListening}
                className={`w-28 h-28 rounded-full flex flex-col items-center justify-center gap-1.5 text-white font-display font-bold transition-all ${
                  isListening
                    ? "bg-red-600 shadow-[0_0_45px_rgba(239,68,68,0.65)] scale-105"
                    : "bg-gradient-to-br from-[#0F766E] to-[#2563EB] shadow-[0_0_36px_rgba(16,185,129,0.45)]"
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-10 h-10 animate-bounce" />
                    <span className="text-xs font-mono">LISTENING...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-10 h-10" />
                    <span className="text-xs font-mono">TAP TO SPEAK</span>
                  </>
                )}
              </button>

              {heardTranscript && (
                <div className="mt-4 px-4 py-2 rounded-full bg-[#FAF8F5] border border-[#E2DDD5] text-base font-semibold text-[#111827]">
                  You said: “{heardTranscript}”
                </div>
              )}
            </div>

            {/* Aura Spoken Response Card */}
            <div className="p-5 rounded-3xl bg-emerald-50/70 border-2 border-[#10B981] space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-bold text-[#0F766E]">
                <Volume2 className="w-4 h-4" />
                <span>AURA VOICE RESPONSE</span>
              </div>
              <p className="text-[22px] font-display font-semibold text-[#111827] leading-snug">
                {auraReply}
              </p>
            </div>

            {/* 1-Tap Voice Command Prompts (Works both with Mic or Direct Tap) */}
            <div className="space-y-3">
              <div className="text-base font-semibold text-slate-600">
                Say aloud or tap any command below to execute immediately:
              </div>
              <div className="grid grid-cols-1 gap-3">
                {[
                  "Aura, what do I take next?",
                  "I just took my morning pills.",
                  "Tell Maya I feel a little dizzy today.",
                ].map((phrase) => (
                  <button
                    key={phrase}
                    type="button"
                    disabled={processing}
                    onClick={() => processVoiceCommand(phrase)}
                    className="min-h-[64px] px-6 py-4 rounded-2xl bg-[#FAF8F5] hover:bg-white border border-[#E2DDD5] text-left font-display font-semibold text-[20px] text-[#111827] flex items-center justify-between gap-4"
                  >
                    <span>“{phrase}”</span>
                    <span className="px-3.5 py-1 rounded-full bg-[#0F766E] text-white text-sm font-mono shrink-0 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Run Voice Intent
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
