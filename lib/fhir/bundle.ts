// =============================================================================
// FHIR R4 Bundle builder — ABDM OPConsultRecord profile.
// =============================================================================
// Converts a Visit + Patient + Doctor (+ optional structured allergies) into
// a fully conformant FHIR R4 Bundle of type `document`. The Composition
// resource at index 0 anchors all section references.
//
// References:
//   * NRCES OPConsultRecord 6.0:
//     https://nrces.in/ndhm/fhir/r4/StructureDefinition-OPConsultRecord.html
//   * FHIR R4 spec:
//     https://hl7.org/fhir/R4
// =============================================================================

import type { Doctor, Patient, PatientAllergy, Visit, Medicine } from "@/types/db";
import {
  COMPOSITION_TYPE,
  SYSTEM,
  VITAL_CODES,
  deriveBirthDate,
  durationToFhir,
  encounterStatus,
  fhirGender,
  frequencyToTiming,
  routeToFhir,
} from "./mappings";

type FhirRef = { reference: string };
type FhirCoding = { system: string; code: string; display?: string };
type FhirCodeable = { coding?: FhirCoding[]; text?: string };

type FhirEntry = { fullUrl: string; resource: Record<string, unknown> };

function urn(): string {
  // RFC 4122 v4 — Bundle.entry.fullUrl needs to be globally unique within the doc.
  return `urn:uuid:${crypto.randomUUID()}`;
}

function nameParts(p: Patient): { given: string[]; family: string; text: string } {
  const text = p.full_name || `${p.given_name || ""} ${p.family_name || ""}`.trim();
  if (p.given_name || p.family_name) {
    return {
      given: p.given_name ? [p.given_name] : [],
      family: p.family_name || "",
      text,
    };
  }
  // Best-effort split: last token = family, everything before = given.
  const tokens = (p.full_name || "").trim().split(/\s+/);
  if (tokens.length === 0) return { given: [], family: "", text };
  if (tokens.length === 1) return { given: [], family: tokens[0], text };
  return {
    given: tokens.slice(0, -1),
    family: tokens[tokens.length - 1],
    text,
  };
}

