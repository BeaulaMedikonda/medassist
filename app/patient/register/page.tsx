import { redirect } from "next/navigation";
 
export default async function PatientRegisterRedirect({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = new URLSearchParams();
 
  const clinic = firstValue(params?.clinic);
  const clinicName = firstValue(params?.clinicName);
  if (clinic) next.set("clinic", clinic);
  if (clinicName) next.set("clinicName", clinicName);
 
  redirect(`/patient/login${next.toString() ? `?${next.toString()}` : ""}`);
}
 
function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
 
 