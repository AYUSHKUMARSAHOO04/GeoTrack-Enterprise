"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check, Loader2, ArrowRight, RotateCcw, X } from "lucide-react";
import type { AIResponse, ReasoningStep, RichCard } from "./types";
import { generateAIResponse } from "./ai-engine";
import { RichCardRenderer } from "./rich-cards";
import { easeOut } from "./animations";

interface AIResponsePanelProps {
  query: string;
  onReset: () => void;
}

type Phase = "reasoning" | "streaming" | "done";

export function AIResponsePanel({ query, onReset }: AIResponsePanelProps) {
  const [phase, setPhase] = useState<Phase>("reasoning");
  const [steps, setSteps] = useState<ReasoningStep[]>([]);
  const [streamedText, setStreamedText] = useState("");
  const [visibleCards, setVisibleCards] = useState<RichCard[]>([]);
  const responseRef = useRef<AIResponse | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const response = generateAIResponse(query);
    responseRef.current = response;
    setSteps(response.reasoningSteps.map((s) => ({ ...s, status: "pending" as const })));
    setStreamedText("");
    setVisibleCards([]);

    let stepIndex = 0;
    const stepTimer = setInterval(() => {
      stepIndex++;
      setSteps((prev) =>
        prev.map((s, i) => ({
          ...s,
          status: i < stepIndex ? "done" : i === stepIndex ? "active" : "pending",
        }))
      );
      if (stepIndex >= response.reasoningSteps.length) {
        clearInterval(stepTimer);
        setTimeout(() => setPhase("streaming"), 300);
      }
    }, 450);

    return () => clearInterval(stepTimer);
  }, [query]);

  useEffect(() => {
    if (phase !== "streaming" || !responseRef.current) return;
    const fullText = responseRef.current.summary;
    let charIndex = 0;
    const streamTimer = setInterval(() => {
      charIndex += 2;
      setStreamedText(fullText.slice(0, charIndex));
      if (charIndex >= fullText.length) {
        clearInterval(streamTimer);
        const cards = responseRef.current!.cards;
        cards.forEach((card, i) => {
          setTimeout(() => {
            setVisibleCards((prev) => [...prev, card]);
            if (i === cards.length - 1) {
              setTimeout(() => setPhase("done"), 200);
            }
          }, i * 250);
        });
      }
    }, 16);

    return () => clearInterval(streamTimer);
  }, [phase]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [streamedText, visibleCards, steps]);

  const handleRerun = useCallback(() => {
    setPhase("reasoning");
    setStreamedText("");
    setVisibleCards([]);
    const response = generateAIResponse(query);
    responseRef.current = response;
    setSteps(response.reasoningSteps.map((s) => ({ ...s, status: "pending" as const })));

    let stepIndex = 0;
    const stepTimer = setInterval(() => {
      stepIndex++;
      setSteps((prev) =>
        prev.map((s, i) => ({
          ...s,
          status: i < stepIndex ? "done" : i === stepIndex ? "active" : "pending",
        }))
      );
      if (stepIndex >= response.reasoningSteps.length) {
        clearInterval(stepTimer);
        setTimeout(() => setPhase("streaming"), 300);
      }
    }, 450);
  }, [query]);

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/15">
            <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          </div>
          <span className="text-[12px] font-medium text-foreground">AI Operations Copilot</span>
          {responseRef.current && phase === "done" && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
              {responseRef.current.intent}
            </span>
          )}
        </div>
        <button
          onClick={onReset}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="px-4 py-2.5">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted">
            <span className="text-[10px] font-medium text-muted-foreground">Q</span>
          </div>
          <p className="text-[13px] font-medium text-foreground">{query}</p>
        </div>
      </div>

      <div ref={scrollRef} className="max-h-[48vh] overflow-y-auto scrollbar-thin">
        <div className="space-y-3 px-4 pb-3">
          <AnimatePresence mode="wait">
            {phase === "reasoning" && (
              <motion.div
                key="reasoning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-1.5"
              >
                {steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                      {step.status === "done" ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.2, ease: easeOut }}
                        >
                          <Check className="h-3.5 w-3.5 text-success" />
                        </motion.div>
                      ) : step.status === "active" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      ) : (
                        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                      )}
                    </div>
                    <span
                      className={`text-[12px] transition-colors ${
                        step.status === "done"
                          ? "text-muted-foreground"
                          : step.status === "active"
                            ? "font-medium text-foreground"
                            : "text-muted-foreground/60"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {(phase === "streaming" || phase === "done") && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-2.5"
            >
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-500/15">
                <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] leading-relaxed text-foreground">
                  {streamedText}
                  {phase === "streaming" && (
                    <motion.span
                      className="ml-0.5 inline-block h-3.5 w-0.5 rounded-full bg-violet-400 align-middle"
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    />
                  )}
                </p>
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {visibleCards.map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: easeOut }}
              >
                <RichCardRenderer card={card} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {phase === "done" && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2 border-t border-border px-4 py-2.5"
        >
          <button
            onClick={handleRerun}
            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            <RotateCcw className="h-3 w-3" />
            Rerun
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            <ArrowRight className="h-3 w-3" />
            New query
          </button>
        </motion.div>
      )}
    </div>
  );
}
