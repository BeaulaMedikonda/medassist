import { execFile } from "node:child_process";
import http from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const port = Number(process.env.PORT || 8080);
const validatorJar = "/opt/fhir-validator/validator_cli.jar";
const fhirVersion = process.env.FHIR_VERSION || "4.0.1";
const igPackage = process.env.FHIR_VALIDATOR_IG_PACKAGE || "";
const txServer = process.env.FHIR_VALIDATOR_TX_SERVER || "n/a";
const timeout = Number(process.env.FHIR_VALIDATOR_TIMEOUT_MS || 120000);

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

function collectSeverity(outcome) {
  const issues = Array.isArray(outcome?.issue) ? outcome.issue : [];
  return {
    errors: issues.filter((issue) => issue.severity === "fatal" || issue.severity === "error").length,
    warnings: issues.filter((issue) => issue.severity === "warning").length,
    information: issues.filter((issue) => issue.severity === "information").length,
  };
}

async function validateBundle(bundle) {
  const dir = await mkdtemp(path.join(tmpdir(), "fhir-"));
  const inputPath = path.join(dir, "bundle.json");
  const outputPath = path.join(dir, "outcome.json");

  try {
    await writeFile(inputPath, JSON.stringify(bundle), "utf8");

    const args = [
      "-Dfile.encoding=UTF-8",
      "-jar",
      validatorJar,
      inputPath,
      "-version",
      fhirVersion,
      "-output",
      outputPath,
    ];

    for (const ig of igPackage.split(",").map((item) => item.trim()).filter(Boolean)) {
      args.push("-ig", ig);
    }

    if (txServer) {
      args.push("-tx", txServer);
    }

    let stdout = "";
    let stderr = "";
    let exitCode = 0;

    try {
      const result = await execFileAsync("java", args, {
        timeout,
        maxBuffer: 1024 * 1024 * 10,
      });
      stdout = result.stdout || "";
      stderr = result.stderr || "";
    } catch (error) {
      stdout = error.stdout || "";
      stderr = error.stderr || error.message || "";
      exitCode = typeof error.code === "number" ? error.code : 1;
    }

    let outcome = null;
    try {
      outcome = sanitizeOutcome(JSON.parse(await readFile(outputPath, "utf8")));
    } catch {
      outcome = {
        resourceType: "OperationOutcome",
        issue: [
          {
            severity: "error",
            code: "exception",
            diagnostics: stderr || stdout || "HL7 validator did not return an OperationOutcome.",
          },
        ],
      };
    }

    const summary = collectSeverity(outcome);
    return {
      ok: exitCode === 0 && summary.errors === 0,
      exitCode,
      fhirVersion,
      igPackage,
      txServer,
      summary,
      outcome,
      stdout: compactLog(stdout),
      stderr: compactLog(stderr),
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      sendJson(res, 200, { ok: true, validator: "hl7-validator-cli", fhirVersion, igPackage });
      return;
    }

    if (req.method === "POST" && req.url === "/validate") {
      const body = await readBody(req);
      const bundle = body.bundle || body;
      if (!bundle || typeof bundle !== "object") {
        sendJson(res, 400, { error: "Expected FHIR bundle JSON or { bundle } payload." });
        return;
      }

      const result = await validateBundle(bundle);
      sendJson(res, 200, result);
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Validator service error",
    });
  }
});

server.listen(port, () => {
  console.log(`HL7 FHIR validator service listening on ${port}`);
});

function sanitizeOutcome(outcome) {
  if (outcome && typeof outcome === "object") {
    delete outcome.text;
  }
  if (Array.isArray(outcome?.issue)) {
    outcome.issue = outcome.issue.map((issue) => ({
      ...issue,
      diagnostics: compactMessage(issue.diagnostics),
      details: issue.details
        ? {
            ...issue.details,
            text: compactMessage(issue.details.text),
          }
        : issue.details,
    }));
  }
  return outcome;
}

function compactMessage(value) {
  if (typeof value !== "string") return value;
  return value.replace(/\s+/g, " ").trim().slice(0, 1200);
}

function compactLog(value) {
  if (typeof value !== "string") return "";
  const compacted = value.replace(/\r/g, "").trim();
  return compacted.length > 4000 ? compacted.slice(-4000) : compacted;
}
