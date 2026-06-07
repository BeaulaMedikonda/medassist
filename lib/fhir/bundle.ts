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

import type {
  Appointment,
  Clinic,
  Doctor,
  Immunization,
  Medicine,
  Patient,
  PatientAllergy,
  Referral,
  Visit,
} from "@/types/db";
import {
  COMPOSITION_TYPE,
  HEIGHT_CODE,
  SYSTEM,
  VITAL_CODES,
  deriveBirthDate,
  durationToFhir,
  encounterStatus,
  fhirGender,
  frequencyToTiming,
  icd10Display,
  routeToFhir,
} from "./mappings";

type FhirRef = { reference: string };
type FhirCoding = { system: string; code: string; display?: string };
type FhirCodeable = { coding?: FhirCoding[]; text?: string };

type FhirEntry = { fullUrl: string; resource: Record<string, unknown> };
type GraphicPainMap = {
  id: string;
  pain_type: string;
  intensity: number;
  pain_locations?: string[] | null;
  marked_points?: string[] | null;
  pain_summary?: string | null;
  created_at: string;
};

const SECTION_CODES = {
  chiefComplaints: { system: SYSTEM.snomed, code: "422843007", display: "Chief complaint section" },
  physicalExamination: { system: SYSTEM.snomed, code: "425044008", display: "Physical exam section" },
  allergies: { system: SYSTEM.snomed, code: "722446000", display: "Allergy record" },
  medicalHistory: { system: SYSTEM.snomed, code: "371529009", display: "History and physical report" },
  investigationAdvice: { system: SYSTEM.snomed, code: "721963009", display: "Order document" },
  medications: { system: SYSTEM.snomed, code: "721912009", display: "Medication summary document" },
  followUp: { system: SYSTEM.snomed, code: "390906007", display: "Follow-up encounter" },
  referral: { system: SYSTEM.snomed, code: "306206005", display: "Referral to service" },
  otherObservations: { system: SYSTEM.snomed, code: "404684003", display: "Clinical finding" },
  documentReference: { system: SYSTEM.snomed, code: "371530004", display: "Clinical consultation report" },
} as const;

function urn(): string {
  // RFC 4122 v4 — Bundle.entry.fullUrl needs to be globally unique within the doc.
  return `urn:uuid:${crypto.randomUUID()}`;
}

