"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, ArrowRight } from "lucide-react";

const PROMPT_TEMPLATE = `Based on our previous conversations, analyze how I appear to learn best.

Create a structured learning profile that another AI system could use to teach me effectively.

Make an educated assessment based on patterns you observe in my questions, responses, and interaction style.

Your analysis should include:

- My likely learning style (conceptual, step-by-step, visual, analogy-driven, example-driven, etc.)
- The level of explanation depth I seem to prefer
- Whether I learn better from frameworks, narratives, bullet points, or structured breakdowns
- My tolerance for complexity and abstraction
- Whether I benefit from actionable tasks, exercises, or implementation steps
- Whether I appear to prefer concise answers or deep exploration
- The pace at which information should be delivered
- The types of examples that would help me learn faster
- Any cognitive patterns you observe in how I approach problems
- Recommendations for the most effective teaching style for me

The goal is to produce a teaching profile that another AI tutor could use to personalize instruction for me.

Structure the output clearly so it can be easily interpreted by another AI system.`;

const STEPS = [
  "Copy the prompt template below",
  "Paste it into ChatGPT, Claude, Gemini, or any LLM you've had conversations with",
  "The LLM will analyze your chat history and generate a learning profile",
  "Paste the output back here and save it",
];

interface ImportLlmTabProps {
  onImported: () => void;
}

export function ImportLlmTab({ onImported }: ImportLlmTabProps) {
  const [importText, setImportText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [llmUpdatedAt, setLlmUpdatedAt] = useState<string | null>(null);
  const copyTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    fetch("/api/learner-profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.llmProfileText) {
          setImportText(data.llmProfileText);
          setSaved(true);
        }
        setLlmUpdatedAt(data.llmUpdatedAt);
      })
      .catch(() => {});
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(PROMPT_TEMPLATE);
    setCopied(true);
    if (copyTimeout.current) clearTimeout(copyTimeout.current);
    copyTimeout.current = setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleImport = useCallback(async () => {
    if (saving || !importText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/learner-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ llmProfileText: importText }),
      });
      if (res.ok) {
        setSaved(true);
        setLlmUpdatedAt(new Date().toISOString());
        onImported();
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }, [importText, saving, onImported]);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Import from LLM</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Let another AI analyze your conversation history to build a personalized learning profile.
          This shifts the analytical work to an LLM that already knows how you think and learn.
        </p>
      </div>

      {/* Steps */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">How it works</p>
        <ol className="space-y-2">
          {STEPS.map((step, i) => (
            <li key={i} className="text-sm text-muted-foreground flex items-start gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Prompt template */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Prompt Template</p>
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg gap-1.5"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Prompt
              </>
            )}
          </Button>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
          {PROMPT_TEMPLATE}
        </div>
      </div>

      {/* Paste area */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <ArrowRight className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium">Paste the LLM&apos;s response</p>
        </div>
        <textarea
          value={importText}
          onChange={(e) => {
            setImportText(e.target.value);
            if (saved) setSaved(false);
          }}
          placeholder="Paste the learning profile generated by ChatGPT, Claude, or another LLM here..."
          className="w-full h-56 rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 resize-none transition-all placeholder:text-muted-foreground/40 leading-relaxed"
          disabled={saving}
        />
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {saved && llmUpdatedAt
              ? `Last imported ${new Date(llmUpdatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}. Used alongside your manual profile.`
              : "This will be stored separately from your manual profile. Both are used together."}
          </div>
          <Button
            onClick={handleImport}
            disabled={!importText.trim() || saving || saved}
            size="sm"
            className="rounded-lg"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Importing...
              </span>
            ) : saved ? (
              "Imported"
            ) : (
              "Import Profile"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
