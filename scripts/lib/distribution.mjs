// Every public URL derives from distribution.json. Nothing else may name a repo URL.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const DISTRIBUTION_SCHEMA = "studio-distribution/1";

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
