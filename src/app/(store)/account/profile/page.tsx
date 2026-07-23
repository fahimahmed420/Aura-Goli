"use client";

import { useEffect, useRef, useState } from "react";
import AuraLoadingScreen from "@/components/ui/AuraLoadingScreen";

interface Profile { name: string; email: string; phone: string | null; bio: string | null; }

export default function AccountProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("ag_authed");
    fetch("/api/account/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        setProfile(d.user);
        const parts = (d.user?.name ?? "").split(" ");
        setFirstName(parts[0] ?? "");
        setLastName(parts.slice(1).join(" ") ?? "");
        setPhone(d.user?.phone ?? "");
        setBio(d.user?.bio ?? "");
        if (d.user?.avatarUrl) setAvatarSrc(d.user.avatarUrl);
      })
      .finally(() => setLoading(false));
  }, []);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Compress to JPEG via canvas, max 400×400, quality 0.82 → well under 200KB encoded
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX = 400;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      setAvatarSrc(dataUrl);
    };
    img.src = objectUrl;
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const token = localStorage.getItem("ag_authed");
    const name = [firstName, lastName].filter(Boolean).join(" ");
    const body: Record<string, string> = { name, phone, bio, avatarUrl: avatarSrc ?? "" };
    if (newPassword) { body.currentPassword = currentPassword; body.newPassword = newPassword; }

    const res = await fetch("/api/account/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg({ type: "success", text: "Profile updated successfully." });
      setCurrentPassword(""); setNewPassword("");
      window.dispatchEvent(new Event("user-updated"));
    } else {
      setMsg({ type: "error", text: data.error ?? "Failed to update profile." });
    }
    setSaving(false);
  }

  if (loading) {
    return <AuraLoadingScreen />;
  }

  const initials = [firstName[0], lastName[0]].filter(Boolean).join("").toUpperCase() || "U";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="dd-display text-[28px] text-fg">Profile Details</h2>
        <p className="text-fg-muted text-[14px] mt-1">Manage your personal information and account settings.</p>
      </div>

      <form onSubmit={saveProfile} className="space-y-6">
        {/* Avatar upload */}
        <div className="bg-surface rounded-2xl border border-line p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-28 h-28 rounded-full overflow-hidden bg-accent-tint flex items-center justify-center">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="dd-display text-4xl text-accent">{initials}</span>
                )}
              </div>
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-accent flex items-center justify-center hover:bg-accent-hover transition-colors">
                <span className="material-symbols-outlined text-accent-fg text-[16px]">photo_camera</span>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="text-[13px] font-medium text-fg underline hover:no-underline">Upload new</button>
              {avatarSrc && (
                <button type="button" onClick={() => { setAvatarSrc(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="text-[13px] font-medium underline hover:no-underline">Remove</button>
              )}
            </div>
          </div>
        </div>

        {/* Personal info */}
        <div className="bg-surface rounded-2xl border border-line p-8 space-y-6">
          <h3 className="font-medium text-fg text-[16px]">Personal Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="border-b border-line pb-2">
              <label className="block text-[11px] font-medium text-fg-muted uppercase tracking-wider mb-1">First Name</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)}
                className="w-full border-0 outline-none text-[15px] text-fg bg-transparent placeholder:text-fg-subtle"
                placeholder="First name" required />
            </div>
            <div className="border-b border-line pb-2">
              <label className="block text-[11px] font-medium text-fg-muted uppercase tracking-wider mb-1">Last Name</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)}
                className="w-full border-0 outline-none text-[15px] text-fg bg-transparent placeholder:text-fg-subtle"
                placeholder="Last name" />
            </div>
            <div className="border-b border-line pb-2">
              <label className="block text-[11px] font-medium text-fg-muted uppercase tracking-wider mb-1">Email</label>
              <input value={profile?.email ?? ""} disabled
                className="w-full border-0 outline-none text-[15px] text-fg-subtle bg-transparent cursor-not-allowed" />
            </div>
            <div className="border-b border-line pb-2">
              <label className="block text-[11px] font-medium text-fg-muted uppercase tracking-wider mb-1">Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full border-0 outline-none text-[15px] text-fg bg-transparent placeholder:text-fg-subtle"
                placeholder="+880 1XXX-XXXXXX" />
            </div>
          </div>
          <div className="border-b border-line pb-2">
            <label className="block text-[11px] font-medium text-fg-muted uppercase tracking-wider mb-1">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2}
              className="w-full border-0 outline-none text-[15px] text-fg bg-transparent resize-none placeholder:text-fg-subtle"
              placeholder="Tell us a little about yourself..." />
          </div>
          {msg && (
            <div className={`text-sm px-4 py-3 rounded-xl ${msg.type === "success" ? "" : ""}`}
              style={msg.type === "success" ? { background: "var(--success-tint)", color: "var(--success)" } : { background: "var(--danger-tint)", color: "var(--danger)" }}>
              {msg.text}
            </div>
          )}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" className="px-6 py-2.5 border border-line rounded-full text-[13px] font-medium text-fg-muted hover:border-line-strong transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 bg-accent text-accent-fg rounded-full text-[13px] font-medium hover:bg-accent-hover transition-opacity disabled:opacity-50">
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Security card */}
        <div className="bg-surface rounded-2xl border border-line p-8 space-y-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-accent">lock</span>
            <h3 className="font-medium text-fg text-[16px]">Security</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="border-b border-line pb-2">
              <label className="block text-[11px] font-medium text-fg-muted uppercase tracking-wider mb-1">Current Password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full border-0 outline-none text-[15px] text-fg bg-transparent placeholder:text-fg-subtle"
                placeholder="Enter current password" />
            </div>
            <div className="border-b border-line pb-2">
              <label className="block text-[11px] font-medium text-fg-muted uppercase tracking-wider mb-1">New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8}
                className="w-full border-0 outline-none text-[15px] text-fg bg-transparent placeholder:text-fg-subtle"
                placeholder="Min 8 characters" />
            </div>
          </div>
          <p className="text-[12px] text-fg-subtle">Leave blank to keep your current password.</p>
        </div>
      </form>
    </div>
  );
}
