import { useMemo, useState } from "react";
import { clinicsFromRows, filterHistoryRows, normalizeSource } from "./packageLedger";

export function SourceBadge({ source, labelPromo = "Promo", labelPaid = "Paid" }) {
  const kind = normalizeSource(source);
  if (!kind) return null;
  const promo = kind === "promo";
  return (
    <span
      className={`pill ${promo ? "pill-promo" : "pill-paid"}`}
      data-source={kind}
    >
      {promo ? labelPromo : labelPaid}
    </span>
  );
}

export default function HistoryScreen({
  rows = [],
  t,
  onOpenSession,
  onOpenPackage,
  onBuyMore,
}) {
  const [kind, setKind] = useState("all");
  const [clinic, setClinic] = useState("all");
  const clinics = useMemo(() => clinicsFromRows(rows), [rows]);
  const visible = useMemo(() => filterHistoryRows(rows, { kind, clinic }), [rows, kind, clinic]);
  const label = (key, fallback) => (t && t(key)) || fallback;

  return (
    <div style={{ paddingBottom: 100 }} data-page="history">
      <div style={{
        background: "linear-gradient(160deg,#EDE5D8,#F5EFE6,#FAF7F2)",
        padding: "calc(60px + env(safe-area-inset-top)) 24px 28px",
        borderRadius: "0 0 32px 32px",
        borderBottom: "1px solid rgba(180,145,95,0.12)",
      }}>
        <p style={{ fontSize: 11, color: "#B4915F", fontWeight: 600, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 10 }}>
          {label("history_kicker", "Archive")}
        </p>
        <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 36, fontWeight: 300, lineHeight: 1.1 }}>
          {label("history_tab", "History")}
        </h1>
        <p style={{ fontSize: 13, color: "#9A8A78", marginTop: 10, lineHeight: 1.55 }}>
          {label("history_lede", "Finished sessions and packages, kept in one place.")}
        </p>
      </div>

      <div style={{ padding: "20px 20px 0" }}>
        <div className="tabs" style={{ marginBottom: 12 }} role="tablist" aria-label={label("history_filters", "History filters")}>
          {[
            { key: "all", copy: label("filter_all", "All") },
            { key: "sessions", copy: label("filter_sessions", "Sessions") },
            { key: "packages", copy: label("filter_packages", "Packages") },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`t ${kind === tab.key ? "on" : ""}`}
              onClick={() => setKind(tab.key)}
            >
              {tab.copy}
            </button>
          ))}
        </div>

        {clinics.length > 1 && (
          <div style={{ marginBottom: 16 }}>
            <span className="lbl">{label("filter_clinic", "Clinic")}</span>
            <select className="inp" value={clinic} onChange={(e) => setClinic(e.target.value)}>
              <option value="all">{label("all_clinics", "All clinics")}</option>
              {clinics.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        )}

        {visible.length === 0 && (
          <div className="card" style={{ padding: "48px 24px", textAlign: "center" }} data-empty="history">
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 300, color: "#9A8A78", fontStyle: "italic", marginBottom: 10 }}>
              {label("history_empty_title", "No history yet.")}
            </p>
            <p style={{ fontSize: 13, color: "#C4B8A8", lineHeight: 1.6 }}>
              {label("history_empty", "No history yet. When you finish a session or a package, it shows up here.")}
            </p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {visible.map((row) => {
            const isPackage = row.kind === "package";
            return (
              <div
                key={row.id}
                className="card"
                data-kind={row.kind}
                data-package-id={row.packageId}
                data-status={row.status || ""}
                onClick={() => {
                  if (isPackage) onOpenPackage && onOpenPackage(row);
                  else onOpenSession && onOpenSession(row);
                }}
                style={{ padding: "16px 18px", cursor: "pointer" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 10, fontWeight: 600, color: "#9A8A78", letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 6 }}>
                      {isPackage ? label("package_finished", "Package finished") : label("session_used", "Session used")}
                    </p>
                    <p style={{ fontSize: 15, fontWeight: 600, color: "#1C1612", marginBottom: 4 }}>{row.title}</p>
                    <p style={{ fontSize: 12, color: "#9A8A78" }}>{row.meta}</p>
                    {row.subline && (
                      <p style={{ fontSize: 12, color: "#C4B8A8", marginTop: 6, fontStyle: row.kind === "session" ? "italic" : "normal" }}>
                        {row.kind === "session" && row.note ? row.subline : row.kind === "session" ? label("one_session", "1 session") : row.subline}
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                    <SourceBadge
                      source={row.source}
                      labelPromo={label("promo", "Promo")}
                      labelPaid={label("paid", "Paid")}
                    />
                    {isPackage && row.status === "expired" && (
                      <span className="pill pill-danger">{label("expired", "Expired")}</span>
                    )}
                    {isPackage && row.status === "used_up" && (
                      <span className="pill pill-done">{label("used_up", "Used up")}</span>
                    )}
                  </div>
                </div>
                {isPackage && row.status === "used_up" && (
                  <button
                    type="button"
                    className="btn btn-g"
                    style={{ marginTop: 14 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onBuyMore && onBuyMore(row);
                    }}
                  >
                    {label("buy_more", "Buy more")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
