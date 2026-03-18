"use client";

import { ActionItemsTab } from "@/components/action-items-tab";
import { LibraryTab } from "@/components/library-tab";
import { AskAiTab } from "@/components/ask-ai-tab";
import { LearnerSettingsTab } from "@/components/learner-settings-tab";
import { CalendarTab } from "@/components/calendar-tab";
import { MyWorkTab } from "@/components/my-work-tab";
import { HomeTab } from "@/components/home-tab";
import { useAppView } from "@/components/app-shell";

const VIEW_TITLES: Record<string, string> = {
  home: "Home",
  "action-items": "Action Items",
  calendar: "Calendar",
  "my-work": "My Work",
  library: "Library",
  "ask-ai": "Ask Socraty",
  "learner-settings": "Learner Settings",
};

export default function AppPage() {
  const { activeView } = useAppView();

  if (activeView === "home") {
    return (
      <div className="px-8 py-8">
        <HomeTab />
      </div>
    );
  }

  if (activeView === "ask-ai") {
    return (
      <div className="flex flex-col h-screen overflow-hidden px-8 py-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-6 shrink-0">
          {VIEW_TITLES[activeView]}
        </h1>
        <div className="flex-1 min-h-0">
          <AskAiTab />
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-6">
        {VIEW_TITLES[activeView]}
      </h1>

      {activeView === "action-items" && <ActionItemsTab />}
      {activeView === "calendar" && <CalendarTab />}
      {activeView === "my-work" && <MyWorkTab />}
      {activeView === "library" && <LibraryTab />}
      {activeView === "learner-settings" && <LearnerSettingsTab />}
    </div>
  );
}
