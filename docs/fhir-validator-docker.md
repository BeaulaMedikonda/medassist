# Self-hosted HL7 FHIR Validator

This project validates completed visit bundles in two layers:

1. App-level checks in `lib/fhir/validate.ts`.
2. Official HL7 FHIR R4 validation through a local Docker service.

The Docker service wraps the official HL7 `validator_cli.jar` and exposes a private local endpoint:

```text
POST http://localhost:8080/validate
```

The Next.js API route calls this URL through:

```env
FHIR_VALIDATOR_URL=http://localhost:8080
```

## Local Startup

Start Docker Desktop first, then run:

```bash
npm run fhir:validator:up
```

Check service health:

```bash
curl http://localhost:8080/health
```

Start the app:

```bash
npm run dev
```

Then open a completed visit and click `Validate FHIR`.

## Expected Flow

```text
Doctor clicks Validate FHIR
  -> Next.js API authenticates staff and visit access
  -> API builds FHIR R4 OPConsultRecord Bundle
  -> API runs app-level validation
  -> API posts Bundle to the Docker HL7 validator
  -> Validator returns OperationOutcome errors/warnings
  -> API stores pass/warning/fail in fhir_validation_results
  -> UI displays the result
```

## Notes

- No external validator API key is needed.
- Patient data is sent only to the local validator service.
- The default Docker setting uses `FHIR_VALIDATOR_TX_SERVER=n/a` to avoid external terminology calls during local validation.
- Production can enable a terminology server if required by deployment policy.
