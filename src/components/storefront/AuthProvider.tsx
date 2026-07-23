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

interface AuthState {
  user: AuthUser | null;
  // True while we're confirming a stored session (and fetching the avatar).
  // The provider shows a full-screen branded loader during this window so the
  // navbar never flashes signed-out → person-icon → avatar on a hard load.
  resolving: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, resolving: false });

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [resolving, setResolving] = useState(false);

  // Runs before paint: if a session flag exists we immediately switch into the
  // loading state, so the signed-out SSR markup is never shown to a logged-in
  // user. No hydration mismatch — the server always renders resolving=false and
  // this only flips it on the client.
  useLayoutEffect(() => {
    if (localStorage.getItem("ag_authed")) setResolving(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      const token = localStorage.getItem("ag_authed");
      if (!token) {
        if (!cancelled) { setUser(null); setResolving(false); }
        return;
      }
      setResolving(true);
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
        if (!cancelled) setResolving(false);
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

  return (
    <AuthContext.Provider value={{ user, resolving }}>
      {children}
      {resolving && <AuraLoadingScreen fullScreen />}
    </AuthContext.Provider>
  );
}
