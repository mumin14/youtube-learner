"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import { ImportLlmTab } from "@/components/import-llm-tab";

type SettingsSubTab = "profile" | "import-llm";

const PROMPT_QUESTIONS = [
  "What type of learner are you? (visual, auditory, reading/writing, hands-on)",
  "How do you prefer to learn? (step-by-step, big picture first, examples, etc.)",
  "What are you currently learning or studying?",
  "What stage are you at? (complete beginner, some basics, intermediate, advanced)",
  "What are you trying to achieve with your learning?",
  "Where do you typically get stuck or struggle?",
  "Do you prefer theory first or practical examples first?",
];

export function LearnerSettingsTab() {
  const [profileText, setProfileText] = useState("");
  const [savedText, setSavedText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [subTab, setSubTab] = useState<SettingsSubTab>("profile");

  useEffect(() => {
    fetch("/api/learner-profile")
      .then((r) => r.json())
      .then((data) => {
        setProfileText(data.profileText || "");
        setSavedText(data.profileText || "");
        setSavedAt(data.updatedAt);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/learner-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileText }),
      });
      if (res.ok) {
        setSavedText(profileText);
        setSavedAt(new Date().toISOString());
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }, [profileText, saving]);

  const toggleListening = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }
      if (transcript) {
        setProfileText((prev) => prev + (prev && !prev.endsWith(" ") ? " " : "") + transcript);
      }
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening]);

  const refreshProfile = useCallback(() => {
    fetch("/api/learner-profile")
      .then((r) => r.json())
      .then((data) => {
        setProfileText(data.profileText || "");
        setSavedText(data.profileText || "");
        setSavedAt(data.updatedAt);
      })
      .catch(() => {});
    setSubTab("profile");
  }, []);

  const hasChanges = profileText !== savedText;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded-lg bg-muted/50 animate-pulse" />
        <div className="h-64 rounded-xl bg-muted/50 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Sub-tab navigation */}
      <div className="flex gap-1 border-b border-border">
        {([
          { key: "profile" as const, label: "Your Profile" },
          { key: "import-llm" as const, label: "Import from LLM" },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              subTab === key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === "import-llm" && <ImportLlmTab onImported={refreshProfile} />}

      {subTab === "profile" && <>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Your Learning Profile</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Tell us about yourself as a learner. This information shapes how action items are generated and how the AI assistant responds to you, creating a personalised learning experience.
        </p>
      </div>

      {/* Prompt hints */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Things to include</p>
        <ul className="space-y-1.5">
          {PROMPT_QUESTIONS.map((q, i) => (
            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
              <span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-primary/40" />
              {q}
            </li>
          ))}
        </ul>
      </div>

      {/* Text area */}
      <div className="space-y-2">
        <div className="relative">
          <textarea
          value={profileText}
          onChange={(e) => setProfileText(e.target.value)}
          placeholder="I'm a visual learner who's studying web development. I'm at an intermediate level with JavaScript but just starting with React. I learn best through practical examples and building things. I tend to get stuck when concepts are too abstract without code examples. My goal is to become a full-stack developer within the next 6 months..."
          className="w-full h-56 rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 resize-none transition-all placeholder:text-muted-foreground/40 leading-relaxed"
          disabled={saving || listening}
        />
          <button
            type="button"
            onClick={toggleListening}
            title={listening ? "Stop recording" : "Speak to type"}
            className={`absolute bottom-3 right-3 p-2 rounded-lg transition-colors ${
              listening
                ? "bg-destructive text-destructive-foreground animate-pulse"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            }`}
          >
            {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {savedAt && (
              <span>
                Last saved {new Date(savedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            size="sm"
            className="rounded-lg"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </span>
            ) : hasChanges ? (
              "Save Profile"
            ) : (
              "Saved"
            )}
          </Button>
        </div>
      </div>
      </>}
    </div>
  );
}
