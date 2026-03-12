"use client";

import { useState, useRef, useEffect } from "react";
import {
  Upload,
  ClipboardCheck,
  Library,
  MessageCircle,
  Settings,
  ChevronDown,
  CreditCard,
  LogOut,
} from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useAppView, type AppView } from "@/components/app-shell";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_ITEMS: { view: AppView; label: string; icon: typeof Upload }[] = [
  { view: "upload", label: "Upload", icon: Upload },
  { view: "action-items", label: "Action Items", icon: ClipboardCheck },
  { view: "library", label: "Library", icon: Library },
  { view: "ask-ai", label: "Ask AI", icon: MessageCircle },
  { view: "learner-settings", label: "Learner Settings", icon: Settings },
];

interface AppSidebarProps {
  expanded: boolean;
}

export function AppSidebar({ expanded }: AppSidebarProps) {
  const { activeView, setActiveView } = useAppView();
  const { user, loading, logout } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when sidebar collapses
  useEffect(() => {
    if (!expanded) setDropdownOpen(false);
  }, [expanded]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      /* ignore */
    }
    setPortalLoading(false);
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 bg-sidebar border-r border-sidebar-border flex flex-col z-30 transition-all duration-200 overflow-hidden ${
        expanded ? "w-[250px]" : "w-16"
      }`}
    >
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2 h-[60px]">
        {expanded ? (
          <img
            src="/logo.png"
            alt="Socraty AI"
            className="h-7 dark:invert"
          />
        ) : (
          <img
            src="/mascot.png"
            alt="Socraty AI"
            className="w-8 h-8 mx-auto object-contain"
          />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-1">
        {NAV_ITEMS.map(({ view, label, icon: Icon }) => {
          const active = activeView === view;
          return (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              title={expanded ? undefined : label}
              className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-colors ${
                expanded ? "px-3 py-2.5" : "px-0 py-2.5 justify-center"
              } ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              {expanded && <span className="whitespace-nowrap">{label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User profile */}
      {!loading && user && (
        <div className="border-t border-sidebar-border p-2" ref={dropdownRef}>
          <button
            onClick={() => expanded && setDropdownOpen(!dropdownOpen)}
            title={expanded ? undefined : user.name || user.email}
            className={`w-full flex items-center rounded-lg hover:bg-sidebar-accent transition-colors ${
              expanded ? "gap-3 px-2 py-2" : "justify-center py-2"
            }`}
          >
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                className="w-8 h-8 rounded-full shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                {(user.name || user.email)[0].toUpperCase()}
              </div>
            )}
            {expanded && (
              <>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.name || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </>
            )}
          </button>

          {/* Dropdown */}
          {dropdownOpen && expanded && (
            <div className="mt-1 py-1 rounded-lg border border-border bg-popover shadow-lg">
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Theme</span>
                <ThemeToggle />
              </div>
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                {portalLoading ? "Loading..." : "Manage Billing"}
              </button>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
