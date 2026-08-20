#!/usr/bin/env node

/**
 * Generates docs/eol-dependency-catalog.csv and docs/eol-dependency-catalog-report.md
 * for RHDH core direct deps. See docs/eol-dependency-catalog.md for how this works.
 *
 * Scope (this phase): root + packages/* + plugins/* + python/*.in + platforms.
 * Dynamic-plugin wrappers and other repos are out of scope.
 *
 * Usage:
 *   node scripts/generate-eol-catalog.mjs
 *   node scripts/generate-eol-catalog.mjs --offline
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
process.chdir(repoRoot);

const OFFLINE = process.argv.includes("--offline");

/** Frozen 2.2 GA assumption until a real GA date is set (2027Q1). */
const GA = new Date("2027-03-01T00:00:00Z");
const SUPPORT_MONTHS = 10;
const UNMAINTAINED_MONTHS = 18;
const WINDOW_END = addMonths(GA, SUPPORT_MONTHS);
const UNMAINTAINED_BEFORE = addMonths(new Date(), -UNMAINTAINED_MONTHS);

const OUTPUT_CSV = join(repoRoot, "docs/eol-dependency-catalog.csv");
const OUTPUT_MD = join(repoRoot, "docs/eol-dependency-catalog-report.md");

const CSV_COLUMNS = [
  "ecosystem",
  "name",
  "version",
  "dep_type",
  "tree",
  "declared_in",
  "status",
  "eol_date",
  "last_publish",
  "deprecated",
  "risk",
  "notes",
];

const TEST_NAME =
  /(?:^@types\/|jest|testing-library|test-utils|jsdom|@jest\/)/i;
const AUTH_CRYPTO_NETWORK =
  /auth|passport|oidc|oauth|jwt|crypto|helmet|https-proxy|global-agent|undici|openid|keycloak|saml|tls|ssh/i;

function addMonths(date, months) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function isoDate(value) {
  if (!value) {
    return "";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 10);
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

async function mapPool(items, limit, mapper) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= items.length) {
        return;
      }
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

function listCorePackageJsons() {
  const files = ["package.json"];
  for (const dir of ["packages", "plugins"]) {
    const dirPath = join(repoRoot, dir);
    for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }
      const pkgPath = join(dir, entry.name, "package.json");
      if (existsSync(join(repoRoot, pkgPath))) {
        files.push(pkgPath);
      }
    }
  }
  return files;
}

function collectNpmDeclarations() {
  /** @type {Map<string, object>} */
  const rows = new Map();

  function add(name, version, depType, declaredIn) {
    if (!name || version.startsWith("workspace:")) {
      return;
    }
    const key = `npm|${name}|${version}|${depType}`;
    const existing = rows.get(key);
    if (existing) {
      existing.declaredIn.add(declaredIn);
      return;
    }
    rows.set(key, {
      ecosystem: "npm",
      name,
      version,
      depType,
      tree: "root-workspace",
      declaredIn: new Set([declaredIn]),
    });
  }

  for (const relativePath of listCorePackageJsons()) {
    const pkg = JSON.parse(readFileSync(relativePath, "utf8"));
    for (const [depType, deps] of [
      ["dependencies", pkg.dependencies],
      ["devDependencies", pkg.devDependencies],
      ["peerDependencies", pkg.peerDependencies],
    ]) {
      for (const [name, version] of Object.entries(deps ?? {})) {
        add(name, version, depType, relativePath);
      }
    }
    if (pkg.resolutions) {
      for (const [name, version] of Object.entries(pkg.resolutions)) {
        add(name, version, "resolutions", relativePath);
      }
    }
  }

  return [...rows.values()];
}

function parsePythonRequirement(line) {
  const trimmed = line.split("#")[0].trim();
  if (!trimmed) {
    return undefined;
  }
  const urlPin = trimmed.match(
    /^([A-Za-z0-9_.-]+)\s+@\s+(\S+?)(?:\s+--hash=.*)?$/,
  );
  if (urlPin) {
    return { name: urlPin[1], version: urlPin[2], notes: "url pin" };
  }
  const pinned = trimmed.match(/^([A-Za-z0-9_.-]+)\s*([=<>!~].*)$/);
  if (pinned) {
    return { name: pinned[1], version: pinned[2].trim(), notes: "" };
  }
  if (/^[A-Za-z0-9_.-]+$/.test(trimmed)) {
    return { name: trimmed, version: "unpinned", notes: "unpinned" };
  }
  return undefined;
}

function collectPythonDeclarations() {
  const rows = new Map();
  for (const relativePath of [
    "python/requirements.in",
    "python/requirements-build.in",
  ]) {
    const text = readFileSync(relativePath, "utf8");
    for (const line of text.split("\n")) {
      const parsed = parsePythonRequirement(line);
      if (!parsed) {
        continue;
      }
      const key = `pypi|${parsed.name}|${parsed.version}|docs-python`;
      const existing = rows.get(key);
      if (existing) {
        existing.declaredIn.add(relativePath);
        continue;
      }
      rows.set(key, {
        ecosystem: "pypi",
        name: parsed.name,
        version: parsed.version,
        depType: "dependencies",
        tree: "python",
        declaredIn: new Set([relativePath]),
        notes: parsed.notes,
      });
    }
  }
  return [...rows.values()];
}

