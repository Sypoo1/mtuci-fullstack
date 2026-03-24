import type { CSSProperties } from "react";

// ─── Layout ──────────────────────────────────────────────────────────────────

export const pageWrapper: CSSProperties = {
  padding: "24px 32px",
};

export const pageWrapperNarrow: CSSProperties = {
  padding: "24px 32px",
  maxWidth: "560px",
};

// ─── Typography ──────────────────────────────────────────────────────────────

export const pageTitle: CSSProperties = {
  margin: 0,
};

export const pageSubtitle: CSSProperties = {
  color: "#888",
  margin: "4px 0 0",
  fontSize: "14px",
};

export const breadcrumbs: CSSProperties = {
  fontSize: "13px",
  color: "#888",
  marginBottom: "16px",
};

export const breadcrumbLink: CSSProperties = {
  color: "#888",
};

export const sectionTitle: CSSProperties = {
  marginBottom: "12px",
};

// ─── Buttons ─────────────────────────────────────────────────────────────────

export const btnPrimary: CSSProperties = {
  padding: "8px 16px",
  background: "#1a1a2e",
  color: "#fff",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "14px",
};

export const btnSecondary: CSSProperties = {
  padding: "8px 16px",
  border: "1px solid #ccc",
  background: "#fff",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "14px",
};

export const btnDanger: CSSProperties = {
  padding: "6px 12px",
  border: "1px solid #fca5a5",
  background: "#fee2e2",
  color: "#dc2626",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "13px",
};

export const btnDangerSmall: CSSProperties = {
  padding: "6px 10px",
  border: "1px solid #fca5a5",
  background: "#fee2e2",
  color: "#dc2626",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "13px",
};

// ─── Cards ───────────────────────────────────────────────────────────────────

export const card: CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: "8px",
  padding: "16px",
};

export const cardHighlighted: CSSProperties = {
  border: "2px solid #1a1a2e",
  borderRadius: "8px",
  padding: "20px",
  marginBottom: "24px",
};

export const cardDashed: CSSProperties = {
  border: "2px dashed #ccc",
  borderRadius: "8px",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "#999",
  minHeight: "120px",
};

// ─── Tables ──────────────────────────────────────────────────────────────────

export const table: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "14px",
};

export const tableHeadRow: CSSProperties = {
  background: "#f5f5f5",
};

export const th: CSSProperties = {
  padding: "10px",
  textAlign: "left",
  borderBottom: "1px solid #ddd",
  whiteSpace: "nowrap",
};

export const td: CSSProperties = {
  padding: "10px",
  borderBottom: "1px solid #f0f0f0",
};

// ─── Form ────────────────────────────────────────────────────────────────────

export const formGroup: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

export const label: CSSProperties = {
  display: "block",
  marginBottom: "4px",
  fontSize: "14px",
  fontWeight: 600,
};

export const labelLight: CSSProperties = {
  display: "block",
  marginBottom: "4px",
  fontSize: "14px",
};

export const input: CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #ccc",
  borderRadius: "4px",
  fontSize: "14px",
};

export const hint: CSSProperties = {
  fontSize: "12px",
  color: "#888",
  margin: "4px 0 0",
};

export const errorText: CSSProperties = {
  color: "red",
  fontSize: "14px",
};

// ─── Status badges ───────────────────────────────────────────────────────────

export function statusBadgeStyle(status: string): CSSProperties {
  const isCompleted = status === "completed";
  const isFailed = status === "failed";
  return {
    padding: "2px 8px",
    borderRadius: "12px",
    fontSize: "12px",
    background: isCompleted ? "#dcfce7" : isFailed ? "#fee2e2" : "#fef9c3",
    color: isCompleted ? "#16a34a" : isFailed ? "#dc2626" : "#92400e",
  };
}

export function statusLabel(status: string): string {
  if (status === "completed") return "✓ Завершён";
  if (status === "failed") return "✗ Ошибка";
  return "⟳ Выполняется";
}

// ─── Score color ─────────────────────────────────────────────────────────────

export function scoreColor(score: number): string {
  if (score >= 70) return "#16a34a";
  if (score >= 40) return "#ca8a04";
  return "#dc2626";
}
