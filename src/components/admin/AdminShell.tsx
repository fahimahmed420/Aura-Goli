"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

interface AdminUser { id: string; name: string; email: string; role: string; }

export default function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) { router.replace("/admin/login"); return; }

    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (!d.user || d.user.role !== "admin") {
          localStorage.removeItem("adminToken");
          router.replace("/admin/login");
        } else {
          setAdmin(d.user);
        }
      })
      .catch(() => router.replace("/admin/login"))
      .finally(() => setChecking(false));
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f9f9]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
          <p className="text-[#444748] text-sm">Authenticating…</p>
        </div>
      </div>
    );
  }

  if (!admin) return null;

  return (
    <div className="flex min-h-screen overflow-hidden" style={{ background: "#f9f9f9" }}>
      <Sidebar adminName={admin.name} />
      {/* Main content — push down on mobile for the fixed top bar */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto pt-14 md:pt-0">
        <Topbar title={title} />
        <div className="flex-1 p-4 md:p-8 lg:p-10">{children}</div>
      </main>
    </div>
  );
}