function collectPlatforms() {
  const rootPkg = JSON.parse(readFileSync("package.json", "utf8"));
  const containerfile = readFileSync(
    "build/containerfiles/Containerfile",
    "utf8",
  );
  const ubiMatch = containerfile.match(/ubi(\d+)\/nodejs-(\d+)/);

  return [
    {
      ecosystem: "platform",
      name: "nodejs",
      version: String(rootPkg.engines?.node ?? "").replace(/^[^0-9]*/, ""),
      depType: "runtime",
      tree: "platform",
      declaredIn: new Set(["package.json engines.node"]),
      eolProduct: "nodejs",
    },
    {
      ecosystem: "platform",
      name: "rhel-ubi",
      version: ubiMatch?.[1] ?? "9",
      depType: "runtime",
      tree: "platform",
      declaredIn: new Set(["build/containerfiles/Containerfile"]),
      eolProduct: "rhel",
    },
    {
      ecosystem: "platform",
      name: "python",
      version: "3.9",
      depType: "runtime",
      tree: "platform",
      declaredIn: new Set([
        "build/containerfiles/Containerfile (ubi9 python3)",
      ]),
      eolProduct: "python",
      notes: "UBI9 python3 is 3.9",
    },
  ];
}

function classifyRisk(row) {
  if (row.tree === "python") {
    return "docs-python";
  }
  if (row.tree === "platform") {
    return "runtime-prod";
  }
  if (AUTH_CRYPTO_NETWORK.test(row.name)) {
    return "auth-crypto-network";
  }
  if (row.depType === "devDependencies" || TEST_NAME.test(row.name)) {
    return TEST_NAME.test(row.name) ? "test-only" : "build";
  }
  return "runtime-prod";
}

function classifyStatus({ eolDate, lastPublish, deprecated }) {
  if (deprecated) {
    return "unmaintained";
  }
  if (eolDate) {
    if (eolDate <= GA) {
      return "EOL";
    }
    if (eolDate <= WINDOW_END) {
      return "nearing EOL";
    }
    return "OK";
  }
  if (lastPublish) {
    if (lastPublish < UNMAINTAINED_BEFORE) {
      return "unmaintained";
    }
    return "OK";
  }
  return "unknown";
}

function npmLookupName(name) {
  const nested = name.match(/@npm:[^/]+\/(.+)$/);
  if (nested) {
    return nested[1];
  }
  return name;
}

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, {
    headers: { "User-Agent": "rhdh-eol-catalog", ...headers },
    signal: AbortSignal.timeout(20000),
  });
  if (response.status === 404) {
    return undefined;
  }
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }
  return response.json();
}

async function loadEolCycles() {
  const products = {
    nodejs: "https://endoflife.date/api/nodejs.json",
    rhel: "https://endoflife.date/api/rhel.json",
    python: "https://endoflife.date/api/python.json",
  };
  /** @type {Record<string, object[]>} */
  const cycles = {};
  if (OFFLINE) {
    return cycles;
  }
  await Promise.all(
    Object.entries(products).map(async ([name, url]) => {
      try {
        cycles[name] = (await fetchJson(url)) ?? [];
      } catch (error) {
        console.warn(`Failed to fetch EOL data for ${name}: ${error.message}`);
        cycles[name] = [];
      }
    }),
  );
  return cycles;
}

