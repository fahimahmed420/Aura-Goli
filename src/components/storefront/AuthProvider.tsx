"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useState } from "react";
import { fetchCurrentUser } from "@/lib/client-auth";
import AuraLoadingScreen from "@/components/ui/AuraLoadingScreen";

export interface AuthUser {
  id?: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role?: string;
}

// Three distinct states, not a boolean — "haven't checked yet" and
// "confirmed logged out" must never collapse into the same falsy value.
// A consumer that reacts to "not logged in" (e.g. redirecting to /login)
// has to be able to tell those two apart, or it fires during the brief
// window before the session check has even started.
type AuthStatus = "idle" | "resolving" | "done";

interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
}

const AuthContext = createContext<AuthState>({ user: null, status: "idle" });

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("idle");

  // Runs before paint: if a session flag exists, move to "resolving" so the
  // React-rendered full-screen loader below is already up by the time the
  // browser paints the first client-rendered frame. (The very first paint —
  // the raw server HTML, before any JS has run — is instead covered by the
  // blocking inline script + #boot-auth-loader in layout.tsx; this hands off
  // from that with the same visual, no gap.)
  useLayoutEffect(() => {
    if (localStorage.getItem("ag_authed")) setStatus("resolving");
  }, []);

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      const token = localStorage.getItem("ag_authed");
      if (!token) {
        if (!cancelled) { setUser(null); setStatus("done"); }
        return;
      }
      setStatus("resolving");
      try {
        const r = await fetchCurrentUser(token);
        if (cancelled) return;
        if (r.ok) {
          const d = await r.json();
          setUser(d.user);
        } else {
          localStorage.removeItem("ag_authed");
          setUser(null);
        }
      } catch {
        /* offline — keep whatever we have rather than falsely signing out */
      } finally {
        if (!cancelled) setStatus("done");
      }
    };

    resolve();
    // Login, logout, OAuth callback and profile edits all dispatch this event.
    window.addEventListener("user-updated", resolve);
    return () => {
      cancelled = true;
      window.removeEventListener("user-updated", resolve);
    };
  }, []);

  // Hand off to real content once resolved — hides the pre-hydration static
  // loader (it's a no-op if the flag was never set, i.e. the attribute was
  // never applied in the first place).
  useEffect(() => {
    if (status === "done") document.documentElement.removeAttribute("data-auth-pending");
  }, [status]);

  return (
    <AuthContext.Provider value={{ user, status }}>
      {children}
      {status === "resolving" && <AuraLoadingScreen fullScreen />}
    </AuthContext.Provider>
  );
}
