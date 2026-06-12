export const PATIENT_DEMO_SESSION_COOKIE = "patient_demo_session";
export const PATIENT_DEMO_PROFILE_COOKIE = "patient_demo_profile";
 
export type PatientDemoSession = {
  phone: string;
  clinicId: string;
  clinicName?: string;
};
 
export function patientDemoProfileKey(clinicId: string | null | undefined, phone: string | null | undefined) {
  const normalizedClinic = clinicId || "no-clinic";
  const normalizedPhone = (phone || "").replace(/\D/g, "").slice(-10);
  return `${normalizedClinic}:${normalizedPhone}`;
}
 
export function encodePatientDemoSession(session: PatientDemoSession) {
  return encodeURIComponent(JSON.stringify(session));
}
 
export function decodePatientDemoSession(value: string | null | undefined): PatientDemoSession | null {
  if (!value) return null;
 
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<PatientDemoSession>;
    const phone = normalizeMobile(parsed.phone);
    const clinicId = typeof parsed.clinicId === "string" ? parsed.clinicId : "";
    if (!phone || !clinicId) return null;
    return {
      phone,
      clinicId,
      clinicName: typeof parsed.clinicName === "string" ? parsed.clinicName : undefined,
    };
  } catch {
    return null;
  }
}
 
function normalizeMobile(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, "") || "";
  return digits.length > 10 ? digits.slice(-10) : digits;
}
 
 