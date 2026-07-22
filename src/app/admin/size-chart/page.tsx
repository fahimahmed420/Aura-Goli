"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";

interface SizeChartRow { size: string; chest: string; length: string; shoulder: string; }

const EMPTY_ROW = (): SizeChartRow => ({ size: "", chest: "", length: "", shoulder: "" });

export default function AdminSizeChartPage() {
  const [rows, setRows] = useState<SizeChartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const token = () => typeof window !== "undefined" ? localStorage.getItem("adminToken") ?? "" : "";
  const headers = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/size-chart", { headers: headers() });
      const d = r.ok ? await r.json() : { rows: [] };
      setRows(d.rows ?? []);
    } catch {
      setRows([]);
    }
    setLoading(false);
    // headers() only reads localStorage, so it needs no dependency tracking.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      const r = await fetch("/api/admin/size-chart", {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({ rows }),
      });
      const d = await r.json();
      if (!r.ok) {
        setStatus({ type: "error", msg: d.error ?? "Failed to save" });
      } else {
        setRows(d.rows ?? rows);
        setStatus({ type: "success", msg: "Size chart saved successfully." });
        setTimeout(() => setStatus(null), 3000);
      }
    } catch {
      setStatus({ type: "error", msg: "Network error. Please try again." });
    }
    setSaving(false);
  }

  function updateRow(idx: number, field: keyof SizeChartRow, value: string) {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }

  function deleteRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function addRow() {
    setRows((prev) => [...prev, EMPTY_ROW()]);
  }

  const inputStyle = {
    background: "white",
    border: "1px solid rgba(11,11,20,0.15)",
    borderRadius: "10px",
    color: "var(--canvas)",
    padding: "8px 12px",
    fontSize: "13px",
    outline: "none",
    width: "100%",
    transition: "border-color 0.15s",
  };

  return (
    <AdminShell title="Size Chart">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--canvas)" }}>Size Chart</h1>
            <p className="text-sm mt-0.5" style={{ color: "rgba(11,11,20,0.5)" }}>
              Edit the size guide shown on product pages. Changes apply instantly.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={addRow}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: "rgba(201,168,76,0.12)", color: "var(--warning)", border: "1px solid rgba(201,168,76,0.35)" }}>
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add Row
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              style={{ background: "var(--canvas)", color: "var(--fg)" }}>
              <span className="material-symbols-outlined text-[18px]">{saving ? "hourglass_empty" : "save"}</span>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Status */}
        {status && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5 text-sm font-semibold"
            style={{
              background: status.type === "success" ? "rgba(22,163,74,0.08)" : "rgba(186,26,26,0.08)",
              border: `1px solid ${status.type === "success" ? "rgba(22,163,74,0.3)" : "rgba(186,26,26,0.3)"}`,
              color: status.type === "success" ? "var(--success)" : "var(--danger)",
            }}>
            <span className="material-symbols-outlined text-[18px]">
              {status.type === "success" ? "check_circle" : "error"}
            </span>
            {status.msg}
          </div>
        )}

        {/* Table card */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "white", border: "1px solid rgba(11,11,20,0.1)", boxShadow: "0 1px 4px rgba(11,11,20,0.06)" }}>
          {/* Column headers */}
          <div
            className="grid gap-3 px-5 py-3"
            style={{
              gridTemplateColumns: "1fr 1.5fr 1.5fr 1.5fr 40px",
              borderBottom: "1px solid rgba(11,11,20,0.08)",
              background: "rgba(11,11,20,0.03)",
            }}>
            {["Size", "Chest", "Length", "Shoulder", ""].map((h) => (
              <span
                key={h}
                className="text-[10px] font-bold uppercase tracking-[0.22em]"
                style={{ color: "rgba(11,11,20,0.4)" }}>
                {h}
              </span>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16" style={{ color: "rgba(11,11,20,0.4)" }}>
              <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
              Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="py-20 text-center">
              <span className="material-symbols-outlined text-5xl block mb-2" style={{ color: "rgba(11,11,20,0.15)" }}>straighten</span>
              <p className="text-sm" style={{ color: "rgba(11,11,20,0.4)" }}>No rows yet. Add a row to get started.</p>
            </div>
          ) : (
            <div>
              {rows.map((row, idx) => (
                <div
                  key={idx}
                  className="grid gap-3 px-5 py-3 items-center"
                  style={{
                    gridTemplateColumns: "1fr 1.5fr 1.5fr 1.5fr 40px",
                    borderBottom: idx < rows.length - 1 ? "1px solid rgba(11,11,20,0.06)" : "none",
                    background: idx % 2 === 1 ? "rgba(11,11,20,0.015)" : "transparent",
                  }}>
                  {(["size", "chest", "length", "shoulder"] as const).map((field) => (
                    <input
                      key={field}
                      type="text"
                      value={row[field]}
                      onChange={(e) => updateRow(idx, field, e.target.value)}
                      placeholder={field === "size" ? "e.g. M" : 'e.g. 38–40"'}
                      style={inputStyle}
                      onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--accent)"; }}
                      onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "rgba(11,11,20,0.15)"; }}
                    />
                  ))}
                  <button
                    onClick={() => deleteRow(idx)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg transition-all"
                    style={{ color: "rgba(186,26,26,0.5)" }}
                    title="Delete row"
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(186,26,26,0.08)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--danger)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(186,26,26,0.5)"; }}>
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <p className="mt-4 text-[12px]" style={{ color: "rgba(11,11,20,0.35)" }}>
          Measurements are shown in inches on product pages. Changes are saved to <code style={{ color: "var(--warning)", background: "rgba(201,168,76,0.1)", padding: "1px 5px", borderRadius: "4px" }}>size-chart.json</code> at the project root.
        </p>
      </div>
    </AdminShell>
  );
}
