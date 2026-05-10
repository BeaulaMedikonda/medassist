/**
 * Build a sample OPConsultRecord FHIR Bundle from synthetic data and write it
 * to scripts/fhir/fixture-bundle.json.
 *
 * Used by:
 *   - `npm run fhir:validate` (local, runs the HL7 Java validator next)
 *   - .github/workflows/fhir-validate.yml (CI)
 *
 * Run: npx tsx scripts/fhir/generate-fixture.ts
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { buildOpConsultBundle } from "../../lib/fhir/bundle";
import type {
  Doctor,
  Patient,
  PatientAllergy,
  Visit,
} from "../../types/db";

const visitDate = "2026-05-08T10:30:00.000Z";

const patient: Patient = {
  id: "f7c3e9b0-1111-4ddd-8888-aaaaaaaaaaaa",
  doctor_id: "f7c3e9b0-2222-4ddd-8888-bbbbbbbbbbbb",
  clinic_id: "f7c3e9b0-3333-4ddd-8888-cccccccccccc",
  emr_number: "HD-2026-00001",
  full_name: "Anjali Reddy",
  given_name: "Anjali",
  family_name: "Reddy",
  age: 42,
  birthdate: "1983-07-21",
  sex: "F",
  phone: "+919876543210",
  email: "anjali@example.com",
  address: null,
  address_line1: "12, MG Road",
  address_line2: null,
  city: "Bengaluru",
  state: "Karnataka",
  postal_code: "560001",
  country: "IN",
  blood_group: "O+",
  known_allergies: "Penicillin",
  chronic_conditions: "T2DM, HTN",
  emergency_contact: null,
  abha_id: "91-7412-3456-7890",
  abha_address: "anjali@abdm",
  created_at: visitDate,
  last_visit_at: visitDate,
};

const doctor: Doctor = {
  id: "f7c3e9b0-2222-4ddd-8888-bbbbbbbbbbbb",
  full_name: "Dr. Vikram Iyer",
  qualification: "MBBS, MD (General Medicine)",
  registration_number: "KMC-12345",
  hpr_id: "12-3456-7890-1234",
  clinic_name: "Hello Doctor Clinic",
  clinic_address: "12, MG Road, Bengaluru",
  clinic_phone: "+918012345678",
  signature_url: null,
  letterhead_url: null,
  preferred_language: "en",
  role: "doctor",
  clinic_id: "f7c3e9b0-3333-4ddd-8888-cccccccccccc",
  created_at: visitDate,
};

const visit: Visit = {
  id: "f7c3e9b0-4444-4ddd-8888-dddddddddddd",
  patient_id: patient.id,
  doctor_id: doctor.id,
  clinic_id: patient.clinic_id,
  created_by: doctor.id,
  visit_date: visitDate,
  status: "completed",
  completed_at: "2026-05-08T10:55:00.000Z",
  bp_systolic: 138,
  bp_diastolic: 86,
  pulse: 84,
  temperature_f: 99.1,
  spo2: 97,
  weight_kg: 68.4,
  height_cm: null,
  chief_complaints: "Sore throat × 3 days, low-grade fever, body ache",
  history_present_illness:
    "Throat pain on swallowing since 3 days, intermittent fever (~99°F), no cough.",
  past_history: "T2DM on Metformin, HTN on Telmisartan.",
  examination_findings:
    "Throat erythematous, no exudate. No cervical lymphadenopathy. Chest clear.",
  provisional_diagnosis: "Acute pharyngitis",
  confirmed_diagnosis: null,
  icd_codes: ["J02.9"],
  investigations_ordered: "CBC, CRP",
  prescription: {
    medicines: [
      {
        name: "Paracetamol",
        dose: "500 mg",
        frequency: "TDS",
        duration: "5 days",
        route: "Oral",
        instructions: "After food",
        status: "new",
      },
      {
        name: "Azithromycin",
        dose: "500 mg",
        frequency: "OD",
        duration: "3 days",
        route: "Oral",
        instructions: "Empty stomach",
        status: "new",
      },
      {
        name: "Metformin",
        dose: "500 mg",
        frequency: "BD",
        duration: "30 days",
        route: "Oral",
        instructions: "After food",
        status: "continued",
      },
    ],
    previous_prescription_id: null,
  },
  advice: "Warm saline gargles BD. Hydration. Rest.",
  follow_up_date: "2026-05-13",
  follow_up_notes: "Recheck if fever > 5 days or throat worsening.",
  audio_url: null,
  transcript_text: null,
  transcript_original: null,
  transcript_language: null,
  transcript_speakers: null,
  doctor_speaker_id: null,
  doctor_id_confidence: null,
  llm_extraction_raw: null,
  doctor_notes: null,
  pre_visit_summary: null,
  pre_visit_summary_generated_at: null,
  encounter_class: "AMB",
  field_assumptions: {
    chief_complaints: "stated",
    history_present_illness: "stated",
    examination_findings: "stated",
    provisional_diagnosis: "stated",
    confirmed_diagnosis: null,
    investigations_ordered: "stated",
    icd_codes: "assumed",
    vitals: "stated",
    advice: "stated",
    prescription: "stated",
    follow_up_notes: "stated",
  },
  created_at: visitDate,
  updated_at: visitDate,
};

const allergies: PatientAllergy[] = [
  {
    id: "f7c3e9b0-5555-4ddd-8888-eeeeeeeeeeee",
    patient_id: patient.id,
    allergen: "Penicillin",
    reaction: "Urticaria",
    severity: "moderate",
    recorded_at: visitDate,
  },
];

const bundle = buildOpConsultBundle({ patient, visit, doctor, allergies });

const out = resolve(__dirname, "fixture-bundle.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(bundle, null, 2), "utf8");
console.log(`Wrote ${out}`);
