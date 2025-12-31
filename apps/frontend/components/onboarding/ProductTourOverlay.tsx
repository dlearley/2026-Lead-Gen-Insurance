"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/utils/cn";
import { useOnboardingStore } from "@/stores/onboarding.store";
import { getTourStepsForRole } from "@/lib/onboarding/tours";
import type { OnboardingRole } from "@/lib/onboarding/types";

type HighlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function ProductTourOverlay() {
  const router = useRouter();
  const pathname = usePathname();

  const {
    activeTour,
    setTourStepIndex,
    nextTourStep,
    prevTourStep,
    completeTour,
    skipTour,
  } = useOnboardingStore();

  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [comment, setComment] = useState("");

  const steps = useMemo(() => {
    if (!activeTour) return [];
    return getTourStepsForRole(activeTour.role);
  }, [activeTour]);

  const step = activeTour ? steps[activeTour.stepIndex] : null;

  const recalcTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!activeTour || !step) return;

    if (step.kind === "feedback") {
      setHighlightRect(null);
      setTooltipPos({ top: window.innerHeight / 2 - 160, left: window.innerWidth / 2 - 200 });
      return;
    }

    if (step.path && pathname !== step.path) {
      router.push(step.path);
      return;
    }

    const recalc = () => {
      if (!step.selector) {
        setHighlightRect(null);
        setTooltipPos({ top: window.innerHeight / 2 - 160, left: window.innerWidth / 2 - 200 });
        return;
      }

      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (!el) {
        setHighlightRect(null);
        setTooltipPos({ top: window.innerHeight / 2 - 160, left: window.innerWidth / 2 - 200 });
        return;
      }

      el.scrollIntoView({ block: "center", inline: "center" });

      const rect = el.getBoundingClientRect();
      const padding = 10;

      const highlight: HighlightRect = {
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      };

      setHighlightRect(highlight);

      const tooltipWidth = 420;
      const tooltipHeight = 220;

      const preferredTop = rect.bottom + 12;
      const fallbackTop = rect.top - tooltipHeight - 12;
      const top = preferredTop + tooltipHeight < window.innerHeight
        ? preferredTop
        : fallbackTop > 12
          ? fallbackTop
          : clamp(window.innerHeight / 2 - tooltipHeight / 2, 12, window.innerHeight - tooltipHeight - 12);

      const left = clamp(rect.left, 12, window.innerWidth - tooltipWidth - 12);

      setTooltipPos({ top, left });
    };

    recalc();

    const handle = () => {
      if (recalcTimer.current) {
        window.clearTimeout(recalcTimer.current);
      }
      recalcTimer.current = window.setTimeout(recalc, 50);
    };

    window.addEventListener("resize", handle);
    window.addEventListener("scroll", handle, true);

    return () => {
      window.removeEventListener("resize", handle);
      window.removeEventListener("scroll", handle, true);
      if (recalcTimer.current) {
        window.clearTimeout(recalcTimer.current);
        recalcTimer.current = null;
      }
    };
  }, [activeTour, step, pathname, router]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!activeTour) return;
      if (e.key === "Escape") {
        skipTour(activeTour.role);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTour, skipTour]);

  useEffect(() => {
    if (!activeTour) {
      setHighlightRect(null);
      setTooltipPos(null);
      setRating(5);
      setComment("");
    }
  }, [activeTour]);

  if (!activeTour || !step) return null;

  const totalSteps = steps.length;
  const stepNumber = activeTour.stepIndex + 1;

  const handleBack = () => {
    if (activeTour.stepIndex === 0) return;
    prevTourStep();
  };

  const handleNext = () => {
    nextTourStep(totalSteps);
  };

  const handleComplete = (role: OnboardingRole) => {
    completeTour(role, { rating, comment: comment.trim() || undefined });
  };

  return (
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-secondary-900/50" />

      {highlightRect && (
        <div
          className="absolute rounded-xl border-2 border-primary-400"
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
            boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.6)",
            pointerEvents: "none",
          }}
        />
      )}

      <div
        className={cn(
          "absolute w-[420px] max-w-[calc(100vw-24px)] rounded-xl bg-white shadow-2xl border border-secondary-200",
          "p-4"
        )}
        style={
          tooltipPos
            ? { top: tooltipPos.top, left: tooltipPos.left }
            : { top: 24, left: 24 }
        }
        role="dialog"
        aria-modal="true"
        aria-label="Product tour"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-secondary-500">
              Step {stepNumber} of {totalSteps}
            </p>
            <h3 className="text-lg font-semibold text-secondary-900">{step.title}</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => skipTour(activeTour.role)}
            className="text-secondary-600"
          >
            Skip
          </Button>
        </div>

        <div className="mt-3">
          {step.kind === "feedback" ? (
            <div className="space-y-3">
              <p className="text-sm text-secondary-700">{step.description}</p>

              <div className="flex items-center gap-2">
                {([1, 2, 3, 4, 5] as const).map((v) => (
                  <button
                    key={v}
                    className={cn(
                      "h-9 w-9 rounded-lg border text-sm font-semibold transition-colors",
                      rating === v
                        ? "bg-primary-600 text-white border-primary-600"
                        : "bg-white text-secondary-700 border-secondary-200 hover:bg-secondary-50"
                    )}
                    onClick={() => setRating(v)}
                    type="button"
                    aria-label={`${v} out of 5`}
                  >
                    {v}
                  </button>
                ))}
              </div>

              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Optional: what should we improve?"
                rows={3}
              />

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setTourStepIndex(Math.max(activeTour.stepIndex - 1, 0))}>
                  Back
                </Button>
                <Button onClick={() => handleComplete(activeTour.role)}>Finish</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-secondary-700">{step.description}</p>

              <div className="h-2 rounded-full bg-secondary-100 overflow-hidden">
                <div
                  className="h-full bg-primary-600"
                  style={{ width: `${Math.round((stepNumber / totalSteps) * 100)}%` }}
                />
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={handleBack} disabled={activeTour.stepIndex === 0}>
                  Back
                </Button>

                <Button onClick={handleNext}>{stepNumber === totalSteps ? "Finish" : "Next"}</Button>
              </div>

              <p className="text-xs text-secondary-500">Tip: Press Esc to skip the tour.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
