"use client";

import { useState } from "react";

interface Props {
  email: string;
  phone: string;
  address: string;
}

export default function ContactForm({ email, phone, address }: Props) {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to send. Please try again.");
      } else {
        setSent(true);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const contacts = [
    email    && { icon: "email",       label: "Email",  value: email,   href: `mailto:${email}` },
    phone    && { icon: "phone",       label: "Phone",  value: phone,   href: `tel:${phone}` },
    address  && { icon: "location_on", label: "Studio", value: address, href: null },
    { icon: "schedule", label: "Hours", value: "Sun–Thu, 10am – 6pm", href: null },
  ].filter(Boolean) as { icon: string; label: string; value: string; href: string | null }[];

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-12 py-16 grid grid-cols-1 md:grid-cols-2 gap-16">
      {/* Contact info */}
      <div>
        <h2 className="font-['Playfair_Display'] text-2xl font-bold text-black mb-8">Contact Information</h2>
        <ul className="space-y-6">
          {contacts.map((c) => (
            <li key={c.label} className="flex items-start gap-4">
              <span className="material-symbols-outlined text-2xl text-[#5951b4] mt-0.5">{c.icon}</span>
              <div>
                <p className="text-xs font-semibold text-[#444748] uppercase tracking-wider mb-0.5">{c.label}</p>
                {c.href ? (
                  <a href={c.href} className="text-sm text-black hover:text-[#5951b4] transition-colors">{c.value}</a>
                ) : (
                  <p className="text-sm text-black">{c.value}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Form */}
      <div>
        {sent ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
            <span className="material-symbols-outlined text-5xl text-green-600 mb-4 block"
              style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <h3 className="font-['Playfair_Display'] text-2xl font-bold text-black mb-2">Message Sent!</h3>
            <p className="text-[#444748]">We&apos;ll get back to you within 24 hours.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#444748] uppercase tracking-wider mb-1.5">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                  className="w-full border border-[#e8e8e8] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#5951b4] transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#444748] uppercase tracking-wider mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required
                  className="w-full border border-[#e8e8e8] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#5951b4] transition-colors" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#444748] uppercase tracking-wider mb-1.5">Subject</label>
              <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required
                className="w-full border border-[#e8e8e8] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#5951b4] bg-white">
                <option value="">Select a topic…</option>
                <option>Order Enquiry</option>
                <option>Return / Exchange</option>
                <option>Product Question</option>
                <option>Wholesale</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#444748] uppercase tracking-wider mb-1.5">Message</label>
              <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required rows={5}
                className="w-full border border-[#e8e8e8] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#5951b4] resize-none" />
            </div>
            {error && (
              <div className="rounded-xl px-4 py-3 text-sm bg-[#ffdad6] border border-[#ba1a1a]/20 text-[#ba1a1a]">
                {error}
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full bg-black text-white py-4 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-[#5951b4] transition-colors disabled:opacity-50">
              {loading ? "Sending…" : "Send Message"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
