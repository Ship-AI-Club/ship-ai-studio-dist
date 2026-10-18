// Every public URL derives from distribution.json. Nothing else may name a repo URL.
import { existsSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { sha256, skillNames, walk } from "./catalog.mjs";

export const DISTRIBUTION_SCHEMA = "studio-distribution/1";

// The runtime digest cannot cover the files that carry it: distribution.json holds it and
// catalog.json pins distribution.json's bytes. Both are excluded; catalog.json is recomputable
// from the tree and verify-install.mjs requires it byte for byte.
export const RUNTIME_DIGEST_EXCLUDES = ["catalog.json", "distribution.json"];
export const RUNTIME_DIGEST_METHOD = "sha256 of the sha256sum list ('<sha256>  <path>' lines, paths relative to the release root, sorted bytewise) of every release file except catalog.json and distribution.json. Shell: git ls-files -z | LC_ALL=C sort -z | grep -zvxE 'catalog\\.json|distribution\\.json' | xargs -0 sha256sum | sha256sum";

const posix = p => p.split(sep).join("/");
const bytewise = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b));

export function runtimeFacts(root) {
  const paths = walk(root).map(f => posix(relative(root, f))).filter(p => !RUNTIME_DIGEST_EXCLUDES.includes(p)).sort(bytewise);
  const list = paths.map(p => `${sha256(readFileSync(join(root, p)))}  ${p}\n`).join("");
  return { digestMethod: RUNTIME_DIGEST_METHOD, digest: sha256(list), files: paths.length + RUNTIME_DIGEST_EXCLUDES.length, skills: skillNames(root).length };
}

export function runtimeProblems(root, dist) {
  const r = dist?.runtime;
  if (!r) return ["distribution.json carries no runtime digest; this tree is not a built Studio release"];
  const p = [];
  for (const f of RUNTIME_DIGEST_EXCLUDES) if (!existsSync(join(root, f))) p.push(`${f} is missing`);
  const actual = runtimeFacts(root);
  if (r.digestMethod !== RUNTIME_DIGEST_METHOD) p.push("distribution.json runtime.digestMethod is not the documented method");
  if (r.digest !== actual.digest) p.push(`runtime digest is ${actual.digest}, distribution.json says ${r.digest}`);
  if (r.files !== actual.files) p.push(`release has ${actual.files} files, distribution.json says ${r.files}`);
  if (r.skills !== actual.skills) p.push(`release has ${actual.skills} skills, distribution.json says ${r.skills}`);
  return p;
}

export function loadDistribution(root) {
  const file = join(root, "distribution.json");
  if (!existsSync(file)) throw new Error("distribution.json is missing");
  return JSON.parse(readFileSync(file, "utf8"));
}

export function distributionProblems(dist, plugin) {
  const p = [];
  if (dist?.schema !== DISTRIBUTION_SCHEMA) p.push(`distribution.json schema must be "${DISTRIBUTION_SCHEMA}"`);
  if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(dist?.publicSource ?? "")) p.push("distribution.json publicSource must be https://github.com/<owner>/<repo>");
  if (dist?.release !== plugin?.version) p.push(`distribution.json release ${dist?.release} differs from plugin.json version ${plugin?.version}`);
  if (dist?.tag !== `v${dist?.release}`) p.push("distribution.json tag must be v<release>");
  if (plugin?.repository !== dist?.publicSource) p.push("plugin.json repository must equal distribution.json publicSource");
  return p;
}

export function publicUrls(dist, { skill } = {}) {
  const base = dist.publicSource;
  const [, owner, repo] = new URL(base).pathname.split("/");
  const blob = p => `${base}/blob/${dist.tag}/${p}`;
  return {
    repository: base,
    release: `${base}/releases/tag/${dist.tag}`,
    tree: `${base}/tree/${dist.tag}`,
    catalog: blob("catalog.json"),
    catalogRaw: `https://raw.githubusercontent.com/${owner}/${repo}/${dist.tag}/catalog.json`,
    bootstrap: blob("skills/studio-team-setup/SKILL.md"),
    ...(skill ? { entrySkill: blob(`skills/${skill}/SKILL.md`) } : {}),
  };
}

// Public docs use {{publicSource}}, {{release}}, {{tag}} and {{urls.<key>}}.
export function renderTemplate(text, dist) {
  const urls = publicUrls(dist);
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, key) => {
    const v = key.startsWith("urls.") ? urls[key.slice(5)] : dist[key];
    if (typeof v !== "string") throw new Error(`unknown template value ${m}`);
    return v;
  });
}
