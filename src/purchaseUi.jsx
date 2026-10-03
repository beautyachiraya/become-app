/**
 * Purchase list and Buy again sheet for a session package.
 * Rendered on the package detail page, under the session timeline —
 * not as a tab beside Aftercare. Journals do not use this.
 */

export function PurchaseHistorySection({
  title,
  subtitle,
  note,
  emptyLabel,
  rows,
  buyLabel,
  onBuyAgain,
  disabled,
}) {
  const list = rows || [];
  return (
    <div data-testid="purchase-history" style={{ marginTop: 8 }}>
      <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{title}</p>
      <p style={{ fontSize: 12, color: "#9A8A78", marginBottom: note ? 8 : 14, lineHeight: 1.5 }}>{subtitle}</p>
      {note ? (
        <p data-testid="purchase-derived-note" style={{ fontSize: 12, color: "#9A8A78", lineHeight: 1.55, marginBottom: 14 }}>
          {note}
        </p>
      ) : null}
      {list.length === 0 ? (
        <p data-testid="purchase-empty" style={{ fontSize: 13, color: "#9A8A78", textAlign: "center", padding: "8px 0 16px" }}>
          {emptyLabel}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          {list.map((row) => (
            <div key={row.key} className="card" data-testid="purchase-row" style={{ padding: "16px 18px" }}>
              <p style={{ fontSize: 14, fontWeight: 600 }}>{row.title}</p>
              <p style={{ fontSize: 12, color: "#9A8A78", marginTop: 2 }}>{row.meta}</p>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        className="btn btn-g"
        data-testid="buy-again"
        onClick={onBuyAgain}
        disabled={disabled}
      >
        {buyLabel}
      </button>
    </div>
  );
}

export function BuyAgainSheet({
  name,
  clinic,
  sessions,
  expiryDate,
  hint,
  labels,
  isSaving,
  onChange,
  onSave,
  onClose,
}) {
  const add = parseInt(sessions, 10);
  const ready = Number.isFinite(add) && add >= 1;
  return (
    <div
      className="mbg"
      data-testid="buy-again-sheet"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div className="msheet">
        <div className="mhandle" />
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 30, fontWeight: 400, marginBottom: 4 }}>
          {labels.title}
        </h2>
        <p style={{ fontSize: 13, color: "#9A8A78", marginBottom: 24 }}>{name} · {clinic}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <span className="lbl">{labels.sessions}</span>
            <input
              className="inp"
              data-testid="buy-again-sessions"
              type="number"
              min="1"
              placeholder={labels.sessionsPlaceholder}
              value={sessions}
              onChange={(e) => onChange({ sessions: e.target.value, expiryDate })}
            />
          </div>
          <div>
            <span className="lbl">{labels.expiry}</span>
            <input
              className="inp"
              data-testid="buy-again-expiry"
              type="date"
              value={expiryDate}
              onChange={(e) => onChange({ sessions, expiryDate: e.target.value })}
            />
            {hint ? (
              <p style={{ fontSize: 12, color: "#9A8A78", marginTop: 8, lineHeight: 1.5 }}>{hint}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="btn btn-c"
            data-testid="buy-again-save"
            style={{ marginTop: 4 }}
            onClick={onSave}
            disabled={!ready || isSaving}
          >
            {isSaving ? labels.saving : labels.save}
          </button>
        </div>
      </div>
    </div>
  );
}
