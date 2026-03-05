"use client";

import { useState, useEffect, useCallback } from "react";

interface SessionUser {
  id: number;
  email: string;
  subscription_status: string;
  current_period_end: string | null;
  name: string | null;
  avatar_url: string | null;
}

export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Not authenticated");
      })
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/session", { method: "DELETE" });
    window.location.href = "/";
  }, []);

  return { user, loading, logout };
}
