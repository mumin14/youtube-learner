"use client";

import { useState } from "react";
import { useSession } from "@/hooks/use-session";

export function TrialBanner() {
  const { user, loading } = useSession();
  const [dismissed, setDismissed] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  if (loading || !user || dismissed) return null;
  if (user.subscription_status !== "trialing") return null;
  if (!user.current_period_end) return null;

  const endDate = new Date(user.current_period_end);
  const now = new Date();
  const msLeft = endDate.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // silent fail
    }
    setPortalLoading(false);
  };

  let bgClass: string;
  let textClass: string;
  let message: string;

  if (daysLeft === 0) {
    bgClass = "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900";
    textClass = "text-red-800 dark:text-red-200";
    message =
      "Your trial ends today. You will be charged unless you cancel now.";
  } else if (daysLeft <= 2) {
    bgClass =
      "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900";
    textClass = "text-amber-800 dark:text-amber-200";
    message = `Your trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. You will be charged unless you cancel.`;
  } else {
    bgClass =
      "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900";
    textClass = "text-blue-800 dark:text-blue-200";
    message = `You have ${daysLeft} days left in your free trial.`;
  }

  return (
    <div
      className={`flex items-center justify-between gap-4 px-4 py-2.5 border-b text-sm ${bgClass}`}
    >
      <p className={`font-medium ${textClass}`}>{message}</p>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={openPortal}
          disabled={portalLoading}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
            daysLeft <= 2
              ? "bg-white border-current hover:bg-gray-50"
              : "bg-white/80 border-blue-300 hover:bg-white dark:bg-white/10 dark:border-blue-700 dark:hover:bg-white/20"
          } ${textClass}`}
        >
          {portalLoading ? "Loading..." : "Manage subscription"}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className={`p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 ${textClass}`}
          aria-label="Dismiss"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M3 3l8 8M11 3l-8 8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
