import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import ContactForm from "./ContactForm";

export function generateMetadata(): Metadata {
  const { storeName } = getSettings();
  const name = storeName || "Aura Goli";
  return {
    title: `Contact Us | ${name}`,
    description: `Get in touch with ${name}. We're here to help with orders, returns, product questions, and more.`,
  };
}

export default function ContactPage() {
  const { storeName, email, phone, address } = getSettings();
  const name = storeName || "Aura Goli";

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      <div className="bg-black text-white px-4 md:px-12 py-16">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold text-[#9f97ff] uppercase tracking-widest mb-3">Get in Touch</p>
          <h1 className="font-['Playfair_Display'] text-4xl md:text-5xl font-bold">
            We&apos;d love to hear from you.
          </h1>
          <p className="mt-3 text-white/60 text-sm">{name} — here to help.</p>
        </div>
      </div>
      <ContactForm email={email} phone={phone} address={address} />
    </div>
  );
}
