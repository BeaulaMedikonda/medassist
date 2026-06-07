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
  Appointment,
  Clinic,
  Doctor,
  Immunization,
  Patient,
  PatientAllergy,
  Referral,
  Visit,
} from "../../types/db";

const visitDate = "2026-05-08T10:30:00.000Z";

const patient: Patient = {
  id: "f7c3e9b0-1111-4ddd-8888-aaaaaaaaaaaa",
  doctor_id: "f7c3e9b0-2222-4ddd-8888-bbbbbbbbbbbb",
  clinic_id: "f7c3e9b0-3333-4ddd-8888-cccccccccccc",
  emr_number: "HD-2026-00001",
  full_name: "Anjali Reddy",
  first_name: "Anjali",
  last_name: "Reddy",
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
  height_cm: 162,
  blood_group: "O+",
  known_allergies: "Penicillin",
  chronic_conditions: "T2DM, HTN",
  emergency_contact: "+919800001234",
  abha_id: "91-7412-3456-7890",
  abha_address: "anjali@abdm",
  created_at: visitDate,
  last_visit_at: visitDate,
};

const doctor: Doctor = {
  id: "f7c3e9b0-2222-4ddd-8888-bbbbbbbbbbbb",
  auth_user_id: null,
  email: "vikram@example.com",
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

const clinic: Clinic = {
  id: "f7c3e9b0-3333-4ddd-8888-cccccccccccc",
  name: "Hello Doctor Clinic",
  address: "12, MG Road, Bengaluru",
  phone: "+918012345678",
  invite_code: "DEMO",
  city: "Bengaluru",
  state: "Karnataka",
  email: "clinic@example.com",
  established_year: 2026,
  letterhead_header: null,
  letterhead_footer: null,
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
  height_cm: 162,
  chief_complaints: "Sore throat x 3 days, low-grade fever, body ache",
  history_present_illness:
    "Throat pain on swallowing since 3 days, intermittent fever (~99 F), no cough.",
  past_history: "T2DM on Metformin, HTN on Telmisartan.",
  examination_findings:
    "Throat erythematous, no exudate. No cervical lymphadenopathy. Chest clear.",
  provisional_diagnosis: "Viral fever with pharyngitis and myalgia",
  confirmed_diagnosis: null,
  icd_codes: ["J06.9", "R50.9", "M79.1"],
  icd_code_details: [
    { code: "J06.9", name: "Acute upper respiratory infection, unspecified" },
    { code: "R50.9", name: "Fever, unspecified" },
    { code: "M79.1", name: "Myalgia" },
  ],
  investigations_ordered: "CBC, CRP",
  loinc_code_details: [
    {
      test_name: "CBC",
      loinc_code: null,
      loinc_name: "Complete blood count panel",
      ucum_unit: null,
    },
    {
      test_name: "CRP",
      loinc_code: "1988-5",
      loinc_name: "C reactive protein [Mass/volume] in Serum or Plasma",
      ucum_unit: null,
    },
  ],
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
  audio_url: "visit-audio/demo.webm",
  transcript_text: "Doctor: Please take medicines after food. Patient: Okay.",
  transcript_original: "Doctor: Please take medicines after food. Patient: Okay.",
  transcript_language: "en",
  transcript_speakers: [
    {
      speaker: "SPEAKER_1",
      text: "Please take medicines after food.",
      start: 0,
      end: 3,
    },
    {
      speaker: "SPEAKER_2",
      text: "Okay.",
      start: 3,
      end: 4,
    },
  ],
  doctor_speaker_id: null,
  doctor_id_confidence: null,
  llm_extraction_raw: { fixture: true },
  doctor_notes: null,
  speaker_roles: null,
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

const immunizations: Immunization[] = [
  {
    id: "f7c3e9b0-6666-4ddd-8888-ffffffffffff",
    clinic_id: clinic.id,
    patient_id: patient.id,
    visit_id: visit.id,
    created_by: doctor.id,
    updated_by: doctor.id,
    created_role: "doctor",
    vaccine_name: "Tdap",
    date_given: "2026-05-08",
    dose: "0.5 mL",
    cvx_code: "115",
    status: "completed",
    next_due_date: "2036-05-08",
    notes: "Given during visit.",
    created_at: visitDate,
    updated_at: visitDate,
  },
];

const referrals: Referral[] = [
  {
    id: "f7c3e9b0-7777-4ddd-8888-111111111111",
    clinic_id: clinic.id,
    patient_id: patient.id,
    visit_id: visit.id,
    referring_doctor_id: doctor.id,
    referred_to_doctor_id: null,
    referred_to_name: "Dr. ENT Specialist",
    referred_to_specialty: "ENT",
    referred_to_hospital: "City ENT Center",
    referred_to_phone: "+918055555555",
    referred_to_email: "ent@example.com",
    reason: "Persistent throat symptoms if not improving.",
    notes: "Review if fever persists.",
    status: "draft",
    created_by: doctor.id,
    created_at: visitDate,
    updated_at: visitDate,
  },
];

const appointments: Appointment[] = [
  {
    id: "f7c3e9b0-8888-4ddd-8888-222222222222",
    clinic_id: clinic.id,
    patient_id: patient.id,
    doctor_id: doctor.id,
    scheduled_at: "2026-05-13T10:30:00.000Z",
    duration_minutes: 15,
    type: "follow_up",
    priority: "routine",
    status: "scheduled",
    notes: "Follow-up review.",
    created_by: doctor.id,
    created_at: visitDate,
    updated_at: visitDate,
  },
];

const painMaps = [
  {
    id: "f7c3e9b0-9999-4ddd-8888-333333333333",
    pain_type: "throbbing",
    intensity: 7,
    pain_locations: ["head", "lower back"],
    marked_points: ["head - throbbing - 7/10", "lower back - sharp - 5/10"],
    pain_summary: "Headache and lower back pain recorded on pain map.",
    created_at: visitDate,
  },
];

const bundle = buildOpConsultBundle({
  patient,
  visit,
  doctor,
  allergies,
  clinic,
  immunizations,
  referrals,
  appointments,
  painMaps,
});

const out = resolve(__dirname, "fixture-bundle.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(bundle, null, 2), "utf8");
console.log(`Wrote ${out}`);
