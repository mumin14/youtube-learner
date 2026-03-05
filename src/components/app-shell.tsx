"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";

export type AppView = "upload" | "action-items" | "ask-ai" | "learner-settings";

interface AppViewContextValue {
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  focusFileId: number | null;
  askAboutFile: (fileId: number) => void;
  clearFocusFile: () => void;
}

const AppViewContext = createContext<AppViewContextValue | null>(null);

export function useAppView() {
  const ctx = useContext(AppViewContext);
  if (!ctx) throw new Error("useAppView must be used within AppShell");
  return ctx;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [activeView, setActiveView] = useState<AppView>("upload");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [focusFileId, setFocusFileId] = useState<number | null>(null);

  const askAboutFile = useCallback((fileId: number) => {
    setFocusFileId(fileId);
    setActiveView("ask-ai");
  }, []);

  const clearFocusFile = useCallback(() => {
    setFocusFileId(null);
  }, []);

  return (
    <AppViewContext.Provider value={{ activeView, setActiveView, focusFileId, askAboutFile, clearFocusFile }}>
      <div className="min-h-screen bg-background">
        <div
          onMouseEnter={() => setSidebarExpanded(true)}
          onMouseLeave={() => setSidebarExpanded(false)}
        >
          <AppSidebar expanded={sidebarExpanded} />
        </div>
        <main className="ml-16 min-h-screen">{children}</main>
      </div>
    </AppViewContext.Provider>
  );
}
