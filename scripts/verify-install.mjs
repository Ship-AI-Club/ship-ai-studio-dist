// Install verifier shipped with every Studio release. It checks only the tree it sits in:
// catalog identity, every skill and file hash, the runtime digest and counts, internal links,
// and that every command a shipped skill, role doc or the registry tells a bot to run exists.
// It never reads another folder, a creator workspace or a plugin cache, and has no fallback.
//
// Usage: node <root>/scripts/verify-install.mjs [--root <plugin-root>]
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildCatalog, catalogSha256, skillNames, walk } from "./lib/catalog.mjs";
import { distributionProblems, loadDistribution, runtimeProblems } from "./lib/distribution.mjs";

const posix = p => p.split(sep).join("/");
const inside = (root, p) => { const r = relative(root, p); return r === "" || (!r.startsWith("..") && !isAbsolute(r)); };
// Skill commands run from the skill folder; registry and role-doc commands run from the plugin root.
const SKILL_COMMAND = /\bnode\s+(\.\.\/\.\.\/[^\s`"'<>|]+?\.mjs)(?![\w.])/g;
const ROOT_COMMAND = /\bnode\s+((?:scripts|assets)\/[^\s`"'<>|]+?\.mjs)(?![\w.])/g;
const ROOT_DOCS = ["README.md", "studio-role-registry.json", "studio-role-registry.md"];

const mdUnder = (root, d) => existsSync(join(root, d)) ? walk(join(root, d)).filter(f => f.endsWith(".md")) : [];

export function commandPaths(root) {
  const found = new Map();
  const add = (from, command, abs) => {
    const path = posix(relative(root, abs));
    found.set(`${from}\0${path}`, { from, command, path, inside: inside(root, abs), exists: inside(root, abs) && existsSync(abs) });
  };
  for (const name of skillNames(root)) {
    for (const f of mdUnder(root, join("skills", name))) {
      for (const m of readFileSync(f, "utf8").matchAll(SKILL_COMMAND)) add(posix(relative(root, f)), m[0], resolve(root, "skills", name, m[1]));
    }
  }
  const docs = [...ROOT_DOCS.map(f => join(root, f)).filter(existsSync), ...mdUnder(root, "roles")];
  for (const f of docs) for (const m of readFileSync(f, "utf8").matchAll(ROOT_COMMAND)) add(posix(relative(root, f)), m[0], resolve(root, m[1]));
  return [...found.values()].sort((a, b) => (a.path + a.from).localeCompare(b.path + b.from));
}

function linkProblems(root) {
  const files = [...mdUnder(root, "skills"), ...mdUnder(root, "assets"), ...mdUnder(root, "roles"), ...mdUnder(root, "pm-config"),
    ...["README.md", "studio-role-registry.md", "THIRD_PARTY_NOTICES.md"].map(f => join(root, f)).filter(existsSync)];
  const errors = [];
  for (const f of files) {
    const text = readFileSync(f, "utf8").replace(/```[\s\S]*?```/g, "");
    for (const m of text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
      if (/^(https?:|mailto:|#|\/)/.test(m[1])) continue;
      const p = resolve(dirname(f), m[1].split("#")[0]);
      if (!inside(root, p) || !existsSync(p)) errors.push(`broken link in ${posix(relative(root, f))}: ${m[1]}`);
    }
  }
  return errors;
}

// The PM entry config is exported as is, so it must agree with the registry and distribution.json.
function pmConfigProblems(root, plugin, dist) {
  const reg = JSON.parse(readFileSync(join(root, "studio-role-registry.json"), "utf8"));
  const pm = reg.roles.find(r => r.id === "pm");
  if (!pm?.entryConfig) return ["registry pm role has no entryConfig"];
  const f = join(root, pm.entryConfig);
  if (!existsSync(f)) return [`${pm.entryConfig} is missing`];
  const cfg = JSON.parse(readFileSync(f, "utf8"));
  const errors = [];
  if (cfg.description !== pm.description) errors.push(`${pm.entryConfig} description differs from the registry pm description`);
  if (cfg.release !== plugin.version || cfg.settings?.studioRelease !== plugin.version) errors.push(`${pm.entryConfig} release is not ${plugin.version}`);
  const studio = cfg.pluginRefs?.find(p => p.name === plugin.name);
  if (studio?.source !== dist.publicSource || studio?.tag !== dist.tag) errors.push(`${pm.entryConfig} plugin ref must be ${dist.publicSource} at ${dist.tag}`);
  const skill = cfg.bootstrapSkill?.path && join(root, cfg.bootstrapSkill.path);
  if (!skill || !existsSync(skill)) return [...errors, `${pm.entryConfig} bootstrap skill ${cfg.bootstrapSkill?.path} is missing`];
  const text = readFileSync(skill, "utf8");
  if (!text.includes(`SRC=${dist.publicSource}\n`) || !text.includes(`BASE="${cfg.settings?.studioRuntimeBase}"\n`)) errors.push(`${cfg.bootstrapSkill.path} must hydrate from ${dist.publicSource} into ${cfg.settings?.studioRuntimeBase}`);
  return errors;
}

function catalogProblems(root, catalog) {
  const fresh = buildCatalog(root);
  const errors = [];
  const key = (list, k) => new Map(list.map(x => [x[k], x]));
  const cs = key(catalog.skills ?? [], "name"), fs = key(fresh.skills, "name");
  const cf = key(catalog.files ?? [], "path"), ff = key(fresh.files, "path");
  for (const [n, s] of fs) if (!cs.has(n)) errors.push(`skill ${n} is not in catalog.json`); else if (cs.get(n).sha256 !== s.sha256) errors.push(`skill ${n} differs from catalog.json`);
  for (const n of cs.keys()) if (!fs.has(n)) errors.push(`skill ${n} is missing`);
  for (const [p, x] of ff) if (!cf.has(p)) errors.push(`file ${p} is not in catalog.json`); else if (cf.get(p).sha256 !== x.sha256 || cf.get(p).bytes !== x.bytes) errors.push(`file ${p} differs from catalog.json`);
  for (const p of cf.keys()) if (!ff.has(p)) errors.push(`file ${p} is missing`);
  if (!errors.length && readFileSync(join(root, "catalog.json"), "utf8") !== JSON.stringify(fresh, null, 2) + "\n") errors.push("catalog.json is not the catalog of this tree");
  return { errors, skills: fresh.skills.length, files: fresh.files.length };
}

export function verifyInstall(root) {
  root = resolve(root);
  if (!existsSync(root)) return { status: "FAIL", root, errors: [`${root} does not exist`] };
  root = realpathSync(root);
  const missing = ["plugin.json", "catalog.json", "distribution.json"].filter(f => !existsSync(join(root, f)));
  if (missing.length) return { status: "FAIL", root, errors: missing.map(f => `${root} has no ${f}; it is not a Studio release root`) };
  const plugin = JSON.parse(readFileSync(join(root, "plugin.json"), "utf8"));
  const catalog = JSON.parse(readFileSync(join(root, "catalog.json"), "utf8"));
  const dist = loadDistribution(root);
  const errors = [];
  if (catalog.name !== plugin.name || catalog.release !== plugin.version) errors.push(`catalog ${catalog.name}@${catalog.release} does not match plugin ${plugin.name}@${plugin.version}`);
  errors.push(...distributionProblems(dist, plugin), ...runtimeProblems(root, dist));
  const cat = catalogProblems(root, catalog);
  errors.push(...cat.errors, ...linkProblems(root), ...pmConfigProblems(root, plugin, dist));
  const commands = commandPaths(root);
  for (const c of commands) if (!c.exists) errors.push(`${c.from}: \`${c.command}\` needs ${c.path}, which is ${c.inside ? "missing from this release" : "outside this release"}`);
  return {
    status: errors.length ? "FAIL" : "PASS",
    plugin: plugin.name, release: plugin.version, root, catalogSha256: catalogSha256(root),
    runtime: dist.runtime ?? null, skills: cat.skills, catalogFiles: cat.files,
    commands: [...new Set(commands.map(c => c.path))], errors,
  };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const i = process.argv.indexOf("--root");
  try {
    const report = verifyInstall(i > -1 ? process.argv[i + 1] : fileURLToPath(new URL("..", import.meta.url)));
    console.log(JSON.stringify(report, null, 2));
    if (report.status !== "PASS") process.exitCode = 1;
  } catch (e) { console.error(`STUDIO INSTALL CHECK FAILED: ${e.message}`); process.exitCode = 1; }
}