function nameParts(p: Patient): { given: string[]; family: string; text: string } {
  const text = p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim();
  if (p.first_name || p.last_name) {
    return {
      given: p.first_name ? [p.first_name] : [],
      family: p.last_name || "",
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
  clinic?: Clinic | null;
  immunizations?: Immunization[];
  referrals?: Referral[];
  appointments?: Appointment[];
  painMaps?: GraphicPainMap[];
}): Record<string, unknown> {
  const {
    patient,
    visit,
    doctor,
    allergies = [],
    clinic = null,
    immunizations = [],
    referrals = [],
    appointments = [],
    painMaps = [],
  } = args;

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
    text: textNarrative(`Patient: ${np.text}, ${fhirGender(patient.sex)}, DOB: ${deriveBirthDate(patient.birthdate, patient.age, visitDate)}`),
    identifier: [
      ...(patient.abha_id
        ? [
            {
              type: {
                coding: [
                  {
                    system: "http://terminology.hl7.org/CodeSystem/v2-0203",
                    code: "NI",
                    display: "National unique individual identifier",
                  },
                ],
                text: "ABHA Number",
              },
              system: SYSTEM.abhaNumber,
              value: patient.abha_id,
              use: "official" as const,
            },
          ]
        : []),
      ...(patient.abha_address
        ? [
            {
              type: {
                coding: [
                  {
                    system: "http://terminology.hl7.org/CodeSystem/v2-0203",
                    code: "NI",
                    display: "National unique individual identifier",
                  },
                ],
                text: "ABHA Address",
              },
              system: SYSTEM.abhaAddress,
              value: patient.abha_address,
              use: "usual" as const,
            },
          ]
        : []),
      {
        type: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v2-0203",
              code: "MR",
              display: "Medical record number",
            },
          ],
          text: "EMR Number",
        },
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
    ...(patient.emergency_contact
      ? {
          contact: [
            {
              relationship: [
                {
                  coding: [
                    {
                      system: "http://terminology.hl7.org/CodeSystem/v2-0131",
                      code: "C",
                      display: "Emergency Contact",
                    },
                  ],
                  text: "Emergency contact",
                },
              ],
              telecom: [
                {
                  system: "phone",
                  value: patient.emergency_contact,
                  use: "mobile",
                },
              ],
            },
          ],
        }
      : {}),
    ...(patient.address || patient.city
      ? {
          address: [
            {
              ...(patient.address ? { line: [patient.address] } : {}),
              ...(patient.city ? { city: patient.city } : {}),
              ...(patient.state ? { state: patient.state } : {}),
              ...(patient.postal_code ? { postalCode: patient.postal_code } : {}),
              country: patient.country || "IN",
            },
          ],
        }
      : {}),
  };

  // -------- 2. Organization + Practitioner ---------------------------------
  const organizationRef = urn();
  const organizationId =
    clinic?.id || doctor.clinic_id || slugId(clinic?.name || doctor.clinic_name || "clinic");
  const organizationResource: Record<string, unknown> | null =
    clinic || doctor.clinic_name || doctor.clinic_address || doctor.clinic_phone
      ? {
          resourceType: "Organization",
          id: organizationId,
          meta: {
            profile: [
              "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Organization",
            ],
          },
          text: textNarrative(`Organization: ${clinic?.name || doctor.clinic_name || "Clinic"}`),
          identifier: [
            {
              type: {
                coding: [
                  {
                    system: "http://terminology.hl7.org/CodeSystem/v2-0203",
                    code: "PRN",
                    display: "Provider number",
                  },
                ],
                text: "Clinic identifier",
              },
              system: "https://hellodoctor.app/clinic",
              value: organizationId,
              use: "official" as const,
            },
          ],
          type: [
            {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/organization-type",
                  code: "prov",
                  display: "Healthcare Provider",
                },
              ],
              text: "Healthcare Provider",
            },
          ],
          name: clinic?.name || doctor.clinic_name || "Clinic",
          ...(clinic?.phone || doctor.clinic_phone
            ? {
                telecom: [
                  {
                    system: "phone",
                    value: clinic?.phone || doctor.clinic_phone,
                  },
                ],
              }
            : {}),
          ...(clinic?.address || doctor.clinic_address
            ? {
                address: [
                  {
                    text: clinic?.address || doctor.clinic_address,
                    ...(clinic?.city ? { city: clinic.city } : {}),
                    ...(clinic?.state ? { state: clinic.state } : {}),
                  },
                ],
              }
            : {}),
        }
      : null;

  const practitionerRef = urn();
  const practitionerResource: Record<string, unknown> = {
    resourceType: "Practitioner",
    id: doctor.id,
    meta: {
      profile: [
        "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Practitioner",
      ],
    },
    text: textNarrative(`Practitioner: ${doctor.full_name}`),
    identifier: [
      ...(doctor.hpr_id
        ? [
            {
              type: {
                coding: [
                  {
                    system: "http://terminology.hl7.org/CodeSystem/v2-0203",
                    code: "PRN",
                    display: "Provider number",
                  },
                ],
                text: "HPR ID",
              },
              system: SYSTEM.hpr,
              value: doctor.hpr_id,
              use: "official" as const,
            },
          ]
        : []),
      ...(doctor.registration_number
        ? [
            {
              type: {
                coding: [
                  {
                    system: "http://terminology.hl7.org/CodeSystem/v2-0203",
                    code: "MD",
                    display: "Medical license number",
                  },
                ],
                text: "Medical Registration Number",
              },
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
    text: textNarrative(`Encounter on ${visitDate.toISOString().slice(0, 10)}, status: ${encounterStatus(visit.status)}`),
    identifier: [
      {
        system: "https://hellodoctor.app/visit",
        value: visit.id,
      },
    ],
    status: encounterStatus(visit.status),
    class: {
      system: SYSTEM.v3ActCode,
      code: visit.encounter_class || "AMB",
      display: "ambulatory",
    },
    type: [
      {
        coding: [
          {
            system: "http://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-encounter-type",
            code: "OPD",
            display: "Outpatient Department",
          },
        ],
        text: "Outpatient Department",
      },
    ],
    serviceType: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/service-type",
          code: "124",
          display: "General Practice",
        },
      ],
      text: "General Practice",
    },
    subject: { reference: patientRef } as FhirRef,
    participant: [
      {
        individual: { reference: practitionerRef } as FhirRef,
      },
    ],
    period: { start: periodStart, end: periodEnd },
    ...(organizationResource ? { serviceProvider: { reference: organizationRef } as FhirRef } : {}),
  };

  // -------- 4. Conditions (diagnoses) --------------------------------------
  const diagnosisConditionEntries: FhirEntry[] = [];
  const diagnosisText =
    visit.confirmed_diagnosis || visit.provisional_diagnosis || null;
  const verification = visit.confirmed_diagnosis ? "confirmed" : "provisional";
  if (diagnosisText) {
    const codings: FhirCoding[] = (visit.icd_codes || []).map((code) => ({
      system: SYSTEM.icd10,
      code: code.trim().toUpperCase(),
      display: icd10Display(code, diagnosisText),
    }));
    diagnosisConditionEntries.push({
      fullUrl: urn(),
      resource: {
        resourceType: "Condition",
        meta: {
          profile: [
            "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Condition",
          ],
        },
        text: textNarrative(`Condition: ${diagnosisText}`),
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
  const chronicConditionEntries: FhirEntry[] = parseTextList(
    patient.chronic_conditions,
  ).map((condition) => ({
    fullUrl: urn(),
    resource: {
      resourceType: "Condition",
      meta: {
        profile: [
          "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Condition",
        ],
      },
      text: textNarrative(`Condition: ${condition}`),
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
            code: "confirmed",
            display: "confirmed",
          },
        ],
      },
      code: { text: condition } as FhirCodeable,
      subject: { reference: patientRef } as FhirRef,
      encounter: { reference: encounterRef } as FhirRef,
      recordedDate: periodStart,
    },
  }));
  const conditionEntries = [
    ...diagnosisConditionEntries,
    ...chronicConditionEntries,
  ];

  // -------- 5. MedicationRequests -----------------------------------------
  // ABDM OPConsultRecord profile restricts medication[x] to CodeableConcept only.
  const medRequestEntries: FhirEntry[] = (
    (visit.prescription?.medicines || []) as Medicine[]
  )
    .map((m) => {
      const timing = frequencyToTiming(m.frequency);
      const duration = durationToFhir(m.duration);
      const route = routeToFhir(m.route);
      const isStopped = m.status === "stopped";
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
          text: textNarrative(`MedicationRequest: ${m.name}${m.dose ? `, ${m.dose}` : ""}${m.frequency ? `, ${m.frequency}` : ""}`),
          status: isStopped ? "stopped" : "active",
          intent: "order",
          medicationCodeableConcept: { text: m.name },
          subject: { reference: patientRef } as FhirRef,
          encounter: { reference: encounterRef } as FhirRef,
          authoredOn: periodStart,
          requester: { reference: practitionerRef } as FhirRef,
          dosageInstruction: isStopped ? [] : [dosage],
          note: [{ text: `Hello Doctor medicine status: ${m.status}` }],
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

  // BP panel: FHIR bp profile requires magic code 85354-9 + two component slices.
  // Emit a single panel observation rather than two flat valueQuantity observations.
  const hasBp = visit.bp_systolic != null || visit.bp_diastolic != null;
  if (hasBp) {
    const bpComponents: unknown[] = [];
    if (visit.bp_systolic != null) {
      bpComponents.push({
        code: {
          coding: [{ system: SYSTEM.loinc, code: VITAL_CODES.bp_systolic.loinc, display: VITAL_CODES.bp_systolic.display }],
          text: VITAL_CODES.bp_systolic.display,
        },
        valueQuantity: {
          value: Number(visit.bp_systolic),
          unit: VITAL_CODES.bp_systolic.unitDisplay,
          system: SYSTEM.ucum,
          code: VITAL_CODES.bp_systolic.unit,
        },
      });
    }
    if (visit.bp_diastolic != null) {
      bpComponents.push({
        code: {
          coding: [{ system: SYSTEM.loinc, code: VITAL_CODES.bp_diastolic.loinc, display: VITAL_CODES.bp_diastolic.display }],
          text: VITAL_CODES.bp_diastolic.display,
        },
        valueQuantity: {
          value: Number(visit.bp_diastolic),
          unit: VITAL_CODES.bp_diastolic.unitDisplay,
          system: SYSTEM.ucum,
          code: VITAL_CODES.bp_diastolic.unit,
        },
      });
    }
    vitalsEntries.push({
      fullUrl: urn(),
      resource: {
        resourceType: "Observation",
        meta: {
          profile: ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/Observation"],
        },
        text: textNarrative(`Blood pressure: ${visit.bp_systolic ?? "?"}/${visit.bp_diastolic ?? "?"} mmHg`),
        status: "final",
        category: [{ coding: [{ system: SYSTEM.observationCategory, code: "vital-signs", display: "Vital Signs" }] }],
        code: {
          coding: [{ system: SYSTEM.loinc, code: "85354-9", display: "Blood pressure panel with all children optional" }],
          text: "Blood pressure",
        },
        subject: { reference: patientRef } as FhirRef,
        performer: [{ reference: practitionerRef } as FhirRef],
        encounter: { reference: encounterRef } as FhirRef,
        effectiveDateTime: periodStart,
        component: bpComponents,
      },
    });
  }

  for (const key of Object.keys(VITAL_CODES) as Array<keyof typeof VITAL_CODES>) {
    if (key === "bp_systolic" || key === "bp_diastolic") continue; // handled as bp panel above
    const value = visit[key];
    if (value == null) continue;
    const meta = VITAL_CODES[key];
    // SpO2: oxygensat profile requires magic code 2708-6 alongside the pulse-ox code 59408-5.
    const extraCodings = key === "spo2"
      ? [{ system: SYSTEM.loinc, code: "2708-6", display: "Oxygen saturation in arterial blood" }]
      : [];
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
        text: textNarrative(`${meta.display}: ${Number(value)} ${meta.unitDisplay}`),
        code: {
          coding: [
            ...extraCodings,
            { system: SYSTEM.loinc, code: meta.loinc, display: meta.display },
          ],
          text: meta.display,
        },
        subject: { reference: patientRef } as FhirRef,
        performer: [{ reference: practitionerRef } as FhirRef],
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
  if (patient.height_cm != null) {
    vitalsEntries.push({
      fullUrl: urn(),
      resource: {
        resourceType: "Observation",
        meta: {
          profile: [
            "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Observation",
          ],
        },
        text: textNarrative(`${HEIGHT_CODE.display}: ${patient.height_cm} ${HEIGHT_CODE.unitDisplay}`),
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
          coding: [{ system: SYSTEM.loinc, code: HEIGHT_CODE.loinc, display: HEIGHT_CODE.display }],
          text: HEIGHT_CODE.display,
        },
        subject: { reference: patientRef } as FhirRef,
        performer: [{ reference: practitionerRef } as FhirRef],
        encounter: { reference: encounterRef } as FhirRef,
        effectiveDateTime: periodStart,
        valueQuantity: {
          value: Number(patient.height_cm),
          unit: HEIGHT_CODE.unitDisplay,
          system: SYSTEM.ucum,
          code: HEIGHT_CODE.unit,
        },
      },
    });
  }

  const bloodGroupEntry: FhirEntry | null = patient.blood_group
    ? {
        fullUrl: urn(),
        resource: {
          resourceType: "Observation",
          meta: {
            profile: [
              "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Observation",
            ],
          },
          text: textNarrative(`Blood group: ${patient.blood_group}`),
          status: "final",
          code: { text: "Blood group" },
          subject: { reference: patientRef } as FhirRef,
          performer: [{ reference: practitionerRef } as FhirRef],
          encounter: { reference: encounterRef } as FhirRef,
          effectiveDateTime: periodStart,
          valueString: patient.blood_group,
        },
      }
    : null;

  const painMapEntries: FhirEntry[] = painMaps.map((painMap) => ({
    fullUrl: urn(),
    resource: {
      resourceType: "Observation",
      meta: {
        profile: [
          "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Observation",
        ],
      },
      text: textNarrative(`Pain score: ${painMap.intensity}/10${painMap.pain_type ? `, ${painMap.pain_type}` : ""}`),
      status: "final",
      code: { text: "Pain score and location" },
      subject: { reference: patientRef } as FhirRef,
      performer: [{ reference: practitionerRef } as FhirRef],
      encounter: { reference: encounterRef } as FhirRef,
      effectiveDateTime: painMap.created_at || periodStart,
      valueQuantity: {
        value: painMap.intensity,
        unit: "score",
        system: SYSTEM.ucum,
        code: "{score}",
      },
      bodySite: {
        text:
          painMap.pain_locations?.join(", ") ||
          painMap.marked_points?.join(", ") ||
          undefined,
      },
      note: [
        {
          text: [
            painMap.pain_summary,
            painMap.pain_type ? `Type: ${painMap.pain_type}` : null,
          ]
            .filter(Boolean)
            .join(" - "),
        },
      ],
    },
  }));

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
      text: textNarrative(`AllergyIntolerance: ${a.allergen}${a.severity ? `, ${a.severity}` : ""}`),
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
            text: textNarrative(`ServiceRequest: ${test}`),
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

  const referralEntries: FhirEntry[] = referrals.map((referral) => ({
    fullUrl: urn(),
    resource: {
      resourceType: "ServiceRequest",
      text: textNarrative(`Referral to ${referral.referred_to_specialty}${referral.referred_to_name ? ` (${referral.referred_to_name})` : ""}`),
      status: referral.status === "cancelled" ? "revoked" : "active",
      intent: "order",
      code: { text: `Referral to ${referral.referred_to_specialty}` },
      subject: { reference: patientRef } as FhirRef,
      encounter: { reference: encounterRef } as FhirRef,
      authoredOn: referral.created_at || periodStart,
      requester: { reference: practitionerRef } as FhirRef,
      performer: [
        {
          display: [
            referral.referred_to_name,
            referral.referred_to_hospital,
            referral.referred_to_phone,
            referral.referred_to_email,
          ]
            .filter(Boolean)
            .join(", "),
        },
      ],
      reasonCode: [{ text: referral.reason }],
      ...(referral.notes ? { note: [{ text: referral.notes }] } : {}),
    },
  }));

  const immunizationEntries: FhirEntry[] = immunizations.map((record) => ({
    fullUrl: urn(),
    resource: {
      resourceType: "Immunization",
      text: textNarrative(`Immunization: ${record.vaccine_name}${record.date_given ? `, ${record.date_given}` : ""}`),
      status:
        record.status === "completed"
          ? "completed"
          : record.status === "declined"
            ? "not-done"
            : "entered-in-error",
      vaccineCode: {
        ...(record.cvx_code
          ? {
              coding: [
                {
                  system: "http://hl7.org/fhir/sid/cvx",
                  code: record.cvx_code,
                },
              ],
            }
          : {}),
        text: record.vaccine_name,
      },
      patient: { reference: patientRef } as FhirRef,
      encounter: { reference: encounterRef } as FhirRef,
      occurrenceDateTime: record.date_given,
      primarySource: true,
      ...(record.dose
        ? { doseQuantity: { value: parseDoseValue(record.dose), unit: record.dose } }
        : {}),
      ...(record.notes ? { note: [{ text: record.notes }] } : {}),
    },
  }));

  const appointmentEntries: FhirEntry[] = appointments.map((appointment) => ({
    fullUrl: urn(),
    resource: {
      resourceType: "Appointment",
      text: textNarrative(`Appointment: ${appointment.type}, ${appointment.scheduled_at}`),
      status: appointmentStatusToFhir(appointment.status),
      appointmentType: { text: appointment.type },
      priority: appointment.priority === "urgent" ? 1 : 5,
      description: appointment.notes || undefined,
      start: appointment.scheduled_at,
      end: addMinutesIso(appointment.scheduled_at, appointment.duration_minutes),
      participant: [
        { actor: { reference: patientRef } as FhirRef, status: "accepted" },
        { actor: { reference: practitionerRef } as FhirRef, status: "accepted" },
      ],
    },
  }));

  const carePlanEntry: FhirEntry | null =
    visit.advice || visit.follow_up_date || visit.follow_up_notes
      ? {
          fullUrl: urn(),
          resource: {
            resourceType: "CarePlan",
            text: textNarrative(`CarePlan${visit.advice ? `: ${visit.advice.slice(0, 80)}` : ""}`),
            status: visit.status === "completed" ? "active" : "draft",
            intent: "plan",
            subject: { reference: patientRef } as FhirRef,
            encounter: { reference: encounterRef } as FhirRef,
            created: periodStart,
            activity: [
              ...(visit.advice
                ? [{ detail: { description: visit.advice, status: "scheduled" } }]
                : []),
              ...(visit.follow_up_date || visit.follow_up_notes
                ? [
                    {
                      detail: {
                        description: [
                          visit.follow_up_date
                            ? `Follow-up: ${visit.follow_up_date}`
                            : null,
                          visit.follow_up_notes,
                        ]
                          .filter(Boolean)
                          .join(" - "),
                        status: "scheduled",
                      },
                    },
                  ]
                : []),
            ],
          },
        }
      : null;

  const documentEntries: FhirEntry[] = [
    ...(visit.pre_visit_summary
      ? [
          documentReference({
            patientRef,
            encounterRef,
            periodStart,
            title: "Pre-visit summary",
            text: visit.pre_visit_summary,
          }),
        ]
      : []),
    ...(visit.transcript_text
      ? [
          documentReference({
            patientRef,
            encounterRef,
            periodStart,
            title: "Voice-to-text transcript",
            text: visit.transcript_text,
          }),
        ]
      : []),
    ...(visit.transcript_original
      ? [
          documentReference({
            patientRef,
            encounterRef,
            periodStart,
            title: "Original transcript",
            text: visit.transcript_original,
          }),
        ]
      : []),
    ...(visit.transcript_speakers
      ? [
          documentReference({
            patientRef,
            encounterRef,
            periodStart,
            title: "Speaker-labeled transcript JSON",
            text: JSON.stringify(visit.transcript_speakers, null, 2),
          }),
        ]
      : []),
    ...(visit.field_assumptions || visit.llm_extraction_raw || visit.speaker_roles
      ? [
          documentReference({
            patientRef,
            encounterRef,
            periodStart,
            title: "AI extraction metadata",
            text: JSON.stringify(
              {
                field_assumptions: visit.field_assumptions,
                doctor_id_confidence: visit.doctor_id_confidence,
                speaker_roles: visit.speaker_roles,
                llm_extraction_raw: visit.llm_extraction_raw,
              },
              null,
              2,
            ),
          }),
        ]
      : []),
    ...(visit.doctor_notes
      ? [
          documentReference({
            patientRef,
            encounterRef,
            periodStart,
            title: "Doctor internal notes",
            text: visit.doctor_notes,
          }),
        ]
      : []),
  ];

  // -------- 9. Composition (anchors all of the above) ---------------------
  const sections: Array<Record<string, unknown>> = [];

  if (visit.chief_complaints) {
    sections.push({
      title: "Chief complaints",
      code: sectionCode("chiefComplaints"),
      text: { status: "generated", div: htmlDiv(visit.chief_complaints) },
    });
  }
  if (visit.history_present_illness || visit.past_history || conditionEntries.length > 0 || immunizationEntries.length > 0) {
    const text = [
      visit.history_present_illness,
      visit.past_history,
      immunizationEntries.length > 0 ? `${immunizationEntries.length} immunization record(s) available in bundle.` : null,
    ]
      .filter(Boolean)
      .join("\n\n");
    sections.push({
      title: "Medical history",
      code: sectionCode("medicalHistory"),
      ...(text ? { text: { status: "generated", div: htmlDiv(text) } } : {}),
      ...(conditionEntries.length > 0
        ? { entry: conditionEntries.map((e) => ({ reference: e.fullUrl } as FhirRef)) }
        : {}),
    });
  }
  if (visit.examination_findings || vitalsEntries.length > 0) {
    sections.push({
      title: "Physical examination",
      code: sectionCode("physicalExamination"),
      ...(visit.examination_findings
        ? { text: { status: "generated", div: htmlDiv(visit.examination_findings) } }
        : {}),
      ...(vitalsEntries.length > 0
        ? { entry: vitalsEntries.map((e) => ({ reference: e.fullUrl } as FhirRef)) }
        : {}),
    });
  }
  const additionalObservationEntries = [
    ...(bloodGroupEntry ? [bloodGroupEntry] : []),
    ...painMapEntries,
  ];
  const additionalObservationText = [
    visit.advice ? `Advice: ${visit.advice}` : null,
    carePlanEntry ? "Care plan is available in bundle." : null,
  ].filter(Boolean).join("\n\n");
  if (additionalObservationEntries.length > 0 || additionalObservationText) {
    sections.push({
      title: "Additional observations",
      code: sectionCode("otherObservations"),
      ...(additionalObservationText
        ? { text: { status: "generated", div: htmlDiv(additionalObservationText) } }
        : {}),
      ...(additionalObservationEntries.length > 0
        ? { entry: additionalObservationEntries.map((e) => ({ reference: e.fullUrl } as FhirRef)) }
        : {}),
    });
  }
  if (allergyEntries.length > 0) {
    sections.push({
      title: "Allergies",
      code: sectionCode("allergies"),
      entry: allergyEntries.map((e) => ({ reference: e.fullUrl } as FhirRef)),
    });
  }
  if (medRequestEntries.length > 0) {
    sections.push({
      title: "Medications",
      code: sectionCode("medications"),
      entry: medRequestEntries.map((e) => ({ reference: e.fullUrl } as FhirRef)),
    });
  }
  if (investigationEntries.length > 0) {
    sections.push({
      title: "Investigation advice",
      code: sectionCode("investigationAdvice"),
      entry: investigationEntries.map((e) => ({ reference: e.fullUrl } as FhirRef)),
    });
  }
  if (referralEntries.length > 0) {
    sections.push({
      title: "Referrals",
      code: sectionCode("referral"),
      entry: referralEntries.map((e) => ({ reference: e.fullUrl } as FhirRef)),
    });
  }
  if (visit.follow_up_date || visit.follow_up_notes || appointmentEntries.length > 0) {
    const text = [
      visit.follow_up_date ? `Follow-up: ${visit.follow_up_date}` : null,
      visit.follow_up_notes,
    ]
      .filter(Boolean)
      .join(" - ");
    sections.push({
      title: "Follow up",
      code: sectionCode("followUp"),
      ...(text ? { text: { status: "generated", div: htmlDiv(text) } } : {}),
      ...(appointmentEntries.length > 0
        ? { entry: appointmentEntries.map((e) => ({ reference: e.fullUrl } as FhirRef)) }
        : {}),
    });
  }
  if (documentEntries.length > 0) {
    sections.push({
      title: "Supporting documents",
      code: sectionCode("documentReference"),
      entry: documentEntries.map((e) => ({ reference: e.fullUrl } as FhirRef)),
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
    text: textNarrative(`OP Consultation Record — ${np.text}, ${visitDate.toISOString().slice(0, 10)}, Dr. ${doctor.full_name}`),
    status: visit.status === "completed" ? "final" : "preliminary",
    type: { coding: [COMPOSITION_TYPE], text: COMPOSITION_TYPE.display },
    subject: { reference: patientRef } as FhirRef,
    encounter: { reference: encounterRef } as FhirRef,
    date: periodStart,
    author: [{ reference: practitionerRef } as FhirRef],
    title: "OP Consultation Record",
    section: sections,
  };

  const provenanceEntry: FhirEntry = {
    fullUrl: urn(),
    resource: {
      resourceType: "Provenance",
      text: textNarrative(`Provenance: authored by ${doctor.full_name}, assembled by Hello Doctor`),
      target: [{ reference: compositionRef } as FhirRef],
      recorded: new Date().toISOString(),
      agent: [
        {
          type: {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/provenance-participant-type",
                code: "author",
                display: "Author",
              },
            ],
            text: "Author",
          },
          who: { reference: practitionerRef } as FhirRef,
        },
        {
          type: {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/provenance-participant-type",
                code: "assembler",
                display: "Assembler",
              },
            ],
            text: "Assembler",
          },
          who: { display: "Hello Doctor FHIR exporter" },
        },
      ],
    },
  };

  // -------- Bundle assembly -----------------------------------------------
  const entries: FhirEntry[] = [
    { fullUrl: compositionRef, resource: compositionResource },
    { fullUrl: patientRef, resource: patientResource },
    ...(organizationResource
      ? [{ fullUrl: organizationRef, resource: organizationResource }]
      : []),
    { fullUrl: practitionerRef, resource: practitionerResource },
    { fullUrl: encounterRef, resource: encounterResource },
    ...conditionEntries,
    ...medRequestEntries,
    ...vitalsEntries,
    ...(bloodGroupEntry ? [bloodGroupEntry] : []),
    ...painMapEntries,
    ...allergyEntries,
    ...investigationEntries,
    ...referralEntries,
    ...immunizationEntries,
    ...appointmentEntries,
    ...(carePlanEntry ? [carePlanEntry] : []),
    ...documentEntries,
    provenanceEntry,
  ];

  return {
    resourceType: "Bundle",
    type: "document",
    timestamp: new Date().toISOString(),
    identifier: { system: "https://hellodoctor.app/visit", value: visit.id },
    meta: {
      versionId: "1",
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

function textNarrative(summary: string): { status: string; div: string } {
  return { status: "generated", div: htmlDiv(summary) };
}

function sectionCode(key: keyof typeof SECTION_CODES): FhirCodeable {
  const coding = SECTION_CODES[key];
  return { coding: [coding], text: coding.display };
}

function parseDoseValue(dose: string): number {
  const m = dose.trim().match(/^(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 1;
}

function parseTextList(text: string | null | undefined): string[] {
  if (!text || text.trim().length === 0) return [];
  return text
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function appointmentStatusToFhir(
  status: Appointment["status"],
): "booked" | "arrived" | "fulfilled" | "cancelled" | "noshow" {
  if (status === "checked_in") return "arrived";
  if (status === "completed") return "fulfilled";
  if (status === "cancelled") return "cancelled";
  if (status === "no_show") return "noshow";
  return "booked";
}

function addMinutesIso(date: string, minutes: number): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

function slugId(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "clinic";
}

function documentReference(input: {
  patientRef: string;
  encounterRef: string;
  periodStart: string;
  title: string;
  text?: string | null;
  url?: string | null;
}): FhirEntry {
  return {
    fullUrl: urn(),
    resource: {
      resourceType: "DocumentReference",
      meta: {
        profile: [
          "https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentReference",
        ],
      },
      text: textNarrative(`DocumentReference: ${input.title}`),
      status: "current",
      type: { text: input.title },
      subject: { reference: input.patientRef } as FhirRef,
      context: {
        encounter: [{ reference: input.encounterRef } as FhirRef],
      },
      date: input.periodStart,
      content: [
        {
          attachment: {
            title: input.title,
            ...(input.url
              ? {
                  url: input.url,
                  contentType: documentContentType(input.title),
                }
              : {}),
            ...(input.text
              ? {
                  contentType: "text/plain",
                  data: Buffer.from(input.text, "utf8").toString("base64"),
                }
              : {}),
          },
        },
      ],
    },
  };
}

function documentContentType(title: string): string {
  return title.toLowerCase().includes("audio") ? "audio/webm" : "application/octet-stream";
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

