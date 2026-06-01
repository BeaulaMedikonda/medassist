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
    ...(patient.emergency_contact
      ? {
          contact: [
            {
              relationship: [{ text: "Emergency contact" }],
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

  // -------- 2. Organization + Practitioner ---------------------------------
  const organizationRef = urn();
  const organizationResource: Record<string, unknown> | null =
    clinic || doctor.clinic_name || doctor.clinic_address || doctor.clinic_phone
      ? {
          resourceType: "Organization",
          id: clinic?.id || doctor.clinic_id || undefined,
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

  const practitionerRoleRef = urn();
  const practitionerRoleResource: Record<string, unknown> | null = organizationResource
    ? {
        resourceType: "PractitionerRole",
        practitioner: { reference: practitionerRef } as FhirRef,
        organization: { reference: organizationRef } as FhirRef,
        code: [{ text: doctor.role === "doctor" ? "Doctor" : doctor.role }],
      }
    : null;

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

  // -------- 5. Medication + MedicationRequests ----------------------------
  const medicationEntries: FhirEntry[] = (
    (visit.prescription?.medicines || []) as Medicine[]
  ).map((m) => ({
    fullUrl: urn(),
    resource: {
      resourceType: "Medication",
      code: { text: m.name },
      status: m.status === "stopped" ? "inactive" : "active",
    },
  }));

  const medRequestEntries: FhirEntry[] = (
    (visit.prescription?.medicines || []) as Medicine[]
  )
    .map((m, index) => {
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
          status: isStopped ? "stopped" : "active",
          intent: "order",
          medicationReference: { reference: medicationEntries[index].fullUrl },
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
          status: "final",
          code: { text: "Blood group" },
          subject: { reference: patientRef } as FhirRef,
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
      status: "final",
      code: { text: "Pain score and location" },
      subject: { reference: patientRef } as FhirRef,
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

  const referralEntries: FhirEntry[] = referrals.map((referral) => ({
    fullUrl: urn(),
    resource: {
      resourceType: "ServiceRequest",
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
    ...(visit.audio_url
      ? [
          documentReference({
            patientRef,
            encounterRef,
            periodStart,
            title: "Visit audio",
            url: visit.audio_url,
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
  const additionalObservationEntries = [
    ...(bloodGroupEntry ? [bloodGroupEntry] : []),
    ...painMapEntries,
  ];
  if (additionalObservationEntries.length > 0) {
    sections.push({
      title: "Additional observations",
      code: { text: "Additional observations" },
      entry: additionalObservationEntries.map((e) => ({ reference: e.fullUrl } as FhirRef)),
    });
  }
  if (conditionEntries.length > 0) {
    sections.push({
      title:
        chronicConditionEntries.length > 0
          ? "Diagnosis and chronic conditions"
          : "Diagnosis",
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
  if (immunizationEntries.length > 0) {
    sections.push({
      title: "Immunizations",
      code: { text: "Immunizations" },
      entry: immunizationEntries.map((e) => ({ reference: e.fullUrl } as FhirRef)),
    });
  }
  if (investigationEntries.length > 0) {
    sections.push({
      title: "Investigation advice",
      code: { coding: [{ system: SYSTEM.loinc, code: "18776-5", display: "Plan of care note" }] },
      entry: investigationEntries.map((e) => ({ reference: e.fullUrl } as FhirRef)),
    });
  }
  if (referralEntries.length > 0) {
    sections.push({
      title: "Referrals",
      code: { text: "Referrals" },
      entry: referralEntries.map((e) => ({ reference: e.fullUrl } as FhirRef)),
    });
  }
  if (visit.advice) {
    sections.push({
      title: "Advice",
      code: { coding: [{ system: SYSTEM.loinc, code: "61146-7", display: "Patient education" }] },
      text: { status: "generated", div: htmlDiv(visit.advice) },
    });
  }
  if (carePlanEntry) {
    sections.push({
      title: "Care plan",
      code: { text: "Care plan" },
      entry: [{ reference: carePlanEntry.fullUrl } as FhirRef],
    });
  }
  if (visit.follow_up_date || visit.follow_up_notes) {
    const text = [
      visit.follow_up_date ? `Follow-up: ${visit.follow_up_date}` : null,
      visit.follow_up_notes,
    ]
      .filter(Boolean)
      .join(" - ");
    sections.push({
      title: "Follow up",
      code: { coding: [{ system: SYSTEM.loinc, code: "390906007", display: "Follow-up encounter" }] },
      text: { status: "generated", div: htmlDiv(text) },
    });
  }
  if (appointmentEntries.length > 0) {
    sections.push({
      title: "Appointments",
      code: { text: "Appointments" },
      entry: appointmentEntries.map((e) => ({ reference: e.fullUrl } as FhirRef)),
    });
  }
  if (documentEntries.length > 0) {
    sections.push({
      title: "Supporting documents",
      code: { text: "Supporting documents" },
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
      target: [{ reference: compositionRef } as FhirRef],
      recorded: new Date().toISOString(),
      agent: [
        {
          type: { text: "Author" },
          who: { reference: practitionerRef } as FhirRef,
        },
        {
          type: { text: "Assembler" },
          who: { display: "Hello Doctor FHIR exporter" },
        },
      ],
    },
  };

  const auditEventEntry: FhirEntry = {
    fullUrl: urn(),
    resource: {
      resourceType: "AuditEvent",
      type: {
        system: "http://terminology.hl7.org/CodeSystem/audit-event-type",
        code: "rest",
        display: "Restful Operation",
      },
      action: "R",
      recorded: new Date().toISOString(),
      outcome: "0",
      agent: [
        {
          requestor: true,
          who: { reference: practitionerRef } as FhirRef,
        },
      ],
      source: {
        observer: { display: "Hello Doctor" },
      },
      entity: [
        {
          what: { reference: compositionRef } as FhirRef,
          role: {
            system: "http://terminology.hl7.org/CodeSystem/object-role",
            code: "1",
            display: "Patient",
          },
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
    ...(practitionerRoleResource
      ? [{ fullUrl: practitionerRoleRef, resource: practitionerRoleResource }]
      : []),
    { fullUrl: encounterRef, resource: encounterResource },
    ...conditionEntries,
    ...medicationEntries,
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
    auditEventEntry,
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
            ...(input.url ? { url: input.url } : {}),
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