export function buildOpConsultBundle(args: {
  patient: Patient;
  visit: Visit;
  doctor: Doctor;
  allergies?: PatientAllergy[];
}): Record<string, unknown> {
  const { patient, visit, doctor, allergies = [] } = args;

  const visitDate = new Date(visit.visit_date);
  const completedAt = visit.completed_at ? new Date(visit.completed_at) : null;
  const periodStart = visitDate.toISOString();
  const periodEnd = (completedAt || visitDate).toISOString();

  // -------- 1. Patient ------------------------------------------------------
  const patientRef = urn();
  const np = nameParts(patient);
  const patientResource: Record<string, unknown> = {
    resourceType: "Patient",
    id: patient.id,
    meta: {
      profile: [
        "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Patient",
      ],
    },
    identifier: [
      ...(patient.abha_id
        ? [
            {
              system: SYSTEM.abhaNumber,
              value: patient.abha_id,
              use: "official" as const,
            },
          ]
        : []),
      ...(patient.abha_address
        ? [
            {
              system: SYSTEM.abhaAddress,
              value: patient.abha_address,
              use: "usual" as const,
            },
          ]
        : []),
      {
        system: "https://hellodoctor.app/emr",
        value: patient.emr_number,
        use: "secondary" as const,
      },
    ],
    name: [
      {
        text: np.text,
        ...(np.family ? { family: np.family } : {}),
        ...(np.given.length > 0 ? { given: np.given } : {}),
      },
    ],
    gender: fhirGender(patient.sex),
    birthDate: deriveBirthDate(patient.birthdate, patient.age, visitDate),
    ...(patient.phone || patient.email
      ? {
          telecom: [
            ...(patient.phone
              ? [{ system: "phone", value: patient.phone, use: "mobile" }]
              : []),
            ...(patient.email
              ? [{ system: "email", value: patient.email }]
              : []),
          ],
        }
      : {}),
    ...(patient.address_line1 || patient.city || patient.address
      ? {
          address: [
            {
              ...(patient.address_line1 || patient.address_line2
                ? {
                    line: [
                      patient.address_line1,
                      patient.address_line2,
                    ].filter(Boolean) as string[],
                  }
                : patient.address
                  ? { line: [patient.address] }
                  : {}),
              ...(patient.city ? { city: patient.city } : {}),
              ...(patient.state ? { state: patient.state } : {}),
              ...(patient.postal_code ? { postalCode: patient.postal_code } : {}),
              country: patient.country || "IN",
            },
          ],
        }
      : {}),
  };

  // -------- 2. Practitioner -------------------------------------------------
  const practitionerRef = urn();
  const practitionerResource: Record<string, unknown> = {
    resourceType: "Practitioner",
    id: doctor.id,
    meta: {
      profile: [
        "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Practitioner",
      ],
    },
    identifier: [
      ...(doctor.hpr_id
        ? [{ system: SYSTEM.hpr, value: doctor.hpr_id, use: "official" as const }]
        : []),
      ...(doctor.registration_number
        ? [
            {
              system: "https://www.nmc.org.in",
              value: doctor.registration_number,
              use: "secondary" as const,
            },
          ]
        : []),
    ],
    name: [{ text: doctor.full_name }],
    ...(doctor.qualification
      ? {
          qualification: [
            { code: { text: doctor.qualification } },
          ],
        }
      : {}),
  };

  // -------- 3. Encounter ----------------------------------------------------
  const encounterRef = urn();
  const encounterResource: Record<string, unknown> = {
    resourceType: "Encounter",
    id: visit.id,
    meta: {
      profile: [
        "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Encounter",
      ],
    },
    status: encounterStatus(visit.status),
    class: {
      system: SYSTEM.v3ActCode,
      code: visit.encounter_class || "AMB",
      display: "ambulatory",
    },
    subject: { reference: patientRef } as FhirRef,
    participant: [
      {
        individual: { reference: practitionerRef } as FhirRef,
      },
    ],
    period: { start: periodStart, end: periodEnd },
  };

  // -------- 4. Conditions (diagnoses) --------------------------------------
  const conditionEntries: FhirEntry[] = [];
  const diagnosisText =
    visit.confirmed_diagnosis || visit.provisional_diagnosis || null;
  const verification = visit.confirmed_diagnosis ? "confirmed" : "provisional";
  if (diagnosisText) {
    const codings: FhirCoding[] = (visit.icd_codes || []).map((code) => ({
      system: SYSTEM.icd10,
      code,
      display: diagnosisText,
    }));
    conditionEntries.push({
      fullUrl: urn(),
      resource: {
        resourceType: "Condition",
        meta: {
          profile: [
            "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Condition",
          ],
        },
        clinicalStatus: {
          coding: [
            {
              system: SYSTEM.conditionClinical,
              code: "active",
              display: "Active",
            },
          ],
        },
        verificationStatus: {
          coding: [
            {
              system: SYSTEM.conditionVerStatus,
              code: verification,
              display: verification,
            },
          ],
        },
        code: {
          ...(codings.length > 0 ? { coding: codings } : {}),
          text: diagnosisText,
        } as FhirCodeable,
        subject: { reference: patientRef } as FhirRef,
        encounter: { reference: encounterRef } as FhirRef,
        recordedDate: periodStart,
      },
    });
  }

  // -------- 5. MedicationRequests -----------------------------------------
  const medRequestEntries: FhirEntry[] = (
    (visit.prescription?.medicines || []) as Medicine[]
  )
    .filter((m) => m.status !== "stopped")
    .map((m) => {
      const timing = frequencyToTiming(m.frequency);
      const duration = durationToFhir(m.duration);
      const route = routeToFhir(m.route);
      const dosage: Record<string, unknown> = {
        ...(m.instructions ? { text: m.instructions } : {}),
        ...(timing ? { timing } : {}),
        ...(route ? { route } : {}),
        ...(m.dose
          ? {
              doseAndRate: [
                {
                  type: {
                    coding: [
                      {
                        system:
                          "http://terminology.hl7.org/CodeSystem/dose-rate-type",
                        code: "ordered",
                        display: "Ordered",
                      },
                    ],
                  },
                  doseQuantity: { value: parseDoseValue(m.dose), unit: m.dose },
                },
              ],
            }
          : {}),
      };
      return {
        fullUrl: urn(),
        resource: {
          resourceType: "MedicationRequest",
          meta: {
            profile: [
              "https://nrces.in/ndhm/fhir/r4/StructureDefinition/MedicationRequest",
            ],
          },
          status: "active",
          intent: "order",
          medicationCodeableConcept: { text: m.name },
          subject: { reference: patientRef } as FhirRef,
          encounter: { reference: encounterRef } as FhirRef,
          authoredOn: periodStart,
          requester: { reference: practitionerRef } as FhirRef,
          dosageInstruction: [dosage],
          ...(duration
            ? {
                dispenseRequest: {
                  expectedSupplyDuration: duration,
                },
              }
            : {}),
        },
      };
    });

  // -------- 6. Observations (vitals) --------------------------------------
  const vitalsEntries: FhirEntry[] = [];
  for (const key of Object.keys(VITAL_CODES) as Array<keyof typeof VITAL_CODES>) {
    const value = visit[key];
    if (value == null) continue;
    const meta = VITAL_CODES[key];
    vitalsEntries.push({
      fullUrl: urn(),
      resource: {
        resourceType: "Observation",
        meta: {
          profile: [
            "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Observation",
          ],
        },
        status: "final",
        category: [
          {
            coding: [
              {
                system: SYSTEM.observationCategory,
                code: "vital-signs",
                display: "Vital Signs",
              },
            ],
          },
        ],
        code: {
          coding: [{ system: SYSTEM.loinc, code: meta.loinc, display: meta.display }],
          text: meta.display,
        },
        subject: { reference: patientRef } as FhirRef,
        encounter: { reference: encounterRef } as FhirRef,
        effectiveDateTime: periodStart,
        valueQuantity: {
          value: Number(value),
          unit: meta.unitDisplay,
          system: SYSTEM.ucum,
          code: meta.unit,
        },
      },
    });
  }

  // -------- 7. AllergyIntolerance -----------------------------------------
  const allergyEntries: FhirEntry[] = (
    allergies.length > 0
      ? allergies
      : parseFreeTextAllergies(patient.known_allergies, patient.id)
  ).map((a) => ({
    fullUrl: urn(),
    resource: {
      resourceType: "AllergyIntolerance",
      meta: {
        profile: [
          "https://nrces.in/ndhm/fhir/r4/StructureDefinition/AllergyIntolerance",
        ],
      },
      clinicalStatus: {
        coding: [
          {
            system:
              "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
            code: "active",
          },
        ],
      },
      verificationStatus: {
        coding: [
          {
            system:
              "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification",
            code: "confirmed",
          },
        ],
      },
      code: { text: a.allergen },
      patient: { reference: patientRef } as FhirRef,
      ...(a.severity ? { criticality: severityToCriticality(a.severity) } : {}),
      ...(a.reaction
        ? {
            reaction: [
              {
                manifestation: [{ text: a.reaction }],
                ...(a.severity ? { severity: a.severity } : {}),
              },
            ],
          }
        : {}),
      recordedDate: a.recorded_at,
    },
  }));

  // -------- 8. ServiceRequests (investigations) ---------------------------
  const investigationsText = (visit.investigations_ordered || "").trim();
  const investigationEntries: FhirEntry[] = investigationsText
    ? investigationsText
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((test) => ({
          fullUrl: urn(),
          resource: {
            resourceType: "ServiceRequest",
            meta: {
              profile: [
                "https://nrces.in/ndhm/fhir/r4/StructureDefinition/ServiceRequest",
              ],
            },
            status: "active",
            intent: "order",
            code: { text: test },
            subject: { reference: patientRef } as FhirRef,
            encounter: { reference: encounterRef } as FhirRef,
            authoredOn: periodStart,
            requester: { reference: practitionerRef } as FhirRef,
          },
        }))
    : [];

  // -------- 9. Composition (anchors all of the above) ---------------------
  const sections: Array<Record<string, unknown>> = [];

  if (visit.chief_complaints) {
    sections.push({
      title: "Chief complaints",
      code: { coding: [{ system: SYSTEM.loinc, code: "10154-3", display: "Chief complaint" }] },
      text: { status: "generated", div: htmlDiv(visit.chief_complaints) },
    });
  }
  if (visit.history_present_illness || visit.past_history) {
    const text = [visit.history_present_illness, visit.past_history]
      .filter(Boolean)
      .join("\n\n");
    sections.push({
      title: "Medical history",
      code: { coding: [{ system: SYSTEM.loinc, code: "11348-0", display: "History of past illness" }] },
      text: { status: "generated", div: htmlDiv(text) },
    });
  }
  if (visit.examination_findings) {
    sections.push({
      title: "Physical examination",
      code: { coding: [{ system: SYSTEM.loinc, code: "29545-1", display: "Physical findings" }] },
      text: { status: "generated", div: htmlDiv(visit.examination_findings) },
    });
  }
  if (vitalsEntries.length > 0) {
    sections.push({
      title: "Vital signs",
      code: { coding: [{ system: SYSTEM.loinc, code: "8716-3", display: "Vital signs" }] },
      entry: vitalsEntries.map((e) => ({ reference: e.fullUrl } as FhirRef)),
    });
  }
  if (conditionEntries.length > 0) {
    sections.push({
      title: "Diagnosis",
      code: { coding: [{ system: SYSTEM.loinc, code: "51848-0", display: "Assessment" }] },
      entry: conditionEntries.map((e) => ({ reference: e.fullUrl } as FhirRef)),
    });
  }
  if (allergyEntries.length > 0) {
    sections.push({
      title: "Allergies",
      code: { coding: [{ system: SYSTEM.loinc, code: "48765-2", display: "Allergies and adverse reactions" }] },
      entry: allergyEntries.map((e) => ({ reference: e.fullUrl } as FhirRef)),
    });
  }
  if (medRequestEntries.length > 0) {
    sections.push({
      title: "Medications",
      code: { coding: [{ system: SYSTEM.loinc, code: "10160-0", display: "History of medication use" }] },
      entry: medRequestEntries.map((e) => ({ reference: e.fullUrl } as FhirRef)),
    });
  }
  if (investigationEntries.length > 0) {
    sections.push({
      title: "Investigation advice",
      code: { coding: [{ system: SYSTEM.loinc, code: "18776-5", display: "Plan of care note" }] },
      entry: investigationEntries.map((e) => ({ reference: e.fullUrl } as FhirRef)),
    });
  }
  if (visit.advice) {
    sections.push({
      title: "Advice",
      code: { coding: [{ system: SYSTEM.loinc, code: "61146-7", display: "Patient education" }] },
      text: { status: "generated", div: htmlDiv(visit.advice) },
    });
  }
  if (visit.follow_up_date || visit.follow_up_notes) {
    const text = [
      visit.follow_up_date ? `Follow-up: ${visit.follow_up_date}` : null,
      visit.follow_up_notes,
    ]
      .filter(Boolean)
      .join(" — ");
    sections.push({
      title: "Follow up",
      code: { coding: [{ system: SYSTEM.loinc, code: "390906007", display: "Follow-up encounter" }] },
      text: { status: "generated", div: htmlDiv(text) },
    });
  }

  const compositionRef = urn();
  const compositionResource: Record<string, unknown> = {
    resourceType: "Composition",
    meta: {
      profile: [
        "https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord",
      ],
    },
    status: visit.status === "completed" ? "final" : "preliminary",
    type: { coding: [COMPOSITION_TYPE], text: COMPOSITION_TYPE.display },
    subject: { reference: patientRef } as FhirRef,
    encounter: { reference: encounterRef } as FhirRef,
    date: periodStart,
    author: [{ reference: practitionerRef } as FhirRef],
    title: "OP Consultation Record",
    section: sections,
  };

  // -------- Bundle assembly -----------------------------------------------
  const entries: FhirEntry[] = [
    { fullUrl: compositionRef, resource: compositionResource },
    { fullUrl: patientRef, resource: patientResource },
    { fullUrl: practitionerRef, resource: practitionerResource },
    { fullUrl: encounterRef, resource: encounterResource },
    ...conditionEntries,
    ...medRequestEntries,
    ...vitalsEntries,
    ...allergyEntries,
    ...investigationEntries,
  ];

  return {
    resourceType: "Bundle",
    type: "document",
    timestamp: new Date().toISOString(),
    identifier: { system: "https://hellodoctor.app/visit", value: visit.id },
    meta: {
      profile: [
        "https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle",
      ],
    },
    entry: entries,
  };
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function htmlDiv(text: string): string {
  // Escape HTML-special chars for the narrative div FHIR requires.
  const safe = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div xmlns="http://www.w3.org/1999/xhtml">${safe.replace(/\n/g, "<br/>")}</div>`;
}

function parseDoseValue(dose: string): number {
  const m = dose.trim().match(/^(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 1;
}

function severityToCriticality(
  s: "mild" | "moderate" | "severe",
): "low" | "high" | "unable-to-assess" {
  if (s === "severe") return "high";
  if (s === "moderate") return "high";
  return "low";
}

// Best-effort split of legacy free-text allergy column into structured rows.
function parseFreeTextAllergies(
  text: string | null,
  patientId: string,
): PatientAllergy[] {
  if (!text || text.trim().length === 0) return [];
  return text
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((allergen) => ({
      id: `${patientId}-${allergen}`,
      patient_id: patientId,
      allergen,
      reaction: null,
      severity: null,
      recorded_at: new Date().toISOString(),
    }));
}
