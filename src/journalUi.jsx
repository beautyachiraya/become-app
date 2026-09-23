/**
 * Home card and detail stats for a Journal treatment.
 * A journal never shows a remaining count, expiry, or Buy more.
 */

export function JournalHomeCard({
  name,
  clinic,
  brandUnit,
  notes,
  icon,
  palette,
  chip,
  lastVisitLabel,
  lastVisitText,
  subline,
  usually,
  onClick,
  className,
}) {
  const p = palette || { bg: "#FDF0F2", accent: "#D4788A" };
  return (
    <div
      className={className || "tcard"}
      data-track-mode="journal"
      style={{ padding: "22px 20px" }}
      onClick={onClick}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flex: 1, minWidth: 0 }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: p.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 20, color: p.accent }}>
            {icon || "✧"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{name}</p>
            <p style={{ fontSize: 12, color: "#9A8A78" }}>{clinic}</p>
            {brandUnit ? <p style={{ fontSize: 11, color: "#B4915F", fontWeight: 500, marginTop: 2 }}>{brandUnit}</p> : null}
            <span className="pill pill-journal" data-testid="journal-chip" style={{ marginTop: 8 }}>{chip}</span>
            {usually ? <p style={{ fontSize: 12, color: "#9A8A78", marginTop: 8 }}>{usually}</p> : null}
            {notes ? <p style={{ fontSize: 11, color: "#C4B8A8", fontStyle: "italic", marginTop: 6 }}>{notes}</p> : null}
          </div>
        </div>
        <div style={{ textAlign: "right", marginLeft: 8, flexShrink: 0, maxWidth: 128 }}>
          <p style={{ fontSize: 9, color: "#C4B8A8", fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>{lastVisitLabel}</p>
          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 400, color: p.accent, lineHeight: 1.2 }}>{lastVisitText}</p>
        </div>
      </div>
      <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${p.accent}20,transparent)`, margin: "16px 0" }} />
      <p style={{ fontSize: 12, color: "#9A8A78" }}>{subline}</p>
    </div>
  );
}

export function JournalDetailStats({ visitCount, lastVisitText, nextSuggestedText, labels, accent }) {
  const cells = [
    { label: labels.visits, value: visitCount },
    { label: labels.lastVisit, value: lastVisitText },
  ];
  if (nextSuggestedText) cells.push({ label: labels.next, value: nextSuggestedText });
  return (
    <div data-testid="journal-stats" style={{ display: "grid", gridTemplateColumns: `repeat(${cells.length},1fr)`, gap: 10, marginTop: 24 }}>
      {cells.map((cell) => (
        <div key={cell.label} className="card" style={{ padding: "14px 10px", textAlign: "center" }}>
          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: typeof cell.value === "number" ? 30 : 15, fontWeight: 400, color: accent || "#B4915F", lineHeight: 1.2 }}>{cell.value}</p>
          <p style={{ fontSize: 10, color: "#9A8A78", fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", marginTop: 4 }}>{cell.label}</p>
        </div>
      ))}
    </div>
  );
}

export function JournalVisitList({
  visits,
  emptyLabel,
  usually,
  nextSuggestedText,
  nextLabel,
  logLabel,
  accent,
  soft,
  isSaving,
  onLog,
  onOpenVisit,
}) {
  return (
    <div data-testid="journal-visits">
      {nextSuggestedText ? (
        <div style={{ background: soft || "#F5EFE6", borderRadius: 20, padding: "20px", border: "1px solid rgba(180,145,95,0.15)", marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: "#8C6E40", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>{nextLabel}</p>
          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 400 }}>{nextSuggestedText}</p>
          {usually ? <p style={{ fontSize: 12, color: "#9A8A78", marginTop: 4 }}>{usually}</p> : null}
        </div>
      ) : null}
      <div className="card" style={{ padding: "8px 18px", marginBottom: 16 }}>
        {(!visits || visits.length === 0) && (
          <p style={{ fontSize: 13, color: "#9A8A78", padding: "16px 0" }}>{emptyLabel}</p>
        )}
        {(visits || []).map((visit, index) => (
          <button
            key={visit.id != null ? visit.id : index}
            type="button"
            onClick={() => onOpenVisit && onOpenVisit(index)}
            style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: index === visits.length - 1 ? "none" : "1px solid rgba(180,145,95,0.1)", padding: "14px 0", cursor: "pointer", fontFamily: "inherit" }}
          >
            <p style={{ fontSize: 14, fontWeight: 600, color: "#1C1612" }}>{visit.dateText}</p>
            {visit.note ? <p style={{ fontSize: 12, color: "#7A6A58", marginTop: 4 }}>{visit.note}</p> : null}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="btn"
        data-testid="log-visit"
        style={{ background: accent || "#B4915F", color: "#FFF", boxShadow: "0 8px 24px rgba(180,145,95,0.28)", marginBottom: 16, fontWeight: 600 }}
        onClick={onLog}
        disabled={isSaving}
      >
        {logLabel}
      </button>
    </div>
  );
}
