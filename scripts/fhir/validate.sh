#!/usr/bin/env bash
# Generate the OPConsultRecord fixture and, when FHIR_STRICT_VALIDATE=1 is set,
# run the HL7 FHIR validator against NRCES profiles.
#
# Strict validation currently reports profile-conformance gaps that are useful
# for hardening but too noisy for the default CI gate.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FIXTURE="$ROOT/scripts/fhir/fixture-bundle.json"
CACHE_DIR="${FHIR_CACHE_DIR:-$HOME/.cache/fhir}"
JAR="$CACHE_DIR/validator_cli.jar"
JAR_URL="${FHIR_VALIDATOR_URL:-https://github.com/hapifhir/org.hl7.fhir.core/releases/latest/download/validator_cli.jar}"
IG_PACKAGE="${FHIR_IG_PACKAGE:-ndhm.in#6.5.0}"

# Generate the fixture from current types + Bundle builder.
echo "Generating fixture..."
npx --yes tsx "$ROOT/scripts/fhir/generate-fixture.ts"

if [ ! -f "$FIXTURE" ]; then
  echo "Fixture not generated at $FIXTURE" >&2
  exit 3
fi

if [ "${SKIP_FHIR_VALIDATE:-}" = "1" ]; then
  echo "SKIP_FHIR_VALIDATE=1 set; generated fixture only."
  exit 0
fi

if [ "${FHIR_STRICT_VALIDATE:-}" != "1" ]; then
  echo "FHIR_STRICT_VALIDATE is not set; generated fixture only."
  echo "Set FHIR_STRICT_VALIDATE=1 to run the HL7 validator against $IG_PACKAGE."
  exit 0
fi

mkdir -p "$CACHE_DIR"

if [ ! -f "$JAR" ]; then
  echo "Downloading FHIR validator from $JAR_URL ..."
  curl -L --fail --retry 3 -o "$JAR" "$JAR_URL"
fi

if ! command -v java >/dev/null 2>&1; then
  echo "java not found on PATH. Install JDK 17+ before running the validator." >&2
  exit 2
fi

# Run validator with NRCES IG loaded. The validator pulls the IG from
# packages2.fhir.org on first run and caches it.
echo "Validating $FIXTURE against NRCES OPConsultRecord profile using $IG_PACKAGE..."
java -jar "$JAR" "$FIXTURE" \
  -version 4.0.1 \
  -ig "$IG_PACKAGE" \
  -profile "https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle" \
  -tx n/a
