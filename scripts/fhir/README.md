# FHIR Bundle validator

This folder contains the offline validator harness for the OPConsultRecord
Bundle that `/api/fhir/visit/[id]` emits. It runs the official HL7 Java
validator (`validator_cli.jar`) against the NRCES profiles published by NHA.

## What gets checked
- Bundle structure (`type: document`, Composition first, all references resolve).
- Every resource against its NRCES profile claimed in `meta.profile`.
- Required code systems (LOINC, ICD-10, UCUM, SNOMED CT) are bound correctly.
- Cardinality of required fields (Patient.birthDate, Encounter.class, etc).

## Run locally
```bash
npm run fhir:validate
```

This generates `fixture-bundle.json` from synthetic data via `generate-fixture.ts`.

Strict NRCES validation is available as a hardening check:
```bash
FHIR_STRICT_VALIDATE=1 npm run fhir:validate:strict
```

Strict mode downloads `validator_cli.jar` (HL7's official validator, ~120 MB)
into `~/.cache/fhir/` if not already present and runs with the NRCES IG loaded
(`-ig ndhm.in#6.5.0` by default; override with `FHIR_IG_PACKAGE`).

## Run in CI
The GitHub Action at `.github/workflows/fhir-validate.yml` runs fixture
generation on every push and PR that touches `lib/fhir/**` or `types/db.ts`.

## When the fixture changes
If you add or remove a field from `Patient`, `Visit`, or `Doctor`, update
`generate-fixture.ts` accordingly. The fixture must always be a complete,
realistic OPD visit so the validator exercises every code path in the
Bundle builder.

## Skipping CI temporarily
Set `SKIP_FHIR_VALIDATE=1` on the workflow run to skip.
