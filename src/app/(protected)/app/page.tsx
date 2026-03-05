"use client";

import { UploadTab } from "@/components/upload-tab";
import { ActionItemsTab } from "@/components/action-items-tab";
import { AskAiTab } from "@/components/ask-ai-tab";
import { LearnerSettingsTab } from "@/components/learner-settings-tab";
import { useAppView } from "@/components/app-shell";

const VIEW_TITLES: Record<string, string> = {
  upload: "Upload",
  "action-items": "Action Items",
  "ask-ai": "Ask AI",
  "learner-settings": "Learner Settings",
};

export default function AppPage() {
  const { activeView } = useAppView();

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

      {activeView === "upload" && <UploadTab />}
      {activeView === "action-items" && <ActionItemsTab />}
      {activeView === "learner-settings" && <LearnerSettingsTab />}
    </div>
  );
}
