import { renderToStaticMarkup } from "react-dom/server";
import TreatmentFormFields from "./TreatmentFormFields";
import {
  emptyTreatmentForm,
  buildNewTreatment,
  buildEditedTreatment,
  explicitPackKind,
  switchTrackMode,
} from "./treatmentForm";

const FREQUENCIES = [
  { label: "Monthly", days: 30 },
  { label: "Custom", days: null },
];

function markup(extra = {}) {
  return renderToStaticMarkup(
    <TreatmentFormFields
      form={{ ...emptyTreatmentForm(), ...extra.form }}
      setForm={() => {}}
      treatmentTypes={["Laser Hair Removal", "Other"]}
      frequencies={FREQUENCIES}
      allowCustomName
      allowModeSwitch
      onSubmit={() => {}}
      isSaving={false}
      submitLabel="Add to My Diary"
      {...extra}
    />
  );
}

describe("treatment package form", () => {
  it("asks for one package, with no promo or paid choice", () => {
    const html = markup().toLowerCase();
    expect(html).toContain("treatment type");
    expect(html).toContain("clinic / provider");
    expect(html).toContain("total sessions");
    expect(html).toContain("expiry date");
    expect(html).toContain("add to my diary");
    expect(html).toContain("package");
    expect(html).toContain("journal");
    expect(html).not.toContain("like a diary");
    expect(html).not.toContain("promo");
    expect(html).not.toContain("paid");
    expect(html).not.toContain("package type");
  });

  it("keeps the edit form on the same single package type", () => {
    const html = markup({ onCancel: () => {}, submitLabel: "Save Changes", allowModeSwitch: false }).toLowerCase();
    expect(html).toContain("save changes");
    expect(html).toContain("cancel");
    expect(html).not.toContain("promo");
    expect(html).not.toContain("paid");
    expect(html).not.toContain("package type");
  });
});

describe("new package writes", () => {
  it("omits kind and source", () => {
    const created = buildNewTreatment(
      {
        ...emptyTreatmentForm(),
        clinic: "Glow Clinic",
        totalSessions: "6",
        notes: "Full legs",
      },
      { id: 42, palette: 1 }
    );
    expect(created).toEqual({
      id: 42,
      name: "Laser Hair Removal",
      clinic: "Glow Clinic",
      brandUnit: "",
      trackMode: "package",
      totalSessions: 6,
      frequency: 30,
      frequencyLabel: "Monthly",
      expiryDate: "",
      palette: 1,
      notes: "Full legs",
      sessions: [],
    });
    expect(created.kind).toBeUndefined();
    expect(created.source).toBeUndefined();
  });

  it("uses the custom name and custom interval", () => {
    const created = buildNewTreatment(
      {
        ...emptyTreatmentForm(),
        name: "Other",
        customName: "Sculptra",
        frequencyLabel: "Custom",
        customDays: "45",
        totalSessions: "3",
      },
      { id: 7, palette: 0 }
    );
    expect(created.name).toBe("Sculptra");
    expect(created.frequency).toBe(45);
  });
});

describe("journal create", () => {
  it("stores a diary with no session count, no expiry, and an active status", () => {
    const created = buildNewTreatment(
      switchTrackMode(
        {
          ...emptyTreatmentForm(),
          clinic: "Glow Clinic",
          brandUnit: "Botox 20 units",
          totalSessions: "8",
          expiryDate: "2026-12-31",
          notes: "Forehead",
        },
        "journal"
      ),
      { id: 9, palette: 2 }
    );
    expect(created).toEqual({
      id: 9,
      trackMode: "journal",
      status: "active",
      name: "Laser Hair Removal",
      clinic: "Glow Clinic",
      brandUnit: "Botox 20 units",
      totalSessions: null,
      sessionsTotal: null,
      sessionsRemaining: null,
      expiryDate: null,
      expiresAt: null,
      frequency: null,
      frequencyLabel: null,
      palette: 2,
      notes: "Forehead",
      sessions: [],
    });
    expect(created.kind).toBeUndefined();
    expect(created.source).toBeUndefined();
  });

  it("keeps an optional interval as a soft next-visit suggestion", () => {
    const created = buildNewTreatment(
      {
        ...switchTrackMode(emptyTreatmentForm(), "journal"),
        clinic: "Glow Clinic",
        frequency: 30,
        frequencyLabel: "Monthly",
      },
      { id: 4, palette: 0 }
    );
    expect(created.frequency).toBe(30);
    expect(created.frequencyLabel).toBe("Monthly");
    expect(created.sessionsRemaining).toBeNull();
    expect(created.expiresAt).toBeNull();
  });

  it("asks for treatment and clinic, and hides session count and expiry", () => {
    const html = markup({
      form: {
        ...switchTrackMode(emptyTreatmentForm(), "journal"),
        clinic: "Glow Clinic",
      },
    });
    expect(html).toContain("No session count or expiry. Log visits whenever you go — like a diary.");
    expect(html).toContain("How often (optional)");
    expect(html).toContain("Whenever I go");
    expect(html).not.toContain("Total sessions");
    expect(html).not.toContain("Expiry date");
    expect(html).not.toContain('type="date"');
    expect(html).not.toContain("promo");
    expect(html).not.toContain("paid");
    expect(html).not.toContain("disabled");
  });

  it("will not save a journal without a clinic", () => {
    const html = markup({
      form: switchTrackMode(emptyTreatmentForm(), "journal"),
    });
    expect(html).toContain("disabled");
  });
});

