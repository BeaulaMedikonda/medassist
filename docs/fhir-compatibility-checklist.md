# FHIR Compatibility Checklist

This checklist tracks what the current OP consultation FHIR export includes,
what is intentionally left out, and what should be validated before adding more
resources to the bundle.

## Current Target

- FHIR version: R4
- Main profile target: ABDM/NRCeS OPConsultRecord
- Export endpoint: `GET /api/fhir/visit/[id]`
- Bundle type: `document`
- Primary builder: `lib/fhir/bundle.ts`

## Compatibility Checks

- [ ] Current bundle validates as base FHIR R4.
- [ ] Current bundle validates against ABDM/NRCeS `DocumentBundle`.
- [ ] `Composition` is the first bundle entry.
- [ ] `Composition.section` entries are accepted by the selected profile.
- [ ] Every `urn:uuid:` reference resolves to an entry in the same bundle.
- [ ] Required patient, practitioner, encounter, and composition fields exist.
- [ ] Units use UCUM codes correctly.
- [ ] Vitals use appropriate LOINC codes.
- [ ] Medication route/frequency/duration mappings are clinically readable.
- [ ] ICD-10 codes are present when diagnosis codes are available.
- [x] ICD-10 display names are not misleading for covered common OPD codes.
- [x] Temperature display text is clean and does not contain encoding artifacts.
- [ ] Missing clinical fields are documented before new resources are added.

## Included In The Current OP Consult Bundle

- Patient demographics
- Doctor details
- Encounter/visit timing and status
- Chief complaint
- History of present illness and past history
- Examination findings
- Diagnosis
- ICD codes
- Active/current medicines
- Vitals: BP, pulse, temperature, SpO2, weight, height when recorded
- Blood group when recorded
- Allergies
- Investigations ordered
- Graphic pain map summary as pain score/location observations
- Advice
- Follow-up date and notes
- Care plan/advice as `CarePlan`
- Emergency contact when recorded
- Chronic conditions when recorded
- Clinic details as `Organization`
- Doctor role linked to clinic as `PractitionerRole`
- Medicine catalog entries as `Medication`
- Medicine order statuses as notes on `MedicationRequest`
- Immunizations when linked to the visit/date
- Referrals linked to the visit
- Follow-up appointments when found
- Pre-visit summary/transcript/audio/internal notes as `DocumentReference`
- Bundle provenance as `Provenance`
- Export/share event representation as `AuditEvent`

## Still To Add Or Decide

- Lab results: no lab-result table is currently mapped; when available, map to
  `DiagnosticReport` plus result `Observation` resources.
- Pharmacy dispense events: no dispense table is currently mapped; when
  available, map to `MedicationDispense`.
- Consent for sharing record: no consent artifact is passed to the bundle
  builder yet; when available, map to `Consent`.
- Structured AI metadata: `field_assumptions`, confidence, raw LLM output, and
  speaker roles are still not exported as structured provenance. Only document
  content and generic `Provenance` are emitted.
- Full graphic pain coordinates: current export emits pain score/location
  summary. Raw x/y marker coordinates are intentionally not exported until a
  profile-safe extension or separate pain-map export is designed.
- ICD dictionary coverage: common OPD codes have code-specific display labels,
  but the lookup should be expanded as new diagnosis codes appear in production.
- Diagnosis priority: `confirmed_diagnosis` wins over `provisional_diagnosis`;
  if both exist, only the confirmed diagnosis is exported as the primary
  diagnosis condition.

## Current Gaps After Low-Risk Additions

- Need strict NRCeS validation for the expanded bundle. Base fixture generation
  passes, but profile acceptance is not guaranteed until strict validation runs.
  Current local blocker: Java is not installed on PATH, and the HL7 validator jar
  is not cached.
- Decide whether expanded resources should stay in the OPConsultRecord bundle or
  move to separate exports such as ImmunizationRecord, Referral, and Pain Map.
- Add code dictionaries for ICD-10 and maybe CVX/drug coding if production
  interoperability requires coded display names.
- Add real lab-result and pharmacy-dispense source tables before emitting
  `DiagnosticReport` or `MedicationDispense`.
- Add consent artifact support before emitting real `Consent` resources.

## Lowest-Risk Additions

These can be added to the OP consult bundle because they map to standard FHIR
fields and can be emitted only when data exists.

- Height as a vital-sign `Observation` - added
- Emergency contact as `Patient.contact` - added
- Chronic conditions as additional `Condition` resources - added
- Cleaner temperature unit display - added
- Better ICD-10 display labels for covered common OPD codes - added

## Avoid In The Main OPConsultRecord For Now

These may need separate profile checks, separate endpoints, or explicit consent
decisions before export.

- Full transcript/audio
- Raw AI output
- Field assumptions and model confidence
- Graphic pain map coordinates
- Internal doctor notes

## Recommended Expansion Path

1. Validate the current OP consult export.
2. Fix clear compatibility bugs first.
3. Add low-risk optional OP consult fields.
4. Validate again.
5. Add separate FHIR exports for immunizations, referrals, and pain maps when
   their target profiles are clear.
