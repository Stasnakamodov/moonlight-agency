"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlowButton } from "@/components/ui/GlowButton";
import { Badge } from "@/components/ui/Badge";
import { calculateProject } from "./calculatorLogic";
import { ArrowLeft, ArrowRight, Send, Calculator, CheckCircle } from "lucide-react";
import type { ProjectType, Feature, Timeline, CalculatorResult } from "@/types/calculator";

const PROJECT_TYPES: ProjectType[] = ["telegram_bot", "web_app", "b2b_platform", "ai_integration"];
const FEATURES: Feature[] = ["auth", "payments", "admin_panel", "analytics", "api_integration", "ai_features", "realtime", "file_storage"];
const TIMELINES: Timeline[] = ["urgent", "normal", "relaxed"];

export function CalculatorForm() {
  const t = useTranslations("calculator");
  const [step, setStep] = useState(1);
  const [projectType, setProjectType] = useState<ProjectType | null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const toggleFeature = (f: Feature) => {
    setFeatures((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  };

  const handleNext = () => {
    if (step === 3 && projectType && timeline) {
      setResult(calculateProject(projectType, features, timeline));
    }
    setStep((s) => Math.min(s + 1, 4));
  };

  const handleSend = async () => {
    if (!result || !projectType || !timeline) return;
    setSending(true);
    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Calculator Lead",
          email: "",
          telegram: "",
          message: `Calculator request:\nProject: ${projectType}\nFeatures: ${features.join(", ")}\nTimeline: ${timeline}\nEstimate: ₽${result.minCost.toLocaleString()} - ₽${result.maxCost.toLocaleString()}`,
        }),
      });
      setSent(true);
    } catch {
      // silently fail
    }
    setSending(false);
  };

  const canNext =
    (step === 1 && projectType) ||
    (step === 2) ||
    (step === 3 && timeline);

  const formatCost = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M ₽`;
    return `${(n / 1000).toFixed(0)}K ₽`;
  };

  return (
    <GlassCard hover={false} className="max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex-1">
            <div className={`h-1 rounded-full transition-colors ${s <= step ? "bg-gradient-to-r from-sky-500 to-violet-500" : "bg-white/10"}`} />
            <p className={`text-xs mt-1 ${s <= step ? "text-white" : "text-slate-500"}`}>
              {t(`step${s}_title`)}
            </p>
          </div>
        ))}
      </div>

      {/* Step 1: Project Type */}
      {step === 1 && (
        <div className="space-y-3">
          {PROJECT_TYPES.map((pt) => (
            <button
              key={pt}
              onClick={() => setProjectType(pt)}
              className={`w-full text-left rounded-xl border p-4 transition-all cursor-pointer ${
                projectType === pt
                  ? "border-sky-500/50 bg-sky-500/10 text-white"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{t(`project_types.${pt}`)}</span>
                {projectType === pt && <CheckCircle size={18} className="text-sky-400" />}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Features */}
      {step === 2 && (
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map((f) => (
            <button
              key={f}
              onClick={() => toggleFeature(f)}
              className={`rounded-xl border p-3 text-sm text-left transition-all cursor-pointer ${
                features.includes(f)
                  ? "border-violet-500/50 bg-violet-500/10 text-white"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{t(`features.${f}`)}</span>
                {features.includes(f) && <CheckCircle size={16} className="text-violet-400" />}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Step 3: Timeline */}
      {step === 3 && (
        <div className="space-y-3">
          {TIMELINES.map((tl) => (
            <button
              key={tl}
              onClick={() => setTimeline(tl)}
              className={`w-full text-left rounded-xl border p-4 transition-all cursor-pointer ${
                timeline === tl
                  ? "border-sky-500/50 bg-sky-500/10 text-white"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{t(`timeline.${tl}`)}</span>
                {timeline === tl && <CheckCircle size={18} className="text-sky-400" />}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Step 4: Result */}
      {step === 4 && result && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 text-center">
              <p className="text-sm text-slate-400 mb-1">{t("result.estimated_cost")}</p>
              <p className="text-2xl font-bold text-sky-300">
                {formatCost(result.minCost)} — {formatCost(result.maxCost)}
              </p>
            </div>
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 text-center">
              <p className="text-sm text-slate-400 mb-1">{t("result.estimated_time")}</p>
              <p className="text-2xl font-bold text-violet-300">
                {result.minWeeks} — {result.maxWeeks} {t("result.weeks_short")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {projectType && <Badge variant="sky">{t(`project_types.${projectType}`)}</Badge>}
            {features.map((f) => (
              <Badge key={f} variant="violet">{t(`features.${f}`)}</Badge>
            ))}
            {timeline && <Badge>{t(`timeline.${timeline}`)}</Badge>}
          </div>

          <p className="text-xs text-slate-500 text-center">{t("result.disclaimer")}</p>

          {sent ? (
            <div className="flex items-center justify-center gap-2 text-emerald-400">
              <CheckCircle size={18} />
              <span>{t("sent")}</span>
            </div>
          ) : (
            <GlowButton onClick={handleSend} disabled={sending} className="w-full" size="lg">
              <Send size={18} />
              {t("send_to_telegram")}
            </GlowButton>
          )}
        </div>
      )}

      {/* Navigation */}
      {step < 4 && (
        <div className="flex justify-between mt-8">
          <GlowButton
            variant="secondary"
            onClick={() => setStep((s) => Math.max(s - 1, 1))}
            disabled={step === 1}
          >
            <ArrowLeft size={16} />
            {t("prev")}
          </GlowButton>
          <GlowButton onClick={handleNext} disabled={!canNext}>
            {t("next")}
            <ArrowRight size={16} />
          </GlowButton>
        </div>
      )}
    </GlassCard>
  );
}
