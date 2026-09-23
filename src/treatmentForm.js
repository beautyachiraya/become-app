/** Blank Add Treatment form. Package source (promo or paid) is not collected. */
export function emptyTreatmentForm() {
  return {
    trackMode: "package",
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

/** Toggle between a counted package and a no-expiry journal. */
export function switchTrackMode(form, trackMode) {
  const current = form || emptyTreatmentForm();
  if (trackMode === "journal") {
    return {
      ...current,
      trackMode: "journal",
      totalSessions: "",
      expiryDate: "",
      frequency: null,
      frequencyLabel: "",
      customDays: "",
    };
  }
  return {
    ...current,
    trackMode: "package",
    frequency: 30,
    frequencyLabel: "Monthly",
    customDays: "",
  };
}

function journalInterval(form) {
  if (!form || !form.frequencyLabel) return null;
  if (form.frequencyLabel === "Custom") {
    const typed = parseInt(form.customDays, 10);
    if (Number.isFinite(typed) && typed > 0) {
      return { frequency: typed, frequencyLabel: "Custom" };
    }
    return null;
  }
  const days = Number(form.frequency);
  if (!Number.isFinite(days) || days <= 0) return null;
  return { frequency: days, frequencyLabel: form.frequencyLabel };
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
  if (form && form.trackMode === "journal") {
    const interval = journalInterval(form);
    return {
      id,
      trackMode: "journal",
      status: "active",
      name: resolveTreatmentName(form),
      clinic: form.clinic,
      brandUnit: form.brandUnit || "",
      totalSessions: null,
      sessionsTotal: null,
      sessionsRemaining: null,
      expiryDate: null,
      expiresAt: null,
      frequency: interval ? interval.frequency : null,
      frequencyLabel: interval ? interval.frequencyLabel : null,
      palette,
      notes: form.notes || "",
      sessions: [],
    };
  }
  return {
    id,
    trackMode: "package",
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
  if (existing && existing.trackMode === "journal") {
    const interval = journalInterval(form);
    const keptCustom = form
      && form.frequencyLabel === "Custom"
      && !interval
      && existing.frequencyLabel === "Custom"
      && existing.frequency
      ? { frequency: existing.frequency, frequencyLabel: "Custom" }
      : null;
    const nextInterval = interval || keptCustom;
    return {
      ...existing,
      trackMode: "journal",
      status: existing.status === "removed" ? "removed" : "active",
      name: form.name,
      clinic: form.clinic,
      brandUnit: form.brandUnit,
      totalSessions: null,
      sessionsTotal: null,
      sessionsRemaining: null,
      expiryDate: null,
      expiresAt: null,
      frequency: nextInterval ? nextInterval.frequency : null,
      frequencyLabel: nextInterval ? nextInterval.frequencyLabel : null,
      notes: form.notes,
    };
  }
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
