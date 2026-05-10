export type Sex = "M" | "F" | "O";
export type Confidence = "high" | "medium" | "low";
export type MedicineStatus = "new" | "continued" | "modified" | "stopped";
export type StaffRole = "doctor" | "medical_assistant" | "admin";
export type AssignmentRole = "attending" | "resident" | "consultant";
export type VisitStatus =
  | "intake"
  | "queued"
  | "in_progress"
  | "awaiting_review"
  | "completed"
  | "cancelled";
export type AppointmentType = "regular" | "follow_up" | "emergency" | "procedure";
export type AppointmentPriority = "normal" | "urgent" | "routine";
export type AppointmentStatus =
  | "scheduled"
  | "checked_in"
  | "completed"
  | "cancelled"
  | "no_show";

export type Clinic = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  invite_code: string;
  city: string | null;
  state: string | null;
  email: string | null;
  established_year: number | null;
  letterhead_header: string | null;
  letterhead_footer: string | null;
  created_at: string;
};

// Note: the `doctors` table actually holds all clinic staff (including medical assistants).
// The table name is kept for migration continuity. `role` distinguishes doctor vs. medical_assistant vs. admin.
export type Doctor = {
  id: string;
  full_name: string;
  qualification: string | null;
  registration_number: string | null;
  hpr_id: string | null;
  clinic_name: string | null;
  clinic_address: string | null;
  clinic_phone: string | null;
  signature_url: string | null;
  letterhead_url: string | null;
  preferred_language: string;
  role: StaffRole;
  clinic_id: string | null;
  created_at: string;
};

export type Patient = {
  id: string;
  doctor_id: string;
  clinic_id: string | null;
  emr_number: string;
  full_name: string;
  given_name: string | null;
  family_name: string | null;
  age: number | null;
  birthdate: string | null;
  sex: Sex | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  blood_group: string | null;
  known_allergies: string | null;
  chronic_conditions: string | null;
  emergency_contact: string | null;
  abha_id: string | null;
  abha_address: string | null;
  created_at: string;
  last_visit_at: string | null;
};

export type PatientAllergy = {
  id: string;
  patient_id: string;
  allergen: string;
  reaction: string | null;
  severity: "mild" | "moderate" | "severe" | null;
  recorded_at: string;
};

export type DisclosureConsumerType =
  | "self_print"
  | "patient_pdf"
  | "fhir_export"
  | "abdm_hiu"
  | "referral"
  | "insurer";

export type ClinicalDisclosure = {
  id: string;
  clinic_id: string;
  patient_id: string;
  visit_id: string | null;
  actor_id: string | null;
  consumer_type: DisclosureConsumerType;
  consumer_label: string | null;
  consent_artifact_id: string | null;
  bundle_profile: string;
  content_sha256: string;
  content_bytes: number;
  metadata: Record<string, unknown> | null;
  disclosed_at: string;
};

// Per-field marker telling the review UI whether the AI quoted directly from
// the conversation ("stated") or made a clinical inference ("assumed").
// Drives the green vs. yellow highlight on each field. See
// docs/abdm-fhir-r4.html for the UX contract.
export type FieldAssumption = "stated" | "assumed" | null;
export type FieldAssumptionsMap = Partial<{
  chief_complaints: FieldAssumption;
  history_present_illness: FieldAssumption;
  examination_findings: FieldAssumption;
  provisional_diagnosis: FieldAssumption;
  confirmed_diagnosis: FieldAssumption;
  investigations_ordered: FieldAssumption;
  icd_codes: FieldAssumption;
  vitals: FieldAssumption;
  advice: FieldAssumption;
  prescription: FieldAssumption;
  follow_up_notes: FieldAssumption;
}>;

export type Medicine = {
  name: string;
  dose: string | null;
  frequency: string | null;
  duration: string | null;
  route: string | null;
  instructions: string | null;
  status: MedicineStatus;
  previous?: Partial<Medicine>;
};

export type Prescription = {
  medicines: Medicine[];
  previous_prescription_id?: string | null;
};

export type SpeakerTurn = {
  speaker: string;
  text: string;
  translated_text?: string;
  start: number;
  end: number;
};

export type VisitDoctorAssignment = {
  visit_id: string;
  doctor_id: string;
  role: AssignmentRole;
  assigned_at: string;
};

export type Visit = {
  id: string;
  patient_id: string;
  doctor_id: string;
  clinic_id: string | null;
  created_by: string | null;
  visit_date: string;
  status: VisitStatus;
  completed_at: string | null;

  bp_systolic: number | null;
  bp_diastolic: number | null;
  pulse: number | null;
  temperature_f: number | null;
  spo2: number | null;
  weight_kg: number | null;
  height_cm: number | null;

  chief_complaints: string | null;
  history_present_illness: string | null;
  past_history: string | null;
  examination_findings: string | null;
  provisional_diagnosis: string | null;
  confirmed_diagnosis: string | null;
  icd_codes: string[] | null;

  investigations_ordered: string | null;
  prescription: Prescription | null;
  advice: string | null;
  follow_up_date: string | null;
  follow_up_notes: string | null;

  audio_url: string | null;
  transcript_text: string | null;
  transcript_original: string | null;
  transcript_language: string | null;
  transcript_speakers: SpeakerTurn[] | null;
  doctor_speaker_id: string | null;
  doctor_id_confidence: Confidence | null;
  llm_extraction_raw: unknown;
  doctor_notes: string | null;

  pre_visit_summary: string | null;
  pre_visit_summary_generated_at: string | null;

  encounter_class: string | null;
  field_assumptions: FieldAssumptionsMap | null;

  created_at: string;
  updated_at: string;
};

export type Appointment = {
  id: string;
  clinic_id: string;
  patient_id: string | null;
  doctor_id: string;
  scheduled_at: string;
  duration_minutes: number;
  type: AppointmentType;
  priority: AppointmentPriority;
  status: AppointmentStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ExtractionResult = {
  doctor_speaker_id: string | null;
  doctor_id_confidence: Confidence;
  speaker_role_notes: string | null;
  vitals: {
    bp_systolic: number | null;
    bp_diastolic: number | null;
    pulse: number | null;
    temperature_f: number | null;
    spo2: number | null;
    weight_kg: number | null;
  };
  chief_complaints: string | null;
  history_present_illness: string | null;
  examination_findings: string | null;
  provisional_diagnosis: string | null;
  confirmed_diagnosis: string | null;
  investigations_ordered: string | null;
  icd_codes: string[];
  prescription: Prescription;
  advice: string | null;
  follow_up_days: number | null;
  follow_up_notes: string | null;
  field_assumptions: FieldAssumptionsMap;
  extraction_confidence: Confidence;
  ambiguities: string[];
};
