/** Blank Add Treatment form. Package source (promo or paid) is not collected. */
export function emptyTreatmentForm() {
  return {
    name: "Laser Hair Removal",
    customName: "",
    clinic: "",
    brandUnit: "",
    totalSessions: "",
    frequency: 30,
    frequencyLabel: "Monthly",
    customDays: "",
    expiryDate: "",
    notes: "",
  };
}

export function resolveTreatmentName(form) {
  if (!form) return "";
  return form.name === "Other" ? form.customName : form.name;
}

export function resolveFrequencyDays(form) {
  if (!form) return undefined;
  return form.frequencyLabel === "Custom" ? parseInt(form.customDays, 10) : form.frequency;
}

/**
 * New packages are a single type. kind and source are omitted so a write
 * does not force promo or paid. Existing Firestore fields are left as stored.
 */
export function buildNewTreatment(form, { id, palette } = {}) {
  return {
    id,
    name: resolveTreatmentName(form),
    clinic: form.clinic,
    brandUnit: form.brandUnit,
    totalSessions: parseInt(form.totalSessions, 10),
    frequency: resolveFrequencyDays(form),
    frequencyLabel: form.frequencyLabel,
    expiryDate: form.expiryDate,
    palette,
    notes: form.notes,
    sessions: [],
  };
}

/**
 * A label is shown only when Firestore already stored promo or paid.
 * A missing kind stays unlabeled so a new package is not presented as paid.
 */
export function explicitPackKind(treatment) {
  const kind = treatment && treatment.kind;
  if (kind === "promo" || kind === "paid") return kind;
  return "";
}

/** Edit keeps any stored kind or source. The form no longer asks for either. */
export function buildEditedTreatment(existing, form) {
  return {
    ...existing,
    name: form.name,
    clinic: form.clinic,
    brandUnit: form.brandUnit,
    totalSessions: parseInt(form.totalSessions, 10),
    frequency: resolveFrequencyDays(form),
    frequencyLabel: form.frequencyLabel,
    expiryDate: form.expiryDate,
    notes: form.notes,
  };
}
