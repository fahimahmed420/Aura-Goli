"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Category { id: string; name: string; }
interface Variant { id?: string; color: string; size: string; sku: string; stockQuantity: number; priceModifier: number; }
interface ProductImage { url: string; altText: string; sortOrder: number; }
interface ProductFormData {
  name: string; slug: string; description: string; price: string; compareAtPrice: string;
  categoryId: string; status: string; material: string; careInstructions: string; tags: string;
  variants: Variant[];
  images: ProductImage[];
}

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
const COLORS = ["Black", "White", "Navy", "Grey", "Beige", "Brown", "Red", "Green", "Blue", "Olive", "Cream", "Charcoal"];

function toSlug(str: string) {
  return str.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function slugSuggestions(name: string): string[] {
  if (!name.trim()) return [];
  const base = toSlug(name);
  const words = name.trim().toLowerCase().split(/\s+/);
  const suggestions = new Set<string>();
  suggestions.add(base);
  if (words.length >= 2) suggestions.add(words.slice(0, 2).join("-"));
  suggestions.add(`${base}-clothing`);
  suggestions.add(`ag-${base}`);
  if (words[0]) suggestions.add(words[0]);
  return [...suggestions].filter(Boolean).slice(0, 5);
}

// Compress image to JPEG via canvas before storing as base64
function compressImage(file: File, maxPx = 1200, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function ProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const isEdit = Boolean(productId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showSlugSuggestions, setShowSlugSuggestions] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [form, setForm] = useState<ProductFormData>({
    name: "", slug: "", description: "", price: "", compareAtPrice: "",
    categoryId: "", status: "draft", material: "", careInstructions: "", tags: "",
    variants: [], images: [],
  });

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.categories ?? []));
    if (productId) {
      const token = localStorage.getItem("adminToken");
      fetch(`/api/admin/products/${productId}`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => {
          const p = d.product;
          if (!p) return;
          setForm({
            name: p.name ?? "", slug: p.slug ?? "", description: p.description ?? "",
            price: String(p.price ?? ""), compareAtPrice: String(p.compareAtPrice ?? ""),
            categoryId: p.categoryId ?? "", status: p.status ?? "draft",
            material: p.material ?? "", careInstructions: p.careInstructions ?? "",
            tags: (p.tags ?? []).join(", "),
            variants: (p.variants ?? []).map((v: Variant & { priceModifier?: number }) => ({
              id: v.id, color: v.color ?? "", size: v.size ?? "",
              sku: v.sku ?? "", stockQuantity: v.stockQuantity ?? 0,
              priceModifier: Number(v.priceModifier ?? 0),
            })),
            images: (p.images ?? []).map((img: ProductImage) => ({
              url: img.url, altText: img.altText ?? "", sortOrder: img.sortOrder ?? 0,
            })),
          });
        });
    }
  }, [productId]);

  function setField(field: keyof ProductFormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (field === "name" && !isEdit) {
      setForm((f) => ({ ...f, [field]: value, slug: toSlug(value) }));
      setShowSlugSuggestions(true);
    }
  }

  // ── Images ──────────────────────────────────────────────────
  async function handleImageFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const token = localStorage.getItem("adminToken");

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;
      setUploadingIdx(i);
      try {
        // Compress locally first (reduces upload size), then send to Cloudinary
        const base64 = await compressImage(file);
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ image: base64 }),
        });
        if (!res.ok) throw new Error("Upload failed");
        const { url } = await res.json() as { url: string };
        setForm((f) => ({
          ...f,
          images: [...f.images, { url, altText: file.name.replace(/\.[^.]+$/, ""), sortOrder: f.images.length }],
        }));
      } catch {
        setError(`Failed to upload ${file.name}. Please try again.`);
      }
    }
    setUploadingIdx(null);
  }

  function removeImage(i: number) {
    setForm((f) => ({
      ...f,
      images: f.images.filter((_, idx) => idx !== i).map((img, idx) => ({ ...img, sortOrder: idx })),
    }));
  }

  function addImageUrl() {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setForm((f) => ({
      ...f,
      images: [...f.images, { url: trimmed, altText: "", sortOrder: f.images.length }],
    }));
    setUrlInput("");
  }

  function moveImage(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= form.images.length) return;
    setForm((f) => {
      const imgs = [...f.images];
      [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
      return { ...f, images: imgs.map((img, idx) => ({ ...img, sortOrder: idx })) };
    });
  }

  // ── Variants ─────────────────────────────────────────────────
  function addVariant() {
    setForm((f) => ({
      ...f,
      variants: [...f.variants, { color: "Black", size: "M", sku: "", stockQuantity: 0, priceModifier: 0 }],
    }));
  }
  function updateVariant(i: number, field: keyof Variant, value: string | number) {
    setForm((f) => {
      const variants = [...f.variants];
      variants[i] = { ...variants[i], [field]: value };
      return { ...f, variants };
    });
  }
  function removeVariant(i: number) {
    setForm((f) => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const token = localStorage.getItem("adminToken");
    const body = {
      ...form,
      price: parseFloat(form.price),
      compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : undefined,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    const url = isEdit ? `/api/admin/products/${productId}` : "/api/admin/products";
    const res = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    let data: Record<string, string> = {};
    try { data = await res.json(); } catch { /* empty body */ }
    if (!res.ok) { setError(data.error ?? `Save failed (${res.status})`); setSaving(false); return; }
    router.push("/admin/products");
  }

  const suggestions = slugSuggestions(form.name);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl pb-10">
      {error && (
        <div className="bg-[#ffdad6] border border-[#ba1a1a]/20 px-4 py-3 text-sm text-[#93000a] flex items-center gap-2 rounded-xl">
          <span className="material-symbols-outlined text-base">error</span>{error}
        </div>
      )}

      {/* ── Basic Info ── */}
      <Section title="Basic Information" icon="info">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Product Name" required>
            <input value={form.name} onChange={(e) => setField("name", e.target.value)} required
              className="field-input" placeholder="Oversized Cotton Tee" />
          </Field>
          <Field label="Slug" required hint="URL-friendly identifier">
            <div className="relative">
              <input value={form.slug} onChange={(e) => setField("slug", toSlug(e.target.value))} required
                className="field-input pr-10" placeholder="oversized-cotton-tee"
                onFocus={() => setShowSlugSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSlugSuggestions(false), 150)} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-[#747878]">link</span>
            </div>
            {/* Slug suggestions */}
            {showSlugSuggestions && suggestions.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#747878] mb-1.5">Suggestions</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button key={s} type="button"
                      onClick={() => { setForm((f) => ({ ...f, slug: s })); setShowSlugSuggestions(false); }}
                      className="px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all hover:bg-[#0b0b14] hover:text-white hover:border-[#0b0b14]"
                      style={{ borderColor: "#e8e8e8", color: "#444748" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Field>
        </div>
        <Field label="Description">
          <textarea value={form.description} onChange={(e) => setField("description", e.target.value)}
            rows={4} className="field-input resize-none" placeholder="Describe this product…" />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Field label="Category" required>
            <select value={form.categoryId} onChange={(e) => setField("categoryId", e.target.value)} required className="field-input">
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => setField("status", e.target.value)} className="field-input">
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
          <Field label="Tags">
            <input value={form.tags} onChange={(e) => setField("tags", e.target.value)}
              className="field-input" placeholder="cotton, summer, oversized" />
          </Field>
        </div>
      </Section>

      {/* ── Images ── */}
      <Section title="Product Images" icon="photo_library">
        <div className="space-y-4">
          {/* Upload drop zone */}
          <div
            className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors hover:border-[#0b0b14]"
            style={{ borderColor: "#e8e8e8" }}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleImageFiles(e.dataTransfer.files); }}
          >
            <span className="material-symbols-outlined text-4xl block mb-2" style={{ color: "#c4c7c7" }}>add_photo_alternate</span>
            <p className="text-sm font-semibold text-[#444748]">Click to upload or drag &amp; drop</p>
            <p className="text-[12px] text-[#747878] mt-1">JPG, PNG, WEBP — multiple allowed. First image = cover.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleImageFiles(e.target.files)}
            />
          </div>

          {/* URL input for video or remote image URLs */}
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addImageUrl(); } }}
              placeholder="Or paste a media URL (.jpg, .png, .mp4, .webm…)"
              className="flex-1 rounded-xl px-4 py-2.5 text-[13px] outline-none"
              style={{ border: "1px solid #e8e8e8", background: "#fafafa", color: "#0b0b14" }}
            />
            <button type="button" onClick={addImageUrl}
              className="px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-colors"
              style={{ background: "#0b0b14", color: "#faf7f0" }}>
              Add URL
            </button>
          </div>

          {/* Preview grid */}
          {form.images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {form.images.map((img, i) => (
                <div key={i} className="relative group rounded-xl overflow-hidden border"
                  style={{ aspectRatio: "1", borderColor: i === 0 ? "#c9a84c" : "#e8e8e8", borderWidth: i === 0 ? "2px" : "1px" }}>
                  {/\.(mp4|webm|ogg)$/i.test(img.url) ? (
                    <video src={img.url} muted loop autoPlay playsInline className="w-full h-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.url} alt={img.altText} className="w-full h-full object-cover" />
                  )}

                  {/* Cover badge */}
                  {i === 0 && (
                    <span className="absolute top-1.5 left-1.5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ background: "#c9a84c", color: "#0b0b14" }}>Cover</span>
                  )}

                  {/* Controls overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0}
                        className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center disabled:opacity-30 transition-all">
                        <span className="material-symbols-outlined text-white text-[14px]">arrow_back</span>
                      </button>
                      <button type="button" onClick={() => moveImage(i, 1)} disabled={i === form.images.length - 1}
                        className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center disabled:opacity-30 transition-all">
                        <span className="material-symbols-outlined text-white text-[14px]">arrow_forward</span>
                      </button>
                    </div>
                    <button type="button" onClick={() => removeImage(i)}
                      className="w-7 h-7 rounded-full bg-red-500/80 hover:bg-red-600 flex items-center justify-center transition-all">
                      <span className="material-symbols-outlined text-white text-[14px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}

              {/* Uploading spinner */}
              {uploadingIdx !== null && (
                <div className="rounded-xl border border-dashed border-[#e8e8e8] flex items-center justify-center"
                  style={{ aspectRatio: "1" }}>
                  <div className="w-6 h-6 border-2 border-[#0b0b14] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          )}

          {form.images.length > 0 && (
            <p className="text-[11px] text-[#747878]">
              ← → arrows reorder · first image is the cover · hover to delete
            </p>
          )}
        </div>
      </Section>

      {/* ── Pricing ── */}
      <Section title="Pricing" icon="sell">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Price (৳)" required>
            <input type="number" min="0" step="0.01" value={form.price}
              onChange={(e) => setField("price", e.target.value)} required className="field-input" placeholder="1200" />
          </Field>
          <Field label="Compare at Price (৳)" hint="Shown as strikethrough original price">
            <input type="number" min="0" step="0.01" value={form.compareAtPrice}
              onChange={(e) => setField("compareAtPrice", e.target.value)} className="field-input" placeholder="1500" />
          </Field>
        </div>
      </Section>

      {/* ── Details ── */}
      <Section title="Product Details" icon="straighten">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Material">
            <input value={form.material} onChange={(e) => setField("material", e.target.value)}
              className="field-input" placeholder="100% Supima Cotton" />
          </Field>
          <Field label="Care Instructions">
            <input value={form.careInstructions} onChange={(e) => setField("careInstructions", e.target.value)}
              className="field-input" placeholder="Machine wash cold, tumble dry low" />
          </Field>
        </div>
      </Section>

      {/* ── Variants ── */}
      <Section title="Variants & Stock" icon="category">
        <div className="space-y-3">
          {form.variants.length === 0 && (
            <p className="text-sm text-[#747878] py-2">No variants yet. Add size/colour combinations below.</p>
          )}
          {form.variants.map((v, i) => (
            <div key={i} className="border border-[#e8e8e8] rounded-xl p-4 grid grid-cols-2 md:grid-cols-6 gap-3 items-end"
              style={{ background: "#fafafa" }}>
              <Field label="Color">
                <select value={v.color} onChange={(e) => updateVariant(i, "color", e.target.value)} className="field-input">
                  {COLORS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Size">
                <select value={v.size} onChange={(e) => updateVariant(i, "size", e.target.value)} className="field-input">
                  {SIZES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="SKU" required>
                <input value={v.sku} onChange={(e) => updateVariant(i, "sku", e.target.value)}
                  required className="field-input" placeholder="AG-BLK-M-001" />
              </Field>
              <Field label="Stock">
                <input type="number" min="0" value={v.stockQuantity}
                  onChange={(e) => updateVariant(i, "stockQuantity", parseInt(e.target.value) || 0)}
                  className="field-input" />
              </Field>
              <Field label="+Price (৳)" hint="Added to base price">
                <input type="number" step="0.01" value={v.priceModifier}
                  onChange={(e) => updateVariant(i, "priceModifier", parseFloat(e.target.value) || 0)}
                  className="field-input" />
              </Field>
              <div className="flex justify-end pb-1">
                <button type="button" onClick={() => removeVariant(i)}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-[#ffdad6]"
                  style={{ color: "#ba1a1a" }}>
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={addVariant}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed text-[13px] font-semibold transition-all hover:border-[#0b0b14]"
            style={{ borderColor: "#e8e8e8", color: "#444748" }}>
            <span className="material-symbols-outlined text-lg">add_circle</span>
            Add Variant
          </button>
        </div>
      </Section>

      {/* ── Actions ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="flex items-center justify-center gap-2 px-10 py-3.5 rounded-full text-[13px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
          style={{ background: "#0b0b14", color: "#faf7f0", boxShadow: "0 4px 0 rgba(0,0,0,0.3)" }}>
          {saving
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
            : <><span className="material-symbols-outlined text-[18px]">save</span> {isEdit ? "Update Product" : "Create Product"}</>}
        </button>
        <button type="button" onClick={() => router.push("/admin/products")}
          className="px-10 py-3.5 rounded-full border text-[13px] font-semibold uppercase tracking-wider transition-all"
          style={{ borderColor: "#e8e8e8", color: "#444748" }}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#e8e8e8] rounded-2xl p-6 space-y-5"
      style={{ boxShadow: "0 2px 12px rgba(11,11,20,0.04)" }}>
      <div className="flex items-center gap-3 border-b border-[#f0eeea] pb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(11,11,20,0.05)" }}>
          <span className="material-symbols-outlined text-[18px] text-[#444748]">{icon}</span>
        </div>
        <h3 className="font-['Playfair_Display'] text-[17px] font-semibold text-black">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold text-[#444748] uppercase tracking-wider">
        {label}{required && <span className="text-[#ba1a1a] ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-[#747878]">{hint}</p>}
    </div>
  );
}
