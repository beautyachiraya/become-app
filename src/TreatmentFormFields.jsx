/**
 * Shared fields for New Treatment and Edit Treatment.
 * Package keeps session count and expiry. Journal is a diary with neither.
 * One package type — no promo or paid choice.
 */
import { switchTrackMode } from "./treatmentForm";

const COPY = {
  package: "Package",
  journal: "Journal",
  helper: "No session count or expiry. Log visits whenever you go — like a diary.",
  howOften: "How often do you go?",
  howOftenOptional: "How often (optional)",
  whenever: "Whenever I go",
};

export default function TreatmentFormFields({
  form,
  setForm,
  treatmentTypes,
  frequencies,
  allowCustomName,
  allowModeSwitch,
  labels,
  onSubmit,
  isSaving,
  submitLabel,
  onCancel,
}) {
  const copy = { ...COPY, ...(labels || {}) };
  const mode = form.trackMode === "journal" ? "journal" : "package";
  const journal = mode === "journal";
  const nameReady = !allowCustomName || form.name !== "Other" || Boolean(form.customName && String(form.customName).trim());
  const clinicReady = Boolean(form.clinic && String(form.clinic).trim());
  const packageReady = Boolean(form.totalSessions) && Boolean(form.clinic);
  const ready = journal ? clinicReady && nameReady : packageReady;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {allowModeSwitch && (
        <div
          role="tablist"
          aria-label="Track mode"
          style={{ display: "flex", background: "#F5EFE6", borderRadius: 50, padding: 4 }}
        >
          {["package", "journal"].map((nextMode) => {
            const selected = mode === nextMode;
            return (
              <button
                key={nextMode}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setForm(switchTrackMode(form, nextMode))}
                style={{
                  flex: 1,
                  border: "none",
                  borderRadius: 50,
                  padding: "10px 12px",
                  background: selected ? "#B4915F" : "transparent",
                  color: selected ? "#FAF7F2" : "#7A6A58",
                  fontWeight: 600,
                  fontSize: 13,
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >
                {nextMode === "package" ? copy.package : copy.journal}
              </button>
            );
          })}
        </div>
      )}
      {journal && (
        <p style={{ fontSize: 13, color: "#7A6A58", lineHeight: 1.55, background: "#F5EFE6", borderRadius: 14, padding: "12px 14px" }}>
          {copy.helper}
        </p>
      )}
      <div>
        <span className="lbl">Treatment type</span>
        <select className="inp" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}>
          {treatmentTypes.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </div>
      {allowCustomName && form.name === "Other" && (
        <div>
          <span className="lbl">Treatment name</span>
          <input
            className="inp"
            placeholder="e.g. Sculptra"
            value={form.customName}
            onChange={(e) => setForm({ ...form, customName: e.target.value })}
          />
        </div>
      )}
      <div>
        <span className="lbl">Clinic / Provider</span>
        <input
          className="inp"
          placeholder="e.g. Glow Clinic Bangkok"
          value={form.clinic}
          onChange={(e) => setForm({ ...form, clinic: e.target.value })}
        />
      </div>
      <div>
        <span className="lbl">Brand, Unit or cc (optional)</span>
        <input
          className="inp"
          placeholder="e.g. Botox 20 units · Juvederm 1cc"
          value={form.brandUnit}
          onChange={(e) => setForm({ ...form, brandUnit: e.target.value })}
        />
      </div>
      {!journal && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <span className="lbl">Total sessions</span>
            <input
              className="inp"
              type="number"
              min="1"
              placeholder="e.g. 6"
              value={form.totalSessions}
              onChange={(e) => setForm({ ...form, totalSessions: e.target.value })}
            />
          </div>
          <div>
            <span className="lbl">Expiry date</span>
            <input
              className="inp"
              type="date"
              value={form.expiryDate}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
            />
          </div>
        </div>
      )}
      <div>
        <span className="lbl">{journal ? copy.howOftenOptional : copy.howOften}</span>
        <select
          className="inp"
          value={journal ? (form.frequencyLabel || "") : form.frequencyLabel}
          onChange={(e) => {
            const value = e.target.value;
            if (value === "") {
              setForm({ ...form, frequencyLabel: "", frequency: null, customDays: "" });
              return;
            }
            const match = frequencies.find((item) => item.label === value);
            setForm({
              ...form,
              frequencyLabel: value,
              frequency: match ? match.days : 30,
            });
          }}
        >
          {journal && <option value="">{copy.whenever}</option>}
          {frequencies.map((item) => (
            <option key={item.label} value={item.label}>{item.label}</option>
          ))}
        </select>
      </div>
      {form.frequencyLabel === "Custom" && (
        <div>
          <span className="lbl">Every how many days?</span>
          <input
            className="inp"
            type="number"
            placeholder="e.g. 45"
            value={form.customDays}
            onChange={(e) => setForm({ ...form, customDays: e.target.value })}
          />
        </div>
      )}
      <div>
        <span className="lbl">Notes (optional)</span>
        <textarea
          className="inp"
          rows={2}
          placeholder="Area treated, units, add-ons..."
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>
      <button
        className="btn btn-c"
        style={{ marginTop: 4 }}
        onClick={onSubmit}
        disabled={!ready || isSaving}
      >
        {isSaving ? "Saving…" : submitLabel}
      </button>
      {onCancel && (
        <button
          onClick={onCancel}
          style={{
            background: "none",
            border: "none",
            color: "#9A8A78",
            fontSize: 13,
            fontFamily: "inherit",
            cursor: "pointer",
            fontWeight: 500,
            padding: "4px 0",
          }}
        >
          Cancel
        </button>
      )}
    </div>
  );
}
