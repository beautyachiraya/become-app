import { renderToStaticMarkup } from "react-dom/server";
import TreatmentFormFields from "./TreatmentFormFields";
import {
  emptyTreatmentForm,
  buildNewTreatment,
  buildEditedTreatment,
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
    expect(html).toContain("add to my diary");
    expect(html).not.toContain("promo");
    expect(html).not.toContain("paid");
    expect(html).not.toContain("package type");
  });

  it("keeps the edit form on the same single package type", () => {
    const html = markup({ onCancel: () => {}, submitLabel: "Save Changes" }).toLowerCase();
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
  });
});
