"use client";

import { useSession } from "@/hooks/use-session";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

export function SubscriptionBanner() {
  const { user, loading, logout } = useSession();
  const [portalLoading, setPortalLoading] = useState(false);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Could not open billing portal. Please try again.");
      }
    } catch {
      alert("Could not open billing portal. Please try again.");
    }
    setPortalLoading(false);
  };

  if (loading || !user) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt=""
            className="w-6 h-6 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
            {(user.name || user.email)[0].toUpperCase()}
          </div>
        )}
        <span className="text-xs text-muted-foreground truncate max-w-[140px]">
          {user.name || user.email}
        </span>
      </div>
      <ThemeToggle />
      <button
        onClick={openPortal}
        disabled={portalLoading}
        className="text-xs px-3 py-1.5 rounded-lg border border-border/60 bg-card/60 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
      >
        {portalLoading ? "Loading..." : "Manage"}
      </button>
      <button
        onClick={logout}
        className="text-xs px-3 py-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
