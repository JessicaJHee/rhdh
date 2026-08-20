# EOL dependency catalog

Living inventory of **direct** RHDH dependencies for [RHIDP-13174](https://redhat.atlassian.net/browse/RHIDP-13174). It is not a `yarn.lock` dump and not a remediation tracker.

## Run / update

From the repo root (needs network for npm, PyPI, and endoflife.date):

```bash
yarn eol-catalog
```

Same thing: `node scripts/generate-eol-catalog.mjs`.

That regenerates:

- [eol-dependency-catalog.csv](./eol-dependency-catalog.csv) — every row
- [eol-dependency-catalog-report.md](./eol-dependency-catalog-report.md) — counts and non-OK rows

Commit those two files with the PR. Do not edit them by hand.

Run again when direct deps change, the 2.2 GA date is updated, or you want a fresh status pass. There is no scheduled GitHub Action.

`--offline` skips registry lookups (status will be mostly `unknown`):

```bash
node scripts/generate-eol-catalog.mjs --offline
```

To change the support window, edit `GA` and `SUPPORT_MONTHS` in [`scripts/generate-eol-catalog.mjs`](../scripts/generate-eol-catalog.mjs) and re-run.

## Scope (this repo, this phase)

Included: root, `packages/*`, `plugins/*`, `python/*.in`, platforms (Node, UBI, image Python).

Skipped: `yarn.lock`, `dynamic-plugins/wrappers`, other repos. Plugin repos come later, and only where overlays metadata `spec.support` is not `community`.

## Status

Status is computed on each run. The CSV is not the source of truth.

Signals, in order:

1. npm/PyPI **deprecated** (or yanked) → `unmaintained`
2. Published **EOL date** vs frozen 2.2 window → `EOL`, `nearing EOL`, or `OK`
3. **Last publish** older than 18 months → `unmaintained`, else `OK`
4. No signal → `unknown`

Window: GA `2027-03-01` through `2028-01-01` (GA + 10 months). Nearing EOL means the vendor EOL date falls **inside that window**, not “EOL within 10 months of today.”

| Input | Source | Used for |
| ----- | ------ | -------- |
| What we ship | `package.json`, `python/*.in`, Containerfile | Rows |
| EOL date | [endoflife.date](https://endoflife.date) (`nodejs`, `rhel`, `python`) | Platforms |
| Deprecated / last publish | npm registry, PyPI | JS and Python packages |

Most npm/PyPI packages have no EOL date. They are only `unmaintained` or `OK`.
