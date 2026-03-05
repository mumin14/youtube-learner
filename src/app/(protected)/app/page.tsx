"use client";

import { UploadTab } from "@/components/upload-tab";
import { ActionItemsTab } from "@/components/action-items-tab";
import { AskAiTab } from "@/components/ask-ai-tab";
import { useAppView } from "@/components/app-shell";

const VIEW_TITLES: Record<string, string> = {
  upload: "Upload",
  "action-items": "Action Items",
  "ask-ai": "Ask AI",
};

export default function AppPage() {
  const { activeView } = useAppView();

  return (
    <div className="px-8 py-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-6">
        {VIEW_TITLES[activeView]}
      </h1>

      {activeView === "upload" && <UploadTab />}
      {activeView === "action-items" && <ActionItemsTab />}
      {activeView === "ask-ai" && <AskAiTab />}
    </div>
  );
}
