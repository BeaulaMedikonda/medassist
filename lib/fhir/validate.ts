export type FhirValidationStatus = "passed" | "warning" | "failed";

export type FhirValidationIssue = {
  code: string;
  message: string;
  path?: string;
};

export type FhirValidationResult = {
  status: FhirValidationStatus;
  errors: FhirValidationIssue[];
  warnings: FhirValidationIssue[];
};

type FhirEntry = {
  fullUrl?: unknown;
  resource?: Record<string, unknown>;
};

const REQUIRED_RESOURCE_TYPES = ["Composition", "Patient", "Practitioner", "Encounter"];

export function validateFhirBundle(bundle: unknown): FhirValidationResult {
  const errors: FhirValidationIssue[] = [];
  const warnings: FhirValidationIssue[] = [];

  if (!isRecord(bundle)) {
    return {
      status: "failed",
      errors: [
        {
          code: "bundle.not_object",
          message: "FHIR bundle must be a JSON object.",
          path: "$",
        },
      ],
      warnings,
    };
  }

  if (bundle.resourceType !== "Bundle") {
    errors.push({
      code: "bundle.resource_type",
      message: "Top-level resourceType must be Bundle.",
      path: "$.resourceType",
    });
  }

  if (bundle.type !== "document") {
    errors.push({
      code: "bundle.type",
      message: "OP consultation bundle must be a document Bundle.",
      path: "$.type",
    });
  }

  const entries = Array.isArray(bundle.entry) ? (bundle.entry as FhirEntry[]) : [];
  if (entries.length === 0) {
    errors.push({
      code: "bundle.entry_missing",
      message: "Bundle must contain at least one entry.",
      path: "$.entry",
    });
  }

  const fullUrls = new Set<string>();
  const resources = entries.flatMap((entry, index) => {
    if (typeof entry.fullUrl !== "string" || entry.fullUrl.trim() === "") {
      errors.push({
        code: "entry.full_url_missing",
        message: "Every Bundle entry must have a fullUrl.",
        path: `$.entry[${index}].fullUrl`,
      });
    } else if (fullUrls.has(entry.fullUrl)) {
      errors.push({
        code: "entry.full_url_duplicate",
        message: "Bundle entry fullUrl values must be unique.",
        path: `$.entry[${index}].fullUrl`,
      });
    } else {
      fullUrls.add(entry.fullUrl);
    }

    if (!isRecord(entry.resource)) {
      errors.push({
        code: "entry.resource_missing",
        message: "Every Bundle entry must contain a resource object.",
        path: `$.entry[${index}].resource`,
      });
      return [];
    }

    if (typeof entry.resource.resourceType !== "string") {
      errors.push({
        code: "resource.resource_type_missing",
        message: "Every FHIR resource must have resourceType.",
        path: `$.entry[${index}].resource.resourceType`,
      });
    }

    return [{ fullUrl: entry.fullUrl, resource: entry.resource, index }];
  });

  for (const resourceType of REQUIRED_RESOURCE_TYPES) {
    if (!resources.some((entry) => entry.resource.resourceType === resourceType)) {
      errors.push({
        code: "resource.required_missing",
        message: `${resourceType} resource is required in the document bundle.`,
        path: "$.entry",
      });
    }
  }

  const composition = resources.find((entry) => entry.resource.resourceType === "Composition")?.resource;
  if (composition) {
    requireString(composition.status, "composition.status", "$.Composition.status", errors);
    requireReference(composition.subject, "Composition.subject must reference Patient.", "$.Composition.subject", errors);
    requireReference(composition.encounter, "Composition.encounter must reference Encounter.", "$.Composition.encounter", errors);
    if (!Array.isArray(composition.author) || composition.author.length === 0) {
      errors.push({
        code: "composition.author_missing",
        message: "Composition must contain at least one author.",
        path: "$.Composition.author",
      });
    }
    if (!Array.isArray(composition.section) || composition.section.length === 0) {
      warnings.push({
        code: "composition.sections_missing",
        message: "Composition has no sections; external consumers may receive a sparse clinical document.",
        path: "$.Composition.section",
      });
    }
  }

  const patient = resources.find((entry) => entry.resource.resourceType === "Patient")?.resource;
  if (patient) {
    if (!Array.isArray(patient.identifier) || patient.identifier.length === 0) {
      errors.push({
        code: "patient.identifier_missing",
        message: "Patient must include at least one identifier.",
        path: "$.Patient.identifier",
      });
    }
    if (!Array.isArray(patient.name) || patient.name.length === 0) {
      errors.push({
        code: "patient.name_missing",
        message: "Patient must include a name.",
        path: "$.Patient.name",
      });
    }
    if (typeof patient.birthDate !== "string" || patient.birthDate.trim() === "") {
      warnings.push({
        code: "patient.birth_date_missing",
        message: "Patient birthDate is missing; age-derived dates should be reviewed for profile compliance.",
        path: "$.Patient.birthDate",
      });
    }
  }

  const practitioner = resources.find((entry) => entry.resource.resourceType === "Practitioner")?.resource;
  if (practitioner) {
    if (!Array.isArray(practitioner.name) || practitioner.name.length === 0) {
      errors.push({
        code: "practitioner.name_missing",
        message: "Practitioner must include a name.",
        path: "$.Practitioner.name",
      });
    }
    if (!Array.isArray(practitioner.identifier) || practitioner.identifier.length === 0) {
      warnings.push({
        code: "practitioner.identifier_missing",
        message: "Practitioner identifier is missing; HPR or registration number is recommended.",
        path: "$.Practitioner.identifier",
      });
    }
  }

  const encounter = resources.find((entry) => entry.resource.resourceType === "Encounter")?.resource;
  if (encounter) {
    requireString(encounter.status, "encounter.status", "$.Encounter.status", errors);
    requireReference(encounter.subject, "Encounter.subject must reference Patient.", "$.Encounter.subject", errors);
    if (!isRecord(encounter.period) || typeof encounter.period.start !== "string") {
      errors.push({
        code: "encounter.period_start_missing",
        message: "Encounter must include period.start.",
        path: "$.Encounter.period.start",
      });
    }
  }

  validateReferences(resources, fullUrls, errors);
  validateClinicalContent(resources, warnings);

  return {
    status: errors.length > 0 ? "failed" : warnings.length > 0 ? "warning" : "passed",
    errors,
    warnings,
  };
}

