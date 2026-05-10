// =============================================================================
// FHIR R4 / ABDM mapping tables
// =============================================================================
// Static lookups used by the FHIR Bundle exporter to attach proper coding
// metadata to clinical fields. All systems and codes are taken from the
// ABDM OPConsultRecord profile published by NRCES (nrces.in/ndhm/fhir/r4).
// =============================================================================

export const SYSTEM = {
  abhaNumber: "https://healthid.ndhm.gov.in",
  abhaAddress: "https://healthid.abdm.gov.in",
  hpr: "https://doctor.ndhm.gov.in",
  loinc: "http://loinc.org",
  snomed: "http://snomed.info/sct",
  icd10: "http://hl7.org/fhir/sid/icd-10",
  ucum: "http://unitsofmeasure.org",
  v3ActCode: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
  v3RoleCode: "http://terminology.hl7.org/CodeSystem/v3-RoleCode",
  conditionVerStatus:
    "http://terminology.hl7.org/CodeSystem/condition-ver-status",
  conditionClinical:
    "http://terminology.hl7.org/CodeSystem/condition-clinical",
  observationCategory:
    "http://terminology.hl7.org/CodeSystem/observation-category",
  composition: "http://snomed.info/sct",
} as const;

// FHIR Composition.type — LOINC 11488-4 = "Consult note"
export const COMPOSITION_TYPE = {
  system: SYSTEM.loinc,
  code: "11488-4",
  display: "Consult note",
};

// Sex (M/F/O) → FHIR administrative-gender code
export function fhirGender(sex: "M" | "F" | "O" | null | undefined): string {
  if (sex === "M") return "male";
  if (sex === "F") return "female";
  if (sex === "O") return "other";
  return "unknown";
}

// Compute a FHIR-shaped birthDate. If we have a real birthdate column use it;
// else derive YYYY from age relative to the visit date so the Patient resource
// still validates against the OPConsultRecord profile (birthDate is 1..1).
export function deriveBirthDate(
  patientBirthdate: string | null | undefined,
  age: number | null | undefined,
  asOf: Date = new Date(),
): string {
  if (patientBirthdate && /^\d{4}-\d{2}-\d{2}/.test(patientBirthdate)) {
    return patientBirthdate.slice(0, 10);
  }
  if (typeof age === "number" && age >= 0 && age < 150) {
    const year = asOf.getUTCFullYear() - Math.round(age);
    return `${year}-01-01`;
  }
  // Last-resort fallback so the resource still validates.
  return `${asOf.getUTCFullYear()}-01-01`;
}

// LOINC + UCUM coding for each vital we capture.
export const VITAL_CODES = {
  bp_systolic: {
    loinc: "8480-6",
    display: "Systolic blood pressure",
    unit: "mm[Hg]",
    unitDisplay: "mmHg",
  },
  bp_diastolic: {
    loinc: "8462-4",
    display: "Diastolic blood pressure",
    unit: "mm[Hg]",
    unitDisplay: "mmHg",
  },
  pulse: {
    loinc: "8867-4",
    display: "Heart rate",
    unit: "/min",
    unitDisplay: "/min",
  },
  temperature_f: {
    loinc: "8310-5",
    display: "Body temperature",
    unit: "[degF]",
    unitDisplay: "°F",
  },
  spo2: {
    loinc: "59408-5",
    display: "Oxygen saturation in arterial blood by pulse oximetry",
    unit: "%",
    unitDisplay: "%",
  },
  weight_kg: {
    loinc: "29463-7",
    display: "Body weight",
    unit: "kg",
    unitDisplay: "kg",
  },
} as const;