describe("stored package labels", () => {
  it("labels only an explicit promo or paid kind", () => {
    expect(explicitPackKind({ kind: "promo" })).toBe("promo");
    expect(explicitPackKind({ kind: "paid" })).toBe("paid");
    expect(explicitPackKind({})).toBe("");
    expect(explicitPackKind({ kind: "standard" })).toBe("");
    expect(explicitPackKind({ source: "promo" })).toBe("");
  });
});

describe("edited package writes", () => {
  it("keeps a stored kind or source and does not add one when missing", () => {
    const kept = buildEditedTreatment(
      {
        id: 3,
        kind: "promo",
        source: "spring-offer",
        sessions: [{ id: 1, date: "2026-01-01" }],
        palette: 2,
      },
      {
        name: "Botox",
        clinic: "Aesthetic Studio",
        brandUnit: "20 units",
        totalSessions: "3",
        frequency: 90,
        frequencyLabel: "Every 3 months",
        expiryDate: "2026-09-30",
        notes: "Forehead",
      }
    );
    expect(kept.kind).toBe("promo");
    expect(kept.source).toBe("spring-offer");
    expect(kept.sessions).toEqual([{ id: 1, date: "2026-01-01" }]);
    expect(kept.clinic).toBe("Aesthetic Studio");
    expect(kept.totalSessions).toBe(3);

    const fresh = buildEditedTreatment(
      { id: 8, sessions: [] },
      {
        name: "Hydrafacial",
        clinic: "Pure Skin",
        brandUnit: "",
        totalSessions: "4",
        frequency: 30,
        frequencyLabel: "Monthly",
        expiryDate: "",
        notes: "",
      }
    );
    expect(fresh.kind).toBeUndefined();
    expect(fresh.source).toBeUndefined();
    expect(fresh.trackMode).toBeUndefined();
  });

  it("keeps a journal diary nulls when its details change", () => {
    const kept = buildEditedTreatment(
      {
        id: 9,
        trackMode: "journal",
        status: "active",
        sessionsTotal: null,
        sessionsRemaining: null,
        expiresAt: null,
        totalSessions: null,
        expiryDate: null,
        sessions: [{ id: 1, date: "2026-08-01" }],
        palette: 1,
      },
      {
        name: "Botox",
        clinic: "Glow Clinic",
        brandUnit: "20 units",
        totalSessions: "6",
        frequency: 30,
        frequencyLabel: "Monthly",
        expiryDate: "2026-12-31",
        notes: "Forehead",
      }
    );
    expect(kept.trackMode).toBe("journal");
    expect(kept.status).toBe("active");
    expect(kept.totalSessions).toBeNull();
    expect(kept.sessionsTotal).toBeNull();
    expect(kept.sessionsRemaining).toBeNull();
    expect(kept.expiryDate).toBeNull();
    expect(kept.expiresAt).toBeNull();
    expect(kept.frequency).toBe(30);
    expect(kept.sessions).toEqual([{ id: 1, date: "2026-08-01" }]);
    expect(kept.clinic).toBe("Glow Clinic");
  });
});
