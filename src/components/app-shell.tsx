"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { ErrorBoundary } from "@/components/error-boundary";
import { TrialBanner } from "@/components/trial-banner";

export type AppView = "home" | "action-items" | "calendar" | "my-work" | "library" | "ask-ai" | "learner-settings";

interface AppViewContextValue {
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  focusFileId: number | null;
  initialPrompt: string | null;
  askAboutFile: (fileId: number) => void;
  askAboutActionItem: (fileId: number, prompt: string) => void;
  clearFocusFile: () => void;
  clearInitialPrompt: () => void;
}

const AppViewContext = createContext<AppViewContextValue | null>(null);

export function useAppView() {
  const ctx = useContext(AppViewContext);
  if (!ctx) throw new Error("useAppView must be used within AppShell");
  return ctx;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [activeView, setActiveView] = useState<AppView>("home");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [focusFileId, setFocusFileId] = useState<number | null>(null);
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null);

  const askAboutFile = useCallback((fileId: number) => {
    setFocusFileId(fileId);
    setActiveView("ask-ai");
  }, []);

  const askAboutActionItem = useCallback((fileId: number, prompt: string) => {
    setFocusFileId(fileId);
    setInitialPrompt(prompt);
    setActiveView("ask-ai");
  }, []);

  const clearFocusFile = useCallback(() => {
    setFocusFileId(null);
  }, []);

  const clearInitialPrompt = useCallback(() => {
    setInitialPrompt(null);
  }, []);

  return (
    <AppViewContext.Provider value={{ activeView, setActiveView, focusFileId, initialPrompt, askAboutFile, askAboutActionItem, clearFocusFile, clearInitialPrompt }}>
      <div className="min-h-screen bg-background">
        <TrialBanner />
        <div
          onMouseEnter={() => setSidebarExpanded(true)}
          onMouseLeave={() => setSidebarExpanded(false)}
        >
          <AppSidebar expanded={sidebarExpanded} />
        </div>
        <main className="ml-16 min-h-screen">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </AppViewContext.Provider>
  );
}
