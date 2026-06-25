"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const STEPS = [
  {
    title: "Welcome to Your Studio",
    desc: "Turn any ebook into a beautifully narrated audiobook in minutes",
    targetId: null,
  },
  {
    title: "Upload Your Book",
    desc: "Drag & drop an EPUB, PDF, or TXT file. We'll extract chapters automatically.",
    targetId: "upload-btn",
  },
  {
    title: "Choose Your Voice",
    desc: "Pick from 8 TTS engines — from free Kokoro to premium AI voices. Or add your own via the admin panel.",
    targetId: null,
  },
  {
    title: "Listen & Navigate",
    desc: "Use Space to play/pause, ← → to skip chapters, ? for shortcuts, and the 🌙 sleep timer.",
    targetId: null,
  },
  {
    title: "You're All Set",
    desc: "Upload your first book and start listening",
    targetId: null,
  },
];

export default function WelcomeTour() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const seen = localStorage.getItem("welcomeTourSeen");
    if (!seen) {
      setStep(1);
      setVisible(true);
    }
  }, []);

  const getTargetRect = useCallback((id: string | null): DOMRect | null => {
    if (!id) return null;
    return document.getElementById(id)?.getBoundingClientRect() ?? null;
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleSkip();
      if (e.key === "Enter" && step < 5) handleNext();
      if (e.key === "Enter" && step === 5) handleFinish();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, step]);

  // Scroll lock
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [visible]);

  const handleNext = () => {
    if (step < 5) setStep((s) => s + 1);
  };

  const handleSkip = () => {
    localStorage.setItem("welcomeTourSeen", "skipped");
    setVisible(false);
  };

  const handleFinish = () => {
    localStorage.setItem("welcomeTourSeen", "done");
    setVisible(false);
    router.push("/upload");
  };

  if (!visible || step === 0) return null;

  const s = STEPS[step - 1];
  const isWelcome = step === 1;
  const isCompletion = step === 5;

  // For steps 2-4, find the target element and highlight it
  const targetEl = s.targetId ? document.getElementById(s.targetId) : null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[90]"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        onClick={handleSkip}
      />

      {/* Welcome / Completion full-screen */}
      {(isWelcome || isCompletion) && (
        <div className="fixed inset-0 z-[91] flex items-center justify-center p-6 pointer-events-none">
          <div
            className="pointer-events-auto w-full max-w-sm rounded-2xl p-10 text-center animate-fade-in"
            style={{
              background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {isWelcome ? (
              <>
                <div
                  className="w-[72px] h-[72px] mx-auto mb-5 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #6366f1, #a855f7)",
                    boxShadow: "0 8px 32px rgba(99,102,241,0.4)",
                  }}
                >
                  <span className="text-3xl">🎧</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2" style={{ letterSpacing: "-0.5px" }}>
                  {s.title}
                </h2>
                <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.6)", maxWidth: 320, margin: "0 auto 32px" }}>
                  {s.desc}
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleNext(); }}
                    className="px-7 py-3 rounded-xl text-white font-semibold text-sm border-none cursor-pointer transition-transform active:scale-95"
                    style={{
                      background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                      boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
                    }}
                  >
                    Start Quick Tour
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSkip(); }}
                    className="px-5 py-3 rounded-xl text-sm cursor-pointer border-none transition-opacity hover:opacity-80"
                    style={{ color: "rgba(255,255,255,0.6)", background: "transparent" }}
                  >
                    Skip
                  </button>
                </div>
                <p className="text-xs mt-5" style={{ color: "rgba(255,255,255,0.25)" }}>
                  Takes about 30 seconds
                </p>
              </>
            ) : (
              <>
                <div
                  className="w-[80px] h-[80px] mx-auto mb-5 rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    boxShadow: "0 8px 32px rgba(16,185,129,0.3)",
                  }}
                >
                  <span className="text-4xl text-white font-bold">✓</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2" style={{ letterSpacing: "-0.5px" }}>
                  {s.title}
                </h2>
                <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {s.desc}
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); handleFinish(); }}
                  className="px-8 py-3 rounded-xl text-white font-semibold text-sm border-none cursor-pointer transition-transform active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
                  }}
                >
                  Upload a Book →
                </button>
                <p className="text-xs mt-5" style={{ color: "rgba(255,255,255,0.25)" }}>
                  Replay from Settings → Show Welcome Tour
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mid-tour steps (2-4): tooltip card */}
      {!isWelcome && !isCompletion && (
        <div className="fixed inset-0 z-[91] flex items-center justify-center p-6 pointer-events-none">
          {/* Highlight target element if it exists */}
          {targetEl && (
            <div
              className="fixed z-[91] pointer-events-none rounded-xl animate-fade-in"
              style={{
                left: targetEl.getBoundingClientRect().left - 4,
                top: targetEl.getBoundingClientRect().top - 4,
                width: targetEl.getBoundingClientRect().width + 8,
                height: targetEl.getBoundingClientRect().height + 8,
                border: "2px solid #6366f1",
                boxShadow: "0 0 0 4px rgba(99,102,241,0.3), 0 0 24px rgba(99,102,241,0.2)",
                borderRadius: "14px",
              }}
            />
          )}

          {/* Tooltip card */}
          <div
            className="pointer-events-auto animate-fade-in"
            style={{ maxWidth: "380px", width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="rounded-xl p-5 shadow-2xl"
              style={{
                background: "rgba(255,255,255,0.98)",
                border: "1px solid rgba(255,255,255,0.2)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                  style={{
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  }}
                >
                  {step}
                </div>
                <div className="font-semibold text-gray-900 text-sm">{s.title}</div>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#475569" }}>
                {s.desc}
              </p>

              {!targetEl && step === 3 && (
                <div className="mt-3 flex gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Free: Kokoro</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">Pro: Chatterbox</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">+6 more</span>
                </div>
              )}
              {!targetEl && step === 4 && (
                <div className="mt-3 flex gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200"><kbd className="font-mono">Space</kbd> Play/Pause</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200"><kbd className="font-mono">←→</kbd> Skip</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200"><kbd className="font-mono">?</kbd> Shortcuts</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200">🌙 Sleep Timer</span>
                </div>
              )}
            </div>

            {/* Bottom bar: progress + buttons */}
            <div className="flex items-center justify-between mt-3 px-1">
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      background: i === step ? "#6366f1" : "rgba(255,255,255,0.3)",
                      width: i === step ? "20px" : "8px",
                      borderRadius: i === step ? "4px" : "50%",
                    }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSkip}
                  className="text-xs font-medium cursor-pointer border-none transition-opacity hover:opacity-80"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                >
                  Skip
                </button>
                <button
                  onClick={handleNext}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none transition-transform active:scale-95"
                  style={{
                    background: "white",
                    color: "#0f172a",
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
