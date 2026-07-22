import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import ContactForm from "./ContactForm";

export async function generateMetadata(): Promise<Metadata> {
  const { storeName } = await getSettings();
  const name = storeName || "Aura Goli";
  return {
    title: `Contact Us | ${name}`,
    description: `Get in touch with ${name}. We're here to help with orders, returns, product questions, and more.`,
  };
}

export default async function ContactPage() {
  const { storeName, email, phone, address } = await getSettings();
  const name = storeName || "Aura Goli";

  return (
    <div className="min-h-screen bg-canvas">
      <div className="bg-surface border-b border-line px-4 md:px-12 py-16">
        <div className="max-w-5xl mx-auto">
          <p className="dd-eyebrow text-fg-subtle uppercase tracking-widest mb-3">Get in Touch</p>
          <h1 className="dd-display text-4xl md:text-5xl text-fg">
            We&apos;d love to hear from you.
          </h1>
          <p className="mt-3 text-fg-subtle text-sm">{name} — here to help.</p>
        </div>
      </div>
      <ContactForm email={email} phone={phone} address={address} />
    </div>
  );
}