// Indian shorthand → FHIR Timing structure (when + frequency + period).
// Returned shape is what FHIR R4 dosageInstruction[].timing expects.
export function frequencyToTiming(
  frequency: string | null | undefined,
): { code?: { text: string }; repeat?: { frequency: number; period: number; periodUnit: "h" | "d" } } | undefined {
  if (!frequency) return undefined;
  const f = frequency.trim().toUpperCase().replace(/\./g, "");
  const map: Record<string, { frequency: number; period: number; periodUnit: "h" | "d" }> = {
    OD: { frequency: 1, period: 1, periodUnit: "d" },
    QD: { frequency: 1, period: 1, periodUnit: "d" },
    BD: { frequency: 2, period: 1, periodUnit: "d" },
    BID: { frequency: 2, period: 1, periodUnit: "d" },
    TDS: { frequency: 3, period: 1, periodUnit: "d" },
    TID: { frequency: 3, period: 1, periodUnit: "d" },
    QID: { frequency: 4, period: 1, periodUnit: "d" },
    QDS: { frequency: 4, period: 1, periodUnit: "d" },
    HS: { frequency: 1, period: 1, periodUnit: "d" },
    SOS: { frequency: 1, period: 1, periodUnit: "d" },
    PRN: { frequency: 1, period: 1, periodUnit: "d" },
    Q4H: { frequency: 1, period: 4, periodUnit: "h" },
    Q6H: { frequency: 1, period: 6, periodUnit: "h" },
    Q8H: { frequency: 1, period: 8, periodUnit: "h" },
    Q12H: { frequency: 1, period: 12, periodUnit: "h" },
  };
  const r = map[f];
  if (r) return { code: { text: frequency }, repeat: r };
  // Unknown frequency — preserve as text only so doctors can still read it.
  return { code: { text: frequency } };
}

// "5 days", "1 week", "2 weeks" → FHIR Duration { value, unit, system, code }.
export function durationToFhir(
  duration: string | null | undefined,
): { value: number; unit: string; system: string; code: string } | undefined {
  if (!duration) return undefined;
  const m = duration.trim().match(/^(\d+(?:\.\d+)?)\s*(day|days|d|week|weeks|wk|month|months|mo|hour|hours|hr|h)\b/i);
  if (!m) return undefined;
  const value = Number(m[1]);
  const u = m[2].toLowerCase();
  if (u.startsWith("day") || u === "d") return { value, unit: "d", system: SYSTEM.ucum, code: "d" };
  if (u.startsWith("week") || u === "wk") return { value, unit: "wk", system: SYSTEM.ucum, code: "wk" };
  if (u.startsWith("month") || u === "mo") return { value, unit: "mo", system: SYSTEM.ucum, code: "mo" };
  if (u.startsWith("hour") || u === "hr" || u === "h") return { value, unit: "h", system: SYSTEM.ucum, code: "h" };
  return undefined;
}

// Free-text route → FHIR route code (SNOMED CT). Falls back to text only.
export function routeToFhir(
  route: string | null | undefined,
): { coding?: Array<{ system: string; code: string; display: string }>; text?: string } | undefined {
  if (!route) return undefined;
  const r = route.trim().toLowerCase();
  const map: Record<string, { code: string; display: string }> = {
    oral: { code: "26643006", display: "Oral route" },
    po: { code: "26643006", display: "Oral route" },
    iv: { code: "47625008", display: "Intravenous route" },
    im: { code: "78421000", display: "Intramuscular route" },
    sc: { code: "34206005", display: "Subcutaneous route" },
    topical: { code: "6064005", display: "Topical route" },
    inhalation: { code: "447694001", display: "Respiratory tract route" },
    nasal: { code: "46713006", display: "Nasal route" },
    rectal: { code: "37161004", display: "Rectal route" },
  };
  const hit = map[r];
  if (hit) {
    return {
      coding: [{ system: SYSTEM.snomed, code: hit.code, display: hit.display }],
      text: route,
    };
  }
  return { text: route };
}

// visits.status → FHIR Encounter.status
export function encounterStatus(
  visitStatus: string,
): "planned" | "arrived" | "in-progress" | "finished" | "cancelled" {
  switch (visitStatus) {
    case "completed":
      return "finished";
    case "cancelled":
      return "cancelled";
    case "in_progress":
    case "awaiting_review":
      return "in-progress";
    case "queued":
      return "arrived";
    case "intake":
    default:
      return "planned";
  }
}
