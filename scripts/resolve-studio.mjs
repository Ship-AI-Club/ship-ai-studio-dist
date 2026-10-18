// Resolve step for every Studio entry skill. Proves which plugin root, release and
// catalog a skill was loaded from, and stops on any mismatch. There is no fallback:
// an old product-team skill name or a missing Studio skill is an error, never a substitute.
//
// Usage: node <root>/scripts/resolve-studio.mjs --skill <studio-skill>
//          [--expect-release <x.y.z>] [--expect-catalog-sha256 <hex>] [--root <plugin-root>]
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { catalogSha256, sha256, treeHash } from "./lib/catalog.mjs";
import { distributionProblems, loadDistribution, publicUrls } from "./lib/distribution.mjs";

export class ResolveError extends Error {
  constructor(msg) { super(`STUDIO RESOLVE FAILED: ${msg}. Stop. Do not load any other copy of this skill; report this error to the PM.`); this.name = "ResolveError"; }
}

const inside = (root, p) => { const r = relative(root, p); return r && !r.startsWith("..") && !isAbsolute(r); };

export function resolveStudio({ root, skill, expectRelease, expectCatalogSha256 }) {
  if (!skill) throw new ResolveError("--skill is required");
  if (!root || !existsSync(root)) throw new ResolveError(`plugin root ${root} does not exist`);
  root = realpathSync(root);
  for (const f of ["plugin.json", "catalog.json"]) if (!existsSync(join(root, f))) throw new ResolveError(`${root} has no ${f}; it is not a Studio plugin root`);
  const plugin = JSON.parse(readFileSync(join(root, "plugin.json"), "utf8"));
  const catalog = JSON.parse(readFileSync(join(root, "catalog.json"), "utf8"));
  if (catalog.name !== plugin.name || catalog.release !== plugin.version) throw new ResolveError(`catalog ${catalog.name}@${catalog.release} does not match plugin ${plugin.name}@${plugin.version}`);
  if (expectRelease && plugin.version !== expectRelease) throw new ResolveError(`release is ${plugin.version}, expected ${expectRelease}`);
  const sha = catalogSha256(root);
  if (expectCatalogSha256 && sha !== expectCatalogSha256) throw new ResolveError(`catalog sha256 is ${sha}, expected ${expectCatalogSha256}`);
  const legacy = JSON.parse(readFileSync(join(root, "scripts/legacy-product-team-skills.json"), "utf8")).skills;
  if (legacy.includes(skill)) throw new ResolveError(`"${skill}" is an old product-team skill; Studio entry points never use it`);
  const entry = catalog.skills.find(s => s.name === skill);
  if (!entry) throw new ResolveError(`"${skill}" is not in the Studio catalog ${plugin.version}`);
  const dir = resolve(root, entry.path);
  if (!existsSync(join(dir, "SKILL.md")) || !inside(root, realpathSync(dir))) throw new ResolveError(`${entry.path} is missing or outside the plugin root`);
  const actual = treeHash(dir);
  if (actual !== entry.sha256) throw new ResolveError(`${entry.path} sha256 ${actual} does not match the catalog ${entry.sha256}`);
  let dist;
  try { dist = loadDistribution(root); } catch (e) { throw new ResolveError(e.message); }
  const distProblems = distributionProblems(dist, plugin);
  if (distProblems.length) throw new ResolveError(distProblems.join("; "));
  const distEntry = catalog.files.find(f => f.path === "distribution.json");
  if (!distEntry || distEntry.sha256 !== sha256(readFileSync(join(root, "distribution.json")))) throw new ResolveError("distribution.json does not match the catalog");
  return {
    status: "RESOLVED", plugin: plugin.name, release: plugin.version, root, catalogSha256: sha,
    skill: { name: skill, path: join(dir, "SKILL.md"), sha256: actual },
    urls: publicUrls(dist, { skill }),
  };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const a = k => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : undefined; };
  try {
    const out = resolveStudio({
      root: a("--root") ?? fileURLToPath(new URL("..", import.meta.url)),
      skill: a("--skill"),
      expectRelease: a("--expect-release"),
      expectCatalogSha256: a("--expect-catalog-sha256"),
    });
    console.log(JSON.stringify(out, null, 2));
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
