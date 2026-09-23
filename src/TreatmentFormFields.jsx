/**
 * Shared fields for New Treatment and Edit Treatment.
 * One package type — no promo or paid choice.
 */
export default function TreatmentFormFields({
  form,
  setForm,
  treatmentTypes,
  frequencies,
  allowCustomName,
  onSubmit,
  isSaving,
  submitLabel,
  onCancel,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
      <div>
        <span className="lbl">How often do you go?</span>
        <select
          className="inp"
          value={form.frequencyLabel}
          onChange={(e) => {
            const match = frequencies.find((item) => item.label === e.target.value);
            setForm({
              ...form,
              frequencyLabel: e.target.value,
              frequency: match ? match.days : 30,
            });
          }}
        >
          {frequencies.map((item) => (
            <option key={item.label}>{item.label}</option>
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
        disabled={!form.totalSessions || !form.clinic || isSaving}
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