function validateReferences(
  resources: Array<{ fullUrl: unknown; resource: Record<string, unknown>; index: number }>,
  fullUrls: Set<string>,
  errors: FhirValidationIssue[],
) {
  resources.forEach(({ resource, index }) => {
    const refs = collectReferences(resource);
    refs.forEach(({ reference, path }) => {
      if (reference.startsWith("#")) return;
      if (!fullUrls.has(reference)) {
        errors.push({
          code: "reference.unresolved",
          message: `Reference does not point to a Bundle entry: ${reference}`,
          path: `$.entry[${index}].resource${path}`,
        });
      }
    });
  });
}

function validateClinicalContent(
  resources: Array<{ resource: Record<string, unknown> }>,
  warnings: FhirValidationIssue[],
) {
  if (!resources.some((entry) => entry.resource.resourceType === "Condition")) {
    warnings.push({
      code: "clinical.condition_missing",
      message: "No Condition resource found; diagnosis may be missing from the bundle.",
      path: "$.entry",
    });
  }

  if (!resources.some((entry) => entry.resource.resourceType === "MedicationRequest")) {
    warnings.push({
      code: "clinical.medication_request_missing",
      message: "No MedicationRequest resource found; prescription may be empty.",
      path: "$.entry",
    });
  }

  const observations = resources.filter((entry) => entry.resource.resourceType === "Observation");
  if (observations.length === 0) {
    warnings.push({
      code: "clinical.observation_missing",
      message: "No Observation resources found; vitals or clinical observations may be missing.",
      path: "$.entry",
    });
  }
}

function collectReferences(value: unknown, path = ""): Array<{ reference: string; path: string }> {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectReferences(item, `${path}[${index}]`));
  }

  if (!isRecord(value)) return [];

  const ownReference =
    typeof value.reference === "string" && value.reference.trim() !== ""
      ? [{ reference: value.reference, path: `${path}.reference` }]
      : [];

  return [
    ...ownReference,
    ...Object.entries(value).flatMap(([key, nested]) =>
      key === "reference" ? [] : collectReferences(nested, `${path}.${key}`),
    ),
  ];
}

function requireString(
  value: unknown,
  code: string,
  path: string,
  errors: FhirValidationIssue[],
) {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push({
      code,
      message: `${path.replace(/^\$\./, "")} is required.`,
      path,
    });
  }
}

function requireReference(
  value: unknown,
  message: string,
  path: string,
  errors: FhirValidationIssue[],
) {
  if (!isRecord(value) || typeof value.reference !== "string" || value.reference.trim() === "") {
    errors.push({
      code: "reference.required_missing",
      message,
      path,
    });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
