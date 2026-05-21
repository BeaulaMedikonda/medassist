"use client";

import { PatientAllergies } from "@/components/emr/PatientAllergies";
import type { PatientAllergy } from "@/types/db";

export function PatientAllergiesSection({
  patientId,
  initialAllergies,
}: {
  patientId: string;
  initialAllergies: PatientAllergy[];
}) {
  return (
    <PatientAllergies
      patientId={patientId}
      initialAllergies={initialAllergies}
    />
  );
}