function eolDateFor(cycles, product, version) {
  const list = cycles[product];
  if (!list?.length || !version) {
    return undefined;
  }
  const cycle = list.find(
    (item) =>
      String(item.cycle) === String(version) || String(item.cycle) === version,
  );
  if (!cycle?.eol || cycle.eol === false) {
    return undefined;
  }
  const date = new Date(`${cycle.eol}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

async function enrichNpm(row) {
  const lookupName = npmLookupName(row.name);
  const encoded = encodeURIComponent(lookupName).replaceAll("%40", "@");
  const url = `https://registry.npmjs.org/${encoded}`;
  try {
    const meta = await fetchJson(url);
    if (!meta) {
      return { notes: "not found on npm" };
    }
    const latest = meta["dist-tags"]?.latest;
    const lastPublish = meta.time?.[latest] ?? meta.time?.modified;
    const deprecatedMessage =
      meta.deprecated || (latest && meta.versions?.[latest]?.deprecated) || "";
    return {
      lastPublish: lastPublish ? new Date(lastPublish) : undefined,
      deprecated: Boolean(deprecatedMessage),
      notes: deprecatedMessage
        ? `npm deprecated: ${deprecatedMessage}`
        : lookupName !== row.name
          ? `resolved as ${lookupName}`
          : "",
    };
  } catch (error) {
    return { notes: `npm lookup failed: ${error.message}` };
  }
}

async function enrichPypi(row) {
  if (row.version.startsWith("http")) {
    return { notes: row.notes || "url pin" };
  }
  try {
    const meta = await fetchJson(`https://pypi.org/pypi/${row.name}/json`);
    if (!meta) {
      return { notes: "not found on PyPI" };
    }
    const latest = meta.info?.version;
    const files = (latest && meta.releases?.[latest]) || meta.urls || [];
    const lastPublish = files[0]?.upload_time_iso_8601 || files[0]?.upload_time;
    const deprecated = Boolean(meta.info?.yanked);
    return {
      lastPublish: lastPublish ? new Date(lastPublish) : undefined,
      deprecated,
    };
  } catch (error) {
    return { notes: `PyPI lookup failed: ${error.message}` };
  }
}

async function enrich(row, cycles) {
  let eolDate;
  let lastPublish;
  let deprecated = false;
  let notes = row.notes ?? "";

  if (row.eolProduct) {
    eolDate = eolDateFor(cycles, row.eolProduct, row.version);
  }

  if (!OFFLINE && row.ecosystem === "npm") {
    const extra = await enrichNpm(row);
    lastPublish = extra.lastPublish;
    deprecated = Boolean(extra.deprecated);
    notes = [notes, extra.notes].filter(Boolean).join("; ");
  } else if (!OFFLINE && row.ecosystem === "pypi") {
    const extra = await enrichPypi(row);
    lastPublish = extra.lastPublish;
    deprecated = Boolean(extra.deprecated);
    notes = [notes, extra.notes].filter(Boolean).join("; ");
  }

  const status = classifyStatus({ eolDate, lastPublish, deprecated });
  return {
    ...row,
    status,
    eolDate,
    lastPublish,
    deprecated,
    risk: classifyRisk(row),
    notes,
  };
}

function toCsvRow(row) {
  const values = {
    ecosystem: row.ecosystem,
    name: row.name,
    version: row.version,
    dep_type: row.depType,
    tree: row.tree,
    declared_in: [...row.declaredIn].sort().join("; "),
    status: row.status,
    eol_date: isoDate(row.eolDate),
    last_publish: isoDate(row.lastPublish),
    deprecated: row.deprecated ? "true" : "false",
    risk: row.risk,
    notes: row.notes ?? "",
  };
  return CSV_COLUMNS.map((column) => csvEscape(values[column])).join(",");
}

function toMarkdown(rows) {
  const nonGreen = rows.filter((row) => row.status !== "OK");
  const counts = rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});

  const lines = [
    "# RHDH core EOL dependency catalog (generated)",
    "",
    "Generated by `yarn eol-catalog`. Do not edit by hand.",
    "How this works: [eol-dependency-catalog.md](./eol-dependency-catalog.md).",
    "",
    `- **Repo:** rhdh core (root, ` +
      "`packages/*`, `plugins/*`, Python TechDocs, platforms)",
    `- **GA (frozen):** ${isoDate(GA)}`,
    `- **Support window end:** ${isoDate(WINDOW_END)} (GA + ${SUPPORT_MONTHS} months)`,
    `- **Unmaintained:** no release in ${UNMAINTAINED_MONTHS} months, or npm/PyPI deprecated`,
    "",
    "| Status | Count |",
    "| --- | --- |",
    ...["EOL", "nearing EOL", "unmaintained", "OK", "unknown"].map(
      (status) => `| ${status} | ${counts[status] ?? 0} |`,
    ),
    "",
    "## Non-OK rows",
    "",
  ];

  if (nonGreen.length === 0) {
    lines.push("_None._", "");
    return `${lines.join("\n")}\n`;
  }

  lines.push(
    "| Status | Ecosystem | Name | Version | Risk | EOL date | Last publish | Declared in |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
  );
  for (const row of nonGreen) {
    lines.push(
      `| ${row.status} | ${row.ecosystem} | \`${row.name}\` | ${csvEscape(row.version)} | ${row.risk} | ${isoDate(row.eolDate) || "—"} | ${isoDate(row.lastPublish) || "—"} | ${[...row.declaredIn].sort().join("; ")} |`,
    );
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function main() {
  const declarations = [
    ...collectNpmDeclarations(),
    ...collectPythonDeclarations(),
    ...collectPlatforms(),
  ];

  console.log(
    `Collected ${declarations.length} direct declarations${OFFLINE ? " (offline)" : ""}`,
  );

  const cycles = await loadEolCycles();
  const enriched = await mapPool(declarations, 8, (row) => enrich(row, cycles));

  enriched.sort((a, b) => {
    const statusOrder = {
      EOL: 0,
      "nearing EOL": 1,
      unmaintained: 2,
      unknown: 3,
      OK: 4,
    };
    return (
      (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9) ||
      a.ecosystem.localeCompare(b.ecosystem) ||
      a.name.localeCompare(b.name) ||
      a.version.localeCompare(b.version)
    );
  });

  const csv = [CSV_COLUMNS.join(","), ...enriched.map(toCsvRow)].join("\n");
  writeFileSync(OUTPUT_CSV, `${csv}\n`);
  writeFileSync(OUTPUT_MD, toMarkdown(enriched));

  console.log(`Wrote ${OUTPUT_CSV}`);
  console.log(`Wrote ${OUTPUT_MD}`);
}

await main();
