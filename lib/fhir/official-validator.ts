import type { FhirValidationIssue, FhirValidationResult } from "@/lib/fhir/validate";

type OperationOutcomeIssue = {
  severity?: string;
  code?: string;
  diagnostics?: string;
  details?: {
    text?: string;
    coding?: Array<{ code?: string; display?: string }>;
  };
  expression?: string[];
  location?: string[];
};

type ValidatorServiceResponse = {
  ok?: boolean;
  outcome?: {
    resourceType?: string;
    issue?: OperationOutcomeIssue[];
  };
  summary?: {
    errors?: number;
    warnings?: number;
    information?: number;
  };
  stderr?: string;
  error?: string;
};

export type OfficialValidatorResult = FhirValidationResult & {
  enabled: boolean;
  validator: "hl7-validator-cli" | "hl7-validator-unavailable";
};

export async function validateWithOfficialFhirValidator(
  bundle: Record<string, unknown>,
): Promise<OfficialValidatorResult> {
  const baseUrl = process.env.FHIR_VALIDATOR_URL?.replace(/\/+$/, "");
  if (!baseUrl) {
    return unavailable("HL7 FHIR Validator service is not configured.");
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      Number(process.env.FHIR_VALIDATOR_REQUEST_TIMEOUT_MS || 150000),
    );

    const response = await fetch(`${baseUrl}/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bundle }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const payload = (await response.json().catch(() => ({}))) as ValidatorServiceResponse;
    if (!response.ok) {
      return unavailable(payload.error || `HL7 validator service returned ${response.status}.`);
    }

    return normalizeOperationOutcome(payload);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "HL7 validator service could not be reached.";
    return unavailable(message);
  }
}

function normalizeOperationOutcome(payload: ValidatorServiceResponse): OfficialValidatorResult {
  const issues = Array.isArray(payload.outcome?.issue) ? payload.outcome.issue : [];
  const errors: FhirValidationIssue[] = [];
  const warnings: FhirValidationIssue[] = [];

  for (const issue of issues) {
    const normalized = normalizeIssue(issue);
    if (issue.severity === "fatal" || issue.severity === "error") {
      errors.push(normalized);
    } else if (issue.severity === "warning" || issue.severity === "information") {
      warnings.push(normalized);
    }
  }

  return {
    enabled: true,
    validator: "hl7-validator-cli",
    status: errors.length > 0 ? "failed" : warnings.length > 0 ? "warning" : "passed",
    errors,
    warnings,
  };
}

function normalizeIssue(issue: OperationOutcomeIssue): FhirValidationIssue {
  const code =
    issue.details?.coding?.find((coding) => coding.code)?.code ||
    issue.code ||
    issue.severity ||
    "issue";
  const message =
    issue.diagnostics ||
    issue.details?.text ||
    issue.details?.coding?.find((coding) => coding.display)?.display ||
    "HL7 validator reported an issue.";

  return {
    code: `hl7.${code}`,
    message: message.replace(/\s+/g, " ").trim().slice(0, 1200),
    path: issue.expression?.[0] || issue.location?.[0],
  };
}

function unavailable(message: string): OfficialValidatorResult {
  return {
    enabled: false,
    validator: "hl7-validator-unavailable",
    status: "warning",
    errors: [],
    warnings: [
      {
        code: "hl7.validator_unavailable",
        message,
      },
    ],
  };
}
